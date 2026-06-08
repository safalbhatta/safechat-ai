const Message = require("../models/Message");
const Chat = require("../models/Chat");

const classifyMessage = (text) => {
  const lowerText = text.toLowerCase();

  const spamWords = ["win", "free", "prize", "offer", "click", "money"];
  const abusiveWords = ["stupid", "idiot", "fool"];
  const hatefulWords = ["hate", "kill"];

  if (spamWords.some((word) => lowerText.includes(word))) return "Spam";
  if (abusiveWords.some((word) => lowerText.includes(word))) return "Abusive";
  if (hatefulWords.some((word) => lowerText.includes(word))) return "Hateful";

  return "Normal";
};

const sendMessage = async (req, res) => {
  try {
    const { chatId, receiverId, text } = req.body;

    if (!chatId || !receiverId || !text) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const category = classifyMessage(text);

    const message = await Message.create({
      chatId,
      senderId: req.user._id,
      receiverId,
      text,
      category,
      isViewed: false,
    });

    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: text,
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const currentUserId = req.user._id;

    await Message.updateMany(
      {
        chatId,
        receiverId: currentUserId,
        isViewed: false,
      },
      {
        isViewed: true,
      }
    );

    const messages = await Message.find({ chatId }).sort({
      createdAt: 1,
    });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { sendMessage, getMessages };