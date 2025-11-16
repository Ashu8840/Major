const ChatbotTraining = require("../models/ChatbotTraining");

// @desc    Get all training data
// @route   GET /api/chatbot-training
// @access  Admin
exports.getAllTrainingData = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      search,
      isActive,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const query = {};

    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === "true";
    if (search) {
      query.$or = [
        { question: { $regex: search, $options: "i" } },
        { answer: { $regex: search, $options: "i" } },
        { keywords: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const trainingData = await ChatbotTraining.find(query)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ [sortBy]: order === "desc" ? -1 : 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ChatbotTraining.countDocuments(query);

    res.json({
      success: true,
      data: trainingData,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch training data",
      error: error.message,
    });
  }
};

// @desc    Get single training data
// @route   GET /api/chatbot-training/:id
// @access  Admin
exports.getTrainingDataById = async (req, res) => {
  try {
    const trainingData = await ChatbotTraining.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!trainingData) {
      return res.status(404).json({
        success: false,
        message: "Training data not found",
      });
    }

    res.json({
      success: true,
      data: trainingData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch training data",
      error: error.message,
    });
  }
};

// @desc    Create new training data
// @route   POST /api/chatbot-training
// @access  Admin
exports.createTrainingData = async (req, res) => {
  try {
    const { question, answer, category, keywords, priority } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        message: "Question and answer are required",
      });
    }

    // Auto-generate keywords if not provided
    const autoKeywords = question
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3);

    const trainingData = await ChatbotTraining.create({
      question,
      answer,
      category: category || "general",
      keywords: keywords && keywords.length > 0 ? keywords : autoKeywords,
      priority: priority || 1,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Training data created successfully",
      data: trainingData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create training data",
      error: error.message,
    });
  }
};

// @desc    Update training data
// @route   PUT /api/chatbot-training/:id
// @access  Admin
exports.updateTrainingData = async (req, res) => {
  try {
    const { question, answer, category, keywords, priority, isActive } =
      req.body;

    const trainingData = await ChatbotTraining.findById(req.params.id);

    if (!trainingData) {
      return res.status(404).json({
        success: false,
        message: "Training data not found",
      });
    }

    // Update fields
    if (question) trainingData.question = question;
    if (answer) trainingData.answer = answer;
    if (category) trainingData.category = category;
    if (keywords) trainingData.keywords = keywords;
    if (priority !== undefined) trainingData.priority = priority;
    if (isActive !== undefined) trainingData.isActive = isActive;
    trainingData.updatedBy = req.user._id;

    await trainingData.save();

    res.json({
      success: true,
      message: "Training data updated successfully",
      data: trainingData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update training data",
      error: error.message,
    });
  }
};

// @desc    Delete training data
// @route   DELETE /api/chatbot-training/:id
// @access  Admin
exports.deleteTrainingData = async (req, res) => {
  try {
    const trainingData = await ChatbotTraining.findById(req.params.id);

    if (!trainingData) {
      return res.status(404).json({
        success: false,
        message: "Training data not found",
      });
    }

    await trainingData.deleteOne();

    res.json({
      success: true,
      message: "Training data deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete training data",
      error: error.message,
    });
  }
};

// @desc    Bulk import training data from JSON
// @route   POST /api/chatbot-training/bulk-import
// @access  Admin
exports.bulkImportTrainingData = async (req, res) => {
  try {
    const { data, overwrite } = req.body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid data format. Expected array of training objects",
      });
    }

    // Validate data format
    const invalidItems = data.filter((item) => !item.question || !item.answer);
    if (invalidItems.length > 0) {
      return res.status(400).json({
        success: false,
        message: "All items must have 'question' and 'answer' fields",
        invalidItems: invalidItems.slice(0, 5),
      });
    }

    // If overwrite, clear existing data
    if (overwrite === true) {
      await ChatbotTraining.deleteMany({});
    }

    // Bulk import
    const results = await ChatbotTraining.bulkImport(data, req.user._id);

    res.json({
      success: true,
      message: `Imported ${results.success} items successfully`,
      results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to import training data",
      error: error.message,
    });
  }
};

// @desc    Export all training data as JSON
// @route   GET /api/chatbot-training/export
// @access  Admin
exports.exportTrainingData = async (req, res) => {
  try {
    const trainingData = await ChatbotTraining.find({ isActive: true }).select(
      "question answer category keywords priority -_id"
    );

    res.json({
      success: true,
      count: trainingData.length,
      data: trainingData,
      exportedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to export training data",
      error: error.message,
    });
  }
};

// @desc    Get training data analytics
// @route   GET /api/chatbot-training/analytics
// @access  Admin
exports.getTrainingAnalytics = async (req, res) => {
  try {
    const totalCount = await ChatbotTraining.countDocuments();
    const activeCount = await ChatbotTraining.countDocuments({
      isActive: true,
    });
    const inactiveCount = totalCount - activeCount;

    // Category breakdown
    const categoryStats = await ChatbotTraining.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Usage statistics
    const usageStats = await ChatbotTraining.aggregate([
      {
        $group: {
          _id: null,
          totalUsage: { $sum: "$usageCount" },
          avgSuccessRate: { $avg: "$successRate" },
        },
      },
    ]);

    // Top performing training data
    const topPerformers = await ChatbotTraining.find({ usageCount: { $gt: 0 } })
      .sort({ successRate: -1, usageCount: -1 })
      .limit(10)
      .select("question successRate usageCount category");

    // Recently added
    const recentlyAdded = await ChatbotTraining.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("createdBy", "name")
      .select("question category createdAt");

    res.json({
      success: true,
      analytics: {
        overview: {
          total: totalCount,
          active: activeCount,
          inactive: inactiveCount,
          totalUsage: usageStats[0]?.totalUsage || 0,
          avgSuccessRate: usageStats[0]?.avgSuccessRate || 0,
        },
        byCategory: categoryStats,
        topPerformers,
        recentlyAdded,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
      error: error.message,
    });
  }
};

// @desc    Test training data match
// @route   POST /api/chatbot-training/test-match
// @access  Admin
exports.testMatch = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Question is required",
      });
    }

    const match = await ChatbotTraining.findBestMatch(question);

    if (match) {
      res.json({
        success: true,
        matched: true,
        data: {
          question: match.question,
          answer: match.answer,
          category: match.category,
          confidence: "high",
        },
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
      message: "Failed to test match",
      error: error.message,
    });
  }
};
