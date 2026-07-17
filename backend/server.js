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

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("addUser", (userId) => {
    socket.join(userId);
    onlineUsers.set(userId, socket.id);
    io.emit("getOnlineUsers", Array.from(onlineUsers.keys()));
    console.log("Online users:", onlineUsers);
  });

  socket.on("activeChat", ({ userId, chatId }) => {
    if (!userId || !chatId) return;
    activeChats.set(socket.id, { userId: userId.toString(), chatId: chatId.toString() });
  });

  socket.on("leaveChat", () => {
    activeChats.delete(socket.id);
  });

  socket.on("sendMessage", ({ receiverId, message }) => {
    const receiverSocketId = onlineUsers.get(receiverId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("receiveMessage", message);
    }
  });

  socket.on("messageUpdated", ({ receiverId, message }) => {
    const receiverSocketId = onlineUsers.get(receiverId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageUpdated", message);
    }
  });

  socket.on("messagesSeen", ({ receiverId, chatId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messagesSeen", { chatId });
    }
  });

  socket.on("typing", ({ receiverId, senderId, senderName, chatId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", { senderId, senderName, chatId });
    }
  });

  socket.on("stopTyping", ({ receiverId, senderId, chatId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("stopTyping", { senderId, chatId });
    }
  });

  socket.on("disconnect", () => {
    activeChats.delete(socket.id);
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }

    io.emit("getOnlineUsers", Array.from(onlineUsers.keys()));
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
