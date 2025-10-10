const mongoose = require("mongoose");
const Post = require("../models/Post");
const User = require("../models/User");
const Comment = require("../models/Comment");
const TrendingHashtag = require("../models/TrendingHashtag");
const Media = require("../models/Media");
const cloudinary = require("../services/cloudinary");

const generatePollOptionId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const calculateReadTime = (text = "") => {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (!words) return 1;
  return Math.max(1, Math.ceil(words / 200));
};

const parseArrayPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (typeof payload === "string" && payload.trim()) {
    try {
      const parsed = JSON.parse(payload);
      return Array.isArray(parsed) ? parsed : [payload];
    } catch (error) {
      return payload
        .split(/[,\n]/)
        .map((value) => value.trim())
        .filter(Boolean);
    }
  }
  return [];
};

const toBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalised = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalised)) return true;
    if (["false", "0", "no", "off", ""].includes(normalised)) return false;
  }
  return false;
};

const collectHashtags = (targetSet, ...sources) => {
  sources.filter(Boolean).forEach((chunk) => {
    const matches = chunk.match(/#[a-zA-Z0-9_]+/g) || [];
    matches.forEach((tag) => targetSet.add(tag.replace("#", "").toLowerCase()));
  });
  return targetSet;
};

const uploadAsset = async (file, userId, folder) => {
  if (!file) return null;

  const result = await cloudinary.uploader.upload(file.path, {
    folder,
    resource_type: "auto",
  });

  const media = new Media({
    owner: userId,
    url: result.secure_url,
    type: result.resource_type,
    public_id: result.public_id,
    size: file.size,
  });

  const savedMedia = await media.save();
  return { media: savedMedia, url: result.secure_url };
};

const buildPollResponse = (post, viewerId) => {
  if (!post?.poll?.options?.length) return null;

  const viewerIdString = viewerId?.toString();
  const totalVotes =
    post.poll.totalVotes ??
    post.poll.options.reduce(
      (total, option) => total + (option.votes || option.voters?.length || 0),
      0
    );
  const now = new Date();
  const isExpired = post.poll.expiresAt
    ? new Date(post.poll.expiresAt) < now
    : false;

  const options = post.poll.options.map((option) => {
    const optionVotes = option.votes || option.voters?.length || 0;
    const percentage = totalVotes
      ? Math.round((optionVotes / totalVotes) * 1000) / 10
      : 0;
    const isOptionVoted = option.voters?.some(
      (voter) => voter?.toString() === viewerIdString
    );

    return {
      id: option.id,
      text: option.text,
      votes: optionVotes,
      percentage,
      isVotedByCurrentUser: Boolean(isOptionVoted),
    };
  });

  const hasVoted = options.some((option) => option.isVotedByCurrentUser);

  return {
    question: post.poll.question,
    allowMultiple: Boolean(post.poll.allowMultiple),
    expiresAt: post.poll.expiresAt,
    isExpired,
    totalVotes,
    hasVoted,
    options,
  };
};

// Get community feed with enhanced data
const getCommunityFeed = async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = "latest", filter = "all" } = req.query;
    const skip = (page - 1) * limit;

    let sortOptions = {};
    switch (sort) {
      case "trending":
        sortOptions = { "likes.length": -1, createdAt: -1 };
        break;
      case "popular":
        sortOptions = { views: -1, "likes.length": -1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    let filterOptions = { visibility: "public" };
    let followingIds = [];

    if (filter === "following") {
      const viewer = await User.findById(req.user._id).select("following");
      followingIds = viewer?.following?.map((f) => f.user) || [];

      if (!followingIds.length) {
        return res.json({
          posts: [],
          pagination: {
            currentPage: parseInt(page),
            totalPages: 0,
            totalPosts: 0,
            hasNext: false,
            hasPrev: false,
          },
        });
      }

      filterOptions.author = { $in: followingIds };
    } else if (filter === "images") {
      filterOptions.media = { $exists: true, $ne: [] };
    } else if (filter === "text") {
      filterOptions.postType = { $in: ["text", "article", "poll"] };
    } else if (filter !== "all") {
      filterOptions.hashtags = { $in: [filter] };
    }

    const posts = await Post.find(filterOptions)
      .populate(
        "author",
        "username displayName bio profileImage followers isVerified"
      )
      .populate("media")
      .populate("article.coverImage.media")
      .populate("event.banner.media")
      .populate("comments", "content author createdAt")
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Add engagement stats to each post
    const postsWithStats = posts.map((post) => {
      const likesCount = post.likes?.length || 0;
      const sharesCount = post.shares?.length || 0;
      const commentsCount = post.comments?.length || 0;
      const authorFollowersCount = post.author?.followers?.length || 0;
      const isLikedByUser =
        post.likes?.some(
          (like) => like.user?.toString() === req.user._id.toString()
        ) || false;

      const formattedPost = {
        ...post,
        likesCount,
        sharesCount,
        commentsCount,
        authorFollowersCount,
        isLikedByUser,
      };

      if (post.postType === "poll") {
        const pollPayload = buildPollResponse(post, req.user._id);
        if (pollPayload) {
          formattedPost.poll = pollPayload;
        }
      }

      if (post.postType === "article" && post.article) {
        formattedPost.article = {
          title: post.article.title,
          summary: post.article.summary,
          body: post.article.body,
          coverImage: post.article.coverImage
            ? {
                url:
                  post.article.coverImage.url ||
                  post.article.coverImage.media?.url ||
                  null,
                mediaId: post.article.coverImage.media?._id || null,
              }
            : null,
          readTimeMinutes:
            post.article.readTimeMinutes ||
            calculateReadTime(post.article.body || ""),
        };
      }

      if (post.postType === "event" && post.event) {
        const startDate = post.event.start ? new Date(post.event.start) : null;
        const endDate = post.event.end ? new Date(post.event.end) : null;
        const now = new Date();
        const attendees = post.event.attendees || [];

        const availableSpots =
          post.event.capacity && post.event.capacity > 0
            ? Math.max(post.event.capacity - attendees.length, 0)
            : null;
        const isAttending = attendees.some(
          (attendee) =>
            attendee.user?.toString() === req.user._id.toString() ||
            attendee?.toString() === req.user._id.toString()
        );

        formattedPost.event = {
          title: post.event.title,
          description: post.event.description,
          location: post.event.location,
          isVirtual: Boolean(post.event.isVirtual),
          capacity: post.event.capacity,
          start: post.event.start,
          end: post.event.end,
          banner: post.event.banner
            ? {
                url:
                  post.event.banner.url || post.event.banner.media?.url || null,
                mediaId: post.event.banner.media?._id || null,
              }
            : null,
          attendeesCount: attendees.length,
          availableSpots,
          isAttending,
          isLive:
            Boolean(startDate && endDate) && startDate <= now && endDate >= now,
          isPast: Boolean(endDate) && endDate < now,
        };
      }

      return formattedPost;
    });

    const totalPosts = await Post.countDocuments(filterOptions);

    res.json({
      posts: postsWithStats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalPosts / limit),
        totalPosts,
        hasNext: page * limit < totalPosts,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get community feed error:", error);
    res.status(500).json({ message: "Failed to fetch community feed" });
  }
};

// Get trending hashtags
const getTrendingHashtags = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    // Get hashtags from posts in last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const trending = await Post.aggregate([
      {
        $match: {
          createdAt: { $gte: yesterday },
          hashtags: { $exists: true, $ne: [] },
        },
      },
      { $unwind: "$hashtags" },
      {
        $group: {
          _id: "$hashtags",
          count: { $sum: 1 },
          posts: { $push: "$_id" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) },
      {
        $project: {
          hashtag: "$_id",
          count: 1,
          posts: { $slice: ["$posts", 5] },
          _id: 0,
        },
      },
    ]);

    res.json(trending);
  } catch (error) {
    console.error("Get trending hashtags error:", error);
    res.status(500).json({ message: "Failed to fetch trending hashtags" });
  }
};

// Get suggested users to follow
const getSuggestedUsers = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const currentUserId = req.user._id;
    const numericLimit = Math.max(parseInt(limit, 10) || 5, 1);

    // Get users not followed by current user, sorted by followers count
    const currentUser = await User.findById(currentUserId).select(
      "following followers"
    );
    const followingDocs = currentUser?.following || [];
    const followerDocs = currentUser?.followers || [];

    const followingIds = followingDocs.map((f) => f.user);
    followingIds.push(currentUserId); // Exclude self

    const followingSet = new Set(followingDocs.map((f) => f.user.toString()));
    const followersSet = new Set(
      followerDocs.map((f) => f.user.toString()) || []
    );

    const queryLimit = Math.max(numericLimit * 3, 15);

    const suggestedUsersRaw = await User.find({
      _id: { $nin: followingIds },
    })
      .select(
        "username displayName bio profileImage followers following isVerified"
      )
      .lean({ virtuals: true })
      .limit(queryLimit);

    // Add followers count to each user
    let usersWithStats = suggestedUsersRaw.map((user) => {
      const followers = user.followers || [];
      const following = user.following || [];
      const followersCount = followers.length;
      const mutualFollowers = followers.filter((follower) =>
        followingSet.has(follower.user?.toString())
      ).length;
      const mutualFollowing = following.filter((follow) =>
        followersSet.has(follow.user?.toString())
      ).length;
      const mutualConnections = mutualFollowers + mutualFollowing;

      return {
        ...user,
        followersCount,
        mutualConnections,
      };
    });

    const prioritized = usersWithStats
      .filter((user) => user.mutualConnections > 0)
      .sort((a, b) => {
        if (b.mutualConnections !== a.mutualConnections) {
          return b.mutualConnections - a.mutualConnections;
        }
        return b.followersCount - a.followersCount;
      });

    if (prioritized.length >= numericLimit) {
      usersWithStats = prioritized.slice(0, numericLimit);
    } else {
      const remainingNeeded = numericLimit - prioritized.length;
      const fallback = usersWithStats
        .filter((user) => user.mutualConnections === 0)
        .sort((a, b) => b.followersCount - a.followersCount)
        .slice(0, remainingNeeded);
      usersWithStats = [...prioritized, ...fallback].slice(0, numericLimit);
    }

    res.json(usersWithStats);
  } catch (error) {
    console.error("Get suggested users error:", error);
    res.status(500).json({ message: "Failed to fetch suggested users" });
  }
};

// Lightweight profile preview for community cards
const getCommunityUserPreview = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findById(userId)
      .select(
        "username displayName bio profileImage isVerified stats followers following socialLinks achievements joinedDate"
      )
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const followerCount = user.followers?.length || 0;
    const followingCount = user.following?.length || 0;
    const profileStats = user.stats || {};

    const topAchievements = Array.isArray(user.achievements)
      ? user.achievements.slice(0, 3)
      : [];

    const preview = {
      _id: user._id,
      username: user.username,
      displayName: user.displayName || user.username,
      bio: user.bio || "",
      isVerified: Boolean(user.isVerified),
      profileImage: user.profileImage || null,
      followerCount,
      followingCount,
      stats: {
        totalPosts: profileStats.totalPosts || 0,
        totalEntries: profileStats.totalEntries || 0,
        totalReads: profileStats.totalReads || 0,
        engagementRate: profileStats.engagementRate || 0,
      },
      socialLinks: {
        website: user.socialLinks?.website || null,
        instagram: user.socialLinks?.instagram || null,
        twitter: user.socialLinks?.twitter || null,
        linkedin: user.socialLinks?.linkedin || null,
      },
      achievements: topAchievements,
      joinedDate: user.joinedDate,
    };

    res.json(preview);
  } catch (error) {
    console.error("Get community user preview error:", error);
    res.status(500).json({ message: "Failed to fetch profile preview" });
  }
};

// Follow/Unfollow user
const toggleFollowUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (userId === currentUserId.toString()) {
      return res.status(400).json({ message: "Cannot follow yourself" });
    }

    const [currentUser, targetUser] = await Promise.all([
      User.findById(currentUserId),
      User.findById(userId),
    ]);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const isFollowing = currentUser.following.some(
      (f) => f.user.toString() === userId
    );

    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(
        (f) => f.user.toString() !== userId
      );
      targetUser.followers = targetUser.followers.filter(
        (f) => f.user.toString() !== currentUserId.toString()
      );
    } else {
      // Follow
      currentUser.following.push({ user: userId });
      targetUser.followers.push({ user: currentUserId });
    }

    await Promise.all([currentUser.save(), targetUser.save()]);

    res.json({
      isFollowing: !isFollowing,
      followersCount: targetUser.followers.length,
      message: isFollowing
        ? "Unfollowed successfully"
        : "Following successfully",
    });
  } catch (error) {
    console.error("Toggle follow error:", error);
    res.status(500).json({ message: "Failed to update follow status" });
  }
};

// Get community insights/stats
const getCommunityInsights = async (req, res) => {
  try {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalPosts,
      totalPostsThisWeek,
      totalPostsThisMonth,
      totalUsers,
      activeUsersToday,
      newUsersToday,
      totalLikes,
      totalComments,
      totalShares,
      topUsers,
      recentPosts,
    ] = await Promise.all([
      // Total posts count
      Post.countDocuments(),

      // Posts this week
      Post.countDocuments({ createdAt: { $gte: weekAgo } }),

      // Posts this month
      Post.countDocuments({ createdAt: { $gte: monthAgo } }),

      // Total users count
      User.countDocuments(),

      // Active users today (users who posted or commented today)
      User.countDocuments({
        $or: [
          { lastActive: { $gte: yesterday } },
          { createdAt: { $gte: yesterday } },
        ],
      }),

      // New users today
      User.countDocuments({ createdAt: { $gte: yesterday } }),

      // Total likes across all posts
      Post.aggregate([
        { $project: { likesCount: { $size: "$likes" } } },
        { $group: { _id: null, total: { $sum: "$likesCount" } } },
      ]),

      // Total comments across all posts
      Post.aggregate([
        { $project: { commentsCount: { $size: "$comments" } } },
        { $group: { _id: null, total: { $sum: "$commentsCount" } } },
      ]),

      // Total shares across all posts
      Post.aggregate([
        { $project: { sharesCount: { $size: "$shares" } } },
        { $group: { _id: null, total: { $sum: "$sharesCount" } } },
      ]),

      // Top users by followers
      User.find()
        .select("username displayName profileImage followers")
        .sort({ "followers.length": -1 })
        .limit(5)
        .lean(),

      // Recent posts for activity timeline
      Post.find()
        .populate("author", "username displayName")
        .select("content author createdAt likes comments")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    // Calculate engagement metrics
    const totalEngagements =
      (totalLikes[0]?.total || 0) +
      (totalComments[0]?.total || 0) +
      (totalShares[0]?.total || 0);
    const engagementRate =
      totalPosts > 0
        ? Math.round((totalEngagements / totalPosts) * 100) / 100
        : 0;
    const growthRate =
      totalUsers > 0
        ? Math.round((newUsersToday / totalUsers) * 10000) / 100
        : 0;

    // Add follower counts to top users
    const topUsersWithStats = topUsers.map((user) => ({
      ...user,
      followersCount: user.followers?.length || 0,
    }));

    // Process recent activity for timeline
    const recentActivity = recentPosts.map((post) => ({
      _id: post._id,
      content: post.content,
      author: post.author,
      createdAt: post.createdAt,
      likesCount: post.likes?.length || 0,
      commentsCount: post.comments?.length || 0,
    }));

    const insights = {
      // Basic counts
      totalPosts,
      totalUsers,
      totalLikes: totalLikes[0]?.total || 0,
      totalComments: totalComments[0]?.total || 0,
      totalShares: totalShares[0]?.total || 0,
      totalEngagements,

      // Daily metrics
      activeUsersToday,
      newUsersToday,

      // Growth metrics
      totalPostsThisWeek,
      totalPostsThisMonth,
      growthRate,
      engagementRate,

      // Top content
      topUsers: topUsersWithStats,
      recentActivity,

      // Calculated metrics
      averageLikesPerPost:
        totalPosts > 0
          ? Math.round(((totalLikes[0]?.total || 0) / totalPosts) * 100) / 100
          : 0,
      averageCommentsPerPost:
        totalPosts > 0
          ? Math.round(((totalComments[0]?.total || 0) / totalPosts) * 100) /
            100
          : 0,

      // Additional insights
      userEngagementLevel:
        activeUsersToday > 0 && totalUsers > 0
          ? Math.round((activeUsersToday / totalUsers) * 100)
          : 0,

      lastUpdated: new Date().toISOString(),
    };

    res.json(insights);
  } catch (error) {
    console.error("Get community insights error:", error);
    res.status(500).json({ message: "Failed to fetch community insights" });
  }
};

// Create post with hashtag processing
const createCommunityPost = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      postType: rawPostType = "text",
      content: rawContent = "",
      hashtags,
      visibility: rawVisibility = "public",
      pollQuestion,
      pollOptions,
      pollAllowMultiple,
      pollExpiresAt,
      articleTitle,
      articleSummary,
      articleBody,
      eventTitle,
      eventLocation,
      eventStart,
      eventEnd,
      eventDescription,
      eventCapacity,
      eventIsVirtual,
    } = req.body;

    const allowedVisibility = ["public", "followers", "private"];
    const visibility = allowedVisibility.includes(rawVisibility)
      ? rawVisibility
      : "public";

    let postType = (rawPostType || "text").toString().toLowerCase();
    if (!["text", "image", "poll", "article", "event"].includes(postType)) {
      postType = "text";
    }

    const trimmedContent = (rawContent || "").toString().trim();
    const hashtagsSet = new Set();

    const providedHashtags = parseArrayPayload(hashtags)
      .map((tag) =>
        typeof tag === "string" ? tag.trim().replace(/#/g, "") : ""
      )
      .filter(Boolean);
    providedHashtags.forEach((tag) => hashtagsSet.add(tag.toLowerCase()));

    collectHashtags(hashtagsSet, trimmedContent);

    const postData = {
      author: userId,
      postType,
      content: trimmedContent,
      visibility,
    };

    let validationError = null;

    if (postType === "text") {
      if (!trimmedContent) {
        validationError = "Share something with the community";
      }
    } else if (postType === "image") {
      if (!trimmedContent && !req.files?.image?.length) {
        validationError = "Add an image or caption to continue";
      }
    } else if (postType === "poll") {
      const question = (pollQuestion || "").toString().trim();
      const optionsRaw = parseArrayPayload(pollOptions).map((option) => {
        if (typeof option === "string") return option.trim();
        if (option && typeof option === "object" && option.text) {
          return option.text.trim();
        }
        return "";
      });
      const uniqueOptions = Array.from(
        new Set(optionsRaw.filter(Boolean))
      ).slice(0, 6);

      if (!question) {
        validationError = "Ask a question for your poll";
      } else if (uniqueOptions.length < 2) {
        validationError = "Provide at least two poll options";
      } else {
        const expiresAt = pollExpiresAt ? new Date(pollExpiresAt) : null;
        if (expiresAt && Number.isNaN(expiresAt.getTime())) {
          return res
            .status(400)
            .json({ message: "Provide a valid poll close time" });
        }

        collectHashtags(hashtagsSet, question, ...uniqueOptions);

        postData.poll = {
          question,
          allowMultiple: toBoolean(pollAllowMultiple),
          expiresAt,
          totalVotes: 0,
          options: uniqueOptions.map((text) => ({
            id: generatePollOptionId(),
            text,
            votes: 0,
            voters: [],
          })),
        };

        if (!postData.content) {
          postData.content = question;
        }
      }
    } else if (postType === "article") {
      const title = (articleTitle || "").toString().trim();
      const summary = (articleSummary || "").toString().trim();
      const body = (articleBody || "").toString().trim();

      if (!title) {
        validationError = "Add a headline for your article";
      } else if (!body) {
        validationError = "Write the article content";
      } else {
        collectHashtags(hashtagsSet, title, summary, body);

        postData.article = {
          title,
          summary,
          body,
          readTimeMinutes: calculateReadTime(body),
        };

        if (!postData.content) {
          postData.content = summary || title;
        }
      }
    } else if (postType === "event") {
      const title = (eventTitle || "").toString().trim();
      const location = (eventLocation || "").toString().trim();
      const description = (eventDescription || "").toString().trim();
      const startDate = eventStart ? new Date(eventStart) : null;
      const endDate = eventEnd ? new Date(eventEnd) : null;

      if (!title) {
        validationError = "Give your event a title";
      } else if (
        !startDate ||
        Number.isNaN(startDate.getTime()) ||
        !endDate ||
        Number.isNaN(endDate.getTime())
      ) {
        validationError = "Provide the start and end time";
      } else if (endDate < startDate) {
        validationError = "Event end time must be after the start time";
      } else {
        collectHashtags(hashtagsSet, title, location, description);

        const capacityNumber = eventCapacity
          ? Number(eventCapacity)
          : undefined;

        postData.event = {
          title,
          description,
          location,
          isVirtual: toBoolean(eventIsVirtual),
          capacity:
            Number.isFinite(capacityNumber) && capacityNumber > 0
              ? capacityNumber
              : undefined,
          start: startDate,
          end: endDate,
          attendees: [],
        };

        if (!postData.content) {
          postData.content = description || title;
        }
      }
    }

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const files = req.files || {};
    const uploadedAssets = {};

    const uploadTargets = [
      { key: "image", folder: "community_posts" },
      { key: "articleCover", folder: "community_articles" },
      { key: "eventBanner", folder: "community_events" },
    ];

    for (const target of uploadTargets) {
      const file = files?.[target.key]?.[0];
      if (!file) continue;

      try {
        const uploaded = await uploadAsset(file, userId, target.folder);
        if (uploaded) {
          uploadedAssets[target.key] = uploaded;
        }
      } catch (uploadError) {
        console.error(`Image upload failed (${target.key}):`, uploadError);
        return res.status(400).json({ message: "Image upload failed" });
      }
    }

    if (uploadedAssets.image) {
      postData.media = [uploadedAssets.image.media._id];
    }

    if (postData.article && uploadedAssets.articleCover) {
      postData.article.coverImage = {
        media: uploadedAssets.articleCover.media._id,
        url: uploadedAssets.articleCover.url,
      };
      postData.media = postData.media || [];
      postData.media.push(uploadedAssets.articleCover.media._id);
    }

    if (postData.event && uploadedAssets.eventBanner) {
      postData.event.banner = {
        media: uploadedAssets.eventBanner.media._id,
        url: uploadedAssets.eventBanner.url,
      };
      postData.media = postData.media || [];
      postData.media.push(uploadedAssets.eventBanner.media._id);
    }

    if (postType === "image" && !(postData.media && postData.media.length)) {
      return res
        .status(400)
        .json({ message: "Add at least one image to continue" });
    }

    if (!postData.content) {
      postData.content = "";
    }

    postData.hashtags = Array.from(hashtagsSet).slice(0, 15);

    if (postData.media?.length) {
      const uniqueMediaIds = Array.from(
        new Set(postData.media.map((id) => id.toString()))
      );
      postData.media = uniqueMediaIds.map(
        (id) => new mongoose.Types.ObjectId(id)
      );
    }

    const post = new Post(postData);
    const createdPost = await post.save();

    await Promise.all(
      (postData.hashtags || []).map((hashtag) =>
        TrendingHashtag.findOneAndUpdate(
          { hashtag },
          {
            $inc: { count: 1 },
            $push: { posts: createdPost._id },
            $set: { lastUpdated: new Date() },
          },
          { upsert: true, new: true }
        )
      )
    );

    const populatedPost = await Post.findById(createdPost._id)
      .populate(
        "author",
        "username displayName bio profileImage followers isVerified"
      )
      .populate("media")
      .populate("article.coverImage.media")
      .populate("event.banner.media");

    res.status(201).json(populatedPost);
  } catch (error) {
    console.error("Create community post error:", error);
    res.status(500).json({ message: "Failed to create post" });
  }
};

// Like/Unlike a post
const toggleLikePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const existingLikeIndex = post.likes.findIndex(
      (like) => like.user && like.user.toString() === userId.toString()
    );

    if (existingLikeIndex > -1) {
      // Unlike
      post.likes.splice(existingLikeIndex, 1);
    } else {
      // Like
      post.likes.push({ user: userId });
    }

    await post.save();

    res.json({
      isLiked: existingLikeIndex === -1,
      likesCount: post.likes.length,
      likes: post.likes,
    });
  } catch (error) {
    console.error("Toggle like post error:", error);
    res.status(500).json({ message: "Failed to update like status" });
  }
};

// Vote on a poll option
const voteOnPollOption = async (req, res) => {
  try {
    const { postId } = req.params;
    const { optionId } = req.body;
    const userId = req.user._id;

    if (!optionId) {
      return res.status(400).json({ message: "Select a poll option" });
    }

    const post = await Post.findById(postId);

    if (!post || post.postType !== "poll" || !post.poll?.options?.length) {
      return res.status(404).json({ message: "Poll not found" });
    }

    if (post.poll.expiresAt && new Date(post.poll.expiresAt) < new Date()) {
      return res.status(400).json({ message: "This poll has already closed" });
    }

    const viewerIdString = userId.toString();
    const targetOption = post.poll.options.find(
      (option) => option.id === optionId
    );

    if (!targetOption) {
      return res.status(404).json({ message: "Poll option not found" });
    }

    const allowMultiple = Boolean(post.poll.allowMultiple);
    const ensureArray = (arr) => (Array.isArray(arr) ? arr : []);

    if (allowMultiple) {
      targetOption.voters = ensureArray(targetOption.voters);
      const alreadySelected = targetOption.voters.some(
        (voter) => voter?.toString() === viewerIdString
      );

      if (alreadySelected) {
        targetOption.voters = targetOption.voters.filter(
          (voter) => voter?.toString() !== viewerIdString
        );
      } else {
        targetOption.voters.push(userId);
      }
    } else {
      post.poll.options.forEach((option) => {
        option.voters = ensureArray(option.voters).filter(
          (voter) => voter?.toString() !== viewerIdString
        );
      });
      targetOption.voters = ensureArray(targetOption.voters);
      targetOption.voters.push(userId);
    }

    post.poll.options.forEach((option) => {
      option.votes = option.voters?.length || 0;
    });
    post.poll.totalVotes = post.poll.options.reduce(
      (total, option) => total + (option.votes || 0),
      0
    );

    post.markModified("poll");
    await post.save();

    const pollPayload = buildPollResponse(post.toObject(), userId);

    res.json({ poll: pollPayload });
  } catch (error) {
    console.error("Vote on poll option error:", error);
    res.status(500).json({ message: "Failed to record poll vote" });
  }
};

// Share a post
const sharePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const existingShareIndex = post.shares.findIndex(
      (share) => share.user.toString() === userId.toString()
    );

    if (existingShareIndex === -1) {
      post.shares.push({ user: userId });
      await post.save();
    }

    res.json({
      sharesCount: post.shares.length,
      message: "Post shared successfully",
    });
  } catch (error) {
    console.error("Share post error:", error);
    res.status(500).json({ message: "Failed to share post" });
  }
};

// Add comment to post
const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { text, parentCommentId } = req.body;
    const userId = req.user._id;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const commentData = {
      post: postId,
      author: userId,
      text: text.trim(),
    };

    // Handle reply to another comment
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({ message: "Parent comment not found" });
      }
      commentData.parentComment = parentCommentId;
    }

    const comment = new Comment(commentData);
    const savedComment = await comment.save();

    // Add comment to post (only top-level comments)
    if (!parentCommentId) {
      post.comments.push(savedComment._id);
      await post.save();
    }

    // If it's a reply, add to parent comment's replies
    if (parentCommentId) {
      await Comment.findByIdAndUpdate(parentCommentId, {
        $push: { replies: savedComment._id },
      });
    }

    const populatedComment = await Comment.findById(savedComment._id)
      .populate("author", "username displayName profileImage")
      .populate({
        path: "replies",
        populate: {
          path: "author",
          select: "username displayName profileImage",
        },
        options: { sort: { createdAt: 1 } },
      });

    res.status(201).json(populatedComment);
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({ message: "Failed to add comment" });
  }
};

// Get comments for a post
const getPostComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const comments = await Comment.find({
      post: postId,
      parentComment: null, // Only top-level comments
    })
      .populate("author", "username displayName profileImage")
      .populate({
        path: "replies",
        populate: {
          path: "author",
          select: "username displayName profileImage",
        },
        options: { sort: { createdAt: 1 } },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalComments = await Comment.countDocuments({
      post: postId,
      parentComment: null,
    });

    // Also get the total count including replies for statistics
    const totalWithReplies = await Comment.countDocuments({
      post: postId,
    });

    res.json({
      comments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalComments / limit),
        totalComments,
        totalWithReplies,
        hasNext: page * limit < totalComments,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get post comments error:", error);
    res.status(500).json({ message: "Failed to fetch comments" });
  }
};

// Like/Unlike a comment
const toggleLikeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const existingLikeIndex = comment.likes.findIndex(
      (like) => like && like.toString() === userId.toString()
    );

    if (existingLikeIndex > -1) {
      // Unlike
      comment.likes.splice(existingLikeIndex, 1);
    } else {
      // Like
      comment.likes.push(userId);
    }

    await comment.save();

    res.json({
      isLiked: existingLikeIndex === -1,
      likesCount: comment.likes.length,
    });
  } catch (error) {
    console.error("Toggle like comment error:", error);
    res.status(500).json({ message: "Failed to update comment like status" });
  }
};

// Get basic stats (lightweight endpoint for preventing 429 errors)
const getBasicStats = async (req, res) => {
  try {
    const [totalUsers, totalPosts] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
    ]);

    res.json({
      totalUsers,
      totalPosts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get basic stats error:", error);
    res.status(500).json({ message: "Failed to fetch basic stats" });
  }
};

// Delete a post (only by author)
const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if user is the author of the post
    if (post.author.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "You can only delete your own posts" });
    }

    // Delete associated media from cloudinary if exists
    if (post.media && post.media.length > 0) {
      try {
        for (const mediaId of post.media) {
          const media = await Media.findById(mediaId);
          if (media && media.public_id) {
            await cloudinary.uploader.destroy(media.public_id);
          }
          await Media.findByIdAndDelete(mediaId);
        }
      } catch (mediaError) {
        console.error("Error deleting media:", mediaError);
        // Continue with post deletion even if media deletion fails
      }
    }

    // Delete all comments associated with the post
    await Comment.deleteMany({ post: postId });

    // Delete the post
    await Post.findByIdAndDelete(postId);

    // Update trending hashtags (decrement count)
    if (post.hashtags && post.hashtags.length > 0) {
      for (const hashtag of post.hashtags) {
        await TrendingHashtag.findOneAndUpdate(
          { hashtag },
          {
            $inc: { count: -1 },
            $pull: { posts: postId },
            $set: { lastUpdated: new Date() },
          }
        );
      }
    }

    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({ message: "Failed to delete post" });
  }
};

module.exports = {
  getCommunityFeed,
  getTrendingHashtags,
  getSuggestedUsers,
  toggleFollowUser,
  getCommunityInsights,
  createCommunityPost,
  toggleLikePost,
  voteOnPollOption,
  sharePost,
  addComment,
  getPostComments,
  toggleLikeComment,
  getBasicStats,
  deletePost,
  getCommunityUserPreview,
};
