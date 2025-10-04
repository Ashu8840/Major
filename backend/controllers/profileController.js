const mongoose = require("mongoose");
const User = require("../models/User");
const Entry = require("../models/Entry");
const Post = require("../models/Post");
const Story = require("../models/Story");
const Comment = require("../models/Comment");
const Book = require("../models/Book");
const cloudinary = require("../services/cloudinary");
const multer = require("multer");

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const resolveTargetUser = async (identifier, currentUserId) => {
  const baseSelect = "-passwordHash -resetToken -resetTokenExpiry";

  if (!identifier || identifier === "me") {
    return User.findById(currentUserId)
      .select(baseSelect)
      .lean({ virtuals: true });
  }

  const trimmedIdentifier =
    typeof identifier === "string" ? identifier.trim() : identifier;
  let targetUser = null;

  if (trimmedIdentifier && mongoose.Types.ObjectId.isValid(trimmedIdentifier)) {
    targetUser = await User.findById(trimmedIdentifier)
      .select(baseSelect)
      .lean({ virtuals: true });
    if (targetUser) return targetUser;
  }

  if (trimmedIdentifier) {
    const escapedIdentifier = escapeRegex(trimmedIdentifier);
    const orConditions = [
      { userId: trimmedIdentifier },
      { username: { $regex: new RegExp(`^${escapedIdentifier}$`, "i") } },
    ];

    targetUser = await User.findOne({ $or: orConditions })
      .select(baseSelect)
      .lean({ virtuals: true });
  }

  return targetUser;
};

const buildVisibilityFilter = (contentType, isOwnProfile, isFollowing) => {
  if (isOwnProfile) return {};

  switch (contentType) {
    case "entry":
      // Entries are either public or private, only share public entries
      return { visibility: "public" };
    case "post":
    case "story":
      return {
        visibility: isFollowing ? { $in: ["public", "followers"] } : "public",
      };
    case "book":
      return {
        visibility: isFollowing
          ? { $in: ["public", "followers", "collaborators"] }
          : { $in: ["public"] },
      };
    default:
      return {};
  }
};

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const identifier = req.params.userId || "me";
    const currentUserId = req.user?._id;

    if (!currentUserId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const targetUser = await resolveTargetUser(identifier, currentUserId);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentUserIdStr = currentUserId.toString();
    const targetUserIdStr = targetUser._id.toString();
    const isOwnProfile = targetUserIdStr === currentUserIdStr;

    const followerCount =
      targetUser.followerCount ?? (targetUser.followers?.length || 0);
    const followingCount =
      targetUser.followingCount ?? (targetUser.following?.length || 0);
    const isFollowing =
      !isOwnProfile &&
      (targetUser.followers || []).some(
        (follower) => follower.user?.toString() === currentUserIdStr
      );

    const profileVisibility =
      targetUser.preferences?.privacy?.profileVisibility || "public";
    const canViewProfile =
      isOwnProfile ||
      profileVisibility === "public" ||
      (profileVisibility === "followers" && isFollowing);

    if (!canViewProfile) {
      return res.status(403).json({ message: "Profile is private" });
    }

    const targetObjectId = new mongoose.Types.ObjectId(targetUser._id);

    const [
      entriesCount,
      postsCount,
      storiesCount,
      booksCount,
      commentsCount,
      entryViewAggregate,
      storyReadAggregate,
      postViewAggregate,
    ] = await Promise.all([
      Entry.countDocuments({ author: targetObjectId }),
      Post.countDocuments({ author: targetObjectId }),
      Story.countDocuments({ author: targetObjectId }),
      Book.countDocuments({ author: targetObjectId }),
      Comment.countDocuments({ author: targetObjectId }),
      Entry.aggregate([
        { $match: { author: targetObjectId } },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$views", 0] } } } },
      ]),
      Story.aggregate([
        { $match: { author: targetObjectId } },
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ["$stats.reads", 0] } },
          },
        },
      ]),
      Post.aggregate([
        { $match: { author: targetObjectId } },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$views", 0] } } } },
      ]),
    ]);

    const totalEntryViews = entryViewAggregate[0]?.total || 0;
    const totalStoryReads = storyReadAggregate[0]?.total || 0;
    const totalPostViews = postViewAggregate[0]?.total || 0;
    const totalReads =
      (typeof targetUser.stats?.totalReads === "number"
        ? targetUser.stats.totalReads
        : 0) || totalStoryReads + totalEntryViews;

    const visibilityFilters = {
      entries: buildVisibilityFilter("entry", isOwnProfile, isFollowing),
      posts: buildVisibilityFilter("post", isOwnProfile, isFollowing),
      stories: buildVisibilityFilter("story", isOwnProfile, isFollowing),
      books: buildVisibilityFilter("book", isOwnProfile, isFollowing),
    };

    const [recentEntries, recentPosts, recentStories, recentBooks] =
      await Promise.all([
        Entry.find({ author: targetObjectId, ...visibilityFilters.entries })
          .sort({ createdAt: -1 })
          .limit(3)
          .populate({ path: "media", select: "url thumbUrl type" })
          .lean(),
        Post.find({ author: targetObjectId, ...visibilityFilters.posts })
          .sort({ createdAt: -1 })
          .limit(3)
          .populate({ path: "media", select: "url thumbUrl type" })
          .populate({ path: "comments", select: "_id" })
          .lean(),
        Story.find({ author: targetObjectId, ...visibilityFilters.stories })
          .sort({ createdAt: -1 })
          .limit(3)
          .lean(),
        Book.find({ author: targetObjectId, ...visibilityFilters.books })
          .sort({ createdAt: -1 })
          .limit(3)
          .lean(),
      ]);

    const stats = {
      totalEntries: entriesCount,
      totalPosts: postsCount,
      totalStories: storiesCount,
      totalBooks: booksCount,
      totalComments: commentsCount,
      totalReads,
      totalViews: totalEntryViews + totalPostViews,
      dayStreak: targetUser.stats?.dayStreak || { current: 0, longest: 0 },
      engagementRate: targetUser.analytics?.engagementRate || 0,
    };

    const contentCounts = {
      entries: entriesCount,
      posts: postsCount,
      stories: storiesCount,
      books: booksCount,
    };

    const baseProfile = {
      ...targetUser,
      stats: {
        ...targetUser.stats,
        ...stats,
      },
      followerCount,
      followingCount,
      isFollowing,
      isOwnProfile,
      contentCounts,
      contentPreview: {
        entries: recentEntries,
        posts: recentPosts,
        stories: recentStories,
        books: recentBooks,
      },
      lastSyncedAt: new Date(),
    };

    if (!isOwnProfile) {
      // Remove sensitive fields when viewing someone else's profile
      delete baseProfile.favorites;
      if (baseProfile.analytics) {
        delete baseProfile.analytics.monthlyStats;
      }
    }

    res.json(baseProfile);
  } catch (error) {
    console.error("Get user profile error:", error);
    res.status(500).json({ message: "Failed to fetch user profile" });
  }
};

// Update user profile
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const updates = req.body;

    // Validate allowed fields
    const allowedFields = [
      "displayName",
      "bio",
      "address",
      "socialLinks",
      "preferences",
    ];

    const updateData = {};
    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        updateData[key] = updates[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

// Upload profile image
const uploadProfileImage = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "profile_images",
          public_id: `profile_${userId}`,
          overwrite: true,
          transformation: [
            { width: 400, height: 400, crop: "fill", gravity: "face" },
            { quality: "auto", fetch_format: "auto" },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    // Update user profile image
    const user = await User.findByIdAndUpdate(
      userId,
      {
        profileImage: {
          url: result.secure_url,
          cloudinaryId: result.public_id,
        },
      },
      { new: true }
    ).select("-passwordHash");

    res.json({
      message: "Profile image updated successfully",
      profileImage: user.profileImage,
    });
  } catch (error) {
    console.error("Upload profile image error:", error);
    res.status(500).json({ message: "Failed to upload profile image" });
  }
};

// Upload cover photo
const uploadCoverPhoto = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "cover_photos",
          public_id: `cover_${userId}`,
          overwrite: true,
          transformation: [
            { width: 1200, height: 400, crop: "fill" },
            { quality: "auto", fetch_format: "auto" },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    // Update user cover photo
    const user = await User.findByIdAndUpdate(
      userId,
      {
        coverPhoto: {
          url: result.secure_url,
          cloudinaryId: result.public_id,
        },
      },
      { new: true }
    ).select("-passwordHash");

    res.json({
      message: "Cover photo updated successfully",
      coverPhoto: user.coverPhoto,
    });
  } catch (error) {
    console.error("Upload cover photo error:", error);
    res.status(500).json({ message: "Failed to upload cover photo" });
  }
};

// Follow user
const followUser = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { userId } = req.params;

    if (currentUserId.toString() === userId) {
      return res.status(400).json({ message: "Cannot follow yourself" });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    await currentUser.follow(userId);

    res.json({
      message: "User followed successfully",
      isFollowing: true,
    });
  } catch (error) {
    console.error("Follow user error:", error);
    res.status(500).json({ message: "Failed to follow user" });
  }
};

// Unfollow user
const unfollowUser = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { userId } = req.params;

    const currentUser = await User.findById(currentUserId);
    await currentUser.unfollow(userId);

    res.json({
      message: "User unfollowed successfully",
      isFollowing: false,
    });
  } catch (error) {
    console.error("Unfollow user error:", error);
    res.status(500).json({ message: "Failed to unfollow user" });
  }
};

// Get user analytics
const getUserAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const { timeframe = "year" } = req.query;

    const user = await User.findById(userId).select("analytics stats");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let analyticsData = user.analytics;

    // Filter based on timeframe
    if (timeframe === "month") {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      analyticsData.monthlyStats =
        analyticsData.monthlyStats?.filter(
          (stat) => stat.month === currentMonth && stat.year === currentYear
        ) || [];
    } else if (timeframe === "year") {
      const currentYear = new Date().getFullYear();
      analyticsData.monthlyStats =
        analyticsData.monthlyStats?.filter(
          (stat) => stat.year === currentYear
        ) || [];
    }

    res.json({
      analytics: analyticsData,
      stats: user.stats,
    });
  } catch (error) {
    console.error("Get user analytics error:", error);
    res.status(500).json({ message: "Failed to fetch analytics" });
  }
};

// Get user achievements
const getUserAchievements = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;

    const user = await User.findById(userId).select("achievements stats");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Sort achievements by date earned
    const sortedAchievements = user.achievements.sort(
      (a, b) => new Date(b.earnedAt) - new Date(a.earnedAt)
    );

    res.json({
      achievements: sortedAchievements,
      totalAchievements: sortedAchievements.length,
    });
  } catch (error) {
    console.error("Get achievements error:", error);
    res.status(500).json({ message: "Failed to fetch achievements" });
  }
};

// Add to favorites
const addToFavorites = async (req, res) => {
  try {
    const userId = req.user._id;
    const { contentId, contentType } = req.body;

    if (!["entries", "posts", "stories"].includes(contentType)) {
      return res.status(400).json({ message: "Invalid content type" });
    }

    const user = await User.findById(userId);
    await user.addToFavorites(contentId, contentType);

    res.json({ message: "Added to favorites successfully" });
  } catch (error) {
    console.error("Add to favorites error:", error);
    res.status(500).json({ message: "Failed to add to favorites" });
  }
};

// Remove from favorites
const removeFromFavorites = async (req, res) => {
  try {
    const userId = req.user._id;
    const { contentId, contentType } = req.body;

    const user = await User.findById(userId);
    await user.removeFromFavorites(contentId, contentType);

    res.json({ message: "Removed from favorites successfully" });
  } catch (error) {
    console.error("Remove from favorites error:", error);
    res.status(500).json({ message: "Failed to remove from favorites" });
  }
};

// Get user content
const getUserContent = async (req, res) => {
  try {
    const identifier = req.params.userId || "me";
    const currentUserId = req.user?._id;
    const { page = 1, limit = 10 } = req.query;
    const requestedType = (
      req.query.type || (req.path.includes("/books") ? "books" : "all")
    )
      .toString()
      .toLowerCase();

    if (!currentUserId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const targetUser = await resolveTargetUser(identifier, currentUserId);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentUserIdStr = currentUserId.toString();
    const targetObjectId = new mongoose.Types.ObjectId(targetUser._id);
    const isOwnProfile = currentUserIdStr === targetObjectId.toString();
    const isFollowing =
      !isOwnProfile &&
      (targetUser.followers || []).some(
        (follower) => follower.user?.toString() === currentUserIdStr
      );

    const profileVisibility =
      targetUser.preferences?.privacy?.profileVisibility || "public";
    const canViewProfile =
      isOwnProfile ||
      profileVisibility === "public" ||
      (profileVisibility === "followers" && isFollowing);

    if (!canViewProfile) {
      return res.status(403).json({ message: "Profile is private" });
    }

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (pageNumber - 1) * parsedLimit;

    const visibilityFilters = {
      entries: buildVisibilityFilter("entry", isOwnProfile, isFollowing),
      posts: buildVisibilityFilter("post", isOwnProfile, isFollowing),
      stories: buildVisibilityFilter("story", isOwnProfile, isFollowing),
      books: buildVisibilityFilter("book", isOwnProfile, isFollowing),
    };

    const [entryCount, postCount, storyCount, bookCount] = await Promise.all([
      Entry.countDocuments({ author: targetObjectId }),
      Post.countDocuments({ author: targetObjectId }),
      Story.countDocuments({ author: targetObjectId }),
      Book.countDocuments({ author: targetObjectId }),
    ]);

    const requestedTypes =
      requestedType === "all"
        ? ["entries", "posts", "stories", "books"]
        : [requestedType];

    const content = {
      entries: [],
      posts: [],
      stories: [],
      books: [],
    };

    const pagination = {};

    await Promise.all(
      requestedTypes.map(async (typeKey) => {
        switch (typeKey) {
          case "entries": {
            const entries = await Entry.find({
              author: targetObjectId,
              ...visibilityFilters.entries,
            })
              .sort({ createdAt: -1 })
              .skip(skip)
              .limit(parsedLimit)
              .populate({ path: "media", select: "url thumbUrl type" })
              .lean();
            content.entries = entries;
            pagination.entries = {
              total: entryCount,
              page: pageNumber,
              limit: parsedLimit,
              totalPages: Math.ceil(entryCount / parsedLimit) || 1,
            };
            break;
          }
          case "posts": {
            const posts = await Post.find({
              author: targetObjectId,
              ...visibilityFilters.posts,
            })
              .sort({ createdAt: -1 })
              .skip(skip)
              .limit(parsedLimit)
              .populate({ path: "media", select: "url thumbUrl type" })
              .populate({ path: "comments", select: "_id" })
              .lean();
            content.posts = posts;
            pagination.posts = {
              total: postCount,
              page: pageNumber,
              limit: parsedLimit,
              totalPages: Math.ceil(postCount / parsedLimit) || 1,
            };
            break;
          }
          case "stories": {
            const stories = await Story.find({
              author: targetObjectId,
              ...visibilityFilters.stories,
            })
              .sort({ createdAt: -1 })
              .skip(skip)
              .limit(parsedLimit)
              .lean();
            content.stories = stories;
            pagination.stories = {
              total: storyCount,
              page: pageNumber,
              limit: parsedLimit,
              totalPages: Math.ceil(storyCount / parsedLimit) || 1,
            };
            break;
          }
          case "books": {
            const books = await Book.find({
              author: targetObjectId,
              ...visibilityFilters.books,
            })
              .sort({ createdAt: -1 })
              .skip(skip)
              .limit(parsedLimit)
              .lean();
            content.books = books;
            pagination.books = {
              total: bookCount,
              page: pageNumber,
              limit: parsedLimit,
              totalPages: Math.ceil(bookCount / parsedLimit) || 1,
            };
            break;
          }
          default:
            break;
        }
      })
    );

    res.json({
      userId: targetObjectId.toString(),
      type: requestedType,
      isOwnProfile,
      isFollowing,
      counts: {
        entries: entryCount,
        posts: postCount,
        stories: storyCount,
        books: bookCount,
      },
      page: pageNumber,
      limit: parsedLimit,
      pagination,
      content,
      lastSyncedAt: new Date(),
    });
  } catch (error) {
    console.error("Get user content error:", error);
    res.status(500).json({ message: "Failed to fetch user content" });
  }
};

// Update user verification status (admin only)
const updateVerificationStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isVerified } = req.body;

    // Check if current user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isVerified },
      { new: true }
    ).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Award verification achievement
    if (isVerified) {
      await user.addAchievement({
        id: "verified_user",
        name: "Verified User",
        description: "Your account has been verified",
        icon: "checkmark-circle",
        category: "special",
      });
    }

    res.json({
      message: `User ${isVerified ? "verified" : "unverified"} successfully`,
      user,
    });
  } catch (error) {
    console.error("Update verification error:", error);
    res.status(500).json({ message: "Failed to update verification status" });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  uploadProfileImage: [upload.single("profileImage"), uploadProfileImage],
  uploadCoverPhoto: [upload.single("coverPhoto"), uploadCoverPhoto],
  followUser,
  unfollowUser,
  getUserAnalytics,
  getUserAchievements,
  addToFavorites,
  removeFromFavorites,
  getUserContent,
  updateVerificationStatus,
};
