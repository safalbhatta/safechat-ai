const express = require("express");

const {
  sendMessage,
  getMessages,
  editMessage,
  deleteMessage,
  flagMessage,
  getFlaggedSummary,
  getFlaggedMessages,
  updateFlagStatus,
} = require("../controllers/messageController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, sendMessage);

router.get("/flags/summary", protect, getFlaggedSummary);
router.get("/flags/list", protect, getFlaggedMessages);

router.patch("/:messageId/edit", protect, editMessage);
router.patch("/:messageId/delete", protect, deleteMessage);
router.patch("/:messageId/flag", protect, flagMessage);
router.patch("/:messageId/flag-status", protect, updateFlagStatus);

router.get("/:chatId", protect, getMessages);

module.exports = router;