const mongoose = require("mongoose");

const readerBookSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketplaceBook",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["wishlist", "in-progress", "completed"],
      default: "in-progress",
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    lastPage: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalPages: {
      type: Number,
      min: 0,
      default: 0,
    },
    startedAt: Date,
    lastReadAt: Date,
    completedAt: Date,
    wishlistAt: Date,
    addedAt: {
      type: Date,
      default: Date.now,
    },
    source: {
      type: String,
      enum: ["view", "download", "purchase", "manual"],
      default: "manual",
    },
    removedAt: Date,
  },
  {
    timestamps: true,
  }
);

readerBookSchema.index({ user: 1, book: 1 }, { unique: true });
readerBookSchema.index({ status: 1 });
readerBookSchema.index({ removedAt: 1 });

readerBookSchema.virtual("isActive").get(function () {
  return !this.removedAt;
});

module.exports = mongoose.model("ReaderBook", readerBookSchema);
