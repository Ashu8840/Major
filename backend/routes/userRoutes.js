const express = require("express");
const { registerUser, authUser, updateProfile, getProfile } = require("../controllers/userController");
const { validateRequest } = require("../middlewares/validationMiddleware");
const { protect } = require("../middlewares/authMiddleware");
const { body } = require("express-validator");

const router = express.Router();

router.post(
  "/register",
  [
    body("username").not().isEmpty().withMessage("Username is required"),
    body("email").isEmail().withMessage("Please include a valid email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be 6 or more characters"),
  ],
  validateRequest,
  registerUser
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Please include a valid email"),
    body("password").exists().withMessage("Password is required"),
  ],
  validateRequest,
  authUser
);

// Profile routes
router.get("/profile", protect, getProfile);

router.put(
  "/profile",
  protect,
  [
    body("displayName").optional().trim().isLength({ min: 1, max: 100 }),
    body("bio").optional().isLength({ max: 500 }),
    body("profileImage").optional().isURL(),
  ],
  validateRequest,
  updateProfile
);

module.exports = router;
