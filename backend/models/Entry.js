const mongoose = require("mongoose");

const entrySchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      trim: true,
      default: "Untitled Entry",
    },
    content: {
      type: String,
      default: "",
    },
    tags: [String],
    visibility: {
      type: String,
      enum: ["private", "public"],
      default: "private",
    },
    isDraft: {
      type: Boolean,
      default: false,
    },
    media: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Media",
      },
    ],
    mood: {
      type: String,
      enum: [
        "happy",
        "sad",
        "angry",
        "anxious",
        "excited",
        "calm",
        "grateful",
        "love",
        "neutral",
        "disappointed",
        "frustrated",
        "content",
        "tired",
        "confused",
        "confident",
        "overwhelmed",
        "",
      ],
      default: "",
    },
    aiSummary: String,
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Entry = mongoose.model("Entry", entrySchema);

module.exports = Entry;
