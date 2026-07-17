const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getNotifications,
  getNotificationUnreadCount,
  getNotificationPreferences,
  updateNotificationPreferences,
  markNotificationRead,
  markChatNotificationsRead,
  markAllNotificationsRead,
  deleteNotification,
  clearReadNotifications,
} = require("../controllers/notificationController");

const router = express.Router();

router.get("/", protect, getNotifications);
router.get("/unread-count", protect, getNotificationUnreadCount);
router.get("/preferences", protect, getNotificationPreferences);
router.put("/preferences", protect, updateNotificationPreferences);
router.patch("/mark-all-read", protect, markAllNotificationsRead);
router.patch("/chat/:chatId/read", protect, markChatNotificationsRead);
router.delete("/clear-read", protect, clearReadNotifications);
router.patch("/:notificationId/read", protect, markNotificationRead);
router.delete("/:notificationId", protect, deleteNotification);

module.exports = router;
