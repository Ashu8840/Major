const express = require("express");
const {
  summarizeEntry,
  analyzeSentiment,
  getDailyPrompt,
  fixTextGrammar,
  translateUserText,
  improveTextContent,
} = require("../controllers/aiController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/summarize", protect, summarizeEntry);
router.post("/sentiment", protect, analyzeSentiment);
router.get("/prompts", getDailyPrompt);
router.post("/fix-grammar", protect, fixTextGrammar);
router.post("/translate", protect, translateUserText);
router.post("/improve", protect, improveTextContent);

module.exports = router;
