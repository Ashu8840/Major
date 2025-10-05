const mongoose = require("mongoose");

const promptHistorySchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true, trim: true },
    storyIdea: { type: String, trim: true },
    coverIdea: { type: String, trim: true },
    tagline: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const creatorProjectSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    content: {
      type: String,
      default: "",
    },
    plainText: {
      type: String,
      default: "",
    },
    wordCount: {
      type: Number,
      default: 0,
    },
    category: {
      type: String,
      trim: true,
      default: "general",
    },
    tags: {
      type: [String],
      default: [],
    },
    coverImage: {
      dataUrl: String,
      palette: {
        type: [String],
        default: [],
      },
    },
    coverDesign: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    promptHistory: {
      type: [promptHistorySchema],
      default: [],
    },
    settings: {
      allowDownloads: {
        type: Boolean,
        default: true,
      },
      allowComments: {
        type: Boolean,
        default: true,
      },
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },
    visibility: {
      type: String,
      enum: ["private", "public", "followers"],
      default: "private",
      index: true,
    },
    publishedAt: Date,
    lastExportedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

creatorProjectSchema.methods.calculateWordCount = function () {
  if (!this.plainText) {
    this.wordCount = 0;
    return this.wordCount;
  }

  const words = this.plainText
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  this.wordCount = words.length;
  return this.wordCount;
};

creatorProjectSchema.pre("save", function (next) {
  if (this.isModified("plainText")) {
    this.calculateWordCount();
  }

  if (this.isModified("status")) {
    if (this.status === "published" && !this.publishedAt) {
      this.publishedAt = new Date();
    }

    if (this.status !== "published") {
      this.publishedAt = null;
    }
  }

  next();
});

module.exports = mongoose.model("CreatorProject", creatorProjectSchema);
