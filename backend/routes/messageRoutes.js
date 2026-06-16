const express = require("express");
const router = express.Router();
const {
  sendMessage,
  sendVoiceMessage,
  getMessages,
  editMessage,
  deleteMessage,
  flagMessage,
  getFlaggedSummary,
  getFlaggedMessages,
  updateFlagStatus,
} = require("../controllers/messageController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// All message routes are protected, so we apply the middleware to all
router.use(protect);

router.route("/").post(sendMessage);

router.route("/voice").post(upload.single("audio"), sendVoiceMessage);

router.route("/flagged/summary").get(getFlaggedSummary);
router.route("/flagged").get(getFlaggedMessages);

router.route("/:chatId").get(getMessages);

router.route("/:messageId").put(editMessage).delete(deleteMessage);

router.route("/:messageId/flag").post(flagMessage);
router.route("/:messageId/flag-status").put(updateFlagStatus);

module.exports = router;
