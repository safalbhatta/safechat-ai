const express = require("express");

const {
  createOrGetChat,
  getMyChats,
  togglePinChat,
  toggleMuteChat,
  archiveChat,
  unarchiveChat,
  clearChat,
  deleteChatForMe,
} = require("../controllers/chatController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, createOrGetChat);
router.get("/", protect, getMyChats);

router.patch("/:chatId/toggle-pin", protect, togglePinChat);
router.patch("/:chatId/toggle-mute", protect, toggleMuteChat);
router.patch("/:chatId/archive", protect, archiveChat);
router.patch("/:chatId/unarchive", protect, unarchiveChat);
router.patch("/:chatId/clear", protect, clearChat);
router.patch("/:chatId/delete-for-me", protect, deleteChatForMe);

module.exports = router;