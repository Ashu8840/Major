const mongoose = require("mongoose");

const trendingHashtagSchema = new mongoose.Schema(
  {
    hashtag: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    count: {
      type: Number,
      default: 1,
    },
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    category: {
      type: String,
      enum: ["general", "writing", "mood", "life", "inspiration", "creativity"],
      default: "general",
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for trending search
trendingHashtagSchema.index({ count: -1 });
trendingHashtagSchema.index({ lastUpdated: -1 });
trendingHashtagSchema.index({ hashtag: 1 });

const TrendingHashtag = mongoose.model(
  "TrendingHashtag",
  trendingHashtagSchema
);

module.exports = TrendingHashtag;
