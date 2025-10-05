const express = require("express");
const { protect } = require("../middlewares/authMiddleware");
const {
  getLeaderboard,
  getSeasonalLeaderboard,
} = require("../controllers/leaderboardController");

const router = express.Router();

router.get("/", protect, getLeaderboard);
router.get("/seasonal", protect, getSeasonalLeaderboard);

module.exports = router;
