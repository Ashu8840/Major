const Post = require("../models/Post");
const User = require("../models/User");
const Comment = require("../models/Comment");
const TrendingHashtag = require("../models/TrendingHashtag");
const Media = require("../models/Media");
const cloudinary = require("../services/cloudinary");

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
    if (filter !== "all") {
      filterOptions.hashtags = { $in: [filter] };
    }

    const posts = await Post.find(filterOptions)
      .populate(
        "author",
        "username displayName bio profileImage followers isVerified"
      )
      .populate("media")
      .populate("comments", "content author createdAt")
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Add engagement stats to each post
    const postsWithStats = posts.map((post) => ({
      ...post,
      likesCount: post.likes?.length || 0,
      sharesCount: post.shares?.length || 0,
      commentsCount: post.comments?.length || 0,
      authorFollowersCount: post.author?.followers?.length || 0,
      isLikedByUser:
        post.likes?.some(
          (like) => like.user?.toString() === req.user._id.toString()
        ) || false,
    }));

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
    const { limit = 10 } = req.query;

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

    // Get users not followed by current user, sorted by followers count
    const currentUser = await User.findById(currentUserId).select("following");
    const followingIds = currentUser.following.map((f) => f.user);
    followingIds.push(currentUserId); // Exclude self

    const suggestedUsers = await User.find({
      _id: { $nin: followingIds },
    })
      .select("username displayName bio profileImage followers isVerified")
      .sort({ "followers.length": -1 })
      .limit(parseInt(limit))
      .lean();

    // Add followers count to each user
    const usersWithStats = suggestedUsers.map((user) => ({
      ...user,
      followersCount: user.followers?.length || 0,
    }));

    res.json(usersWithStats);
  } catch (error) {
    console.error("Get suggested users error:", error);
    res.status(500).json({ message: "Failed to fetch suggested users" });
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
        .limit(10)
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
    const { content, hashtags, visibility = "public" } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Content is required" });
    }

    // Extract hashtags from content
    const contentHashtags = content.match(/#[a-zA-Z0-9_]+/g) || [];
    const cleanHashtags = contentHashtags.map((tag) =>
      tag.replace("#", "").toLowerCase()
    );

    // Combine with provided hashtags
    const allHashtags = [...new Set([...cleanHashtags, ...(hashtags || [])])];

    const postData = {
      author: req.user._id,
      content,
      hashtags: allHashtags,
      visibility,
    };

    // Handle image upload if provided
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "community_posts",
          resource_type: "auto",
        });

        const media = new Media({
          owner: req.user._id,
          url: result.secure_url,
          type: result.resource_type,
          public_id: result.public_id,
          size: req.file.size,
        });

        const savedMedia = await media.save();
        postData.media = [savedMedia._id];
      } catch (uploadError) {
        console.error("Image upload failed:", uploadError);
        return res.status(400).json({ message: "Image upload failed" });
      }
    }

    const post = new Post(postData);
    const createdPost = await post.save();

    // Update trending hashtags
    for (const hashtag of allHashtags) {
      await TrendingHashtag.findOneAndUpdate(
        { hashtag },
        {
          $inc: { count: 1 },
          $push: { posts: createdPost._id },
          $set: { lastUpdated: new Date() },
        },
        { upsert: true, new: true }
      );
    }

    const populatedPost = await Post.findById(createdPost._id)
      .populate("author", "username displayName bio profileImage isVerified")
      .populate("media");

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
  sharePost,
  addComment,
  getPostComments,
  toggleLikeComment,
  getBasicStats,
  deletePost,
};
