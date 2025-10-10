const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    postType: {
      type: String,
      enum: ["text", "image", "poll", "article", "event"],
      default: "text",
      index: true,
    },
    content: {
      type: String,
      trim: true,
      default: "",
    },
    hashtags: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
    media: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Media",
      },
    ],
    likes: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    shares: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    visibility: {
      type: String,
      enum: ["public", "followers", "private"],
      default: "public",
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    poll: {
      question: { type: String, trim: true },
      allowMultiple: { type: Boolean, default: false },
      expiresAt: { type: Date },
      options: [
        {
          _id: false,
          id: { type: String, required: true },
          text: { type: String, required: true, trim: true },
          votes: { type: Number, default: 0 },
          voters: [
            {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
          ],
        },
      ],
      totalVotes: { type: Number, default: 0 },
    },
    article: {
      title: { type: String, trim: true },
      summary: { type: String, trim: true },
      body: { type: String, trim: true },
      coverImage: {
        media: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Media",
        },
        url: String,
      },
      readTimeMinutes: { type: Number, default: 0 },
    },
    event: {
      title: { type: String, trim: true },
      description: { type: String, trim: true },
      location: { type: String, trim: true },
      isVirtual: { type: Boolean, default: false },
      capacity: { type: Number },
      start: { type: Date },
      end: { type: Date },
      banner: {
        media: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Media",
        },
        url: String,
      },
      attendees: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          rsvpAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Index for hashtag search
postSchema.index({ hashtags: 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ "likes.user": 1 });
postSchema.index({ "poll.options.id": 1 });

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
