const mongoose = require("mongoose");

const trainingDataSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: [
        "features",
        "navigation",
        "diary",
        "community",
        "marketplace",
        "analytics",
        "troubleshooting",
        "account",
        "subscription",
        "general",
      ],
      default: "general",
    },
    keywords: [
      {
        type: String,
        lowercase: true,
      },
    ],
    priority: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    successRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    lastUsed: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast searching
trainingDataSchema.index({
  question: "text",
  answer: "text",
  keywords: "text",
});
trainingDataSchema.index({ category: 1, isActive: 1 });
trainingDataSchema.index({ priority: -1 });

// Method to increment usage
trainingDataSchema.methods.recordUsage = async function (wasSuccessful) {
  this.usageCount += 1;
  this.lastUsed = new Date();

  if (wasSuccessful !== undefined) {
    // Calculate rolling average success rate
    const totalResponses = this.usageCount;
    const currentSuccessCount = (this.successRate / 100) * (totalResponses - 1);
    const newSuccessCount = currentSuccessCount + (wasSuccessful ? 1 : 0);
    this.successRate = (newSuccessCount / totalResponses) * 100;
  }

  await this.save();
};

// Static method to find best match
trainingDataSchema.statics.findBestMatch = async function (query) {
  const lowerQuery = query.toLowerCase();

  // First try exact text search
  const exactMatches = await this.find(
    {
      $text: { $search: query },
      isActive: true,
    },
    { score: { $meta: "textScore" } }
  )
    .sort({ score: { $meta: "textScore" }, priority: -1 })
    .limit(5);

  if (exactMatches.length > 0) {
    return exactMatches[0];
  }

  // Then try keyword matching
  const words = lowerQuery.split(/\s+/).filter((w) => w.length > 3);

  if (words.length > 0) {
    const keywordMatches = await this.find({
      keywords: { $in: words },
      isActive: true,
    })
      .sort({ priority: -1, usageCount: -1 })
      .limit(5);

    if (keywordMatches.length > 0) {
      return keywordMatches[0];
    }
  }

  return null;
};

// Static method to bulk import training data
trainingDataSchema.statics.bulkImport = async function (dataArray, userId) {
  const results = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const item of dataArray) {
    try {
      // Extract keywords from question
      const keywords = item.question
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 3);

      await this.create({
        question: item.question,
        answer: item.answer,
        category: item.category || "general",
        keywords: [...new Set(keywords)],
        priority: item.priority || 1,
        createdBy: userId,
      });

      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        question: item.question,
        error: error.message,
      });
    }
  }

  return results;
};

// Virtual for analytics
trainingDataSchema.virtual("effectiveness").get(function () {
  if (this.usageCount === 0) return "untested";
  if (this.successRate >= 80) return "excellent";
  if (this.successRate >= 60) return "good";
  if (this.successRate >= 40) return "fair";
  return "poor";
});

trainingDataSchema.set("toJSON", { virtuals: true });
trainingDataSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("ChatbotTraining", trainingDataSchema);
