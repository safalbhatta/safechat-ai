const Chat = require("../models/Chat");

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
    }

    res.status(200).json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      members: { $in: [req.user._id] },
    })
      .populate("members", "-password")
      .sort({ updatedAt: -1 });

    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createOrGetChat, getMyChats };