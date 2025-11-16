const User = require("../models/User");
const Post = require("../models/Post");
const Entry = require("../models/Entry");
const MarketplaceBook = require("../models/MarketplaceBook");
const Comment = require("../models/Comment");
const AdminSettings = require("../models/AdminSettings");
const { notifyNewUser } = require("../services/notificationService");

// Dashboard Stats
const getDashboardStats = async (req, res) => {
  try {
    const { period = "7" } = req.query; // days
    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Get total counts
    const [
      totalUsers,
      totalPosts,
      totalEntries,
      totalBooks,
      totalRevenue,
      activeUsers,
      newUsers,
      newPosts,
    ] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Entry.countDocuments(),
      MarketplaceBook.countDocuments(),
      MarketplaceBook.aggregate([
        { $match: { status: "sold" } },
        { $group: { _id: null, total: { $sum: "$price" } } },
      ]),
      User.countDocuments({
        lastActive: { $gte: startDate },
      }),
      User.countDocuments({
        createdAt: { $gte: startDate },
      }),
      Post.countDocuments({
        createdAt: { $gte: startDate },
      }),
    ]);

    // User growth data (last 7 days)
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Revenue trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const revenueTrends = await MarketplaceBook.aggregate([
      {
        $match: {
          status: "sold",
          updatedAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" },
          },
          revenue: { $sum: "$price" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Popular categories
    const popularCategories = await Post.aggregate([
      { $unwind: "$tags" },
      {
        $group: {
          _id: "$tags",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]);

    // Activity timeline (posts and entries by hour)
    const activityTimeline = await Post.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $hour: "$createdAt",
          },
          posts: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Top posts by engagement
    const topPosts = await Post.find({
      createdAt: { $gte: startDate },
    })
      .sort({ likes: -1, comments: -1 })
      .limit(10)
      .populate("author", "username displayName profileImage")
      .lean();

    // Mood distribution from entries
    const moodDistribution = await Entry.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          mood: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$mood",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const totalMoodEntries = moodDistribution.reduce(
      (sum, item) => sum + item.count,
      0
    );

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalPosts,
          totalEntries,
          totalBooks,
          totalRevenue: totalRevenue[0]?.total || 0,
          activeUsers,
          newUsers,
          newPosts,
        },
        charts: {
          userGrowth: userGrowth.map((item) => ({
            date: item._id,
            users: item.count,
          })),
          revenueTrends: revenueTrends.map((item) => ({
            date: item._id,
            revenue: item.revenue,
          })),
          popularCategories: popularCategories.map((item) => ({
            name: item._id,
            value: item.count,
          })),
          activityTimeline: activityTimeline.map((item) => ({
            hour: item._id,
            posts: item.posts,
          })),
        },
        analytics: {
          community: {
            topPosts: topPosts.map((post) => ({
              id: post._id,
              title: post.title,
              summary: post.summary,
              type: post.type || "post",
              author: post.author
                ? {
                    _id: post.author._id?.toString(),
                    username: post.author.username || "unknown",
                    displayName:
                      post.author.displayName ||
                      post.author.username ||
                      "Unknown User",
                    profileImage: post.author.profileImage || null,
                  }
                : {
                    _id: null,
                    username: "unknown",
                    displayName: "Unknown User",
                    profileImage: null,
                  },
              likes: post.likes?.length || 0,
              comments: post.comments?.length || 0,
              shares: post.shares?.length || 0,
              created: new Date(post.createdAt).toLocaleDateString(),
            })),
          },
          mood: {
            distribution: moodDistribution.map((item) => ({
              label: item._id,
              count: item.count,
              percentage:
                totalMoodEntries > 0
                  ? Math.round((item.count / totalMoodEntries) * 100)
                  : 0,
            })),
          },
        },
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
      error: error.message,
    });
  }
};

// User Management

// Get all users with pagination and filters
const getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      status = "all",
      role = "all",
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const query = {};

    // Search filter
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { displayName: { $regex: search, $options: "i" } },
      ];
    }

    // Status filter
    if (status !== "all") {
      if (status === "active") {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        query.lastActive = { $gte: sevenDaysAgo };
      } else if (status === "banned") {
        query.isBanned = true;
      }
    }

    // Role filter
    if (role !== "all") {
      query.role = role;
    }

    const skip = (page - 1) * limit;
    const sortOrder = order === "desc" ? -1 : 1;

    const [users, total, totalActive, totalBanned] = await Promise.all([
      User.find(query)
        .select("-password")
        .sort({ [sortBy]: sortOrder })
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      User.countDocuments(query),
      User.countDocuments({
        lastActive: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      User.countDocuments({ isBanned: true }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
        stats: {
          total: await User.countDocuments(),
          active: totalActive,
          banned: totalBanned,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

// Get user details
const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("-password").lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get user activity stats
    const [postsCount, entriesCount, commentsCount, booksCount] =
      await Promise.all([
        Post.countDocuments({ author: userId }),
        Entry.countDocuments({ user: userId }),
        Comment.countDocuments({ user: userId }),
        MarketplaceBook.countDocuments({ seller: userId }),
      ]);

    res.status(200).json({
      success: true,
      data: {
        ...user,
        activity: {
          posts: postsCount,
          entries: entriesCount,
          comments: commentsCount,
          books: booksCount,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user details",
      error: error.message,
    });
  }
};

// Ban user
const banUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        isBanned: true,
        banReason: reason || "Violated community guidelines",
        bannedAt: new Date(),
      },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User banned successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error banning user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to ban user",
      error: error.message,
    });
  }
};

// Unban user
const unbanUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        isBanned: false,
        banReason: null,
        bannedAt: null,
      },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User unbanned successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error unbanning user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unban user",
      error: error.message,
    });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user is an admin
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Cannot delete admin users",
      });
    }

    // Delete user and their content
    await Promise.all([
      User.findByIdAndDelete(userId),
      Post.deleteMany({ author: userId }),
      Entry.deleteMany({ user: userId }),
      Comment.deleteMany({ user: userId }),
    ]);

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message,
    });
  }
};

// Admin Management

// Get all admins
const getAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" })
      .select("-password")
      .sort({ createdAt: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: admins,
    });
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch admins",
      error: error.message,
    });
  }
};

// Create admin
const createAdmin = async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email or username already exists",
      });
    }

    // Create new admin
    const admin = await User.create({
      username,
      email,
      password,
      displayName: displayName || username,
      role: "admin",
      isVerified: true,
    });

    // Remove password from response
    const adminData = admin.toObject();
    delete adminData.password;

    res.status(201).json({
      success: true,
      message: "Admin created successfully",
      data: adminData,
    });
  } catch (error) {
    console.error("Error creating admin:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create admin",
      error: error.message,
    });
  }
};

// Delete admin
const deleteAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;

    // Find first admin (cannot be deleted)
    const firstAdmin = await User.findOne({ role: "admin" }).sort({
      createdAt: 1,
    });

    if (firstAdmin && firstAdmin._id.toString() === adminId) {
      return res.status(403).json({
        success: false,
        message: "Cannot delete the first admin",
      });
    }

    await User.findByIdAndDelete(adminId);

    res.status(200).json({
      success: true,
      message: "Admin deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting admin:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete admin",
      error: error.message,
    });
  }
};

// Settings Management

// Get settings
const getSettings = async (req, res) => {
  try {
    const { category } = req.query;

    if (category) {
      let settings = await AdminSettings.findOne({ category });

      // If settings don't exist, create default
      if (!settings) {
        const defaultSettings = AdminSettings.getDefaultSettings();
        settings = await AdminSettings.create({
          category,
          settings: defaultSettings[category],
        });
      }

      return res.status(200).json({
        success: true,
        data: settings,
      });
    }

    // Get all settings
    const allSettings = await AdminSettings.find();
    const settingsMap = {};

    allSettings.forEach((setting) => {
      settingsMap[setting.category] = setting.settings;
    });

    // Fill in defaults for missing categories
    const defaultSettings = AdminSettings.getDefaultSettings();
    Object.keys(defaultSettings).forEach((cat) => {
      if (!settingsMap[cat]) {
        settingsMap[cat] = defaultSettings[cat];
      }
    });

    res.status(200).json({
      success: true,
      data: settingsMap,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch settings",
      error: error.message,
    });
  }
};

// Update settings
const updateSettings = async (req, res) => {
  try {
    const { category, settings } = req.body;

    const updated = await AdminSettings.findOneAndUpdate(
      { category },
      {
        settings,
        lastModifiedBy: req.user._id,
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update settings",
      error: error.message,
    });
  }
};

module.exports = {
  getDashboardStats,
  getUsers,
  getUserDetails,
  banUser,
  unbanUser,
  deleteUser,
  getAdmins,
  createAdmin,
  deleteAdmin,
  getSettings,
  updateSettings,
};
