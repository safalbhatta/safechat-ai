const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const User = require("../models/User");
const {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getPreferences,
  populateNotification,
  getUnreadCount,
  emitUnreadCount,
} = require("../services/notificationService");

const buildSearchQuery = (search) => {
  const clean = String(search || "").trim();
  if (!clean) return null;
  return {
    $or: [
      { title: { $regex: clean, $options: "i" } },
      { body: { $regex: clean, $options: "i" } },
    ],
  };
};

const getNotifications = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const filter = req.query.filter || "all";
    const type = req.query.type || "all";

    const query = { recipientId: req.user._id };

    if (filter === "unread") query.isRead = false;
    if (type !== "all") query.type = type;

    const searchQuery = buildSearchQuery(req.query.search);
    if (searchQuery) Object.assign(query, searchQuery);

    const [items, total, unreadCount] = await Promise.all([
      populateNotification(
        Notification.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
      ),
      Notification.countDocuments(query),
      getUnreadCount(req.user._id),
    ]);

    res.json({
      items,
      total,
      unreadCount,
      page,
      limit,
      hasMore: page * limit < total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getNotificationUnreadCount = async (req, res) => {
  try {
    const unreadCount = await getUnreadCount(req.user._id);
    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getNotificationPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("notificationPreferences");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(getPreferences(user));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateNotificationPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const current = getPreferences(user);
    const next = { ...current };

    Object.keys(DEFAULT_NOTIFICATION_PREFERENCES).forEach((key) => {
      if (typeof req.body[key] === "boolean") next[key] = req.body[key];
    });

    user.notificationPreferences = next;
    user.markModified("notificationPreferences");
    await user.save();

    const io = req.app.get("io");
    if (io) {
      io.to(req.user._id.toString()).emit("notification:preferences", next);
    }

    res.json(next);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.notificationId)) {
      return res.status(400).json({ message: "Invalid notification id" });
    }

    const notification = await Notification.findOne({
      _id: req.params.notificationId,
      recipientId: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    const populated = await populateNotification(
      Notification.findById(notification._id)
    );

    const io = req.app.get("io");
    if (io) {
      io.to(req.user._id.toString()).emit("notification:read", {
        notificationId: notification._id,
      });
      await emitUnreadCount(io, req.user._id);
    }

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markChatNotificationsRead = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.chatId)) {
      return res.status(400).json({ message: "Invalid chat id" });
    }

    const now = new Date();
    await Notification.updateMany(
      {
        recipientId: req.user._id,
        chatId: req.params.chatId,
        type: "message",
        isRead: false,
      },
      { $set: { isRead: true, readAt: now } }
    );

    const io = req.app.get("io");
    if (io) {
      io.to(req.user._id.toString()).emit("notification:chat-read", {
        chatId: req.params.chatId,
        readAt: now,
      });
      await emitUnreadCount(io, req.user._id);
    }

    res.json({ message: "Chat notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    const now = new Date();
    await Notification.updateMany(
      { recipientId: req.user._id, isRead: false },
      { $set: { isRead: true, readAt: now } }
    );

    const io = req.app.get("io");
    if (io) {
      io.to(req.user._id.toString()).emit("notification:all-read", {
        readAt: now,
      });
      await emitUnreadCount(io, req.user._id);
    }

    res.json({ message: "All notifications marked as read", unreadCount: 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.notificationId,
      recipientId: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const io = req.app.get("io");
    if (io) {
      io.to(req.user._id.toString()).emit("notification:deleted", {
        notificationId: notification._id,
      });
      await emitUnreadCount(io, req.user._id);
    }

    res.json({ message: "Notification deleted", notificationId: notification._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const clearReadNotifications = async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      recipientId: req.user._id,
      isRead: true,
    });

    const io = req.app.get("io");
    if (io) {
      io.to(req.user._id.toString()).emit("notification:cleared-read");
      await emitUnreadCount(io, req.user._id);
    }

    res.json({ message: "Read notifications cleared", deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getNotifications,
  getNotificationUnreadCount,
  getNotificationPreferences,
  updateNotificationPreferences,
  markNotificationRead,
  markChatNotificationsRead,
  markAllNotificationsRead,
  deleteNotification,
  clearReadNotifications,
};
