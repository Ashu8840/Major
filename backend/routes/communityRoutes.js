const express = require("express");
const {
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
} = require("../controllers/communityController");
const { protect } = require("../middlewares/authMiddleware");
const multer = require("multer");
const path = require("path");

const router = express.Router();

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, "uploads/");
  },
  filename(req, file, cb) {
    cb(null, `community-${Date.now()}${path.extname(file.originalname)}`);
  },
});

function checkFileType(file, cb) {
  const filetypes = /jpg|jpeg|png|gif|webp/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb("Images only!");
  }
}

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

// Community routes
router.route("/feed").get(protect, getCommunityFeed);
router.route("/trending").get(protect, getTrendingHashtags);
router.route("/suggested-users").get(protect, getSuggestedUsers);
router.route("/follow/:userId").post(protect, toggleFollowUser);
router.route("/insights").get(protect, getCommunityInsights);
router.route("/stats").get(protect, getBasicStats);
router
  .route("/post")
  .post(protect, upload.single("image"), createCommunityPost);

// Post interaction routes
router.route("/post/:postId/like").post(protect, toggleLikePost);
router.route("/post/:postId/share").post(protect, sharePost);
router.route("/post/:postId").delete(protect, deletePost);
router
  .route("/post/:postId/comments")
  .get(protect, getPostComments)
  .post(protect, addComment);

// Comment interaction routes
router.route("/comment/:commentId/like").post(protect, toggleLikeComment);

module.exports = router;
