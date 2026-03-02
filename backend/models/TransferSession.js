const mongoose = require("mongoose");

/**
 * TransferSession – stores cross-device image grab/drop sessions.
 *
 * Lifecycle:
 *   1. Device A detects a fist gesture → POST /api/transfer/create  →  status "holding"
 *   2. Device B detects a palm gesture → POST /api/transfer/accept  →  status "consumed"
 *   3. A TTL index auto-deletes the document 5 minutes after creation,
 *      so no manual cleanup is needed.
 */
const transferSessionSchema = new mongoose.Schema(
  {
    /** UUID generated client-side – doubles as the public session handle */
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    /** Owner – only this user may accept the transfer on another device */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /** Cloudinary URL or local path of the grabbed image */
    imageUrl: {
      type: String,
      required: true,
    },

    /** Optional thumbnail for the floating preview animation */
    thumbnailUrl: {
      type: String,
      default: "",
    },

    /** Original filename (shown in the upload modal) */
    fileName: {
      type: String,
      default: "transferred-image.jpg",
    },

    /** MIME type of the grabbed image */
    mimeType: {
      type: String,
      default: "image/jpeg",
    },

    /** Session state machine: holding → consumed  |  holding → expired (TTL) */
    status: {
      type: String,
      enum: ["holding", "consumed"],
      default: "holding",
    },

    /** Hard expiry – used both by application logic and the TTL index */
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Mongo TTL index: deletes doc when Date.now() ≥ expiresAt
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("TransferSession", transferSessionSchema);
