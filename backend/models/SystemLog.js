const mongoose = require("mongoose");

const systemLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["error", "warning", "info", "downtime", "restart", "cache_clear"],
      required: true,
    },
    severity: {
      type: String,
      enum: ["critical", "warning", "info"],
      required: true,
    },
    service: {
      type: String,
      default: "system",
    },
    message: {
      type: String,
      required: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    resolved: {
      type: Boolean,
      default: false,
    },
    resolvedAt: {
      type: Date,
    },
    duration: {
      type: Number, // in milliseconds
      default: 0,
    },
  },
  { timestamps: true }
);

// Index for faster queries
systemLogSchema.index({ type: 1, createdAt: -1 });
systemLogSchema.index({ severity: 1, resolved: 1 });

module.exports = mongoose.model("SystemLog", systemLogSchema);
