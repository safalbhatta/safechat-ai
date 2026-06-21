const express = require("express");
const { getUsers, getUserProfile, updateUserProfile, deleteUserProfile, getSessions, revokeSession, toggleBlockUser } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getUsers);
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);
router.delete("/profile", protect, deleteUserProfile);
router.post("/toggle-block/:userId", protect, toggleBlockUser);
router.get("/sessions", protect, getSessions);
router.delete("/sessions/:sessionId", protect, revokeSession);

module.exports = router;