const express = require("express");
const {
  getMoodAnalytics,
  getActivityAnalytics,
} = require("../controllers/analyticsController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/mood", protect, getMoodAnalytics);
router.get("/activity", protect, getActivityAnalytics);

module.exports = router;
