const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();
const path = require("path");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const Chat = require("./models/Chat");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("SafeChat AI backend is running");
});
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/analytics", analyticsRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

const onlineUsers = new Map();
const activeChats = new Map();
io.activeChats = activeChats;

const emitOnlineUsers = () => {
  io.emit("getOnlineUsers", Array.from(onlineUsers.keys()));
};

const addOnlineSocket = (userId, socketId) => {
  const key = userId.toString();
  const sockets = onlineUsers.get(key) || new Set();
  sockets.add(socketId);
  onlineUsers.set(key, sockets);
};

const removeOnlineSocket = (userId, socketId) => {
  if (!userId) return;

  const key = userId.toString();
  const sockets = onlineUsers.get(key);

  if (!sockets) return;

  sockets.delete(socketId);

  if (sockets.size === 0) {
    onlineUsers.delete(key);
  } else {
    onlineUsers.set(key, sockets);
  }
};

const emitToChatMembers = async ({
  chatId,
  event,
  payload,
  excludeUserId = null,
}) => {
  if (!chatId) return;

  const chat = await Chat.findById(chatId).select("members");
  if (!chat) return;

  for (const memberId of chat.members || []) {
    if (
      excludeUserId &&
      memberId.toString() === excludeUserId.toString()
    ) {
      continue;
    }

    io.to(memberId.toString()).emit(event, payload);
  }
};

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("addUser", (userId) => {
    if (!userId) return;

    if (socket.data.userId && socket.data.userId !== userId.toString()) {
      removeOnlineSocket(socket.data.userId, socket.id);
      socket.leave(socket.data.userId);
    }

    socket.data.userId = userId.toString();
    socket.join(socket.data.userId);
    addOnlineSocket(socket.data.userId, socket.id);
    emitOnlineUsers();
  });

  socket.on("activeChat", async ({ userId, chatId }) => {
    if (!userId || !chatId) return;
    if (socket.data.userId && socket.data.userId !== userId.toString()) return;

    const chat = await Chat.findOne({
      _id: chatId,
      members: userId,
    }).select("_id");

    if (!chat) return;

    const previous = activeChats.get(socket.id);

    if (previous?.chatId && previous.chatId !== chatId.toString()) {
      socket.leave(`chat:${previous.chatId}`);
    }

    activeChats.set(socket.id, {
      userId: userId.toString(),
      chatId: chatId.toString(),
    });

    socket.join(`chat:${chatId}`);
  });

  socket.on("leaveChat", ({ chatId } = {}) => {
    const current = activeChats.get(socket.id);
    const roomChatId = chatId || current?.chatId;

    if (roomChatId) {
      socket.leave(`chat:${roomChatId}`);
    }

    activeChats.delete(socket.id);
  });

  socket.on("sendMessage", async ({ chatId, message }) => {
    try {
      const resolvedChatId = chatId || message?.chatId?._id || message?.chatId;
      const senderId =
        socket.data.userId ||
        message?.senderId?._id ||
        message?.senderId;

      if (!resolvedChatId || !senderId || !message) return;

      const senderIsMember = await Chat.exists({
        _id: resolvedChatId,
        members: senderId,
      });

      if (!senderIsMember) return;

      await emitToChatMembers({
        chatId: resolvedChatId,
        event: "receiveMessage",
        payload: message,
        excludeUserId: senderId,
      });
    } catch (error) {
      console.error("Socket sendMessage failed:", error.message);
    }
  });

  socket.on("messageUpdated", async ({ chatId, message }) => {
    try {
      const resolvedChatId = chatId || message?.chatId?._id || message?.chatId;
      const actorId = socket.data.userId;

      if (!resolvedChatId || !actorId || !message) return;

      const actorIsMember = await Chat.exists({
        _id: resolvedChatId,
        members: actorId,
      });

      if (!actorIsMember) return;

      await emitToChatMembers({
        chatId: resolvedChatId,
        event: "messageUpdated",
        payload: message,
        excludeUserId: actorId,
      });
    } catch (error) {
      console.error("Socket messageUpdated failed:", error.message);
    }
  });

  socket.on("messagesSeen", async ({ chatId, viewedMessageIds = [] }) => {
    try {
      const readerId = socket.data.userId;
      if (!chatId || !readerId) return;

      await emitToChatMembers({
        chatId,
        event: "messagesSeen",
        payload: {
          chatId,
          readerId,
          viewedMessageIds,
        },
        excludeUserId: readerId,
      });
    } catch (error) {
      console.error("Socket messagesSeen failed:", error.message);
    }
  });

  socket.on("typing", ({ senderId, senderName, chatId }) => {
    if (!chatId || !senderId) return;
    if (socket.data.userId && socket.data.userId !== senderId.toString()) return;

    socket.to(`chat:${chatId}`).emit("typing", {
      senderId,
      senderName,
      chatId,
    });
  });

  socket.on("stopTyping", ({ senderId, chatId }) => {
    if (!chatId || !senderId) return;
    if (socket.data.userId && socket.data.userId !== senderId.toString()) return;

    socket.to(`chat:${chatId}`).emit("stopTyping", {
      senderId,
      chatId,
    });
  });

  socket.on("disconnect", () => {
    const active = activeChats.get(socket.id);

    if (active?.chatId) {
      socket.leave(`chat:${active.chatId}`);
    }

    activeChats.delete(socket.id);
    removeOnlineSocket(socket.data.userId, socket.id);
    emitOnlineUsers();

    console.log("Socket disconnected:", socket.id);
  });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((error) => console.error("MongoDB connection failed:", error.message));

const PORT = process.env.PORT || 5002;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
