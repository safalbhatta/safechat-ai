const Notification = require("../models/Notification");
const User = require("../models/User");

const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  enabled: true,
  newMessages: true,
  reactions: true,
  contactRequests: true,
  friendUpdates: true,
  accountActivity: true,
  sound: true,
  desktop: true,
});

const getPreferences = (user) => ({
  ...DEFAULT_NOTIFICATION_PREFERENCES,
  ...((user?.notificationPreferences?.toObject
    ? user.notificationPreferences.toObject()
    : user?.notificationPreferences) || {}),
});

const preferenceKeyForType = (type) => {
  switch (type) {
    case "message":
      return "newMessages";
    case "reaction":
      return "reactions";
    case "contact_request":
      return "contactRequests";
    case "friend_request_accepted":
      return "friendUpdates";
    case "account":
      return "accountActivity";
    default:
      return null;
  }
};

const trimPreview = (value = "", maxLength = 140) => {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1)}…`;
};

const getActorName = (actor) =>
  actor?.name || actor?.username || actor?.email || "Someone";

const canCreateNotification = async ({ recipientId, type }) => {
  const user = await User.findById(recipientId).select("notificationPreferences");
  if (!user) return false;

  const preferences = getPreferences(user);
  if (!preferences.enabled) return false;

  const preferenceKey = preferenceKeyForType(type);
  if (preferenceKey && preferences[preferenceKey] === false) return false;

  return true;
};

const populateNotification = (query) =>
  query
    .populate("actorId", "name username email profilePic")
    .populate("chatId", "members isGroupChat groupName groupAvatar")
    .populate("messageId", "text messageType isDeleted chatId senderId");

const getUnreadCount = (recipientId) =>
  Notification.countDocuments({ recipientId, isRead: false });

const emitUnreadCount = async (io, recipientId) => {
  if (!io || !recipientId) return;
  const unreadCount = await getUnreadCount(recipientId);
  io.to(recipientId.toString()).emit("notification:count", { unreadCount });
};

const isRecipientViewingChat = (io, recipientId, chatId) => {
  if (!io?.activeChats || !recipientId || !chatId) return false;

  return Array.from(io.activeChats.values()).some(
    (entry) =>
      entry?.userId === recipientId.toString() &&
      entry?.chatId === chatId.toString()
  );
};

const createNotification = async ({
  io,
  recipientId,
  actorId = null,
  type,
  title,
  body = "",
  chatId = null,
  messageId = null,
  metadata = {},
}) => {
  try {
    if (!recipientId || !type || !title) return null;

    if (type === "message" && isRecipientViewingChat(io, recipientId, chatId)) {
      return null;
    }

    const allowed = await canCreateNotification({ recipientId, type });
    if (!allowed) return null;

    const notification = await Notification.create({
      recipientId,
      actorId,
      type,
      title: trimPreview(title, 100),
      body: trimPreview(body),
      chatId,
      messageId,
      metadata,
    });

    const populated = await populateNotification(
      Notification.findById(notification._id)
    );

    if (io && populated) {
      io.to(recipientId.toString()).emit("notification:new", populated);
      await emitUnreadCount(io, recipientId);
    }

    return populated;
  } catch (error) {
    console.error("Notification creation failed:", error.message);
    return null;
  }
};

const createMessageNotifications = async ({ io, chat, sender, message }) => {
  if (!chat || !sender || !message) return [];

  const senderId = sender._id || sender;
  const senderName = getActorName(sender);
  const preview =
    message.messageType === "voice"
      ? "Voice message"
      : message.isDeleted
      ? "This message was deleted"
      : trimPreview(message.text || "Sent a message");

  const recipients = (chat.members || []).filter(
    (memberId) => memberId?.toString() !== senderId?.toString()
  );

  const results = await Promise.all(
    recipients.map(async (recipientId) => {
      const isMuted = (chat.mutedBy || []).some(
        (memberId) => memberId?.toString() === recipientId?.toString()
      );
      if (isMuted) return null;

      const title = chat.isGroupChat
        ? `${senderName} in ${chat.groupName || "Group chat"}`
        : senderName;

      return createNotification({
        io,
        recipientId,
        actorId: senderId,
        type: "message",
        title,
        body: preview,
        chatId: chat._id,
        messageId: message._id,
        metadata: {
          isGroupChat: Boolean(chat.isGroupChat),
          groupName: chat.groupName || "",
          messageType: message.messageType || "text",
        },
      });
    })
  );

  return results.filter(Boolean);
};

const createReactionNotification = async ({ io, message, actor, emoji }) => {
  if (!message || !actor || !emoji) return null;

  const actorId = actor._id || actor;
  const recipientId = message.senderId?._id || message.senderId;

  if (!recipientId || recipientId.toString() === actorId.toString()) {
    return null;
  }

  return createNotification({
    io,
    recipientId,
    actorId,
    type: "reaction",
    title: getActorName(actor),
    body: `Reacted ${emoji} to your message`,
    chatId: message.chatId,
    messageId: message._id,
    metadata: { emoji },
  });
};

const updateMessageNotificationPreview = async ({ io, message }) => {
  try {
    if (!message?._id) return;

    const body = message.isDeleted
      ? "This message was deleted"
      : message.messageType === "voice"
      ? "Voice message"
      : trimPreview(message.text || "Sent a message");

    const notifications = await Notification.find({
      messageId: message._id,
      type: "message",
    });

    if (!notifications.length) return;

    await Notification.updateMany(
      { messageId: message._id, type: "message" },
      { $set: { body } }
    );

    if (io) {
      for (const notification of notifications) {
        io.to(notification.recipientId.toString()).emit("notification:updated", {
          notificationId: notification._id,
          body,
        });
      }
    }
  } catch (error) {
    console.error("Notification preview update failed:", error.message);
  }
};

module.exports = {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getPreferences,
  populateNotification,
  getUnreadCount,
  emitUnreadCount,
  createNotification,
  createMessageNotifications,
  createReactionNotification,
  updateMessageNotificationPreview,
};
