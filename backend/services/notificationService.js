const Notification = require("../models/Notification");
const User = require("../models/User");

// Create notification
const createNotification = async (
  recipientId,
  type,
  title,
  message,
  data = {},
  severity = "info",
  link = ""
) => {
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      type,
      title,
      message,
      severity,
      data,
      link,
    });

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

// Create notification for all admins
const notifyAllAdmins = async (
  type,
  title,
  message,
  data = {},
  severity = "info",
  link = ""
) => {
  try {
    const admins = await User.find({ role: "admin" }).select("_id");

    const notifications = await Promise.all(
      admins.map((admin) =>
        createNotification(
          admin._id,
          type,
          title,
          message,
          data,
          severity,
          link
        )
      )
    );

    return notifications;
  } catch (error) {
    console.error("Error notifying admins:", error);
    throw error;
  }
};

// Notification generators for different events

// New user registration
const notifyNewUser = async (user) => {
  const title = "New User Registration";
  const message = `${user.username || user.email} has registered`;
  await notifyAllAdmins(
    "new_user",
    title,
    message,
    { userId: user._id },
    "info",
    "/users"
  );
};

// Flagged content
const notifyFlaggedContent = async (contentType, contentId, reason) => {
  const title = "Content Flagged";
  const message = `${contentType} has been flagged: ${reason}`;
  await notifyAllAdmins(
    "flagged_content",
    title,
    message,
    { contentType, contentId, reason },
    "warning",
    "/moderation"
  );
};

// System error
const notifySystemError = async (error, details = {}) => {
  const title = "System Error Detected";
  const message = error.message || "An error occurred in the system";
  await notifyAllAdmins(
    "system_error",
    title,
    message,
    { error: error.stack, ...details },
    "critical",
    "/monitoring"
  );
};

// High traffic alert
const notifyHighTraffic = async (currentLoad, threshold) => {
  const title = "High Traffic Alert";
  const message = `Server load is ${currentLoad}% (threshold: ${threshold}%)`;
  await notifyAllAdmins(
    "high_traffic",
    title,
    message,
    { currentLoad, threshold },
    "warning",
    "/monitoring"
  );
};

// Downtime alert
const notifyDowntime = async (service, duration) => {
  const title = "System Downtime";
  const message = `${service} experienced downtime for ${duration}ms`;
  await notifyAllAdmins(
    "downtime",
    title,
    message,
    { service, duration },
    "critical",
    "/monitoring"
  );
};

// Security alert
const notifySecurityAlert = async (alertType, details) => {
  const title = "Security Alert";
  const message = `Security event: ${alertType}`;
  await notifyAllAdmins(
    "security_alert",
    title,
    message,
    { alertType, ...details },
    "critical",
    "/settings"
  );
};

// Failed transaction
const notifyFailedTransaction = async (transactionId, reason) => {
  const title = "Transaction Failed";
  const message = `Transaction ${transactionId} failed: ${reason}`;
  await notifyAllAdmins(
    "failed_transaction",
    title,
    message,
    { transactionId, reason },
    "warning",
    "/marketplace-control"
  );
};

// Marketplace sale
const notifyMarketplaceSale = async (bookTitle, amount) => {
  const title = "New Marketplace Sale";
  const message = `"${bookTitle}" sold for $${amount}`;
  await notifyAllAdmins(
    "marketplace_sale",
    title,
    message,
    { bookTitle, amount },
    "info",
    "/marketplace-control"
  );
};

// Low disk space
const notifyLowDiskSpace = async (percentUsed) => {
  const title = "Low Disk Space";
  const message = `Disk usage is at ${percentUsed}%`;
  await notifyAllAdmins(
    "low_disk_space",
    title,
    message,
    { percentUsed },
    "warning",
    "/monitoring"
  );
};

// High CPU usage
const notifyHighCPU = async (cpuUsage) => {
  const title = "High CPU Usage";
  const message = `CPU usage is at ${cpuUsage}%`;
  await notifyAllAdmins(
    "high_cpu",
    title,
    message,
    { cpuUsage },
    "warning",
    "/monitoring"
  );
};

// High memory usage
const notifyHighMemory = async (memoryPercent) => {
  const title = "High Memory Usage";
  const message = `Memory usage is at ${memoryPercent}%`;
  await notifyAllAdmins(
    "high_memory",
    title,
    message,
    { memoryPercent },
    "warning",
    "/monitoring"
  );
};

// Get admin notifications
const getAdminNotifications = async (
  adminId,
  { page = 1, limit = 50, unreadOnly = false }
) => {
  try {
    const query = { recipient: adminId };
    if (unreadOnly) {
      query.isRead = false;
    }

    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: adminId, isRead: false }),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      unreadCount,
    };
  } catch (error) {
    console.error("Error fetching admin notifications:", error);
    throw error;
  }
};

// Mark notification as read
const markAsRead = async (notificationId, adminId) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: adminId },
      { isRead: true },
      { new: true }
    );

    return notification;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};

// Mark all as read
const markAllAsRead = async (adminId) => {
  try {
    await Notification.updateMany(
      { recipient: adminId, isRead: false },
      { isRead: true }
    );

    return true;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
};

// Delete notification
const deleteNotification = async (notificationId, adminId) => {
  try {
    await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: adminId,
    });

    return true;
  } catch (error) {
    console.error("Error deleting notification:", error);
    throw error;
  }
};

// Clear old notifications (older than 30 days)
const clearOldNotifications = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await Notification.deleteMany({
      createdAt: { $lt: thirtyDaysAgo },
      isRead: true,
    });

    console.log(`Cleared ${result.deletedCount} old notifications`);
    return result.deletedCount;
  } catch (error) {
    console.error("Error clearing old notifications:", error);
    throw error;
  }
};

module.exports = {
  createNotification,
  notifyAllAdmins,
  notifyNewUser,
  notifyFlaggedContent,
  notifySystemError,
  notifyHighTraffic,
  notifyDowntime,
  notifySecurityAlert,
  notifyFailedTransaction,
  notifyMarketplaceSale,
  notifyLowDiskSpace,
  notifyHighCPU,
  notifyHighMemory,
  getAdminNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearOldNotifications,
};
