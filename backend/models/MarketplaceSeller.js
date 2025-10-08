const mongoose = require("mongoose");

const marketplaceSellerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    storeName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 1500,
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    socialLinks: {
      instagram: String,
      twitter: String,
      facebook: String,
      tiktok: String,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    autoApproved: {
      type: Boolean,
      default: false,
    },
    approvedAt: Date,
    approvalNotes: String,
    rejectionReason: String,
    preferences: {
      currency: {
        type: String,
        default: "USD",
      },
      allowTips: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

marketplaceSellerSchema.index({ user: 1 });
marketplaceSellerSchema.index({ status: 1 });

marketplaceSellerSchema.virtual("isApproved").get(function () {
  return this.status === "approved";
});

const MarketplaceSeller = mongoose.model(
  "MarketplaceSeller",
  marketplaceSellerSchema
);

module.exports = MarketplaceSeller;
