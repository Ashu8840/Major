const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 2000,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    coAuthors: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["co-author", "editor", "illustrator"],
          default: "co-author",
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    genre: {
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
        "self-help",
        "educational",
        "children",
        "young-adult",
        "poetry",
        "other",
      ],
      default: "other",
    },
    subGenres: [String],
    tags: [String],
    language: {
      type: String,
      default: "english",
    },
    coverImage: {
      url: String,
      cloudinaryId: String,
    },
    status: {
      type: String,
      enum: [
        "planning",
        "writing",
        "editing",
        "completed",
        "published",
        "archived",
      ],
      default: "planning",
    },
    visibility: {
      type: String,
      enum: ["public", "followers", "private", "collaborators"],
      default: "private",
    },
    targetAudience: {
      type: String,
      enum: ["children", "young-adult", "adult", "all-ages"],
      default: "adult",
    },
    chapters: [
      {
        title: {
          type: String,
          required: true,
        },
        content: String,
        wordCount: {
          type: Number,
          default: 0,
        },
        order: {
          type: Number,
          required: true,
        },
        status: {
          type: String,
          enum: ["draft", "review", "completed"],
          default: "draft",
        },
        notes: String,
        lastEditedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        lastEditedAt: Date,
      },
    ],
    outline: {
      summary: String,
      plotPoints: [String],
      characters: [
        {
          name: String,
          description: String,
          role: {
            type: String,
            enum: ["protagonist", "antagonist", "supporting", "minor"],
          },
        },
      ],
      settings: [
        {
          name: String,
          description: String,
        },
      ],
    },
    stats: {
      totalWordCount: {
        type: Number,
        default: 0,
      },
      targetWordCount: {
        type: Number,
        default: 50000,
      },
      completionPercentage: {
        type: Number,
        default: 0,
      },
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
      downloads: {
        type: Number,
        default: 0,
      },
    },
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    reviews: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
        },
        review: String,
        reviewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    publishing: {
      isbn: String,
      publisher: String,
      publishedDate: Date,
      price: Number,
      currency: {
        type: String,
        default: "USD",
      },
      format: {
        type: String,
        enum: ["ebook", "paperback", "hardcover", "audiobook"],
        default: "ebook",
      },
      distribution: [String], // platforms where book is available
    },
    settings: {
      allowComments: {
        type: Boolean,
        default: true,
      },
      allowCollaboration: {
        type: Boolean,
        default: false,
      },
      autoSave: {
        type: Boolean,
        default: true,
      },
      versionControl: {
        type: Boolean,
        default: true,
      },
    },
    featured: {
      type: Boolean,
      default: false,
    },
    mature: {
      type: Boolean,
      default: false,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: Date,
    publishedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual fields
bookSchema.virtual("likesCount").get(function () {
  return this.stats?.likes?.length || 0;
});

bookSchema.virtual("bookmarksCount").get(function () {
  return this.stats?.bookmarks?.length || 0;
});

bookSchema.virtual("commentsCount").get(function () {
  return this.comments?.length || 0;
});

bookSchema.virtual("reviewsCount").get(function () {
  return this.reviews?.length || 0;
});

bookSchema.virtual("averageRating").get(function () {
  if (!this.reviews || this.reviews.length === 0) return 0;
  const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
  return sum / this.reviews.length;
});

bookSchema.virtual("readTime").get(function () {
  const wordsPerMinute = 200;
  return Math.ceil(this.stats.totalWordCount / wordsPerMinute);
});

// Methods
bookSchema.methods.calculateTotalWordCount = function () {
  this.stats.totalWordCount = this.chapters.reduce(
    (total, chapter) => total + (chapter.wordCount || 0),
    0
  );
  return this.stats.totalWordCount;
};

bookSchema.methods.calculateCompletionPercentage = function () {
  if (this.stats.targetWordCount === 0) {
    this.stats.completionPercentage = 0;
  } else {
    this.stats.completionPercentage = Math.min(
      100,
      (this.stats.totalWordCount / this.stats.targetWordCount) * 100
    );
  }
  return this.stats.completionPercentage;
};

bookSchema.methods.addChapter = function (chapterData) {
  const order = chapterData.order || this.chapters.length + 1;
  this.chapters.push({
    ...chapterData,
    order,
    lastEditedAt: new Date(),
  });
  this.chapters.sort((a, b) => a.order - b.order);
  return this.save();
};

bookSchema.methods.updateChapter = function (chapterId, updates) {
  const chapter = this.chapters.id(chapterId);
  if (chapter) {
    Object.assign(chapter, updates);
    chapter.lastEditedAt = new Date();
    return this.save();
  }
  throw new Error("Chapter not found");
};

bookSchema.methods.deleteChapter = function (chapterId) {
  this.chapters.id(chapterId).remove();
  return this.save();
};

bookSchema.methods.incrementViews = async function () {
  this.stats.views += 1;
  return await this.save();
};

bookSchema.methods.incrementReads = async function () {
  this.stats.reads += 1;
  return await this.save();
};

bookSchema.methods.addReview = function (userId, rating, reviewText) {
  const existingReview = this.reviews.find(
    (review) => review.user.toString() === userId.toString()
  );

  if (existingReview) {
    existingReview.rating = rating;
    existingReview.review = reviewText;
    existingReview.reviewedAt = new Date();
  } else {
    this.reviews.push({
      user: userId,
      rating,
      review: reviewText,
    });
  }

  return this.save();
};

// Indexes
bookSchema.index({ author: 1 });
bookSchema.index({ "coAuthors.user": 1 });
bookSchema.index({ genre: 1 });
bookSchema.index({ status: 1 });
bookSchema.index({ visibility: 1 });
bookSchema.index({ publishedAt: -1 });
bookSchema.index({ "stats.views": -1 });
bookSchema.index({ "stats.likes": -1 });
bookSchema.index({ featured: 1 });
bookSchema.index({ tags: 1 });
bookSchema.index({ language: 1 });

// Pre-save middleware
bookSchema.pre("save", function (next) {
  // Calculate stats if chapters were modified
  if (this.isModified("chapters")) {
    this.calculateTotalWordCount();
    this.calculateCompletionPercentage();
  }

  // Set completion date when status changes to completed
  if (
    this.isModified("status") &&
    this.status === "completed" &&
    !this.completedAt
  ) {
    this.completedAt = new Date();
  }

  // Set published date when status changes to published
  if (
    this.isModified("status") &&
    this.status === "published" &&
    !this.publishedAt
  ) {
    this.publishedAt = new Date();
  }

  next();
});

const Book = mongoose.model("Book", bookSchema);

module.exports = Book;
