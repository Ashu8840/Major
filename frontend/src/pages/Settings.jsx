import { useState, useContext, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { AuthContext } from "../context/AuthContext";
import {
  getUserSettings,
  updateUserSettings,
  updatePrivacySettings,
  updateNotificationSettings,
  updateThemePreference,
  checkUsernameAvailability,
  uploadProfileAvatar,
} from "../utils/api";
// import { ThemeContext } from "../context/ThemeContext"; // TODO: Implement theme system later
import {
  IoSettings,
  IoPersonCircle,
  IoShield,
  IoNotificationsOutline as IoNotifications,
  IoTrash,
  IoDownload,
  IoEye,
  IoEyeOff,
  IoColorPalette,
  IoMail,
  IoCall,
  IoGlobe,
  IoCheckmarkCircle,
  IoCloseOutline as IoClose,
  IoChevronForward,
  IoSave,
  IoWarning,
  IoMoon,
  IoSunny,
  IoLeaf,
  IoFlash,
  IoHeart,
  IoRocket,
  IoFlame,
  IoOptionsOutline as IoOptions,
} from "react-icons/io5";
import { NAVIGATION_ITEMS, NAVIGATION_ITEM_IDS } from "../config/navigation";

const DEFAULT_NAVIGATION_SELECTION = [...NAVIGATION_ITEM_IDS];
const PROTECTED_NAVIGATION_ITEMS = new Set(["settings"]);

const sanitizeNavigationSelection = (selection = []) => {
  const filtered = selection.filter((id) =>
    DEFAULT_NAVIGATION_SELECTION.includes(id)
  );
  const unique = Array.from(new Set(filtered));

  PROTECTED_NAVIGATION_ITEMS.forEach((requiredId) => {
    if (
      DEFAULT_NAVIGATION_SELECTION.includes(requiredId) &&
      !unique.includes(requiredId)
    ) {
      unique.push(requiredId);
    }
  });

  if (!unique.length) {
    return [...DEFAULT_NAVIGATION_SELECTION];
  }

  return unique.sort(
    (a, b) =>
      DEFAULT_NAVIGATION_SELECTION.indexOf(a) -
      DEFAULT_NAVIGATION_SELECTION.indexOf(b)
  );
};

const DEFAULT_SETTINGS = {
  profile: {
    username: "",
    displayName: "",
    email: "",
    bio: "",
    profileImage: null,
    coverPhoto: null,
    uid: "",
    userId: "",
  },
  address: {
    street: "",
    city: "",
    state: "",
    country: "",
    zipCode: "",
  },
  socialLinks: {
    website: "",
    twitter: "",
    instagram: "",
    linkedin: "",
    facebook: "",
    youtube: "",
  },
  privacy: {
    profileVisibility: "public",
    diaryVisibility: "followers",
    allowMessages: "followers",
    showEmail: false,
    showAnalytics: true,
    showOnlineStatus: true,
    indexProfile: false,
    blockedUsers: [],
  },
  notifications: {
    email: true,
    push: true,
    newFollowers: true,
    messages: true,
    purchases: true,
    marketing: false,
  },
  theme: {
    current: "default",
  },
  navigation: {
    menuItems: [...DEFAULT_NAVIGATION_SELECTION],
  },
  account: {
    twoFactor: false,
    backupCodesGenerated: false,
    lastSecurityReview: null,
    profileCompleted: false,
    firstLogin: false,
    joinedDate: null,
  },
};

const cloneDefaultSettings = () => ({
  profile: { ...DEFAULT_SETTINGS.profile },
  address: { ...DEFAULT_SETTINGS.address },
  socialLinks: { ...DEFAULT_SETTINGS.socialLinks },
  privacy: { ...DEFAULT_SETTINGS.privacy, blockedUsers: [] },
  notifications: { ...DEFAULT_SETTINGS.notifications },
  theme: { ...DEFAULT_SETTINGS.theme },
  navigation: {
    menuItems: [...DEFAULT_NAVIGATION_SELECTION],
  },
  account: { ...DEFAULT_SETTINGS.account },
});

export default function Settings() {
  const { user, userProfile, logout, fetchUserProfile } =
    useContext(AuthContext);
  const navigate = useNavigate();
  // const { currentTheme, setTheme } = useContext(ThemeContext); // TODO: Implement theme system later
  const [activeSection, setActiveSection] = useState("general");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [previewTheme, setPreviewTheme] = useState("default");
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState({
    type: "idle",
    message: "",
  });
  const fileInputRef = useRef(null);
  const originalUsernameRef = useRef(null);

  // Settings state - will be populated from API
  const [settings, setSettings] = useState(() => cloneDefaultSettings());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [themeSaving, setThemeSaving] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savingNavigation, setSavingNavigation] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [privacyDirty, setPrivacyDirty] = useState(false);
  const [notificationsDirty, setNotificationsDirty] = useState(false);
  const [accountDirty, setAccountDirty] = useState(false);
  const originalNavigationRef = useRef([...DEFAULT_NAVIGATION_SELECTION]);

  const followersCount = userProfile?.followers?.length || 0;
  const followingCount = userProfile?.following?.length || 0;
  const blockedUsersCount = settings.privacy.blockedUsers?.length || 0;
  const joinedDateLabel = settings.account.joinedDate
    ? new Date(settings.account.joinedDate).toLocaleDateString()
    : "Unknown";
  const lastSecurityReviewLabel = settings.account.lastSecurityReview
    ? new Date(settings.account.lastSecurityReview).toLocaleDateString()
    : "Never";
  const navigationSelection = sanitizeNavigationSelection(
    settings.navigation?.menuItems?.length
      ? settings.navigation.menuItems
      : DEFAULT_NAVIGATION_SELECTION
  );

  const normalizeSettings = (incoming = {}) => {
    const base = cloneDefaultSettings();

    const mergedPrivacy = {
      ...base.privacy,
      ...(incoming.privacy || {}),
    };

    if (!Array.isArray(mergedPrivacy.blockedUsers)) {
      mergedPrivacy.blockedUsers = [];
    }

    const incomingNotifications = { ...(incoming.notifications || {}) };
    if (
      incomingNotifications.followers !== undefined &&
      incomingNotifications.newFollowers === undefined
    ) {
      incomingNotifications.newFollowers = incomingNotifications.followers;
    }
    if (
      incomingNotifications.comments !== undefined &&
      incomingNotifications.messages === undefined
    ) {
      incomingNotifications.messages = incomingNotifications.comments;
    }

    const incomingNavigation = incoming.navigation || {};
    const navigationMenuItems = sanitizeNavigationSelection(
      Array.isArray(incomingNavigation.menuItems)
        ? incomingNavigation.menuItems
        : []
    );

    return {
      profile: { ...base.profile, ...(incoming.profile || {}) },
      address: { ...base.address, ...(incoming.address || {}) },
      socialLinks: { ...base.socialLinks, ...(incoming.socialLinks || {}) },
      privacy: mergedPrivacy,
      notifications: {
        ...base.notifications,
        ...incomingNotifications,
      },
      theme: { ...base.theme, ...(incoming.theme || {}) },
      navigation: {
        menuItems: navigationMenuItems,
      },
      account: { ...base.account, ...(incoming.account || {}) },
    };
  };

  // Fetch user settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await getUserSettings();
        if (response.settings) {
          const normalized = normalizeSettings(response.settings);
          setSettings(normalized);
          originalNavigationRef.current = [...normalized.navigation.menuItems];
          originalUsernameRef.current = normalized.profile?.username || "";
          const profileUrl = normalized.profile?.profileImage?.url;
          setProfileImagePreview(profileUrl || null);
          setPreviewTheme(normalized.theme?.current || "default");
          setUsernameStatus({ type: "idle", message: "" });
          setPrivacyDirty(false);
          setNotificationsDirty(false);
          setAccountDirty(false);
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchSettings();
    }
  }, [user]);

  // Update settings when userProfile changes (fallback)
  useEffect(() => {
    if (userProfile && !loading) {
      setSettings((prev) => ({
        ...prev,
        profile: {
          username: userProfile.username || prev.profile.username || "",
          displayName:
            userProfile.displayName || prev.profile.displayName || "",
          email: userProfile.email || prev.profile.email || "",
          bio: userProfile.bio || prev.profile.bio || "",
          profileImage: userProfile.profileImage || prev.profile.profileImage,
          coverPhoto: userProfile.coverPhoto || prev.profile.coverPhoto,
          uid: userProfile.userId || prev.profile.uid || "",
          userId: userProfile.userId || prev.profile.userId || "",
        },
        address: userProfile.address || prev.address,
        socialLinks: userProfile.socialLinks || prev.socialLinks,
        account: {
          ...prev.account,
          profileCompleted:
            userProfile.profileCompleted ?? prev.account.profileCompleted,
          firstLogin: userProfile.firstLogin ?? prev.account.firstLogin,
          joinedDate: userProfile.createdAt || prev.account.joinedDate,
        },
      }));

      if (!originalUsernameRef.current) {
        originalUsernameRef.current = userProfile.username || "";
      }

      if (!profileImagePreview && userProfile.profileImage?.url) {
        setProfileImagePreview(userProfile.profileImage.url);
      }
    }
  }, [userProfile, loading, profileImagePreview]);

  // Validate and upload profile image to backend/cloudinary
  const handleImageChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    const previousImage = settings.profile.profileImage;
    const tempPreviewUrl = URL.createObjectURL(file);
    setProfileImagePreview(tempPreviewUrl);

    try {
      setUploadingProfileImage(true);
      const response = await uploadProfileAvatar(file);

      if (response?.profileImage?.url) {
        setSettings((prev) => ({
          ...prev,
          profile: {
            ...prev.profile,
            profileImage: response.profileImage,
          },
        }));

        setProfileImagePreview(response.profileImage.url);
        toast.success("Profile photo updated");
        await fetchUserProfile();
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Image upload error:", error);
      setSettings((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          profileImage: previousImage,
        },
      }));
      setProfileImagePreview(previousImage?.url || null);
      toast.error(
        error.response?.data?.message ||
          "Failed to upload image. Please try again."
      );
    } finally {
      setUploadingProfileImage(false);
      URL.revokeObjectURL(tempPreviewUrl);
    }
  };

  const handleChangePhoto = () => {
    fileInputRef.current?.click();
  };

  const validateUsername = async () => {
    const currentUsername = settings.profile.username?.trim() || "";

    if (!currentUsername) {
      setUsernameStatus({ type: "error", message: "Username is required" });
      return false;
    }

    if (currentUsername.length < 3) {
      setUsernameStatus({
        type: "error",
        message: "Username must be at least 3 characters",
      });
      return false;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(currentUsername)) {
      setUsernameStatus({
        type: "error",
        message: "Only letters, numbers, and underscores are allowed",
      });
      return false;
    }

    if (currentUsername === originalUsernameRef.current) {
      setUsernameStatus({ type: "success", message: "Username unchanged" });
      return true;
    }

    try {
      setCheckingUsername(true);
      const result = await checkUsernameAvailability(currentUsername);
      if (result.available) {
        setUsernameStatus({
          type: "success",
          message: result.message || "Username is available",
        });
        return true;
      }

      setUsernameStatus({
        type: "error",
        message: result.message || "Username is already taken",
      });
      return false;
    } catch (error) {
      setUsernameStatus({
        type: "error",
        message: error.response?.data?.message || "Unable to verify username",
      });
      return false;
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleUsernameBlur = () => {
    validateUsername();
  };

  // Handle profile save
  const handleSaveProfile = async () => {
    const displayName = settings.profile.displayName?.trim() || "";
    const bio = settings.profile.bio?.trim() || "";
    const username = settings.profile.username?.trim() || "";
    const userId =
      settings.profile.userId?.trim() || settings.profile.uid?.trim() || "";

    console.log("Saving profile with data:", {
      displayName,
      bio,
      username,
      userId,
    });

    // Validate required fields
    if (!displayName) {
      toast.error(
        "Please complete your profile first! Display name is required."
      );
      return;
    }

    if (userId && !/^[a-zA-Z0-9-]+$/.test(userId)) {
      toast.error("User ID can only contain letters, numbers, and hyphens.");
      return;
    }

    if (userId && userId.length < 6) {
      toast.error("User ID must be at least 6 characters long.");
      return;
    }

    const usernameValid = await validateUsername();
    if (!usernameValid) {
      toast.error("Please resolve username issues before saving.");
      return;
    }

    try {
      setSaving(true);

      const { blockedUsers, ...privacyPayload } = settings.privacy;

      const updateData = {
        username,
        displayName,
        bio,
        userId,
        profileImage: settings.profile.profileImage || undefined,
        socialLinks: settings.socialLinks,
        address: settings.address,
        preferences: {
          privacy: privacyPayload,
          notifications: settings.notifications,
          theme: settings.theme.current,
          account: {
            twoFactor: settings.account.twoFactor,
            backupCodesGenerated: settings.account.backupCodesGenerated,
          },
        },
      };

      console.log("Calling updateUserSettings with:", updateData);

      // Call API to update settings
      const response = await updateUserSettings(updateData);

      if (response.user) {
        let nextTheme = null;

        // Update local state with new data
        setSettings((prevSettings) => {
          const updated = {
            ...prevSettings,
            profile: {
              ...prevSettings.profile,
              displayName: response.user.displayName,
              bio: response.user.bio,
              username: response.user.username,
              userId: response.user.userId,
              uid: response.user.userId,
              profileImage:
                response.user.profileImage || prevSettings.profile.profileImage,
            },
          };

          if (response.user.preferences) {
            if (response.user.preferences.privacy) {
              updated.privacy = {
                ...prevSettings.privacy,
                ...response.user.preferences.privacy,
                blockedUsers: prevSettings.privacy.blockedUsers,
              };
            }

            if (response.user.preferences.notifications) {
              updated.notifications = {
                ...prevSettings.notifications,
                ...response.user.preferences.notifications,
              };
            }

            if (response.user.preferences.theme) {
              nextTheme = response.user.preferences.theme;
              updated.theme = {
                ...prevSettings.theme,
                current: response.user.preferences.theme,
              };
            }

            if (response.user.preferences.account) {
              updated.account = {
                ...prevSettings.account,
                ...response.user.preferences.account,
              };
            }
          }

          return updated;
        });

        if (nextTheme) {
          setPreviewTheme(nextTheme);
        }

        originalUsernameRef.current = response.user.username;

        // Update AuthContext if needed
        await fetchUserProfile();
      }

      toast.success("Profile updated successfully!");

      // If this is the first time completing profile, redirect to home
      if (!userProfile?.profileCompleted) {
        setTimeout(() => {
          navigate("/");
        }, 1500);
      }
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const themes = [
    {
      id: "default",
      name: "Ocean Blue",
      icon: IoSunny,
      colors: "from-blue-50 to-white",
      primary: "bg-blue-600",
      description: "Clean and professional",
    },
    {
      id: "jungle",
      name: "Jungle",
      icon: IoLeaf,
      colors: "from-green-50 to-emerald-50",
      primary: "bg-green-600",
      description: "Earthy and natural 🌿",
    },
    {
      id: "cyberpunk",
      name: "Cyberpunk",
      icon: IoFlash,
      colors: "from-purple-900 to-blue-900",
      primary: "bg-purple-600",
      description: "Neon and futuristic ⚡",
    },
    {
      id: "barbie",
      name: "Barbie",
      icon: IoHeart,
      colors: "from-pink-50 to-rose-50",
      primary: "bg-pink-600",
      description: "Pink and glamorous 💖",
    },
    {
      id: "space",
      name: "Space",
      icon: IoRocket,
      colors: "from-gray-900 to-black",
      primary: "bg-indigo-600",
      description: "Dark and mysterious 🌌",
    },
    {
      id: "mars",
      name: "Mars",
      icon: IoFlame,
      colors: "from-red-50 to-orange-50",
      primary: "bg-red-600",
      description: "Warm and bold 🔥",
    },
  ];

  const sidebarSections = [
    { id: "general", label: "General", icon: IoSettings },
    { id: "theme", label: "Theme", icon: IoColorPalette },
    { id: "edit", label: "Edit Sidebar", icon: IoOptions },
    { id: "privacy", label: "Privacy", icon: IoShield },
    { id: "notifications", label: "Notifications", icon: IoNotifications },
    { id: "account", label: "Account", icon: IoPersonCircle },
  ];

  const handleSettingChange = (section, key, value) => {
    setSettings((prev) => {
      const updatedSection = {
        ...prev[section],
        [key]: value,
      };

      if (section === "profile" && key === "userId") {
        updatedSection.uid = value;
      }

      return {
        ...prev,
        [section]: updatedSection,
      };
    });

    if (section === "profile" && key === "username") {
      setUsernameStatus({ type: "idle", message: "" });
    }

    if (section === "privacy") {
      setPrivacyDirty(true);
    }
    if (section === "notifications") {
      setNotificationsDirty(true);
    }
    if (section === "account") {
      setAccountDirty(true);
    }
  };

  const handleThemeSelect = (themeId) => {
    setPreviewTheme(themeId);
  };

  const handleThemeSave = async () => {
    try {
      setThemeSaving(true);
      await updateThemePreference(previewTheme);

      setSettings((prev) => ({
        ...prev,
        theme: {
          current: previewTheme,
        },
      }));

      toast.success("Theme updated successfully!");
    } catch (error) {
      console.error("Theme update error:", error);
      toast.error("Failed to update theme");
    } finally {
      setThemeSaving(false);
    }
  };

  const handlePrivacySave = async () => {
    try {
      setSavingPrivacy(true);
      const { blockedUsers, ...privacyPayload } = settings.privacy;
      await updatePrivacySettings(privacyPayload);
      toast.success("Privacy preferences updated");
      setPrivacyDirty(false);
      await fetchUserProfile({ silent: true });
    } catch (error) {
      console.error("Privacy update error:", error);
      toast.error(
        error.response?.data?.message || "Failed to update privacy settings"
      );
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handleNotificationSave = async () => {
    try {
      setSavingNotifications(true);
      await updateNotificationSettings(settings.notifications);
      toast.success("Notification preferences updated");
      setNotificationsDirty(false);
    } catch (error) {
      console.error("Notification update error:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to update notification settings"
      );
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleAccountSave = async () => {
    try {
      setSavingAccount(true);
      const accountPayload = {
        twoFactor: settings.account.twoFactor,
        backupCodesGenerated: settings.account.backupCodesGenerated,
      };

      if (settings.account.lastSecurityReview) {
        accountPayload.lastSecurityReview = settings.account.lastSecurityReview;
      }

      accountPayload.lastSecurityReview =
        accountPayload.lastSecurityReview || new Date().toISOString();

      await updateUserSettings({
        preferences: {
          account: accountPayload,
        },
      });

      toast.success("Account security updated");
      setAccountDirty(false);
      await fetchUserProfile({ silent: true });
    } catch (error) {
      console.error("Account update error:", error);
      toast.error(
        error.response?.data?.message || "Failed to update account settings"
      );
    } finally {
      setSavingAccount(false);
    }
  };

  const toggleNavigationItem = (itemId) => {
    if (PROTECTED_NAVIGATION_ITEMS.has(itemId)) {
      toast("Settings is always available.");
      return;
    }

    let allowChange = true;
    setSettings((prev) => {
      const currentSelection = prev.navigation?.menuItems?.length
        ? [...prev.navigation.menuItems]
        : [...DEFAULT_NAVIGATION_SELECTION];
      const alreadySelected = currentSelection.includes(itemId);

      if (alreadySelected && currentSelection.length === 1) {
        allowChange = false;
        return prev;
      }

      let nextSelection;
      if (alreadySelected) {
        nextSelection = currentSelection.filter((id) => id !== itemId);
      } else {
        nextSelection = [...currentSelection, itemId];
      }

      const sanitizedSelection = sanitizeNavigationSelection(nextSelection);

      return {
        ...prev,
        navigation: {
          ...prev.navigation,
          menuItems: sanitizedSelection,
        },
      };
    });

    if (!allowChange) {
      toast.error("Keep at least one page in your sidebar.");
      return;
    }
  };

  const handleNavigationReset = () => {
    setSettings((prev) => {
      const current = prev.navigation?.menuItems || [];
      const defaults = [...DEFAULT_NAVIGATION_SELECTION];
      const isSame =
        current.length === defaults.length &&
        current.every((id, index) => id === defaults[index]);

      if (isSame) {
        return prev;
      }

      return {
        ...prev,
        navigation: {
          ...prev.navigation,
          menuItems: sanitizeNavigationSelection(defaults),
        },
      };
    });
  };

  const arraysEqual = (a = [], b = []) =>
    a.length === b.length && a.every((value, index) => value === b[index]);

  const hasNavigationChanges = !arraysEqual(
    navigationSelection,
    originalNavigationRef.current
  );

  const handleNavigationSave = async () => {
    const selection = sanitizeNavigationSelection(
      settings.navigation?.menuItems?.length
        ? settings.navigation.menuItems
        : [...DEFAULT_NAVIGATION_SELECTION]
    );

    if (!selection.length) {
      toast.error("Select at least one page for your sidebar.");
      return;
    }

    try {
      setSavingNavigation(true);
      await updateUserSettings({
        preferences: {
          navigation: {
            menuItems: selection,
          },
        },
      });
      toast.success("Sidebar updated successfully.");
      originalNavigationRef.current = [...selection];
      await fetchUserProfile({ silent: true });
    } catch (error) {
      console.error("Navigation update error:", error);
      toast.error(
        error.response?.data?.message || "Failed to update sidebar layout"
      );
    } finally {
      setSavingNavigation(false);
    }
  };

  const handleDeleteAccount = () => {
    // Implementation for account deletion
    console.log("Account deletion requested");
    setShowDeleteConfirm(false);
  };

  const currentThemeData =
    themes.find((t) => t.id === previewTheme) || themes[0];

  // TODO: Remove this when theme system is implemented
  const defaultTheme = themes[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Control Center
          </h1>
          <p className="text-gray-600">
            Manage your account, privacy, and preferences
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading settings...</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <div className="lg:w-1/4">
              <div className="bg-white rounded-xl shadow-sm border p-4 sticky top-4">
                <nav className="space-y-2">
                  {sidebarSections.map((section) => {
                    const IconComponent = section.icon;
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                          activeSection === section.id
                            ? "bg-blue-600 text-white"
                            : "hover:bg-gray-100 text-gray-700"
                        }`}
                      >
                        <IconComponent className="w-5 h-5" />
                        {section.label}
                        <IoChevronForward className="w-4 h-4 ml-auto" />
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:w-3/4">
              <div className="bg-white rounded-xl shadow-sm border">
                {/* General Settings */}
                {activeSection === "general" && (
                  <div className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">
                      General Settings
                    </h2>

                    <div className="space-y-6">
                      {/* Profile Picture */}
                      <div className="flex items-center gap-6">
                        <img
                          src={
                            profileImagePreview ||
                            settings.profile.profileImage?.url ||
                            "/api/placeholder/80/80"
                          }
                          alt="Profile"
                          className="w-20 h-20 rounded-full object-cover border-4 border-gray-200"
                        />
                        <div>
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageChange}
                            accept="image/*"
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={handleChangePhoto}
                            disabled={uploadingProfileImage}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {uploadingProfileImage
                              ? "Uploading..."
                              : "Change Photo"}
                          </button>
                          <p className="text-sm text-gray-500 mt-1">
                            JPG, PNG up to 5MB
                          </p>
                        </div>
                      </div>

                      {/* User ID (Read-only) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Unique User ID
                        </label>
                        <input
                          type="text"
                          value={
                            settings.profile.userId || settings.profile.uid
                          }
                          onChange={(e) =>
                            handleSettingChange(
                              "profile",
                              "userId",
                              e.target.value
                            )
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter a unique user ID"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Letters, numbers, and hyphens only, minimum 6
                          characters. This appears on sharable profile links.
                        </p>
                      </div>

                      {/* Username */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Username
                        </label>
                        <input
                          type="text"
                          value={settings.profile.username}
                          onChange={(e) =>
                            handleSettingChange(
                              "profile",
                              "username",
                              e.target.value
                            )
                          }
                          onBlur={handleUsernameBlur}
                          autoComplete="off"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Choose your username"
                        />
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          {checkingUsername && (
                            <span className="text-blue-600">
                              Checking availability...
                            </span>
                          )}
                          {!checkingUsername && usernameStatus.message && (
                            <span
                              className={
                                usernameStatus.type === "error"
                                  ? "text-red-500"
                                  : "text-green-600"
                              }
                            >
                              {usernameStatus.message}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Display Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={settings.profile.displayName}
                          onChange={(e) =>
                            handleSettingChange(
                              "profile",
                              "displayName",
                              e.target.value
                            )
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address{" "}
                          <span className="text-gray-500 text-xs">
                            (Cannot be changed)
                          </span>
                        </label>
                        <input
                          type="email"
                          value={settings.profile.email}
                          disabled={true}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                          placeholder="Email will appear here after registration"
                        />
                      </div>

                      {/* Bio */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bio
                        </label>
                        <textarea
                          value={settings.profile.bio}
                          onChange={(e) =>
                            handleSettingChange(
                              "profile",
                              "bio",
                              e.target.value
                            )
                          }
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleSaveProfile}
                          disabled={
                            saving || uploadingProfileImage || checkingUsername
                          }
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <IoSave className="w-4 h-4" />
                          {saving ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Theme Settings */}
                {activeSection === "theme" && (
                  <div className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">
                      Theme Settings
                    </h2>

                    <div className="mb-6">
                      <p className="text-gray-600 mb-4">
                        Choose your preferred theme. Changes will be applied
                        after saving.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {themes.map((theme) => {
                          const IconComponent = theme.icon;
                          return (
                            <div
                              key={theme.id}
                              onClick={() => handleThemeSelect(theme.id)}
                              className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                previewTheme === theme.id
                                  ? "border-blue-500 ring-2 ring-blue-200"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <div
                                className={`h-20 rounded-lg bg-gradient-to-br ${theme.colors} mb-3 relative overflow-hidden`}
                              >
                                <div
                                  className={`absolute bottom-2 right-2 p-1 ${theme.primary} rounded`}
                                >
                                  <IconComponent className="w-4 h-4 text-white" />
                                </div>
                              </div>
                              <h3 className="font-medium text-gray-900">
                                {theme.name}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {theme.description}
                              </p>

                              {previewTheme === theme.id && (
                                <div className="absolute top-2 right-2 p-1 bg-blue-500 rounded-full">
                                  <IoCheckmarkCircle className="w-4 h-4 text-white" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={handleThemeSave}
                          disabled={themeSaving}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <IoSave className="w-4 h-4" />
                          {themeSaving ? "Applying..." : "Apply Theme"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === "edit" && (
                  <div className="p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          Edit Your Sidebar
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                          Choose which pages stay visible. Log out will always
                          remain available.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleNavigationReset}
                        className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                      >
                        Reset to defaults
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {NAVIGATION_ITEMS.map((item) => {
                        const IconComponent = item.icon;
                        const isSelected = navigationSelection.includes(
                          item.id
                        );
                        const isProtected = PROTECTED_NAVIGATION_ITEMS.has(
                          item.id
                        );
                        const statusText = isProtected
                          ? "Always visible"
                          : isSelected
                          ? "Visible in sidebar"
                          : "Hidden from sidebar";
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleNavigationItem(item.id)}
                            aria-pressed={isSelected}
                            disabled={isProtected}
                            title={
                              isProtected
                                ? "Settings stays pinned for quick access"
                                : undefined
                            }
                            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 ${
                              isSelected
                                ? "border-blue-500 bg-blue-50 text-blue-900"
                                : "border-gray-200 text-gray-700 hover:border-gray-300"
                            } disabled:cursor-not-allowed disabled:opacity-70`}
                          >
                            <span
                              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                                isSelected
                                  ? "bg-blue-500 text-white"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              <IconComponent className="w-5 h-5" />
                            </span>
                            <span className="flex-1">
                              <span className="block font-medium">
                                {item.label}
                              </span>
                              <span className="text-xs text-gray-500">
                                {statusText}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-gray-600">
                        {navigationSelection.length} page
                        {navigationSelection.length === 1 ? "" : "s"} will
                        appear in your sidebar.
                      </p>
                      <button
                        type="button"
                        onClick={handleNavigationSave}
                        disabled={!hasNavigationChanges || savingNavigation}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <IoSave className="w-4 h-4" />
                        {savingNavigation ? "Saving..." : "Save layout"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Privacy Settings */}
                {activeSection === "privacy" && (
                  <div className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">
                      Privacy Settings
                    </h2>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Profile Visibility
                        </label>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                          {[
                            {
                              id: "public",
                              label: "Public",
                              description:
                                "Visible to everyone across Daiaryverse",
                              icon: IoGlobe,
                            },
                            {
                              id: "followers",
                              label: "Followers",
                              description: `Limited to your ${followersCount} followers`,
                              icon: IoEye,
                            },
                            {
                              id: "private",
                              label: "Private",
                              description: "Only you can access full details",
                              icon: IoEyeOff,
                            },
                          ].map((option) => {
                            const Icon = option.icon;
                            const isActive =
                              settings.privacy.profileVisibility === option.id;
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() =>
                                  handleSettingChange(
                                    "privacy",
                                    "profileVisibility",
                                    option.id
                                  )
                                }
                                className={`flex items-start gap-3 p-4 rounded-xl border transition-colors text-left ${
                                  isActive
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200 hover:border-gray-300"
                                }`}
                              >
                                <span
                                  className={`p-2 rounded-full ${
                                    isActive
                                      ? "bg-blue-500 text-white"
                                      : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  <Icon className="w-5 h-5" />
                                </span>
                                <span>
                                  <span className="block font-medium text-gray-900">
                                    {option.label}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    {option.description}
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Diary Entries Visibility
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {["public", "followers", "private"].map((option) => {
                            const isActive =
                              settings.privacy.diaryVisibility === option;
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() =>
                                  handleSettingChange(
                                    "privacy",
                                    "diaryVisibility",
                                    option
                                  )
                                }
                                className={`p-4 rounded-xl border transition-colors capitalize ${
                                  isActive
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200 hover:border-gray-300"
                                }`}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Direct Messages
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[
                            {
                              id: "everyone",
                              label: "Everyone",
                              description: "Open to the entire community",
                            },
                            {
                              id: "followers",
                              label: "Followers",
                              description: "Only people you approve",
                            },
                            {
                              id: "nobody",
                              label: "Nobody",
                              description: "DMs stay closed",
                            },
                          ].map((option) => {
                            const isActive =
                              settings.privacy.allowMessages === option.id;
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() =>
                                  handleSettingChange(
                                    "privacy",
                                    "allowMessages",
                                    option.id
                                  )
                                }
                                className={`p-4 rounded-xl border transition-colors text-left ${
                                  isActive
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200 hover-border-gray-300"
                                }`}
                              >
                                <span className="block font-medium text-gray-900">
                                  {option.label}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {option.description}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          {
                            key: "showOnlineStatus",
                            title: "Show Online Status",
                            description: "Let others see when you're active",
                          },
                          {
                            key: "indexProfile",
                            title: "Index Profile",
                            description: "Allow search engines to find you",
                          },
                          {
                            key: "showEmail",
                            title: "Display Email",
                            description: "Share your contact email on profile",
                          },
                          {
                            key: "showAnalytics",
                            title: "Share Insights",
                            description: "Show high-level engagement stats",
                          },
                        ].map((item) => {
                          const enabled = settings.privacy[item.key];
                          return (
                            <div
                              key={item.key}
                              className="flex items-center justify-between gap-3 p-4 border border-gray-200 rounded-xl"
                            >
                              <div>
                                <h3 className="font-medium text-gray-900">
                                  {item.title}
                                </h3>
                                <p className="text-sm text-gray-500">
                                  {item.description}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  handleSettingChange(
                                    "privacy",
                                    item.key,
                                    !enabled
                                  )
                                }
                                className={`relative w-12 h-6 rounded-full transition-colors ${
                                  enabled ? "bg-blue-600" : "bg-gray-300"
                                }`}
                              >
                                <div
                                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                    enabled ? "translate-x-6" : ""
                                  }`}
                                />
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-4 border-t">
                        <h3 className="font-medium text-gray-900 mb-3">
                          Blocked Users
                        </h3>
                        {blockedUsersCount > 0 ? (
                          <ul className="space-y-3">
                            {settings.privacy.blockedUsers.map(
                              (entry, index) => (
                                <li
                                  key={entry.user || entry._id || index}
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                >
                                  <span className="text-sm text-gray-700">
                                    {entry.displayName ||
                                      entry.username ||
                                      entry.user ||
                                      "Blocked account"}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {entry.blockedAt
                                      ? new Date(
                                          entry.blockedAt
                                        ).toLocaleDateString()
                                      : "Unknown date"}
                                  </span>
                                </li>
                              )
                            )}
                          </ul>
                        ) : (
                          <div className="bg-gray-50 rounded-lg p-4 text-center">
                            <p className="text-gray-500">
                              You haven't blocked anyone yet
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t">
                        <p
                          className={`text-sm ${
                            privacyDirty ? "text-gray-600" : "text-gray-400"
                          }`}
                        >
                          {privacyDirty
                            ? "You have unsaved privacy changes"
                            : "Settings are synced"}
                        </p>
                        <button
                          onClick={handlePrivacySave}
                          disabled={!privacyDirty || savingPrivacy}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {savingPrivacy
                            ? "Saving..."
                            : "Save privacy preferences"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notifications */}
                {activeSection === "notifications" && (
                  <div className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">
                      Notification Settings
                    </h2>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            Email Notifications
                          </h3>
                          <p className="text-sm text-gray-500">
                            Receive notifications via email
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            handleSettingChange(
                              "notifications",
                              "email",
                              !settings.notifications.email
                            )
                          }
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            settings.notifications.email
                              ? "bg-blue-600"
                              : "bg-gray-300"
                          }`}
                        >
                          <div
                            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                              settings.notifications.email
                                ? "translate-x-6"
                                : ""
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            Push Notifications
                          </h3>
                          <p className="text-sm text-gray-500">
                            Receive push notifications in browser
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            handleSettingChange(
                              "notifications",
                              "push",
                              !settings.notifications.push
                            )
                          }
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            settings.notifications.push
                              ? "bg-blue-600"
                              : "bg-gray-300"
                          }`}
                        >
                          <div
                            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                              settings.notifications.push ? "translate-x-6" : ""
                            }`}
                          />
                        </button>
                      </div>

                      <div className="border-t pt-4">
                        <h3 className="font-medium text-gray-900 mb-4">
                          Notification Types
                        </h3>
                        <div className="space-y-4">
                          {[
                            {
                              key: "newFollowers",
                              label: "New Followers",
                              desc: "When someone follows you",
                            },
                            {
                              key: "messages",
                              label: "Messages",
                              desc: "New chat messages",
                            },
                            {
                              key: "purchases",
                              label: "Purchases",
                              desc: "Book sales and purchases",
                            },
                            {
                              key: "marketing",
                              label: "Marketing",
                              desc: "Product updates and tips",
                            },
                          ].map((item) => (
                            <div
                              key={item.key}
                              className="flex items-center justify-between"
                            >
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {item.label}
                                </h4>
                                <p className="text-sm text-gray-500">
                                  {item.desc}
                                </p>
                              </div>
                              <button
                                onClick={() =>
                                  handleSettingChange(
                                    "notifications",
                                    item.key,
                                    !settings.notifications[item.key]
                                  )
                                }
                                className={`relative w-12 h-6 rounded-full transition-colors ${
                                  settings.notifications[item.key]
                                    ? "bg-blue-600"
                                    : "bg-gray-300"
                                }`}
                              >
                                <div
                                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                    settings.notifications[item.key]
                                      ? "translate-x-6"
                                      : ""
                                  }`}
                                />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t">
                        <p
                          className={`text-sm ${
                            notificationsDirty
                              ? "text-gray-600"
                              : "text-gray-400"
                          }`}
                        >
                          {notificationsDirty
                            ? "You have unsaved notification changes"
                            : "Settings are synced"}
                        </p>
                        <button
                          onClick={handleNotificationSave}
                          disabled={!notificationsDirty || savingNotifications}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {savingNotifications
                            ? "Saving..."
                            : "Save notification settings"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Account Settings */}
                {activeSection === "account" && (
                  <div className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">
                      Account Settings
                    </h2>

                    <div className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="flex items-start justify-between gap-4 p-4 border border-gray-200 rounded-xl">
                          <div>
                            <h3 className="font-medium text-gray-900">
                              Two-Factor Authentication
                            </h3>
                            <p className="text-sm text-gray-500">
                              Add an extra layer of security when signing in.
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              Last reviewed: {lastSecurityReviewLabel}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              handleSettingChange(
                                "account",
                                "twoFactor",
                                !settings.account.twoFactor
                              )
                            }
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                              settings.account.twoFactor
                                ? "bg-blue-600"
                                : "bg-gray-300"
                            }`}
                          >
                            <div
                              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                settings.account.twoFactor
                                  ? "translate-x-6"
                                  : ""
                              }`}
                            />
                          </button>
                        </div>

                        <div className="p-4 border border-gray-200 rounded-xl">
                          <h3 className="font-medium text-gray-900">
                            Backup Codes
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {settings.account.backupCodesGenerated
                              ? "Backup codes were generated for account recovery."
                              : "Generate single-use codes to regain access if you lose your device."}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              handleSettingChange(
                                "account",
                                "backupCodesGenerated",
                                true
                              )
                            }
                            className="mt-3 inline-flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                          >
                            <IoDownload className="w-4 h-4" />
                            {settings.account.backupCodesGenerated
                              ? "Regenerate codes"
                              : "Generate codes"}
                          </button>
                        </div>
                      </div>

                      <div className="border border-gray-200 rounded-xl p-4">
                        <h3 className="font-medium text-gray-900 mb-4">
                          Account Insight
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">
                              Joined
                            </p>
                            <p className="text-base font-semibold text-gray-900">
                              {joinedDateLabel}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">
                              Followers
                            </p>
                            <p className="text-base font-semibold text-gray-900">
                              {followersCount}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500">
                              Following
                            </p>
                            <p className="text-base font-semibold text-gray-900">
                              {followingCount}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t">
                        <p
                          className={`text-sm ${
                            accountDirty ? "text-gray-600" : "text-gray-400"
                          }`}
                        >
                          {accountDirty
                            ? "You have unsaved security preferences"
                            : "Security preferences are synced"}
                        </p>
                        <button
                          onClick={handleAccountSave}
                          disabled={!accountDirty || savingAccount}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {savingAccount
                            ? "Saving..."
                            : "Save security settings"}
                        </button>
                      </div>

                      <div className="border-t pt-6">
                        <h3 className="font-medium text-gray-900 mb-4">
                          Data Management
                        </h3>

                        <div className="space-y-4">
                          <button className="flex items-center gap-3 p-4 w-full text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            <IoDownload className="w-5 h-5 text-blue-600" />
                            <div>
                              <h4 className="font-medium text-gray-900">
                                Download My Data
                              </h4>
                              <p className="text-sm text-gray-500">
                                Get a copy of all your data
                              </p>
                            </div>
                          </button>

                          <button
                            onClick={logout}
                            className="flex items-center gap-3 p-4 w-full text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <IoSettings className="w-5 h-5 text-gray-600" />
                            <div>
                              <h4 className="font-medium text-gray-900">
                                Sign Out
                              </h4>
                              <p className="text-sm text-gray-500">
                                Sign out of your account
                              </p>
                            </div>
                          </button>
                        </div>
                      </div>

                      <div className="border-t pt-6">
                        <h3 className="font-medium text-red-600 mb-4">
                          Danger Zone
                        </h3>

                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="flex items-center gap-3 p-4 w-full text-left border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <IoTrash className="w-5 h-5 text-red-600" />
                          <div>
                            <h4 className="font-medium text-red-600">
                              Delete Account
                            </h4>
                            <p className="text-sm text-red-500">
                              Permanently delete your account and all data
                            </p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md mx-4">
              <div className="flex items-center gap-3 mb-4">
                <IoWarning className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete Account
                </h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete your account? This action cannot
                be undone and all your data will be permanently lost.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Account
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#363636",
            color: "#fff",
          },
          success: {
            style: {
              background: "#059669",
            },
          },
          error: {
            style: {
              background: "#DC2626",
            },
          },
        }}
      />
    </div>
  );
}
