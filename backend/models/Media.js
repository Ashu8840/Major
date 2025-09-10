const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    public_id: {
      type: String,
      required: true,
    },
    thumbUrl: String,
    type: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },
    size: Number,
    width: Number,
    height: Number,
  },
  {
    timestamps: true,
  }
);

const Media = mongoose.model("Media", mediaSchema);

module.exports = Media;
