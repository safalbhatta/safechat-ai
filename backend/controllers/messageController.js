const Message = require("../models/Message");
const Chat = require("../models/Chat");
const User = require("../models/User");
const { classifyText } = require("../services/mlService");
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
    .populate("senderId", "name username email profilePic")
    .populate("receiverId", "name username email profilePic")
    .populate("readBy", "name username email profilePic")
    .populate({
      path: "replyTo",
      select:
        "text senderId receiverId isDeleted messageType audioUrl audioDuration predictedCategory isSafetyHidden revealedBy classificationConfidence",
      populate: {
        path: "senderId",
        select: "name username email profilePic",
      },
    })
    .populate("reactions.userId", "name username email profilePic");
};

const SAFETY_LABELS = new Set([
  "spam",
  "abusive",
  "hateful",
]);

const getSafetyCategoryTitle = (category) => {
  switch (category) {
    case "spam":
      return "Possible spam message";
    case "abusive":
      return "Potentially abusive message";
    case "hateful":
      return "Potential hateful content";
    default:
      return "Safety-hidden message";
  }
};

const getMessagePreview = (message) => {
  if (!message) return "";

  if (message.isDeleted) {
    return "This message was deleted";
  }

  if (message.messageType === "voice") {
    return "Voice message";
  }

  if (
    message.isSafetyHidden &&
    SAFETY_LABELS.has(
      message.predictedCategory
    )
  ) {
    return getSafetyCategoryTitle(
      message.predictedCategory
    );
  }

  if (
    message.isForwarded &&
    message.text
  ) {
    return message.text;
  }

  return message.text || "";
};

const getClassificationFields = async (
  text
) => classifyText(text);

const copyClassificationFields = (
  source = {}
) => ({
  predictedCategory:
    source.predictedCategory ||
    "unclassified",
  classificationStatus:
    source.classificationStatus ||
    "unclassified",
  classificationConfidence:
    source.classificationConfidence ?? null,
  classificationProbabilities: {
    normal:
      source.classificationProbabilities
        ?.normal || 0,
    spam:
      source.classificationProbabilities
        ?.spam || 0,
    abusive:
      source.classificationProbabilities
        ?.abusive || 0,
    hateful:
      source.classificationProbabilities
        ?.hateful || 0,
  },
  modelVersion:
    source.modelVersion || "",
  modelName:
    source.modelName || "",
  classificationLatencyMs:
    source.classificationLatencyMs ?? null,
  classifiedAt:
    source.classifiedAt || null,
  classificationError:
    source.classificationError || "",
  isSafetyHidden:
    Boolean(source.isSafetyHidden),
});

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

const checkMessageAccess = async (message, userId) => {
  if (!message || !userId) return false;

  if (
    isSameId(message.senderId?._id || message.senderId, userId) ||
    isSameId(message.receiverId?._id || message.receiverId, userId)
  ) {
    return true;
  }

  const chatId = message.chatId?._id || message.chatId;
  if (!chatId) return false;

  const chat = await Chat.findById(chatId).select("members");
  return Boolean(
    chat?.members?.some((memberId) => isSameId(memberId, userId))
  );
};

const getRecipientIds = (chat, senderId) => {
  return (chat?.members || []).filter(
    (memberId) => !isSameId(memberId, senderId)
  );
};

const markMessagesReadForUser = async ({
  chat,
  currentUserId,
  messageQuery,
}) => {
  await Message.updateMany(
    {
      ...messageQuery,
      senderId: { $ne: currentUserId },
      readBy: { $ne: currentUserId },
    },
    {
      $addToSet: {
        readBy: currentUserId,
      },
    }
  );

  const unreadCandidates = await Message.find({
    ...messageQuery,
    senderId: { $ne: currentUserId },
    isViewed: false,
  }).select("_id senderId readBy");

  const memberIds = (chat.members || []).map((memberId) =>
    memberId.toString()
  );

  const viewedMessageIds = unreadCandidates
    .filter((message) => {
      const senderId = (message.senderId?._id || message.senderId)?.toString();
      const requiredReaders = memberIds.filter(
        (memberId) => memberId !== senderId
      );
      const readByIds = new Set(
        (message.readBy || []).map((readerId) =>
          (readerId?._id || readerId).toString()
        )
      );

      return requiredReaders.every((readerId) => readByIds.has(readerId));
    })
    .map((message) => message._id);

  if (viewedMessageIds.length > 0) {
    await Message.updateMany(
      { _id: { $in: viewedMessageIds } },
      { $set: { isViewed: true } }
    );
  }

  return viewedMessageIds;
};

const sendMessage = async (req, res) => {
  try {
    const { chatId, receiverId, text, replyTo } = req.body;

    if (!chatId || !text || !text.trim()) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const chat = await getChatAndCheckMember(chatId, req.user._id);

    if (chat === null) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (chat === false) {
      return res.status(403).json({ message: "Not allowed" });
    }

    let directReceiverId = null;
    let isInitialMessageRequest = false;

    if (!chat.isGroupChat) {
      if (!receiverId) {
        return res.status(400).json({ message: "Receiver is required" });
      }

      const receiverInChat = chat.members.some((memberId) =>
        isSameId(memberId, receiverId)
      );

      if (!receiverInChat || isSameId(receiverId, req.user._id)) {
        return res
          .status(400)
          .json({ message: "Receiver is not in this chat" });
      }

      directReceiverId = receiverId;

      const currentUser = await User.findById(req.user._id);
      const receiverUser = await User.findById(directReceiverId);

      if (
        currentUser?.blockedContacts?.some((id) =>
          isSameId(id, directReceiverId)
        )
      ) {
        return res.status(403).json({ message: "You have blocked this user" });
      }

      if (
        receiverUser?.blockedContacts?.some((id) =>
          isSameId(id, req.user._id)
        )
      ) {
        return res.status(403).json({
          message: "You cannot send messages to this user",
        });
      }

      if ((chat.requestStatus || "accepted") === "pending") {
        if (!isSameId(chat.initiatedBy, req.user._id)) {
          return res.status(403).json({
            message:
              "Accept this message request before replying to the conversation",
          });
        }

        if (!isSameId(chat.requestRecipient, directReceiverId)) {
          return res.status(400).json({
            message: "Message request recipient does not match this chat",
          });
        }

        const alreadySent =
          chat.requestMessageSent ||
          Boolean(await Message.exists({ chatId: chat._id }));

        if (alreadySent) {
          return res.status(403).json({
            message:
              "Your message request is waiting for the other person to accept it",
          });
        }

        if (replyTo) {
          return res.status(400).json({
            message: "The first message request cannot be a reply",
          });
        }

        isInitialMessageRequest = true;
      }
    }

    if (replyTo) {
      const replyMessage = await Message.findById(replyTo);

      if (
        !replyMessage ||
        !isSameId(replyMessage.chatId, chatId) ||
        !(await checkMessageAccess(replyMessage, req.user._id))
      ) {
        return res.status(400).json({ message: "Invalid reply message" });
      }
    }

    const cleanText = text.trim();
    const classification = await getClassificationFields(
      cleanText
    );

    const message = await Message.create({
      chatId,
      senderId: req.user._id,
      receiverId: chat.isGroupChat ? null : directReceiverId,
      readBy: [req.user._id],
      messageType: "text",
      text: cleanText,
      replyTo: replyTo || null,
      ...classification,
      revealedBy: [],
      isViewed: false,
      isEdited: false,
      isDeleted: false,
      isFlagged: false,
      flagCategory: "None",
      flagReason: "",
      flagStatus: "None",
    });

    const allMemberIds = (chat.members || []).map((memberId) => memberId);
    const chatUpdate = {
      lastMessage: getMessagePreview({
        text: cleanText,
        messageType: "text",
        ...classification,
      }),
    };

    if (isInitialMessageRequest) {
      chatUpdate.requestMessageSent = true;
      chatUpdate.requestSentAt = new Date();
      chat.requestMessageSent = true;
      chat.requestSentAt = chatUpdate.requestSentAt;
    }

    await Chat.findByIdAndUpdate(chatId, {
      $set: chatUpdate,
      $pull: {
        deletedFor: { $in: allMemberIds },
      },
    });

    const populatedMessage = await getMessageWithReply(message._id);

    const io = req.app.get("io");

    await createMessageNotifications({
      io,
      chat,
      sender: req.user,
      message: populatedMessage,
    });

    if (isInitialMessageRequest && io) {
      for (const memberId of chat.members || []) {
        io.to(memberId.toString()).emit("chat:changed", {
          chatId: chat._id.toString(),
          action: "message-request-received",
        });
      }
    }

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendVoiceMessage = async (req, res) => {
  try {
    const { chatId, receiverId, audioDuration } = req.body;

    if (!chatId || !req.file) {
      return res
        .status(400)
        .json({ message: "Missing voice message fields" });
    }

    const chat = await getChatAndCheckMember(chatId, req.user._id);

    if (chat === null) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (chat === false) {
      return res.status(403).json({ message: "Not allowed" });
    }

    let directReceiverId = null;

    if (!chat.isGroupChat) {
      if (!receiverId) {
        return res.status(400).json({ message: "Receiver is required" });
      }

      const receiverInChat = chat.members.some((memberId) =>
        isSameId(memberId, receiverId)
      );

      if (!receiverInChat || isSameId(receiverId, req.user._id)) {
        return res
          .status(400)
          .json({ message: "Receiver is not in this chat" });
      }

      directReceiverId = receiverId;

      const currentUser = await User.findById(req.user._id);
      const receiverUser = await User.findById(directReceiverId);

      if (
        currentUser?.blockedContacts?.some((id) =>
          isSameId(id, directReceiverId)
        )
      ) {
        return res.status(403).json({ message: "You have blocked this user" });
      }

      if (
        receiverUser?.blockedContacts?.some((id) =>
          isSameId(id, req.user._id)
        )
      ) {
        return res.status(403).json({
          message: "You cannot send messages to this user",
        });
      }

      if ((chat.requestStatus || "accepted") === "pending") {
        return res.status(403).json({
          message:
            "Send one text message request first. Voice messages are available after it is accepted",
        });
      }
    }

    const audioUrl = `${req.protocol}://${req.get("host")}/uploads/voices/${
      req.file.filename
    }`;

    const message = await Message.create({
      chatId,
      senderId: req.user._id,
      receiverId: chat.isGroupChat ? null : directReceiverId,
      readBy: [req.user._id],
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

    const allMemberIds = (chat.members || []).map((memberId) => memberId);

    await Chat.findByIdAndUpdate(chatId, {
      $set: {
        lastMessage: "Voice message",
      },
      $pull: {
        deletedFor: { $in: allMemberIds },
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

    const viewedMessageIds = await markMessagesReadForUser({
      chat,
      currentUserId,
      messageQuery,
    });

    const messages = await Message.find(messageQuery)
      .populate("senderId", "name username email profilePic")
      .populate("receiverId", "name username email profilePic")
      .populate("readBy", "name username email profilePic")
      .populate({
        path: "replyTo",
        select:
          "text senderId receiverId isDeleted messageType audioUrl audioDuration predictedCategory isSafetyHidden revealedBy classificationConfidence",
        populate: {
          path: "senderId",
          select: "name username email profilePic",
        },
      })
      .populate("reactions.userId", "name username email profilePic")
      .sort({
        createdAt: 1,
      });

    const io = req.app.get("io");
    if (io && viewedMessageIds.length > 0) {
      for (const memberId of chat.members || []) {
        if (isSameId(memberId, currentUserId)) continue;

        io.to(memberId.toString()).emit("messagesSeen", {
          chatId: chat._id.toString(),
          readerId: currentUserId.toString(),
          viewedMessageIds: viewedMessageIds.map((id) => id.toString()),
        });
      }
    }

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

    const cleanText = text.trim();
    const classification =
      await getClassificationFields(
        cleanText
      );

    message.text = cleanText;
    message.isEdited = true;
    message.editedAt = new Date();
    message.predictedCategory =
      classification.predictedCategory;
    message.classificationStatus =
      classification.classificationStatus;
    message.classificationConfidence =
      classification.classificationConfidence;
    message.classificationProbabilities =
      classification.classificationProbabilities;
    message.modelVersion =
      classification.modelVersion;
    message.modelName =
      classification.modelName;
    message.classificationLatencyMs =
      classification.classificationLatencyMs;
    message.classifiedAt =
      classification.classifiedAt;
    message.classificationError =
      classification.classificationError;
    message.isSafetyHidden =
      classification.isSafetyHidden;
    message.revealedBy = [];

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
    message.isSafetyHidden = false;
    message.revealedBy = [];

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

    if (!chatId) {
      return res.status(400).json({ message: "Missing forward fields" });
    }

    const originalMessage = await Message.findById(messageId);

    if (!originalMessage) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (!(await checkMessageAccess(originalMessage, req.user._id))) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (originalMessage.isDeleted) {
      return res
        .status(400)
        .json({ message: "Deleted message cannot be forwarded" });
    }

    const targetChat = await getChatAndCheckMember(chatId, req.user._id);

    if (targetChat === null) {
      return res.status(404).json({ message: "Target chat not found" });
    }

    if (targetChat === false) {
      return res.status(403).json({ message: "Not allowed in target chat" });
    }

    let directReceiverId = null;

    if (!targetChat.isGroupChat) {
      if (!receiverId) {
        return res.status(400).json({ message: "Receiver is required" });
      }

      const receiverInChat = targetChat.members.some((memberId) =>
        isSameId(memberId, receiverId)
      );

      if (!receiverInChat || isSameId(receiverId, req.user._id)) {
        return res
          .status(400)
          .json({ message: "Receiver is not in target chat" });
      }

      directReceiverId = receiverId;

      if ((targetChat.requestStatus || "accepted") === "pending") {
        return res.status(403).json({
          message:
            "Messages cannot be forwarded until the message request is accepted",
        });
      }
    }

    const classification =
      originalMessage.messageType === "text" &&
      originalMessage.classificationStatus ===
        "classified"
        ? copyClassificationFields(
            originalMessage
          )
        : originalMessage.messageType ===
          "text"
        ? await getClassificationFields(
            originalMessage.text || ""
          )
        : copyClassificationFields();

    const forwardedMessage = await Message.create({
      chatId,
      senderId: req.user._id,
      receiverId: targetChat.isGroupChat ? null : directReceiverId,
      readBy: [req.user._id],
      messageType: originalMessage.messageType,
      text: originalMessage.text || "",
      audioUrl: originalMessage.audioUrl || "",
      audioDuration: originalMessage.audioDuration || 0,
      isForwarded: true,
      forwardedFrom: originalMessage._id,
      ...classification,
      revealedBy: [],
      isViewed: false,
      isEdited: false,
      isDeleted: false,
      isFlagged: false,
      flagCategory: "None",
      flagReason: "",
      flagStatus: "None",
    });

    const allMemberIds = (targetChat.members || []).map(
      (memberId) => memberId
    );

    await Chat.findByIdAndUpdate(chatId, {
      $set: {
        lastMessage:
          originalMessage.messageType ===
          "voice"
            ? "Voice message"
            : getMessagePreview({
                text:
                  originalMessage.text ||
                  "Forwarded message",
                messageType: "text",
                ...classification,
              }),
      },
      $pull: {
        deletedFor: { $in: allMemberIds },
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

    if (!(await checkMessageAccess(message, req.user._id))) {
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

    if (!(await checkMessageAccess(message, req.user._id))) {
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

    if (!(await checkMessageAccess(message, req.user._id))) {
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

    if (!(await checkMessageAccess(message, req.user._id))) {
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

    if (!(await checkMessageAccess(message, req.user._id))) {
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

const revealSafetyMessage = async (
  req,
  res
) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(
      messageId
    );

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    if (
      !(await checkMessageAccess(
        message,
        req.user._id
      ))
    ) {
      return res.status(403).json({
        message: "Not allowed",
      });
    }

    if (
      isSameId(
        message.senderId,
        req.user._id
      )
    ) {
      return res.json(
        await getMessageWithReply(
          message._id
        )
      );
    }

    if (
      !isUserInList(
        message.revealedBy,
        req.user._id
      )
    ) {
      message.revealedBy.push(
        req.user._id
      );
      await message.save();
    }

    const updatedMessage =
      await getMessageWithReply(
        message._id
      );

    res.json(updatedMessage);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getFlaggedSummary = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const accessibleChatIds = await Chat.find({
      members: currentUserId,
    }).distinct("_id");

    const messages = await Message.find({
      chatId: { $in: accessibleChatIds },
      isFlagged: true,
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

    const accessibleChatIds = await Chat.find({
      members: currentUserId,
    }).distinct("_id");

    const flaggedMessages = await Message.find({
      chatId: { $in: accessibleChatIds },
      isFlagged: true,
    })
      .populate("chatId", "isGroupChat groupName members")
      .populate("senderId", "name username email profilePic")
      .populate("receiverId", "name username email profilePic")
      .populate("flaggedBy", "name username email profilePic")
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

    if (!(await checkMessageAccess(message, req.user._id))) {
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
  revealSafetyMessage,
  flagMessage,
  getFlaggedSummary,
  getFlaggedMessages,
  updateFlagStatus,
};
