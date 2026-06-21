const Chat = require("../models/Chat");
const Message = require("../models/Message");

const isSameId = (id1, id2) => {
  return id1?.toString() === id2?.toString();
};

const isUserInArray = (array, userId) => {
  return array?.some((id) => isSameId(id, userId));
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

  const unreadQuery = {
    chatId: chat._id,
    receiverId: currentUserId,
    isViewed: false,
  };

  if (clearedAt) {
    unreadQuery.createdAt = { $gt: clearedAt };
  }

  return Message.countDocuments(unreadQuery);
};

const formatChatForUser = async (chat, currentUserId) => {
  const populatedChat = await Chat.findById(chat._id).populate(
    "members",
    "-password"
  );

  if (!populatedChat) {
    return null;
  }

  const unreadCount = await getUnreadCount(populatedChat, currentUserId);

  return {
    ...populatedChat.toObject(),
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

    let chat = await Chat.findOne({
      isGroupChat: false,
      members: { $all: [senderId, receiverId] },
    }).populate("members", "-password");

    if (!chat) {
      chat = await Chat.create({
        members: [senderId, receiverId],
        isGroupChat: false,
      });
    } else {
      chat.deletedFor = chat.deletedFor.filter(
        (userId) => !isSameId(userId, senderId)
      );

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

    const chatsWithUnread = await Promise.all(
      chats.map(async (chat) => {
        const unreadCount = await getUnreadCount(chat, currentUserId);

        return {
          ...chat.toObject(),
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
};