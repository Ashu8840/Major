const express = require("express");
const router = express.Router();
const {
  getHealth,
  getNetwork,
  getServer,
  getTraffic,
  getDowntime,
  restartService,
  clearCache,
  exportLogs,
  getAllMetrics,
} = require("../controllers/monitoringController");
const { protect, adminOnly } = require("../middlewares/authMiddleware");

// All routes require admin authentication
router.use(protect);
router.use(adminOnly);

// Get all metrics in one call
router.get("/all", getAllMetrics);

// System health
router.get("/health", getHealth);

// Network metrics
router.get("/network", getNetwork);

// Server metrics
router.get("/server", getServer);

// Traffic metrics
router.get("/traffic", getTraffic);

// Downtime history
router.get("/downtime", getDowntime);

// Restart service
router.post("/restart/:service", restartService);

// Clear cache
router.post("/clear-cache", clearCache);

// Export logs
router.get("/export-logs", exportLogs);

module.exports = router;
