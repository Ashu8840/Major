const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    url: String,
    secureUrl: String,
    publicId: String,
    resourceType: String,
    format: String,
    filename: String,
    originalName: String,
    size: Number,
    mimeType: String,
  },
  { _id: false }
);

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["created", "view", "download", "purchase", "review"],
      required: true,
    },
    amount: {
      type: Number,
      default: 0,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    note: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1500,
    },
    userSnapshot: {
      displayName: String,
      username: String,
      avatar: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const marketplaceBookSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketplaceSeller",
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    genre: {
      type: String,
      trim: true,
      default: "other",
    },
    language: {
      type: String,
      trim: true,
      default: "English",
    },
    tags: [String],
    price: {
      type: Number,
      min: 0,
      default: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "published",
    },
    coverImage: fileSchema,
    file: fileSchema,
    pages: {
      type: Number,
      min: 1,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    trendingScore: {
      type: Number,
      default: 0,
    },
    stats: {
      views: {
        type: Number,
        default: 0,
      },
      downloads: {
        type: Number,
        default: 0,
      },
      purchases: {
        type: Number,
        default: 0,
      },
      favorites: {
        type: Number,
        default: 0,
      },
      revenue: {
        type: Number,
        default: 0,
      },
      averageRating: {
        type: Number,
        default: 0,
      },
      ratingsCount: {
        type: Number,
        default: 0,
      },
      lastViewAt: Date,
      lastDownloadAt: Date,
      lastPurchaseAt: Date,
    },
    activity: [activitySchema],
    reviews: [reviewSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

marketplaceBookSchema.index({ status: 1 });
marketplaceBookSchema.index({ price: 1 });
marketplaceBookSchema.index({ genre: 1 });
marketplaceBookSchema.index({ createdAt: -1 });
marketplaceBookSchema.index({ "stats.views": -1 });
marketplaceBookSchema.index({
  title: "text",
  description: "text",
  tags: "text",
});
marketplaceBookSchema.index({ "reviews.user": 1 });

marketplaceBookSchema.virtual("isFree").get(function () {
  return (this.price || 0) <= 0;
});

marketplaceBookSchema.methods.appendActivity = function (payload) {
  const MAX_ACTIVITY = 50;
  this.activity.push({
    ...payload,
    createdAt: payload.createdAt || new Date(),
  });
  if (this.activity.length > MAX_ACTIVITY) {
    this.activity = this.activity.slice(this.activity.length - MAX_ACTIVITY);
  }
};

const MarketplaceBook = mongoose.model(
  "MarketplaceBook",
  marketplaceBookSchema
);

module.exports = MarketplaceBook;
