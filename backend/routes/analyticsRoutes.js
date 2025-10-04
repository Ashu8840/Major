const express = require("express");
const {
  getMoodAnalytics,
  getActivityAnalytics,
  getAnalyticsOverview,
} = require("../controllers/analyticsController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/mood", protect, getMoodAnalytics);
router.get("/activity", protect, getActivityAnalytics);
router.get("/overview", protect, getAnalyticsOverview);

module.exports = router;
