const express = require("express");
const router = express.Router();
const {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotificationById,
} = require("../controllers/notificationController");
const { protect, adminOnly } = require("../middlewares/authMiddleware");

// All routes require admin authentication
router.use(protect);
router.use(adminOnly);

// Get notifications
router.get("/", getNotifications);

// Mark all as read
router.put("/mark-all-read", markAllNotificationsAsRead);

// Mark as read
router.put("/:notificationId/read", markNotificationAsRead);

// Delete notification
router.delete("/:notificationId", deleteNotificationById);

module.exports = router;
