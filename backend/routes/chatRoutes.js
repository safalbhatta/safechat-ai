const express = require("express");

const {
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
} = require("../controllers/chatController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, createOrGetChat);
router.post("/group", protect, createGroupChat);
router.get("/", protect, getMyChats);

router.patch("/:chatId/toggle-pin", protect, togglePinChat);
router.patch("/:chatId/toggle-mute", protect, toggleMuteChat);
router.patch("/:chatId/toggle-favorite", protect, toggleFavoriteChat);
router.patch("/:chatId/toggle-unread", protect, toggleMarkUnreadChat);
router.patch("/:chatId/mark-read", protect, markChatRead);
router.patch("/:chatId/toggle-block", protect, toggleBlockChat);
router.patch("/:chatId/archive", protect, archiveChat);
router.patch("/:chatId/unarchive", protect, unarchiveChat);
router.patch("/:chatId/clear", protect, clearChat);
router.patch("/:chatId/delete-for-me", protect, deleteChatForMe);
router.patch("/:chatId/exit-group", protect, exitGroupChat);

module.exports = router;