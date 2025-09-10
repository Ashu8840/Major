const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Media = require("../models/Media");
const cloudinary = require("../services/cloudinary");

const createPost = async (req, res) => {
  try {
    const { title, content, tags, visibility } = req.body;

    // Parse tags if they're sent as a string
    let parsedTags = [];
    if (tags) {
      parsedTags =
        typeof tags === "string"
          ? tags.split(",").map((tag) => tag.trim().replace("#", ""))
          : tags;
    }

    const postData = {
      author: req.user._id,
      title: title || content.slice(0, 50),
      content,
      tags: parsedTags,
      visibility: visibility || "public",
    };

    // Handle image upload if provided
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "community_posts",
          resource_type: "auto",
        });

        // Create media record
        const media = new Media({
          user: req.user._id,
          url: result.secure_url,
          type: result.resource_type,
          publicId: result.public_id,
          size: req.file.size,
          filename: req.file.originalname,
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

    // Populate media and author data in response
    const populatedPost = await Post.findById(createdPost._id)
      .populate("author", "username name email")
      .populate("media");

    res.status(201).json(populatedPost);
  } catch (error) {
    console.error("Create post error:", error);
    res.status(400).json({ message: error.message });
  }
};

const getPosts = async (req, res) => {
  try {
    const pageSize = 10;
    const page = Number(req.query.pageNumber) || 1;

    const count = await Post.countDocuments();
    const posts = await Post.find()
      .populate("author", "username name email avatar")
      .populate("media")
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    res.json({ posts, page, pages: Math.ceil(count / pageSize) });
  } catch (error) {
    console.error("Get posts error:", error);
    res.status(400).json({ message: error.message });
  }
};

const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const isLiked = post.likes.includes(req.user._id);

    if (isLiked) {
      // Unlike
      post.likes = post.likes.filter(
        (userId) => userId.toString() !== req.user._id.toString()
      );
    } else {
      // Like
      post.likes.push(req.user._id);
    }

    await post.save();
    
    res.json({
      likes: post.likes.length,
      isLiked: !isLiked,
      postId: post._id
    });
  } catch (error) {
    console.error("Like post error:", error);
    res.status(500).json({ message: error.message });
  }
};

const addComment = async (req, res) => {
  try {
    const { text, parentCommentId } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = new Comment({
      post: req.params.id,
      author: req.user._id,
      text,
      parentComment: parentCommentId || null,
    });

    await comment.save();

    // If this is a reply, add it to the parent comment's replies
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (parentComment) {
        parentComment.replies.push(comment._id);
        await parentComment.save();
      }
    }

    const populatedComment = await Comment.findById(comment._id)
      .populate("author", "username displayName profileImage")
      .populate({
        path: "replies",
        populate: {
          path: "author",
          select: "username displayName profileImage"
        }
      });

    res.status(201).json(populatedComment);
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({ message: error.message });
  }
};

const likeComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const isLiked = comment.likes.includes(req.user._id);

    if (isLiked) {
      // Unlike
      comment.likes = comment.likes.filter(
        (userId) => userId.toString() !== req.user._id.toString()
      );
    } else {
      // Like
      comment.likes.push(req.user._id);
    }

    await comment.save();
    
    res.json({
      likes: comment.likes.length,
      isLiked: !isLiked,
      commentId: comment._id
    });
  } catch (error) {
    console.error("Like comment error:", error);
    res.status(500).json({ message: error.message });
  }
};

const getComments = async (req, res) => {
  try {
    const comments = await Comment.find({ 
      post: req.params.id, 
      parentComment: null 
    })
      .populate("author", "username displayName profileImage")
      .populate({
        path: "replies",
        populate: {
          path: "author",
          select: "username displayName profileImage"
        }
      })
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({ message: error.message });
  }
};

const searchPosts = async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const searchRegex = new RegExp(q, 'i');
    
    const posts = await Post.find({
      $or: [
        { title: searchRegex },
        { content: searchRegex },
        { tags: { $in: [searchRegex] } }
      ]
    })
      .populate({
        path: "author",
        select: "username displayName profileImage",
        match: {
          $or: [
            { username: searchRegex },
            { displayName: searchRegex }
          ]
        }
      })
      .populate("media")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    // Filter out posts where author didn't match the search if searching by username
    const filteredPosts = posts.filter(post => 
      post.author || 
      post.title.match(searchRegex) || 
      post.content.match(searchRegex) ||
      post.tags.some(tag => tag.match(searchRegex))
    );

    res.json({
      posts: filteredPosts,
      page: Number(page),
      hasMore: filteredPosts.length === Number(limit)
    });
  } catch (error) {
    console.error("Search posts error:", error);
    res.status(500).json({ message: error.message });
  }
};

const getTrendingPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    // Get posts from the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const posts = await Post.find({
      createdAt: { $gte: oneDayAgo }
    })
      .populate("author", "username displayName profileImage")
      .populate("media")
      .sort({ 
        likesCount: -1, // Sort by likes count (we'll add this virtual field)
        createdAt: -1 
      })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    // Sort by actual likes length since we don't have a virtual field yet
    const sortedPosts = posts.sort((a, b) => b.likes.length - a.likes.length);

    res.json({
      posts: sortedPosts,
      page: Number(page),
      hasMore: posts.length === Number(limit)
    });
  } catch (error) {
    console.error("Get trending posts error:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { 
  createPost, 
  getPosts, 
  likePost, 
  addComment, 
  likeComment, 
  getComments, 
  searchPosts, 
  getTrendingPosts 
};
