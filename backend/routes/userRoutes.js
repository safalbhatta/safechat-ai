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
  getSuggestions,
  uploadProfilePicture
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const profilePictureUpload = require("../middleware/profilePictureUpload");

const router = express.Router();

const uploadProfilePictureFile = (req, res, next) => {
  profilePictureUpload.single("profilePic")(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "Profile picture must be smaller than 5 MB"
            : error.message,
      });
    }

    next();
  });
};

router.get("/", protect, getUsers);
router.get("/search", protect, searchUsers);
router.get("/suggestions", protect, getSuggestions);
router.get("/requests", protect, getFriendRequests);
router.post("/request", protect, sendFriendRequest);
router.post("/request/accept", protect, acceptFriendRequest);
router.post("/request/decline", protect, declineFriendRequest);

router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);
router.post(
  "/profile-picture",
  protect,
  uploadProfilePictureFile,
  uploadProfilePicture
);
router.delete("/profile", protect, deleteUserProfile);
router.post("/toggle-block/:userId", protect, toggleBlockUser);
router.post("/remove-friend", protect, removeFriend);
router.get("/sessions", protect, getSessions);
router.delete("/sessions/:sessionId", protect, revokeSession);

module.exports = router;
