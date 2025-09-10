const express = require("express");
const {
  createPost,
  getPosts,
  likePost,
  addComment,
  likeComment,
  getComments,
  searchPosts,
  getTrendingPosts,
} = require("../controllers/postController");
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
    cb(null, `post-${Date.now()}${path.extname(file.originalname)}`);
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

router
  .route("/")
  .post(protect, upload.single("image"), createPost)
  .get(getPosts);

router.route("/search").get(searchPosts);
router.route("/trending").get(getTrendingPosts);

router.route("/:id/like").post(protect, likePost);
router.route("/:id/comment").post(protect, addComment);
router.route("/:id/comments").get(getComments);
router.route("/comment/:commentId/like").post(protect, likeComment);

module.exports = router;
