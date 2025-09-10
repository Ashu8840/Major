import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
// import { ThemeContext } from "../context/ThemeContext"; // TODO: Implement theme system later
import {
  IoSettings,
  IoPersonCircle,
  IoLockClosed,
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
} from "react-icons/io5";

export default function Settings() {
  const { user, logout } = useContext(AuthContext);
  // const { currentTheme, setTheme } = useContext(ThemeContext); // TODO: Implement theme system later
  const [activeSection, setActiveSection] = useState("general");
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [previewTheme, setPreviewTheme] = useState("default");

  // Settings state
  const [settings, setSettings] = useState({
    profile: {
      username: "ayush_writer",
      displayName: "Ayush Tripathi",
      email: "ayush@example.com",
      bio: "Passionate storyteller and digital diary enthusiast.",
      uid: "DA-2025-AYU001", // Read-only
    },
    privacy: {
      diaryVisibility: "private",
      allowMessages: "followers",
      showOnlineStatus: true,
      indexProfile: true,
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      newFollowers: true,
      messages: true,
      purchases: false,
      marketing: false,
    },
    account: {
      twoFactor: false,
      dataDownload: false,
    },
  });

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
    { id: "privacy", label: "Privacy", icon: IoShield },
    { id: "notifications", label: "Notifications", icon: IoNotifications },
    { id: "account", label: "Account", icon: IoPersonCircle },
  ];

  const handleSettingChange = (section, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const handleThemeSelect = (themeId) => {
    setPreviewTheme(themeId);
  };

  const handleThemeSave = () => {
    // setTheme(previewTheme); // TODO: Implement theme system later
    // Here you would also save to backend/localStorage
    console.log("Theme saving will be implemented later:", previewTheme);
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
                        src="/api/placeholder/80/80"
                        alt="Profile"
                        className="w-20 h-20 rounded-full object-cover border-4 border-gray-200"
                      />
                      <div>
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                          Change Photo
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
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={settings.profile.uid}
                          readOnly
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                        />
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <IoLockClosed className="w-4 h-4" />
                          Cannot be changed
                        </div>
                      </div>
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
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
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={settings.profile.email}
                        onChange={(e) =>
                          handleSettingChange(
                            "profile",
                            "email",
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                          handleSettingChange("profile", "bio", e.target.value)
                        }
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Change Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Change Password
                      </label>
                      <div className="space-y-3">
                        <input
                          type="password"
                          placeholder="Current Password"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            placeholder="New Password"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-2 p-1 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? (
                              <IoEyeOff className="w-5 h-5" />
                            ) : (
                              <IoEye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                        <input
                          type="password"
                          placeholder="Confirm New Password"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                        <IoSave className="w-4 h-4" />
                        Save Changes
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
                      Choose your preferred theme. Changes will be applied after
                      saving.
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
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <IoSave className="w-4 h-4" />
                        Apply Theme
                      </button>
                    </div>
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
                        Diary Entries Visibility
                      </label>
                      <div className="space-y-2">
                        {["public", "private", "followers"].map((option) => (
                          <label
                            key={option}
                            className="flex items-center gap-3"
                          >
                            <input
                              type="radio"
                              name="diaryVisibility"
                              value={option}
                              checked={
                                settings.privacy.diaryVisibility === option
                              }
                              onChange={(e) =>
                                handleSettingChange(
                                  "privacy",
                                  "diaryVisibility",
                                  e.target.value
                                )
                              }
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="capitalize">{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Allow Messages From
                      </label>
                      <select
                        value={settings.privacy.allowMessages}
                        onChange={(e) =>
                          handleSettingChange(
                            "privacy",
                            "allowMessages",
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="everyone">Everyone</option>
                        <option value="followers">Followers Only</option>
                        <option value="nobody">Nobody</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          Show Online Status
                        </h3>
                        <p className="text-sm text-gray-500">
                          Let others see when you're active
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleSettingChange(
                            "privacy",
                            "showOnlineStatus",
                            !settings.privacy.showOnlineStatus
                          )
                        }
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          settings.privacy.showOnlineStatus
                            ? "bg-blue-600"
                            : "bg-gray-300"
                        }`}
                      >
                        <div
                          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            settings.privacy.showOnlineStatus
                              ? "translate-x-6"
                              : ""
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          Index Profile
                        </h3>
                        <p className="text-sm text-gray-500">
                          Allow search engines to find your profile
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleSettingChange(
                            "privacy",
                            "indexProfile",
                            !settings.privacy.indexProfile
                          )
                        }
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          settings.privacy.indexProfile
                            ? "bg-blue-600"
                            : "bg-gray-300"
                        }`}
                      >
                        <div
                          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            settings.privacy.indexProfile ? "translate-x-6" : ""
                          }`}
                        />
                      </button>
                    </div>

                    <div className="pt-4 border-t">
                      <h3 className="font-medium text-gray-900 mb-3">
                        Blocked Users
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-gray-500">No blocked users</p>
                      </div>
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
                            "emailNotifications",
                            !settings.notifications.emailNotifications
                          )
                        }
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          settings.notifications.emailNotifications
                            ? "bg-blue-600"
                            : "bg-gray-300"
                        }`}
                      >
                        <div
                          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            settings.notifications.emailNotifications
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
                            "pushNotifications",
                            !settings.notifications.pushNotifications
                          )
                        }
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          settings.notifications.pushNotifications
                            ? "bg-blue-600"
                            : "bg-gray-300"
                        }`}
                      >
                        <div
                          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            settings.notifications.pushNotifications
                              ? "translate-x-6"
                              : ""
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
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          Two-Factor Authentication
                        </h3>
                        <p className="text-sm text-gray-500">
                          Add an extra layer of security
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
                            settings.account.twoFactor ? "translate-x-6" : ""
                          }`}
                        />
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
    </div>
  );
}
