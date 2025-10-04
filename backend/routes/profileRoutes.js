const express = require("express");
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  uploadProfileImage,
  uploadCoverPhoto,
  followUser,
  unfollowUser,
  getUserAnalytics,
  getUserAchievements,
  addToFavorites,
  removeFromFavorites,
  getUserContent,
  updateVerificationStatus,
} = require("../controllers/profileController");
const { protect: authMiddleware } = require("../middlewares/authMiddleware");

// Protected routes (require authentication) - SPECIFIC ROUTES FIRST
router.get("/", authMiddleware, getUserProfile); // Get current user profile
router.put("/", authMiddleware, updateUserProfile);

// Current user specific routes (must come before /:userId routes)
router.get("/analytics", authMiddleware, getUserAnalytics);
router.get("/stats", authMiddleware, getUserAnalytics);
router.get("/content", authMiddleware, getUserContent);
router.get("/favorites", authMiddleware, getUserAnalytics); // For now use analytics endpoint
router.get("/books", authMiddleware, getUserContent);

// Image uploads
router.post("/upload/profile-image", authMiddleware, uploadProfileImage);
router.post("/upload/cover-photo", authMiddleware, uploadCoverPhoto);

// Social features
router.post("/follow/:userId", authMiddleware, followUser);
router.delete("/follow/:userId", authMiddleware, unfollowUser);

// Favorites
router.post("/favorites", authMiddleware, addToFavorites);
router.delete("/favorites", authMiddleware, removeFromFavorites);

// Admin routes
router.put("/verify/:userId", authMiddleware, updateVerificationStatus);

// Public routes for viewing other user profiles (PARAMETERIZED ROUTES LAST)
router.get("/:userId", authMiddleware, getUserProfile);
router.get("/:userId/content", authMiddleware, getUserContent);
router.get("/:userId/achievements", authMiddleware, getUserAchievements);
router.get("/:userId/analytics", authMiddleware, getUserAnalytics);
router.get("/:userId/stats", authMiddleware, getUserAnalytics);
router.get("/:userId/books", authMiddleware, getUserContent);

module.exports = router;
