const Chat = require("../models/Chat");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const User = require("../models/User");
const {
  createNotification,
  emitUnreadCount,
} = require("../services/notificationService");

const isSameId = (id1, id2) => {
  return id1?.toString() === id2?.toString();
};

const isUserInArray = (array, userId) => {
  return array?.some((id) => isSameId(id, userId));
};

const isMutualFriend = (userA, userB) => {
  return (
    isUserInArray(userA?.friends, userB?._id) &&
    isUserInArray(userB?.friends, userA?._id)
  );
};

const uniqueIds = (ids = []) => {
  const seen = new Set();

  return ids.filter((id) => {
    const value = id?.toString();

    if (!value || seen.has(value)) {
      return false;
    }

    seen.add(value);
    return true;
  });
};

const getClearDateForUser = (chat, userId) => {
  const clearEntry = chat.clearedFor?.find((entry) =>
    isSameId(entry.userId, userId)
  );

  return clearEntry?.clearedAt || null;
};

const getUnreadCount = async (chat, currentUserId) => {
  const clearedAt = getClearDateForUser(chat, currentUserId);

  const unreadQuery = chat.isGroupChat
    ? {
        chatId: chat._id,
        senderId: { $ne: currentUserId },
        readBy: { $ne: currentUserId },
        deletedFor: { $ne: currentUserId },
      }
    : {
        chatId: chat._id,
        receiverId: currentUserId,
        isViewed: false,
        deletedFor: { $ne: currentUserId },
      };

  if (clearedAt) {
    unreadQuery.createdAt = { $gt: clearedAt };
  }

  return Message.countDocuments(unreadQuery);
};

const formatChatForUser = async (chat, currentUserId) => {
  const populatedChat = await Chat.findById(chat._id)
    .populate("members", "-password")
    .populate("groupAdmin", "-password");

  if (!populatedChat) {
    return null;
  }

  const unreadCount = await getUnreadCount(populatedChat, currentUserId);
  const requestStatus = populatedChat.isGroupChat
    ? "accepted"
    : populatedChat.requestStatus || "accepted";
  const isMessageRequest = requestStatus === "pending";

  return {
    ...populatedChat.toObject(),
    requestStatus,
    isMessageRequest,
    isIncomingMessageRequest:
      isMessageRequest &&
      isSameId(populatedChat.requestRecipient, currentUserId),
    isOutgoingMessageRequest:
      isMessageRequest &&
      isSameId(populatedChat.initiatedBy, currentUserId),
    unreadCount,
    isPinned: isUserInArray(populatedChat.pinnedBy, currentUserId),
    isMuted: isUserInArray(populatedChat.mutedBy, currentUserId),
    isArchived: isUserInArray(populatedChat.archivedBy, currentUserId),
    isFavorite: isUserInArray(populatedChat.favoriteBy, currentUserId),
    isUnreadMarked: isUserInArray(populatedChat.unreadMarkedBy, currentUserId),
    isBlocked: isUserInArray(populatedChat.blockedBy, currentUserId),
  };
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

const createOrGetChat = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user._id;

    if (!receiverId) {
      return res.status(400).json({ message: "Receiver is required" });
    }

    if (isSameId(receiverId, senderId)) {
      return res.status(400).json({ message: "You cannot chat with yourself" });
    }

    const [sender, receiver] = await Promise.all([
      User.findById(senderId).select("friends blockedContacts"),
      User.findById(receiverId).select("friends blockedContacts"),
    ]);

    if (!receiver) {
      return res.status(404).json({ message: "User not found" });
    }

    if (
      isUserInArray(sender?.blockedContacts, receiverId) ||
      isUserInArray(receiver?.blockedContacts, senderId)
    ) {
      return res.status(403).json({
        message: "This conversation cannot be started because one user is blocked",
      });
    }

    let chat = await Chat.findOne({
      isGroupChat: false,
      members: { $all: [senderId, receiverId], $size: 2 },
    }).populate("members", "-password");

    if (!chat) {
      const friends = isMutualFriend(sender, receiver);

      chat = await Chat.create({
        members: [senderId, receiverId],
        isGroupChat: false,
        requestStatus: friends ? "accepted" : "pending",
        initiatedBy: friends ? null : senderId,
        requestRecipient: friends ? null : receiverId,
        requestMessageSent: false,
      });
    } else {
      chat.deletedFor = chat.deletedFor.filter(
        (userId) => !isSameId(userId, senderId)
      );

      // Keep old direct chats working. Only newly created non-friend chats
      // use the pending request flow.
      if (!chat.requestStatus) {
        chat.requestStatus = "accepted";
      }

      await chat.save();
    }

    const formattedChat = await formatChatForUser(chat, senderId);

    res.status(200).json(formattedChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createGroupChat = async (req, res) => {
  try {
    const { groupName, memberIds } = req.body;
    const currentUserId = req.user._id;

    if (!groupName || !groupName.trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ message: "Select at least one member" });
    }

    const members = uniqueIds([currentUserId, ...memberIds]);

    if (members.length < 2) {
      return res
        .status(400)
        .json({ message: "A group needs at least two members" });
    }

    const chat = await Chat.create({
      members,
      isGroupChat: true,
      groupName: groupName.trim(),
      groupAdmin: currentUserId,
      lastMessage: "Group created",
    });

    const formattedChat = await formatChatForUser(chat, currentUserId);
    const io = req.app.get("io");
    const creatorName =
      req.user.name || req.user.username || req.user.email || "Someone";

    for (const memberId of members) {
      if (isSameId(memberId, currentUserId)) continue;

      await createNotification({
        io,
        recipientId: memberId,
        actorId: currentUserId,
        type: "system",
        title: groupName.trim(),
        body: `${creatorName} added you to this group`,
        chatId: chat._id,
        metadata: {
          action: "added_to_group",
          isGroupChat: true,
          groupName: groupName.trim(),
        },
      });

      if (io) {
        io.to(memberId.toString()).emit("chat:changed", {
          chatId: chat._id.toString(),
          action: "group-created",
        });
      }
    }

    res.status(201).json(formattedChat);
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

    const visibleChats = chats.filter((chat) => {
      if (chat.isGroupChat || (chat.requestStatus || "accepted") !== "pending") {
        return true;
      }

      if (isSameId(chat.initiatedBy, currentUserId)) {
        return true;
      }

      return (
        isSameId(chat.requestRecipient, currentUserId) &&
        Boolean(chat.requestMessageSent)
      );
    });

    const chatsWithUnread = await Promise.all(
      visibleChats.map(async (chat) => {
        const unreadCount = await getUnreadCount(chat, currentUserId);
        const requestStatus = chat.isGroupChat
          ? "accepted"
          : chat.requestStatus || "accepted";
        const isMessageRequest = requestStatus === "pending";

        return {
          ...chat.toObject(),
          requestStatus,
          isMessageRequest,
          isIncomingMessageRequest:
            isMessageRequest &&
            isSameId(chat.requestRecipient, currentUserId),
          isOutgoingMessageRequest:
            isMessageRequest &&
            isSameId(chat.initiatedBy, currentUserId),
          unreadCount,
          isPinned: isUserInArray(chat.pinnedBy, currentUserId),
          isMuted: isUserInArray(chat.mutedBy, currentUserId),
          isArchived: isUserInArray(chat.archivedBy, currentUserId),
          isFavorite: isUserInArray(chat.favoriteBy, currentUserId),
          isUnreadMarked: isUserInArray(chat.unreadMarkedBy, currentUserId),
          isBlocked: isUserInArray(chat.blockedBy, currentUserId),
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

const togglePinChat = async (req, res) => {
  try {
    const chat = await getChatAndCheckMember(req.params.chatId, req.user._id);

    if (chat === null) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (chat === false) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (isUserInArray(chat.pinnedBy, req.user._id)) {
      chat.pinnedBy = chat.pinnedBy.filter((id) => !isSameId(id, req.user._id));
    } else {
      chat.pinnedBy.push(req.user._id);
    }

    await chat.save();

    const updatedChat = await formatChatForUser(chat, req.user._id);

    res.json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleMuteChat = async (req, res) => {
  try {
    const chat = await getChatAndCheckMember(req.params.chatId, req.user._id);

    if (chat === null) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (chat === false) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (isUserInArray(chat.mutedBy, req.user._id)) {
      chat.mutedBy = chat.mutedBy.filter((id) => !isSameId(id, req.user._id));
    } else {
      chat.mutedBy.push(req.user._id);
    }

    await chat.save();

    const updatedChat = await formatChatForUser(chat, req.user._id);

    res.json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleFavoriteChat = async (req, res) => {
  try {
    const chat = await getChatAndCheckMember(req.params.chatId, req.user._id);

    if (chat === null) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (chat === false) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (isUserInArray(chat.favoriteBy, req.user._id)) {
      chat.favoriteBy = chat.favoriteBy.filter(
        (id) => !isSameId(id, req.user._id)
      );
    } else {
      chat.favoriteBy.push(req.user._id);
    }

    await chat.save();

    const updatedChat = await formatChatForUser(chat, req.user._id);

    res.json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleMarkUnreadChat = async (req, res) => {
  try {
    const chat = await getChatAndCheckMember(req.params.chatId, req.user._id);

    if (chat === null) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (chat === false) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (isUserInArray(chat.unreadMarkedBy, req.user._id)) {
      chat.unreadMarkedBy = chat.unreadMarkedBy.filter(
        (id) => !isSameId(id, req.user._id)
      );
    } else {
      chat.unreadMarkedBy.push(req.user._id);
    }

    await chat.save();

    const updatedChat = await formatChatForUser(chat, req.user._id);

    res.json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markChatRead = async (req, res) => {
  try {
    const chat = await getChatAndCheckMember(req.params.chatId, req.user._id);

    if (chat === null) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (chat === false) {
      return res.status(403).json({ message: "Not allowed" });
    }

    chat.unreadMarkedBy = chat.unreadMarkedBy.filter(
      (id) => !isSameId(id, req.user._id)
    );

    await chat.save();

    const updatedChat = await formatChatForUser(chat, req.user._id);

    res.json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleBlockChat = async (req, res) => {
  try {
    const chat = await getChatAndCheckMember(req.params.chatId, req.user._id);

    if (chat === null) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (chat === false) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (chat.isGroupChat) {
      return res.status(400).json({ message: "Groups cannot be blocked here" });
    }

    if (isUserInArray(chat.blockedBy, req.user._id)) {
      chat.blockedBy = chat.blockedBy.filter((id) =>
        !isSameId(id, req.user._id)
      );
    } else {
      chat.blockedBy.push(req.user._id);
    }

    await chat.save();

    const updatedChat = await formatChatForUser(chat, req.user._id);

    res.json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const archiveChat = async (req, res) => {
  try {
    const chat = await getChatAndCheckMember(req.params.chatId, req.user._id);

    if (chat === null) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (chat === false) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (!isUserInArray(chat.archivedBy, req.user._id)) {
      chat.archivedBy.push(req.user._id);
    }

    await chat.save();

    const updatedChat = await formatChatForUser(chat, req.user._id);

    res.json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const unarchiveChat = async (req, res) => {
  try {
    const chat = await getChatAndCheckMember(req.params.chatId, req.user._id);

    if (chat === null) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (chat === false) {
      return res.status(403).json({ message: "Not allowed" });
    }

    chat.archivedBy = chat.archivedBy.filter(
      (id) => !isSameId(id, req.user._id)
    );

    await chat.save();

    const updatedChat = await formatChatForUser(chat, req.user._id);

    res.json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const clearChat = async (req, res) => {
  try {
    const chat = await getChatAndCheckMember(req.params.chatId, req.user._id);

    if (chat === null) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (chat === false) {
      return res.status(403).json({ message: "Not allowed" });
    }

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

    const updatedChat = await formatChatForUser(chat, req.user._id);

    res.json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteChatForMe = async (req, res) => {
  try {
    const chat = await getChatAndCheckMember(req.params.chatId, req.user._id);

    if (chat === null) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (chat === false) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (!isUserInArray(chat.deletedFor, req.user._id)) {
      chat.deletedFor.push(req.user._id);
    }

    chat.archivedBy = chat.archivedBy.filter(
      (id) => !isSameId(id, req.user._id)
    );

    chat.pinnedBy = chat.pinnedBy.filter((id) => !isSameId(id, req.user._id));
    chat.favoriteBy = chat.favoriteBy.filter((id) =>
      !isSameId(id, req.user._id)
    );
    chat.unreadMarkedBy = chat.unreadMarkedBy.filter(
      (id) => !isSameId(id, req.user._id)
    );

    await chat.save();

    res.json({ message: "Chat deleted for you", chatId: chat._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const exitGroupChat = async (req, res) => {
  try {
    const chat = await getChatAndCheckMember(req.params.chatId, req.user._id);

    if (chat === null) {
      return res.status(404).json({ message: "Group not found" });
    }

    if (chat === false) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (!chat.isGroupChat) {
      return res.status(400).json({ message: "This is not a group chat" });
    }

    chat.members = chat.members.filter((id) => !isSameId(id, req.user._id));
    chat.pinnedBy = chat.pinnedBy.filter((id) => !isSameId(id, req.user._id));
    chat.mutedBy = chat.mutedBy.filter((id) => !isSameId(id, req.user._id));
    chat.archivedBy = chat.archivedBy.filter((id) =>
      !isSameId(id, req.user._id)
    );
    chat.favoriteBy = chat.favoriteBy.filter((id) =>
      !isSameId(id, req.user._id)
    );
    chat.unreadMarkedBy = chat.unreadMarkedBy.filter(
      (id) => !isSameId(id, req.user._id)
    );

    if (isSameId(chat.groupAdmin, req.user._id)) {
      chat.groupAdmin = chat.members[0] || null;
    }

    await chat.save();

    res.json({ message: "Exited group", chatId: chat._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const acceptMessageRequest = async (req, res) => {
  try {
    const chat = await getChatAndCheckMember(req.params.chatId, req.user._id);

    if (chat === null) {
      return res.status(404).json({ message: "Message request not found" });
    }

    if (chat === false) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (chat.isGroupChat || (chat.requestStatus || "accepted") !== "pending") {
      return res.status(400).json({ message: "This chat is not a pending message request" });
    }

    if (!isSameId(chat.requestRecipient, req.user._id)) {
      return res.status(403).json({
        message: "Only the person who received the request can accept it",
      });
    }

    if (!chat.requestMessageSent) {
      return res.status(400).json({ message: "No message has been sent yet" });
    }

    chat.requestStatus = "accepted";
    chat.requestAcceptedAt = new Date();
    chat.deletedFor = [];
    await chat.save();

    const updatedChat = await formatChatForUser(chat, req.user._id);
    const io = req.app.get("io");

    for (const memberId of chat.members || []) {
      if (io) {
        io.to(memberId.toString()).emit("chat:changed", {
          chatId: chat._id.toString(),
          action: "message-request-accepted",
        });
      }
    }

    res.json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteMessageRequest = async (req, res) => {
  try {
    const chat = await getChatAndCheckMember(req.params.chatId, req.user._id);

    if (chat === null) {
      return res.status(404).json({ message: "Message request not found" });
    }

    if (chat === false) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (chat.isGroupChat || (chat.requestStatus || "accepted") !== "pending") {
      return res.status(400).json({ message: "This chat is not a pending message request" });
    }

    const canDelete =
      isSameId(chat.requestRecipient, req.user._id) ||
      isSameId(chat.initiatedBy, req.user._id);

    if (!canDelete) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const chatId = chat._id;
    const memberIds = [...(chat.members || [])];

    await Promise.all([
      Message.deleteMany({ chatId }),
      Notification.deleteMany({ chatId }),
      Chat.deleteOne({ _id: chatId }),
    ]);

    const io = req.app.get("io");

    for (const memberId of memberIds) {
      if (io) {
        io.to(memberId.toString()).emit("chat:changed", {
          chatId: chatId.toString(),
          action: "message-request-deleted",
        });
        await emitUnreadCount(io, memberId);
      }
    }

    res.json({
      message: "Message request deleted",
      chatId,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrGetChat,
  createGroupChat,
  getMyChats,
  togglePinChat,
  toggleMuteChat,
  toggleFavoriteChat,
  toggleMarkUnreadChat,
  markChatRead,
  toggleBlockChat,
  archiveChat,
  unarchiveChat,
  clearChat,
  deleteChatForMe,
  exitGroupChat,
  acceptMessageRequest,
  deleteMessageRequest,
};
