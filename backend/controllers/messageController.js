const Message = require("../models/Message");
const Chat = require("../models/Chat");

const getMessageWithReply = async (messageId) => {
  return Message.findById(messageId).populate({
    path: "replyTo",
    select: "text senderId isDeleted",
  });
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
   lastMessage: latestMessage.isDeleted
  ? "This message was deleted"
  : latestMessage.messageType === "voice"
  ? "🎤 Voice message"
  : latestMessage.text,
  });
};

const sendMessage = async (req, res) => {
  try {
    const { chatId, receiverId, text, replyTo } = req.body;

    if (!chatId || !receiverId || !text) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const message = await Message.create({
      chatId,
      senderId: req.user._id,
      receiverId,
      messageType: "text",
      text,
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
        lastMessage: text,
      },
      $pull: {
        deletedFor: { $in: [req.user._id, receiverId] },
      },
    });

    const populatedMessage = await getMessageWithReply(message._id);

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

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const isMember = chat.members.some(
      (memberId) => memberId.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: "Not allowed" });
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

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getMessages = async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const currentUserId = req.user._id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const isMember = chat.members.some(
      (memberId) => memberId.toString() === currentUserId.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const clearedEntry = chat.clearedFor?.find(
      (entry) => entry.userId.toString() === currentUserId.toString()
    );

    const messageQuery = {
      chatId,
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
        select: "text senderId isDeleted",
      })
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

    if (message.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You can edit only your own messages",
      });
    }

    if (message.isDeleted) {
      return res.status(400).json({
        message: "Deleted messages cannot be edited",
      });
    }

    message.text = text.trim();
    message.isEdited = true;
    message.editedAt = new Date();

    await message.save();
    await updateChatLastMessage(message.chatId);

    const updatedMessage = await getMessageWithReply(message._id);

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

    if (message.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You can delete only your own messages",
      });
    }

    message.text = "This message was deleted";
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.isFlagged = false;
    message.flagCategory = "None";
    message.flagReason = "";
    message.flagStatus = "None";

    await message.save();
    await updateChatLastMessage(message.chatId);

    const updatedMessage = await getMessageWithReply(message._id);

    res.json(updatedMessage);
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

    const currentUserId = req.user._id.toString();

    const isSender = message.senderId.toString() === currentUserId;
    const isReceiver = message.receiverId.toString() === currentUserId;

    if (!isSender && !isReceiver) {
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

    const currentUserId = req.user._id.toString();

    const isSender = message.senderId.toString() === currentUserId;
    const isReceiver = message.receiverId.toString() === currentUserId;

    if (!isSender && !isReceiver) {
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
  flagMessage,
  getFlaggedSummary,
  getFlaggedMessages,
  updateFlagStatus,
};