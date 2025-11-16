const express = require("express");
const router = express.Router();
const {
  getAllTrainingData,
  getTrainingDataById,
  createTrainingData,
  updateTrainingData,
  deleteTrainingData,
  bulkImportTrainingData,
  exportTrainingData,
  getTrainingAnalytics,
  testMatch,
} = require("../controllers/chatbotTrainingController");
const { protect, admin } = require("../middlewares/authMiddleware");

// Public route for chatbot to query training data (will be called from Bot server)
router.post("/query", async (req, res) => {
  try {
    const ChatbotTraining = require("../models/ChatbotTraining");
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Question is required",
      });
    }

    const match = await ChatbotTraining.findBestMatch(question);

    if (match) {
      // Record usage
      await match.recordUsage();

      res.json({
        success: true,
        matched: true,
        answer: match.answer,
        category: match.category,
        confidence: "high",
      });
    } else {
      res.json({
        success: true,
        matched: false,
        message: "No matching training data found",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to query training data",
      error: error.message,
    });
  }
});

// Admin routes - all require authentication and admin role
router.use(protect);
router.use(admin);

router.route("/").get(getAllTrainingData).post(createTrainingData);

router.route("/bulk-import").post(bulkImportTrainingData);

router.route("/export").get(exportTrainingData);

router.route("/analytics").get(getTrainingAnalytics);

router.route("/test-match").post(testMatch);

router
  .route("/:id")
  .get(getTrainingDataById)
  .put(updateTrainingData)
  .delete(deleteTrainingData);

module.exports = router;
