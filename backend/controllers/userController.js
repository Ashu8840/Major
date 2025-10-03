const User = require("../models/User");
const {
  generateToken,
  generateRefreshToken,
} = require("../utils/generateToken");

const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  const userExists = await User.findOne({ email });

  if (userExists) {
    return res.status(400).json({ message: "User already exists" });
  }

  const user = await User.create({
    username,
    email,
    passwordHash: password,
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      profileImage: user.profileImage,
      profileCompleted: user.profileCompleted,
      firstLogin: user.firstLogin,
      role: user.role,
      token: generateToken(user._id),
      refreshToken: generateRefreshToken(user._id),
    });
  } else {
    res.status(400).json({ message: "Invalid user data" });
  }
};

const authUser = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      profileImage: user.profileImage,
      profileCompleted: user.profileCompleted,
      firstLogin: user.firstLogin,
      role: user.role,
      token: generateToken(user._id),
      refreshToken: generateRefreshToken(user._id),
    });
  } else {
    res.status(401).json({ message: "Invalid email or password" });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    console.log("Update profile request received:", req.body);
    console.log("User ID from token:", req.user?.id);
    
    const { displayName, bio, profileImage } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      console.log("User not found for ID:", req.user.id);
      return res.status(404).json({ message: "User not found" });
    }

    console.log("Current user data:", {
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      bio: user.bio,
      profileCompleted: user.profileCompleted
    });

    // Update fields if provided
    if (displayName !== undefined) user.displayName = displayName;
    if (bio !== undefined) user.bio = bio;
    if (profileImage !== undefined) user.profileImage = profileImage;

    // Mark profile as completed if basic info is provided
    if (displayName && displayName.trim()) {
      user.profileCompleted = true;
      user.firstLogin = false;
    }

    console.log("Saving user with updated data:", {
      displayName: user.displayName,
      bio: user.bio,
      profileImage: user.profileImage,
      profileCompleted: user.profileCompleted
    });

    await user.save();

    const updatedUser = await User.findById(req.user.id).select('-passwordHash');
    console.log("Profile updated successfully");
    res.json(updatedUser);
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const checkUsername = async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username || username.length < 3) {
      return res.status(400).json({ 
        available: false, 
        message: "Username must be at least 3 characters long" 
      });
    }

    const existingUser = await User.findOne({ username: username.toLowerCase() });
    
    res.json({
      available: !existingUser,
      message: existingUser ? "Username is already taken" : "Username is available"
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { registerUser, authUser, getProfile, updateProfile, checkUsername };
