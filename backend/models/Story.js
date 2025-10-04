const mongoose = require("mongoose");

const storySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      maxlength: 50000, // 50k characters limit
    },
    excerpt: {
      type: String,
      maxlength: 500,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: String,
      enum: [
        "fiction",
        "non-fiction",
        "romance",
        "mystery",
        "sci-fi",
        "fantasy",
        "horror",
        "thriller",
        "drama",
        "comedy",
        "adventure",
        "biography",
        "other",
      ],
      default: "other",
    },
    tags: [String],
    coverImage: {
      url: String,
      cloudinaryId: String,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    visibility: {
      type: String,
      enum: ["public", "followers", "private"],
      default: "public",
    },
    readTime: {
      type: Number, // in minutes
      default: 0,
    },
    wordCount: {
      type: Number,
      default: 0,
    },
    chapters: [
      {
        title: String,
        content: String,
        order: Number,
        publishedAt: Date,
      },
    ],
    stats: {
      views: {
        type: Number,
        default: 0,
      },
      reads: {
        type: Number,
        default: 0,
      },
      likes: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          likedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      bookmarks: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          bookmarkedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    publishedAt: Date,
    featured: {
      type: Boolean,
      default: false,
    },
    allowComments: {
      type: Boolean,
      default: true,
    },
    mature: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual fields
storySchema.virtual("likesCount").get(function () {
  return this.stats?.likes?.length || 0;
});

storySchema.virtual("bookmarksCount").get(function () {
  return this.stats?.bookmarks?.length || 0;
});

storySchema.virtual("commentsCount").get(function () {
  return this.comments?.length || 0;
});

// Methods
storySchema.methods.calculateReadTime = function () {
  const wordsPerMinute = 200;
  this.readTime = Math.ceil(this.wordCount / wordsPerMinute);
  return this.readTime;
};

storySchema.methods.calculateWordCount = function () {
  const words = this.content.split(/\s+/).filter((word) => word.length > 0);
  this.wordCount = words.length;
  return this.wordCount;
};

storySchema.methods.incrementViews = async function () {
  this.stats.views += 1;
  return await this.save();
};

storySchema.methods.incrementReads = async function () {
  this.stats.reads += 1;
  return await this.save();
};

// Indexes
storySchema.index({ author: 1 });
storySchema.index({ category: 1 });
storySchema.index({ status: 1 });
storySchema.index({ visibility: 1 });
storySchema.index({ publishedAt: -1 });
storySchema.index({ "stats.views": -1 });
storySchema.index({ "stats.likes": -1 });
storySchema.index({ featured: 1 });
storySchema.index({ tags: 1 });

// Pre-save middleware
storySchema.pre("save", function (next) {
  if (this.isModified("content")) {
    this.calculateWordCount();
    this.calculateReadTime();

    // Generate excerpt if not provided
    if (!this.excerpt && this.content) {
      this.excerpt = this.content.substring(0, 300) + "...";
    }
  }

  // Set publishedAt when status changes to published
  if (
    this.isModified("status") &&
    this.status === "published" &&
    !this.publishedAt
  ) {
    this.publishedAt = new Date();
  }

  next();
});

const Story = mongoose.model("Story", storySchema);

module.exports = Story;
