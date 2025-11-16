const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getUsers,
  getUserDetails,
  banUser,
  unbanUser,
  deleteUser,
  getAdmins,
  createAdmin,
  deleteAdmin,
  getSettings,
  updateSettings,
} = require("../controllers/adminController");
const { protect, adminOnly } = require("../middlewares/authMiddleware");

// All routes require admin authentication
router.use(protect);
router.use(adminOnly);

// Dashboard
router.get("/dashboard/stats", getDashboardStats);

// User Management
router.get("/users", getUsers);
router.get("/users/:userId", getUserDetails);
router.put("/users/:userId/ban", banUser);
router.put("/users/:userId/unban", unbanUser);
router.delete("/users/:userId", deleteUser);

// Admin Management
router.get("/admins", getAdmins);
router.post("/admins", createAdmin);
router.delete("/admins/:adminId", deleteAdmin);

// Settings
router.get("/settings", getSettings);
router.put("/settings", updateSettings);

module.exports = router;
