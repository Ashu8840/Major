const bcrypt = require("bcrypt");
const User = require("../models/User");
const {
  generateToken,
  generateRefreshToken,
} = require("../utils/generateToken");
const cloudinary = require("../services/cloudinary");

const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  const userExists = await User.findOne({ email });

  if (userExists) {
    return res.status(400).json({ message: "User already exists" });
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const user = await User.create({
    username,
    email,
    passwordHash,
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
    const user = await User.findById(req.user.id).select("-passwordHash");
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
      profileCompleted: user.profileCompleted,
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
      profileCompleted: user.profileCompleted,
    });

    await user.save();

    const updatedUser = await User.findById(req.user.id).select(
      "-passwordHash"
    );
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
        message: "Username must be at least 3 characters long",
      });
    }

    const existingUser = await User.findOne({
      username: username.toLowerCase(),
    });

    res.json({
      available: !existingUser,
      message: existingUser
        ? "Username is already taken"
        : "Username is available",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update user general settings
const updateUserSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      displayName,
      bio,
      socialLinks,
      address,
      preferences,
      profileImage,
      coverPhoto,
      username,
      userId: customUserId,
    } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.preferences) {
      user.preferences = {};
    }
    if (!user.preferences.privacy) {
      user.preferences.privacy = {};
    }
    if (!user.preferences.notifications) {
      user.preferences.notifications = {};
    }
    if (!user.preferences.account) {
      user.preferences.account = {};
    }

    // Handle username change
    if (username !== undefined) {
      const sanitizedUsername = username.trim();

      if (!sanitizedUsername) {
        return res.status(400).json({ message: "Username cannot be empty" });
      }

      if (!/^[a-zA-Z0-9_]+$/.test(sanitizedUsername)) {
        return res.status(400).json({
          message:
            "Username can only contain letters, numbers, and underscores",
        });
      }

      if (sanitizedUsername.toLowerCase() !== user.username?.toLowerCase()) {
        const existingUsername = await User.findOne({
          username: { $regex: new RegExp(`^${sanitizedUsername}$`, "i") },
          _id: { $ne: userId },
        });

        if (existingUsername) {
          return res.status(400).json({ message: "Username is already taken" });
        }

        user.username = sanitizedUsername.toLowerCase();
      }
    }

    // Handle custom userId change
    if (customUserId !== undefined) {
      const sanitizedUserId = customUserId.trim();

      if (!sanitizedUserId) {
        return res.status(400).json({ message: "User ID cannot be empty" });
      }

      if (!/^[A-Z0-9\-]+$/i.test(sanitizedUserId)) {
        return res.status(400).json({
          message: "User ID can only contain letters, numbers, and hyphens",
        });
      }

      if (sanitizedUserId !== user.userId) {
        const existingUserId = await User.findOne({
          userId: sanitizedUserId,
          _id: { $ne: userId },
        });

        if (existingUserId) {
          return res.status(400).json({ message: "User ID is already in use" });
        }

        user.userId = sanitizedUserId;
      }
    }

    // Update basic profile information
    if (displayName !== undefined) user.displayName = displayName;
    if (bio !== undefined) user.bio = bio;
    if (address) user.address = { ...user.address, ...address };
    if (socialLinks) user.socialLinks = { ...user.socialLinks, ...socialLinks };

    // Update profile images
    if (profileImage) {
      user.profileImage = profileImage;
    }
    if (coverPhoto) {
      user.coverPhoto = coverPhoto;
    }

    // Update preferences
    if (preferences) {
      const { theme, privacy, notifications, account } = preferences;

      if (theme !== undefined) {
        user.preferences.theme = theme;
      }

      if (privacy) {
        user.preferences.privacy = {
          ...user.preferences.privacy,
          ...privacy,
        };
      }

      if (notifications) {
        user.preferences.notifications = {
          ...user.preferences.notifications,
          ...notifications,
        };
      }

      if (account) {
        user.preferences.account = {
          ...user.preferences.account,
          ...account,
        };
      }
    }

    // Mark profile as completed if displayName is provided
    if (displayName && displayName.trim()) {
      user.profileCompleted = true;
      user.firstLogin = false;
    }

    await user.save();

    // Return updated user without sensitive data
    const updatedUser = await User.findById(userId).select("-passwordHash");

    res.json({
      message: "Settings updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ message: "Failed to update settings" });
  }
};

// Get user settings
const getUserSettings = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select(
      "username email displayName bio profileImage coverPhoto address socialLinks preferences stats achievements profileCompleted firstLogin userId blockedUsers createdAt"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Structure the response to match frontend expectations
    const settings = {
      profile: {
        username: user.username,
        displayName: user.displayName || "",
        email: user.email,
        bio: user.bio || "",
        profileImage: user.profileImage || null,
        coverPhoto: user.coverPhoto || null,
        uid:
          user.userId ||
          `DA-2025-${user._id.toString().slice(-6).toUpperCase()}`,
        userId: user.userId || "",
      },
      address: user.address || {},
      socialLinks: user.socialLinks || {},
      privacy: {
        profileVisibility:
          user.preferences?.privacy?.profileVisibility || "public",
        diaryVisibility:
          user.preferences?.privacy?.diaryVisibility || "followers",
        allowMessages: user.preferences?.privacy?.allowMessages || "followers",
        showEmail: user.preferences?.privacy?.showEmail ?? false,
        showAnalytics: user.preferences?.privacy?.showAnalytics ?? true,
        showOnlineStatus: user.preferences?.privacy?.showOnlineStatus ?? true,
        indexProfile: user.preferences?.privacy?.indexProfile ?? false,
        blockedUsers: user.blockedUsers || [],
      },
      notifications: {
        email: user.preferences?.notifications?.email ?? true,
        push: user.preferences?.notifications?.push ?? true,
        newFollowers: user.preferences?.notifications?.newFollowers ?? true,
        messages: user.preferences?.notifications?.messages ?? true,
        purchases: user.preferences?.notifications?.purchases ?? true,
        marketing: user.preferences?.notifications?.marketing ?? false,
      },
      theme: {
        current: user.preferences?.theme || "default",
      },
      account: {
        profileCompleted: user.profileCompleted,
        firstLogin: user.firstLogin,
        joinedDate: user.createdAt,
        twoFactor: user.preferences?.account?.twoFactor ?? false,
        backupCodesGenerated:
          user.preferences?.account?.backupCodesGenerated ?? false,
        lastSecurityReview:
          user.preferences?.account?.lastSecurityReview || null,
      },
      stats: user.stats,
      achievements: user.achievements || [],
    };

    res.json({ settings });
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({ message: "Failed to get settings" });
  }
};

// Update privacy settings
const updatePrivacySettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { privacy } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const privacyPayload =
      privacy && typeof privacy === "object" ? privacy : {};

    const visibilityOptions = ["public", "followers", "private"];
    const messageOptions = ["everyone", "followers", "nobody"];
    const sanitizedPrivacy = {};

    if (
      privacyPayload.profileVisibility &&
      visibilityOptions.includes(privacyPayload.profileVisibility)
    ) {
      sanitizedPrivacy.profileVisibility = privacyPayload.profileVisibility;
    }

    if (
      privacyPayload.diaryVisibility &&
      visibilityOptions.includes(privacyPayload.diaryVisibility)
    ) {
      sanitizedPrivacy.diaryVisibility = privacyPayload.diaryVisibility;
    }

    if (
      privacyPayload.allowMessages &&
      messageOptions.includes(privacyPayload.allowMessages)
    ) {
      sanitizedPrivacy.allowMessages = privacyPayload.allowMessages;
    }

    ["showEmail", "showAnalytics", "showOnlineStatus", "indexProfile"].forEach(
      (key) => {
        if (privacyPayload[key] !== undefined) {
          sanitizedPrivacy[key] = Boolean(privacyPayload[key]);
        }
      }
    );

    if (!user.preferences) {
      user.preferences = {};
    }
    if (!user.preferences.privacy) {
      user.preferences.privacy = {};
    }

    user.preferences.privacy = {
      ...user.preferences.privacy,
      ...sanitizedPrivacy,
    };

    await user.save();

    res.json({ message: "Privacy settings updated successfully" });
  } catch (error) {
    console.error("Update privacy settings error:", error);
    res.status(500).json({ message: "Failed to update privacy settings" });
  }
};

// Update notification settings
const updateNotificationSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { notifications } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const notificationsPayload =
      notifications && typeof notifications === "object" ? notifications : {};

    const allowedNotificationKeys = [
      "email",
      "push",
      "newFollowers",
      "messages",
      "purchases",
      "marketing",
    ];

    const sanitizedNotifications = allowedNotificationKeys.reduce(
      (acc, key) => {
        if (notificationsPayload[key] !== undefined) {
          acc[key] = Boolean(notificationsPayload[key]);
        }
        return acc;
      },
      {}
    );

    if (!user.preferences) {
      user.preferences = {};
    }
    if (!user.preferences.notifications) {
      user.preferences.notifications = {};
    }

    user.preferences.notifications = {
      ...user.preferences.notifications,
      ...sanitizedNotifications,
    };
    await user.save();

    res.json({ message: "Notification settings updated successfully" });
  } catch (error) {
    console.error("Update notification settings error:", error);
    res.status(500).json({ message: "Failed to update notification settings" });
  }
};

// Update theme preference
const updateThemePreference = async (req, res) => {
  try {
    const userId = req.user._id;
    const { theme } = req.body;

    if (!theme || typeof theme !== "string") {
      return res.status(400).json({ message: "Theme must be a valid string" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.preferences) {
      user.preferences = {};
    }

    user.preferences.theme = theme;
    await user.save();

    res.json({ message: "Theme preference updated successfully" });
  } catch (error) {
    console.error("Update theme preference error:", error);
    res.status(500).json({ message: "Failed to update theme preference" });
  }
};

module.exports = {
  registerUser,
  authUser,
  getProfile,
  updateProfile,
  checkUsername,
  updateUserSettings,
  getUserSettings,
  updatePrivacySettings,
  updateNotificationSettings,
  updateThemePreference,
};
