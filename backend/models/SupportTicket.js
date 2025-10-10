const mongoose = require("mongoose");

const SupportTicketSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    category: {
      type: String,
      enum: ["general", "technical", "billing", "feedback", "other"],
      default: "general",
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },
    metadata: {
      type: Map,
      of: String,
      default: {},
    },
    resolutionNotes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

SupportTicketSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("SupportTicket", SupportTicketSchema);
