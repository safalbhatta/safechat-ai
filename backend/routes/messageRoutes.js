const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

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

const router = express.Router();

const voiceUploadDir = path.join(__dirname, "..", "uploads", "voices");

fs.mkdirSync(voiceUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, voiceUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".webm";
    cb(null, `voice-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed"));
    }
  },
});

router.post("/", protect, sendMessage);
router.post("/voice", protect, upload.single("audio"), sendVoiceMessage);

router.get("/flags/summary", protect, getFlaggedSummary);
router.get("/flags/list", protect, getFlaggedMessages);

router.patch("/:messageId/edit", protect, editMessage);
router.patch("/:messageId/delete", protect, deleteMessage);
router.patch("/:messageId/flag", protect, flagMessage);
router.patch("/:messageId/flag-status", protect, updateFlagStatus);

router.get("/:chatId", protect, getMessages);

module.exports = router;