import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FiSettings,
  FiMail,
  FiBell,
  FiToggleLeft,
  FiToggleRight,
  FiSave,
  FiRefreshCw,
  FiGlobe,
  FiShield,
  FiKey,
  FiDatabase,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { apiClient } from "../lib/apiClient.js";
import Loader from "../components/loading/Loader.jsx";
import { useAdminSession } from "../context/AdminAuthContext.jsx";

const SystemSettingsPage = () => {
  const { isAuthenticated } = useAdminSession();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("general");

  // Fetch settings
  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiClient.get("/settings"),
    enabled: isAuthenticated,
    retry: false,
  });

  // Form states
  const [generalSettings, setGeneralSettings] = useState({
    siteName: "Daiaryverse",
    siteDescription: "Your digital journaling companion",
    maintenanceMode: false,
    registrationEnabled: true,
  });

  const [emailSettings, setEmailSettings] = useState({
    smtpHost: "",
    smtpPort: "",
    smtpUser: "",
    smtpPassword: "",
    fromEmail: "",
    fromName: "",
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    newUserWelcomeEmail: true,
    weeklyDigest: false,
    marketplaceAlerts: true,
    communityUpdates: true,
  });

  const [featureToggles, setFeatureToggles] = useState({
    marketplace: true,
    community: true,
    readerLounge: true,
    creatorHub: true,
    aiAssistant: true,
    socialSharing: true,
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings) => {
      return await apiClient.put("/settings", settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["settings"]);
      toast.success("Settings updated successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to update settings");
    },
  });

  const handleSaveGeneral = () => {
    updateSettingsMutation.mutate({
      category: "general",
      settings: generalSettings,
    });
  };

  const handleSaveEmail = () => {
    updateSettingsMutation.mutate({
      category: "email",
      settings: emailSettings,
    });
  };

  const handleSaveNotifications = () => {
    updateSettingsMutation.mutate({
      category: "notifications",
      settings: notificationSettings,
    });
  };

  const handleSaveFeatures = () => {
    updateSettingsMutation.mutate({
      category: "features",
      settings: featureToggles,
    });
  };

  const toggleFeature = (feature) => {
    setFeatureToggles((prev) => ({
      ...prev,
      [feature]: !prev[feature],
    }));
  };

  const toggleNotification = (notification) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [notification]: !prev[notification],
    }));
  };

  if (isLoading) {
    return <Loader label="Loading settings" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
            System Settings
          </h1>
          <p className="mt-2 text-sm text-slate-600 flex items-center gap-2">
            <FiSettings className="w-4 h-4" />
            Configure platform settings and features
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-2">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "general"
                ? "bg-indigo-600 text-white shadow-lg"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FiGlobe className="w-4 h-4" />
            General
          </button>
          <button
            onClick={() => setActiveTab("email")}
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "email"
                ? "bg-indigo-600 text-white shadow-lg"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FiMail className="w-4 h-4" />
            Email
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "notifications"
                ? "bg-indigo-600 text-white shadow-lg"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FiBell className="w-4 h-4" />
            Notifications
          </button>
          <button
            onClick={() => setActiveTab("features")}
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "features"
                ? "bg-indigo-600 text-white shadow-lg"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FiToggleRight className="w-4 h-4" />
            Features
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "security"
                ? "bg-indigo-600 text-white shadow-lg"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FiShield className="w-4 h-4" />
            Security
          </button>
        </div>
      </div>

      {/* General Settings */}
      {activeTab === "general" && (
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              General Configuration
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Site Name
                </label>
                <input
                  type="text"
                  value={generalSettings.siteName}
                  onChange={(e) =>
                    setGeneralSettings({
                      ...generalSettings,
                      siteName: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Site Description
                </label>
                <textarea
                  value={generalSettings.siteDescription}
                  onChange={(e) =>
                    setGeneralSettings({
                      ...generalSettings,
                      siteDescription: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-semibold text-slate-800">
                    Maintenance Mode
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    Disable access to the platform temporarily
                  </p>
                </div>
                <button
                  onClick={() =>
                    setGeneralSettings({
                      ...generalSettings,
                      maintenanceMode: !generalSettings.maintenanceMode,
                    })
                  }
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    generalSettings.maintenanceMode
                      ? "bg-red-600"
                      : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      generalSettings.maintenanceMode
                        ? "translate-x-7"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-semibold text-slate-800">
                    User Registration
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    Allow new users to create accounts
                  </p>
                </div>
                <button
                  onClick={() =>
                    setGeneralSettings({
                      ...generalSettings,
                      registrationEnabled: !generalSettings.registrationEnabled,
                    })
                  }
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    generalSettings.registrationEnabled
                      ? "bg-green-600"
                      : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      generalSettings.registrationEnabled
                        ? "translate-x-7"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveGeneral}
            disabled={updateSettingsMutation.isPending}
            className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <FiSave className="w-4 h-4" />
            {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}

      {/* Email Settings */}
      {activeTab === "email" && (
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              Email Configuration
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    value={emailSettings.smtpHost}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        smtpHost: e.target.value,
                      })
                    }
                    placeholder="smtp.gmail.com"
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    SMTP Port
                  </label>
                  <input
                    type="text"
                    value={emailSettings.smtpPort}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        smtpPort: e.target.value,
                      })
                    }
                    placeholder="587"
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  SMTP Username
                </label>
                <input
                  type="text"
                  value={emailSettings.smtpUser}
                  onChange={(e) =>
                    setEmailSettings({
                      ...emailSettings,
                      smtpUser: e.target.value,
                    })
                  }
                  placeholder="user@example.com"
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  SMTP Password
                </label>
                <input
                  type="password"
                  value={emailSettings.smtpPassword}
                  onChange={(e) =>
                    setEmailSettings({
                      ...emailSettings,
                      smtpPassword: e.target.value,
                    })
                  }
                  placeholder="••••••••"
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    From Email
                  </label>
                  <input
                    type="email"
                    value={emailSettings.fromEmail}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        fromEmail: e.target.value,
                      })
                    }
                    placeholder="noreply@daiaryverse.com"
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    From Name
                  </label>
                  <input
                    type="text"
                    value={emailSettings.fromName}
                    onChange={(e) =>
                      setEmailSettings({
                        ...emailSettings,
                        fromName: e.target.value,
                      })
                    }
                    placeholder="Daiaryverse"
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveEmail}
            disabled={updateSettingsMutation.isPending}
            className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <FiSave className="w-4 h-4" />
            {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}

      {/* Notification Settings */}
      {activeTab === "notifications" && (
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              Notification Preferences
            </h3>
            <div className="space-y-3">
              {Object.entries(notificationSettings).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-slate-800 capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      {key === "emailNotifications" &&
                        "Send notifications via email"}
                      {key === "pushNotifications" &&
                        "Send push notifications to mobile devices"}
                      {key === "newUserWelcomeEmail" &&
                        "Send welcome email to new users"}
                      {key === "weeklyDigest" &&
                        "Send weekly activity digest to users"}
                      {key === "marketplaceAlerts" &&
                        "Notify about marketplace activities"}
                      {key === "communityUpdates" &&
                        "Notify about community activities"}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleNotification(key)}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      value ? "bg-green-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                        value ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleSaveNotifications}
            disabled={updateSettingsMutation.isPending}
            className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <FiSave className="w-4 h-4" />
            {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}

      {/* Feature Toggles */}
      {activeTab === "features" && (
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              Feature Toggles
            </h3>
            <div className="space-y-3">
              {Object.entries(featureToggles).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-slate-800 capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      {key === "marketplace" &&
                        "Enable book marketplace for buying/selling"}
                      {key === "community" &&
                        "Enable community features and social interactions"}
                      {key === "readerLounge" &&
                        "Enable reader lounge for book discussions"}
                      {key === "creatorHub" &&
                        "Enable creator hub for content creators"}
                      {key === "aiAssistant" &&
                        "Enable AI-powered writing assistant"}
                      {key === "socialSharing" && "Enable social media sharing"}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleFeature(key)}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      value ? "bg-green-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                        value ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleSaveFeatures}
            disabled={updateSettingsMutation.isPending}
            className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <FiSave className="w-4 h-4" />
            {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}

      {/* Security Settings */}
      {activeTab === "security" && (
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              Security Configuration
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 rounded-xl border-2 border-yellow-200">
                <div className="flex items-start gap-3">
                  <FiShield className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-800">
                      Security Notice
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      These settings affect platform security. Please be careful
                      when making changes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="font-semibold text-slate-800 mb-2">
                  JWT Secret Rotation
                </p>
                <p className="text-sm text-slate-600 mb-4">
                  Rotate the JWT secret key. This will log out all users.
                </p>
                <button className="rounded-lg border-2 border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 transition-all flex items-center gap-2">
                  <FiKey className="w-4 h-4" />
                  Rotate JWT Secret
                </button>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="font-semibold text-slate-800 mb-2">Clear Cache</p>
                <p className="text-sm text-slate-600 mb-4">
                  Clear all cached data to improve performance
                </p>
                <button className="rounded-lg border-2 border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-100 transition-all flex items-center gap-2">
                  <FiRefreshCw className="w-4 h-4" />
                  Clear Cache
                </button>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="font-semibold text-slate-800 mb-2">
                  Database Backup
                </p>
                <p className="text-sm text-slate-600 mb-4">
                  Create a backup of the entire database
                </p>
                <button className="rounded-lg border-2 border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-600 hover:bg-green-100 transition-all flex items-center gap-2">
                  <FiDatabase className="w-4 h-4" />
                  Create Backup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemSettingsPage;
