const express = require("express");
const { 
  getUsers, 
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  getFriendRequests,
  getUserProfile, 
  updateUserProfile, 
  deleteUserProfile, 
  getSessions, 
  revokeSession, 
  toggleBlockUser,
  removeFriend,
  getSuggestions
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getUsers);
router.get("/search", protect, searchUsers);
router.get("/suggestions", protect, getSuggestions);
router.get("/requests", protect, getFriendRequests);
router.post("/request", protect, sendFriendRequest);
router.post("/request/accept", protect, acceptFriendRequest);
router.post("/request/decline", protect, declineFriendRequest);

router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);
router.delete("/profile", protect, deleteUserProfile);
router.post("/toggle-block/:userId", protect, toggleBlockUser);
router.post("/remove-friend", protect, removeFriend);
router.get("/sessions", protect, getSessions);
router.delete("/sessions/:sessionId", protect, revokeSession);

module.exports = router;