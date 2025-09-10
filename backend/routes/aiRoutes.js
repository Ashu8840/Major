const express = require("express");
const {
  summarizeEntry,
  analyzeSentiment,
  getDailyPrompt,
} = require("../controllers/aiController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/summarize", protect, summarizeEntry);
router.post("/sentiment", protect, analyzeSentiment);
router.get("/prompts", getDailyPrompt);

module.exports = router;
