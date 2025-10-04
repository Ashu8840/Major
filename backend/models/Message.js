const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      trim: true,
    },
    media: [
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
    ],
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    callType: {
      type: String,
      enum: [null, "voice", "video"],
      default: null,
    },
    callStatus: {
      type: String,
      enum: ["ringing", "declined", "missed", "ended", null],
      default: null,
    },
    callDuration: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
