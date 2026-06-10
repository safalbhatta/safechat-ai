const Chat = require("../models/Chat");
const Message = require("../models/Message");

const isSameId = (id1, id2) => {
  return id1?.toString() === id2?.toString();
};

const isUserInArray = (array, userId) => {
  return array?.some((id) => isSameId(id, userId));
};

const getClearDateForUser = (chat, userId) => {
  const clearEntry = chat.clearedFor?.find((entry) =>
    isSameId(entry.userId, userId)
  );

  return clearEntry?.clearedAt || null;
};

const createOrGetChat = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user._id;

    let chat = await Chat.findOne({
      members: { $all: [senderId, receiverId] },
    }).populate("members", "-password");

    if (!chat) {
      chat = await Chat.create({
        members: [senderId, receiverId],
      });

      chat = await chat.populate("members", "-password");
    } else {
      chat.deletedFor = chat.deletedFor.filter(
        (userId) => !isSameId(userId, senderId)
      );

      await chat.save();
      chat = await Chat.findById(chat._id).populate("members", "-password");
    }

    res.status(200).json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyChats = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const chats = await Chat.find({
      members: { $in: [currentUserId] },
      deletedFor: { $ne: currentUserId },
    })
      .populate("members", "-password")
      .sort({ updatedAt: -1 });

    const chatsWithUnread = await Promise.all(
      chats.map(async (chat) => {
        const clearedAt = getClearDateForUser(chat, currentUserId);

        const unreadQuery = {
          chatId: chat._id,
          receiverId: currentUserId,
          isViewed: false,
        };

        if (clearedAt) {
          unreadQuery.createdAt = { $gt: clearedAt };
        }

        const unreadCount = await Message.countDocuments(unreadQuery);

        return {
          ...chat.toObject(),
          unreadCount,
          isPinned: isUserInArray(chat.pinnedBy, currentUserId),
          isMuted: isUserInArray(chat.mutedBy, currentUserId),
          isArchived: isUserInArray(chat.archivedBy, currentUserId),
        };
      })
    );

    chatsWithUnread.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    res.json(chatsWithUnread);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getChatAndCheckMember = async (chatId, userId) => {
  const chat = await Chat.findById(chatId);

  if (!chat) {
    return null;
  }

  const isMember = chat.members.some((memberId) => isSameId(memberId, userId));

  if (!isMember) {
    return false;
  }

  return chat;
};

const togglePinChat = async (req, res) => {
  try {
    const chat = await getChatAndCheckMember(req.params.chatId, req.user._id);

    if (chat === null) return res.status(404).json({ message: "Chat not found" });
    if (chat === false) return res.status(403).json({ message: "Not allowed" });

    if (isUserInArray(chat.pinnedBy, req.user._id)) {
      chat.pinnedBy = chat.pinnedBy.filter((id) => !isSameId(id, req.user._id));
    } else {
      chat.pinnedBy.push(req.user._id);
    }

    await chat.save();

    const updatedChat = await Chat.findById(chat._id).populate(
      "members",
      "-password"
    );

    res.json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleMuteChat = async (req, res) => {
  try {
    const chat = await getChatAndCheckMember(req.params.chatId, req.user._id);

    if (chat === null) return res.status(404).json({ message: "Chat not found" });
    if (chat === false) return res.status(403).json({ message: "Not allowed" });

    if (isUserInArray(chat.mutedBy, req.user._id)) {
      chat.mutedBy = chat.mutedBy.filter((id) => !isSameId(id, req.user._id));
    } else {
      chat.mutedBy.push(req.user._id);
    }

    await chat.save();

    const updatedChat = await Chat.findById(chat._id).populate(
      "members",
      "-password"
    );

    res.json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const archiveChat = async (req, res) => {
  try {
    const chat = await getChatAndCheckMember(req.params.chatId, req.user._id);

    if (chat === null) return res.status(404).json({ message: "Chat not found" });
    if (chat === false) return res.status(403).json({ message: "Not allowed" });

    if (!isUserInArray(chat.archivedBy, req.user._id)) {
      chat.archivedBy.push(req.user._id);
    }

    await chat.save();

    res.json({ message: "Chat archived" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const unarchiveChat = async (req, res) => {
  try {
    const chat = await getChatAndCheckMember(req.params.chatId, req.user._id);

    if (chat === null) return res.status(404).json({ message: "Chat not found" });
    if (chat === false) return res.status(403).json({ message: "Not allowed" });

    chat.archivedBy = chat.archivedBy.filter(
      (id) => !isSameId(id, req.user._id)
    );

    await chat.save();

    res.json({ message: "Chat unarchived" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const clearChat = async (req, res) => {
  try {
    const chat = await getChatAndCheckMember(req.params.chatId, req.user._id);

    if (chat === null) return res.status(404).json({ message: "Chat not found" });
    if (chat === false) return res.status(403).json({ message: "Not allowed" });

    const existingClear = chat.clearedFor.find((entry) =>
      isSameId(entry.userId, req.user._id)
    );

    if (existingClear) {
      existingClear.clearedAt = new Date();
    } else {
      chat.clearedFor.push({
        userId: req.user._id,
        clearedAt: new Date(),
      });
    }

    await chat.save();

    res.json({ message: "Chat cleared" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteChatForMe = async (req, res) => {
  try {
    const chat = await getChatAndCheckMember(req.params.chatId, req.user._id);

    if (chat === null) return res.status(404).json({ message: "Chat not found" });
    if (chat === false) return res.status(403).json({ message: "Not allowed" });

    if (!isUserInArray(chat.deletedFor, req.user._id)) {
      chat.deletedFor.push(req.user._id);
    }

    chat.archivedBy = chat.archivedBy.filter(
      (id) => !isSameId(id, req.user._id)
    );

    chat.pinnedBy = chat.pinnedBy.filter((id) => !isSameId(id, req.user._id));

    await chat.save();

    res.json({ message: "Chat deleted for you" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrGetChat,
  getMyChats,
  togglePinChat,
  toggleMuteChat,
  archiveChat,
  unarchiveChat,
  clearChat,
  deleteChatForMe,
};