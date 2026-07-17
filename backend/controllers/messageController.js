const Message = require("../models/Message");
const Chat = require("../models/Chat");
const User = require("../models/User");
const {
  createMessageNotifications,
  createReactionNotification,
  updateMessageNotificationPreview,
} = require("../services/notificationService");

const isSameId = (id1, id2) => {
  return id1?.toString() === id2?.toString();
};

const isUserInList = (list = [], userId) => {
  return list.some((item) => isSameId(item, userId));
};

const getMessageWithReply = async (messageId) => {
  return Message.findById(messageId)
    .populate({
      path: "replyTo",
      select: "text senderId isDeleted messageType audioUrl audioDuration",
    })
    .populate("reactions.userId", "username email");
};

const getMessagePreview = (message) => {
  if (!message) return "";

  if (message.isDeleted) return "This message was deleted";

  if (message.messageType === "voice") return "🎤 Voice message";

  if (message.isForwarded && message.text) return message.text;

  return message.text || "";
};

const updateChatLastMessage = async (chatId) => {
  const latestMessage = await Message.findOne({ chatId }).sort({
    createdAt: -1,
  });

  if (!latestMessage) {
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: "",
    });
    return;
  }

  await Chat.findByIdAndUpdate(chatId, {
    lastMessage: getMessagePreview(latestMessage),
  });
};

const getChatAndCheckMember = async (chatId, userId) => {
  const chat = await Chat.findById(chatId);

  if (!chat) return null;

  const isMember = chat.members.some((memberId) =>
    isSameId(memberId, userId)
  );

  if (!isMember) return false;

  return chat;
};

const checkMessageAccess = (message, userId) => {
  if (!message) return false;

  const isSender = isSameId(message.senderId, userId);
  const isReceiver = isSameId(message.receiverId, userId);

  return isSender || isReceiver;
};

const sendMessage = async (req, res) => {
  try {
    const { chatId, receiverId, text, replyTo } = req.body;

    if (!chatId || !receiverId || !text || !text.trim()) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const chat = await getChatAndCheckMember(chatId, req.user._id);

    if (chat === null) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (chat === false) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const receiverInChat = chat.members.some((memberId) =>
      isSameId(memberId, receiverId)
    );

    if (!receiverInChat) {
      return res.status(400).json({ message: "Receiver is not in this chat" });
    }

    const currentUser = await User.findById(req.user._id);
    const receiverUser = await User.findById(receiverId);

    if (currentUser?.blockedContacts?.some(id => isSameId(id, receiverId))) {
      return res.status(403).json({ message: "You have blocked this user" });
    }

    if (receiverUser?.blockedContacts?.some(id => isSameId(id, req.user._id))) {
      return res.status(403).json({ message: "You cannot send messages to this user" });
    }

    let replyMessage = null;

    if (replyTo) {
      replyMessage = await Message.findById(replyTo);

      if (!replyMessage || !checkMessageAccess(replyMessage, req.user._id)) {
        return res.status(400).json({ message: "Invalid reply message" });
      }
    }

    const cleanText = text.trim();

    const message = await Message.create({
      chatId,
      senderId: req.user._id,
      receiverId,
      messageType: "text",
      text: cleanText,
      replyTo: replyTo || null,
      isViewed: false,
      isEdited: false,
      isDeleted: false,
      isFlagged: false,
      flagCategory: "None",
      flagReason: "",
      flagStatus: "None",
    });

    await Chat.findByIdAndUpdate(chatId, {
      $set: {
        lastMessage: cleanText,
      },
      $pull: {
        deletedFor: { $in: [req.user._id, receiverId] },
      },
    });

    const populatedMessage = await getMessageWithReply(message._id);

    await createMessageNotifications({
      io: req.app.get("io"),
      chat,
      sender: req.user,
      message: populatedMessage,
    });

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendVoiceMessage = async (req, res) => {
  try {
    const { chatId, receiverId, audioDuration } = req.body;

    if (!chatId || !receiverId || !req.file) {
      return res.status(400).json({ message: "Missing voice message fields" });
    }

    const chat = await getChatAndCheckMember(chatId, req.user._id);

    if (chat === null) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (chat === false) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const receiverInChat = chat.members.some((memberId) =>
      isSameId(memberId, receiverId)
    );

    if (!receiverInChat) {
      return res.status(400).json({ message: "Receiver is not in this chat" });
    }

    const currentUser = await User.findById(req.user._id);
    const receiverUser = await User.findById(receiverId);

    if (currentUser?.blockedContacts?.some(id => isSameId(id, receiverId))) {
      return res.status(403).json({ message: "You have blocked this user" });
    }

    if (receiverUser?.blockedContacts?.some(id => isSameId(id, req.user._id))) {
      return res.status(403).json({ message: "You cannot send messages to this user" });
    }

    const audioUrl = `${req.protocol}://${req.get("host")}/uploads/voices/${
      req.file.filename
    }`;

    const message = await Message.create({
      chatId,
      senderId: req.user._id,
      receiverId,
      messageType: "voice",
      text: "",
      audioUrl,
      audioDuration: Number(audioDuration) || 0,
      isViewed: false,
      isEdited: false,
      isDeleted: false,
      isFlagged: false,
      flagCategory: "None",
      flagReason: "",
      flagStatus: "None",
    });

    await Chat.findByIdAndUpdate(chatId, {
      $set: {
        lastMessage: "🎤 Voice message",
      },
      $pull: {
        deletedFor: { $in: [req.user._id, receiverId] },
      },
    });

    const populatedMessage = await getMessageWithReply(message._id);

    await createMessageNotifications({
      io: req.app.get("io"),
      chat,
      sender: req.user,
      message: populatedMessage,
    });

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const currentUserId = req.user._id;

    const chat = await getChatAndCheckMember(chatId, currentUserId);

    if (chat === null) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (chat === false) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const clearedEntry = chat.clearedFor?.find((entry) =>
      isSameId(entry.userId, currentUserId)
    );

    const messageQuery = {
  chatId,
  deletedFor: { $ne: currentUserId },
};

    if (clearedEntry?.clearedAt) {
      messageQuery.createdAt = {
        $gt: clearedEntry.clearedAt,
      };
    }

    await Message.updateMany(
      {
        ...messageQuery,
        receiverId: currentUserId,
        isViewed: false,
      },
      {
        isViewed: true,
      }
    );

    const messages = await Message.find(messageQuery)
      .populate({
        path: "replyTo",
        select: "text senderId isDeleted messageType audioUrl audioDuration",
      })
      .populate("reactions.userId", "username email")
      .sort({
        createdAt: 1,
      });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Message text is required" });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (!isSameId(message.senderId, req.user._id)) {
      return res.status(403).json({
        message: "You can edit only your own messages",
      });
    }

    if (message.isDeleted) {
      return res.status(400).json({
        message: "Deleted messages cannot be edited",
      });
    }

    if (message.messageType === "voice") {
      return res.status(400).json({
        message: "Voice messages cannot be edited",
      });
    }

    message.text = text.trim();
    message.isEdited = true;
    message.editedAt = new Date();

    await message.save();
    await updateChatLastMessage(message.chatId);

    const updatedMessage = await getMessageWithReply(message._id);

    await updateMessageNotificationPreview({
      io: req.app.get("io"),
      message: updatedMessage,
    });

    res.json(updatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (!isSameId(message.senderId, req.user._id)) {
      return res.status(403).json({
        message: "You can delete only your own messages",
      });
    }
    if (message.isDeleted) {
  return res.status(400).json({
    message: "This message is already deleted",
  });
}

    message.text = "This message was deleted";
    message.audioUrl = "";
    message.audioDuration = 0;
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.isFlagged = false;
    message.flagCategory = "None";
    message.flagReason = "";
    message.flagStatus = "None";
    message.reactions = [];

    await message.save();
    await updateChatLastMessage(message.chatId);

    const updatedMessage = await getMessageWithReply(message._id);

    await updateMessageNotificationPreview({
      io: req.app.get("io"),
      message: updatedMessage,
    });

    res.json(updatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const forwardMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { chatId, receiverId } = req.body;

    if (!chatId || !receiverId) {
      return res.status(400).json({ message: "Missing forward fields" });
    }

    const originalMessage = await Message.findById(messageId);

    if (!originalMessage) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (!checkMessageAccess(originalMessage, req.user._id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (originalMessage.isDeleted) {
      return res.status(400).json({ message: "Deleted message cannot be forwarded" });
    }

    const targetChat = await getChatAndCheckMember(chatId, req.user._id);

    if (targetChat === null) {
      return res.status(404).json({ message: "Target chat not found" });
    }

    if (targetChat === false) {
      return res.status(403).json({ message: "Not allowed in target chat" });
    }

    const receiverInChat = targetChat.members.some((memberId) =>
      isSameId(memberId, receiverId)
    );

    if (!receiverInChat) {
      return res.status(400).json({ message: "Receiver is not in target chat" });
    }

    const forwardedMessage = await Message.create({
      chatId,
      senderId: req.user._id,
      receiverId,
      messageType: originalMessage.messageType,
      text: originalMessage.text || "",
      audioUrl: originalMessage.audioUrl || "",
      audioDuration: originalMessage.audioDuration || 0,
      isForwarded: true,
      forwardedFrom: originalMessage._id,
      isViewed: false,
      isEdited: false,
      isDeleted: false,
      isFlagged: false,
      flagCategory: "None",
      flagReason: "",
      flagStatus: "None",
    });

    await Chat.findByIdAndUpdate(chatId, {
      $set: {
        lastMessage:
          originalMessage.messageType === "voice"
            ? "🎤 Voice message"
            : originalMessage.text || "Forwarded message",
      },
      $pull: {
        deletedFor: { $in: [req.user._id, receiverId] },
      },
    });

    const populatedMessage = await getMessageWithReply(forwardedMessage._id);

    await createMessageNotifications({
      io: req.app.get("io"),
      chat: targetChat,
      sender: req.user,
      message: populatedMessage,
    });

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const togglePinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (!checkMessageAccess(message, req.user._id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (isUserInList(message.pinnedBy, req.user._id)) {
      message.pinnedBy = message.pinnedBy.filter(
        (id) => !isSameId(id, req.user._id)
      );
    } else {
      message.pinnedBy.push(req.user._id);
    }

    await message.save();

    const updatedMessage = await getMessageWithReply(message._id);

    res.json(updatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleStarMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (!checkMessageAccess(message, req.user._id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (isUserInList(message.starredBy, req.user._id)) {
      message.starredBy = message.starredBy.filter(
        (id) => !isSameId(id, req.user._id)
      );
    } else {
      message.starredBy.push(req.user._id);
    }

    await message.save();

    const updatedMessage = await getMessageWithReply(message._id);

    res.json(updatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    const allowedEmojis = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

    if (!allowedEmojis.includes(emoji)) {
      return res.status(400).json({ message: "Invalid emoji" });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (!checkMessageAccess(message, req.user._id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (message.isDeleted) {
      return res.status(400).json({ message: "Deleted message cannot be reacted to" });
    }

    const existingReaction = message.reactions.find((reaction) =>
      isSameId(reaction.userId, req.user._id)
    );
    let shouldNotifyReaction = true;

    if (existingReaction) {
      if (existingReaction.emoji === emoji) {
        shouldNotifyReaction = false;
        message.reactions = message.reactions.filter(
          (reaction) => !isSameId(reaction.userId, req.user._id)
        );
      } else {
        existingReaction.emoji = emoji;
        existingReaction.reactedAt = new Date();
      }
    } else {
      message.reactions.push({
        userId: req.user._id,
        emoji,
        reactedAt: new Date(),
      });
    }

    await message.save();

    const updatedMessage = await getMessageWithReply(message._id);

    if (shouldNotifyReaction) {
      await createReactionNotification({
        io: req.app.get("io"),
        message: updatedMessage,
        actor: req.user,
        emoji,
      });
    }

    res.json(updatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const deleteMessageForMe = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (!checkMessageAccess(message, req.user._id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (!isUserInList(message.deletedFor, req.user._id)) {
      message.deletedFor.push(req.user._id);
    }

    await message.save();

    res.json({
      message: "Message deleted for you",
      messageId: message._id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const flagMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { flagCategory, flagReason } = req.body;

    if (!flagCategory || flagCategory === "None") {
      return res.status(400).json({ message: "Flag category is required" });
    }

    const allowedCategories = [
      "Spam",
      "Harassment",
      "Hate Speech",
      "Threat",
      "Scam",
      "Other",
    ];

    if (!allowedCategories.includes(flagCategory)) {
      return res.status(400).json({ message: "Invalid flag category" });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.isDeleted) {
      return res.status(400).json({
        message: "Deleted messages cannot be flagged",
      });
    }

    if (!checkMessageAccess(message, req.user._id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    message.isFlagged = true;
    message.flagCategory = flagCategory;
    message.flagReason = flagReason || "";
    message.flagStatus = "Pending";
    message.flaggedBy = req.user._id;
    message.flaggedAt = new Date();

    await message.save();

    const updatedMessage = await getMessageWithReply(message._id);

    res.json(updatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFlaggedSummary = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const messages = await Message.find({
      $and: [
        {
          $or: [{ senderId: currentUserId }, { receiverId: currentUserId }],
        },
        {
          isFlagged: true,
        },
      ],
    });

    const summary = {
      totalFlagged: messages.length,
      pending: 0,
      reviewed: 0,
      dismissed: 0,
      Spam: 0,
      Harassment: 0,
      "Hate Speech": 0,
      Threat: 0,
      Scam: 0,
      Other: 0,
    };

    messages.forEach((message) => {
      if (message.flagStatus === "Pending") summary.pending += 1;
      if (message.flagStatus === "Reviewed") summary.reviewed += 1;
      if (message.flagStatus === "Dismissed") summary.dismissed += 1;

      if (summary[message.flagCategory] !== undefined) {
        summary[message.flagCategory] += 1;
      }
    });

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFlaggedMessages = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const flaggedMessages = await Message.find({
      $and: [
        {
          $or: [{ senderId: currentUserId }, { receiverId: currentUserId }],
        },
        {
          isFlagged: true,
        },
      ],
    })
      .populate("senderId", "username email")
      .populate("receiverId", "username email")
      .populate("flaggedBy", "username email")
      .sort({ flaggedAt: -1 })
      .limit(100);

    res.json(flaggedMessages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateFlagStatus = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { flagStatus } = req.body;

    const allowedStatuses = ["Pending", "Reviewed", "Dismissed"];

    if (!allowedStatuses.includes(flagStatus)) {
      return res.status(400).json({ message: "Invalid flag status" });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (!checkMessageAccess(message, req.user._id)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    message.flagStatus = flagStatus;
    message.reviewedAt = new Date();

    await message.save();

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendMessage,
  sendVoiceMessage,
  getMessages,
  editMessage,
  deleteMessage,
  deleteMessageForMe,
  forwardMessage,
  togglePinMessage,
  toggleStarMessage,
  reactToMessage,
  flagMessage,
  getFlaggedSummary,
  getFlaggedMessages,
  updateFlagStatus,
};