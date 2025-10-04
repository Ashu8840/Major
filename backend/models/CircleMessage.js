const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    cloudinaryId: String,
    type: {
      type: String,
      enum: ["image", "video", "audio", "document"],
      default: "image",
    },
    thumbUrl: String,
    duration: Number,
    size: Number,
    mimeType: String,
  },
  { _id: false }
);

const circleMessageSchema = new mongoose.Schema(
  {
    circle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Circle",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      trim: true,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    system: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

circleMessageSchema.index({ circle: 1, createdAt: -1 });

const CircleMessage = mongoose.model("CircleMessage", circleMessageSchema);

module.exports = CircleMessage;
