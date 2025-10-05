const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    // Basic Information
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      unique: true,
    },

    // Profile Information
    displayName: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    bio: {
      type: String,
      maxlength: 500,
      default: "",
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
    },

    // Media & Images
    profileImage: {
      url: String,
      cloudinaryId: String,
    },
    coverPhoto: {
      url: String,
      cloudinaryId: String,
    },

    // Verification & Status
    isVerified: {
      type: Boolean,
      default: false,
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    firstLogin: {
      type: Boolean,
      default: true,
    },

    // Social Connections
    followers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        followedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    following: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        followedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Content Stats
    stats: {
      totalEntries: {
        type: Number,
        default: 0,
      },
      totalStories: {
        type: Number,
        default: 0,
      },
      totalPosts: {
        type: Number,
        default: 0,
      },
      totalReads: {
        type: Number,
        default: 0,
      },
      dayStreak: {
        current: {
          type: Number,
          default: 0,
        },
        longest: {
          type: Number,
          default: 0,
        },
        lastEntryDate: Date,
      },
    },

    // Achievements
    achievements: [
      {
        id: String,
        name: String,
        description: String,
        icon: String,
        earnedAt: {
          type: Date,
          default: Date.now,
        },
        category: {
          type: String,
          enum: ["writing", "social", "milestone", "special"],
        },
      },
    ],

    // User Content References
    entries: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Entry",
      },
    ],
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    stories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Story",
      },
    ],
    books: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Book",
      },
    ],

    creatorProjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CreatorProject",
      },
    ],

    // Favorites & Bookmarks
    favorites: {
      entries: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Entry",
        },
      ],
      posts: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Post",
        },
      ],
      stories: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Story",
        },
      ],
    },

    // Analytics
    analytics: {
      monthlyStats: [
        {
          month: Number,
          year: Number,
          entries: Number,
          reads: Number,
          likes: Number,
          comments: Number,
        },
      ],
      topCategories: [
        {
          category: String,
          count: Number,
        },
      ],
      engagementRate: {
        type: Number,
        default: 0,
      },
      avgWordsPerEntry: {
        type: Number,
        default: 0,
      },
    },

    // Social Links
    socialLinks: {
      website: String,
      twitter: String,
      instagram: String,
      linkedin: String,
      facebook: String,
      youtube: String,
    },

    // Settings & Preferences
    preferences: {
      theme: {
        type: String,
        enum: ["light", "dark", "auto"],
        default: "light",
      },
      privacy: {
        profileVisibility: {
          type: String,
          enum: ["public", "followers", "private"],
          default: "public",
        },
        showEmail: {
          type: Boolean,
          default: false,
        },
        showAnalytics: {
          type: Boolean,
          default: true,
        },
      },
      notifications: {
        email: {
          type: Boolean,
          default: true,
        },
        push: {
          type: Boolean,
          default: true,
        },
        followers: {
          type: Boolean,
          default: true,
        },
        comments: {
          type: Boolean,
          default: true,
        },
      },
    },

    social: {
      favoriteFriends: {
        type: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],
        default: [],
      },
    },

    // System Fields
    role: {
      type: String,
      enum: ["user", "admin", "moderator"],
      default: "user",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    joinedDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual fields
userSchema.virtual("followerCount").get(function () {
  return this.followers ? this.followers.length : 0;
});

userSchema.virtual("followingCount").get(function () {
  return this.following ? this.following.length : 0;
});

userSchema.virtual("totalContent").get(function () {
  return (
    (this.stats?.totalEntries || 0) +
    (this.stats?.totalStories || 0) +
    (this.stats?.totalPosts || 0)
  );
});

userSchema.virtual("profileCompletionPercentage").get(function () {
  let completion = 0;
  const fields = [
    this.displayName,
    this.bio,
    this.profileImage?.url,
    this.address?.city,
    this.socialLinks?.website ||
      this.socialLinks?.twitter ||
      this.socialLinks?.instagram,
  ];

  fields.forEach((field) => {
    if (field) completion += 20;
  });

  return completion;
});

// Methods
userSchema.methods.comparePassword = async function (password) {
  if (!this.passwordHash) return false;

  const stored = this.passwordHash;
  const isBcryptHash = typeof stored === "string" && stored.startsWith("$2");

  if (isBcryptHash) {
    return await bcrypt.compare(password, stored);
  }

  return stored === password;
};

userSchema.methods.matchPassword = async function (password) {
  return this.comparePassword(password);
};

userSchema.methods.generateUserId = function () {
  const year = new Date().getFullYear();
  const username = this.username.substring(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `DA-${year}-${username}${random}`;
};

userSchema.methods.updateStats = async function (type, increment = 1) {
  if (!this.stats) this.stats = {};

  switch (type) {
    case "entry":
      this.stats.totalEntries = (this.stats.totalEntries || 0) + increment;
      break;
    case "story":
      this.stats.totalStories = (this.stats.totalStories || 0) + increment;
      break;
    case "post":
      this.stats.totalPosts = (this.stats.totalPosts || 0) + increment;
      break;
    case "read":
      this.stats.totalReads = (this.stats.totalReads || 0) + increment;
      break;
  }

  return await this.save();
};

userSchema.methods.updateStreak = async function () {
  const today = new Date();
  const lastEntry = this.stats?.dayStreak?.lastEntryDate;

  if (!lastEntry) {
    this.stats.dayStreak = {
      current: 1,
      longest: 1,
      lastEntryDate: today,
    };
  } else {
    const daysDiff = Math.floor((today - lastEntry) / (1000 * 60 * 60 * 24));

    if (daysDiff === 1) {
      // Consecutive day
      this.stats.dayStreak.current += 1;
      this.stats.dayStreak.longest = Math.max(
        this.stats.dayStreak.longest,
        this.stats.dayStreak.current
      );
    } else if (daysDiff > 1) {
      // Streak broken
      this.stats.dayStreak.current = 1;
    }

    this.stats.dayStreak.lastEntryDate = today;
  }

  return await this.save();
};

userSchema.methods.addAchievement = async function (achievementData) {
  const existingAchievement = this.achievements.find(
    (achievement) => achievement.id === achievementData.id
  );

  if (!existingAchievement) {
    this.achievements.push(achievementData);
    return await this.save();
  }

  return this;
};

userSchema.methods.follow = async function (targetUserId) {
  const isAlreadyFollowing = this.following.some(
    (follow) => follow.user.toString() === targetUserId.toString()
  );

  if (!isAlreadyFollowing) {
    this.following.push({ user: targetUserId });
    await this.save();

    // Add to target user's followers
    const targetUser = await mongoose.model("User").findById(targetUserId);
    if (targetUser) {
      targetUser.followers.push({ user: this._id });
      await targetUser.save();
    }
  }

  return this;
};

userSchema.methods.unfollow = async function (targetUserId) {
  this.following = this.following.filter(
    (follow) => follow.user.toString() !== targetUserId.toString()
  );
  await this.save();

  // Remove from target user's followers
  const targetUser = await mongoose.model("User").findById(targetUserId);
  if (targetUser) {
    targetUser.followers = targetUser.followers.filter(
      (follower) => follower.user.toString() !== this._id.toString()
    );
    await targetUser.save();
  }

  return this;
};

userSchema.methods.addToFavorites = async function (contentId, contentType) {
  if (!this.favorites[contentType]) {
    this.favorites[contentType] = [];
  }

  const isAlreadyFavorite = this.favorites[contentType].some(
    (fav) => fav.toString() === contentId.toString()
  );

  if (!isAlreadyFavorite) {
    this.favorites[contentType].push(contentId);
    await this.save();
  }

  return this;
};

userSchema.methods.removeFromFavorites = async function (
  contentId,
  contentType
) {
  if (this.favorites[contentType]) {
    this.favorites[contentType] = this.favorites[contentType].filter(
      (fav) => fav.toString() !== contentId.toString()
    );
    await this.save();
  }

  return this;
};

userSchema.methods.updateAnalytics = async function (month, year, data) {
  if (!this.analytics.monthlyStats) {
    this.analytics.monthlyStats = [];
  }

  const existingStats = this.analytics.monthlyStats.find(
    (stat) => stat.month === month && stat.year === year
  );

  if (existingStats) {
    Object.assign(existingStats, data);
  } else {
    this.analytics.monthlyStats.push({ month, year, ...data });
  }

  return await this.save();
};

// Indexes for performance
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ userId: 1 });
userSchema.index({ "followers.user": 1 });
userSchema.index({ "following.user": 1 });
userSchema.index({ isVerified: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ joinedDate: 1 });
userSchema.index({ lastActive: 1 });

// Pre-save middleware
userSchema.pre("save", async function (next) {
  // Generate userId if not exists
  if (!this.userId && this.isNew) {
    this.userId = this.generateUserId();
  }

  // Hash password if modified
  if (
    this.isModified("passwordHash") &&
    !this.passwordHash.startsWith("$2b$")
  ) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  }

  // Update lastActive
  this.lastActive = new Date();

  next();
});

// Post-save middleware to update related models
userSchema.post("save", async function (doc) {
  // Update profile completion percentage
  if (doc.isModified()) {
    const completion = doc.profileCompletionPercentage;
    if (completion === 100 && !doc.profileCompleted) {
      doc.profileCompleted = true;
      // Award profile completion achievement
      await doc.addAchievement({
        id: "profile_complete",
        name: "Profile Master",
        description: "Completed your profile 100%",
        icon: "star",
        category: "milestone",
      });
    }
  }
});

const User = mongoose.model("User", userSchema);

module.exports = User;
