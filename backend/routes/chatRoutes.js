const express = require("express");
const {
  createOrGetChat,
  getMyChats,
} = require("../controllers/chatController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, createOrGetChat);
router.get("/", protect, getMyChats);

module.exports = router;