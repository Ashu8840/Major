import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../context/AuthContext";
import { Navbar } from "../components/layout/Navbar";
import { useRouter, useLocalSearchParams } from "expo-router";
import axios from "axios";
import { AppTheme, useAppTheme } from "@/context/ThemeContext";

const API_URL = "http://10.179.215.93:5000/api";

interface Settings {
  profile: {
    username: string;
    displayName: string;
    email: string;
    bio: string;
    profileImage: any;
    userId: string;
    uid: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  socialLinks: {
    website: string;
    twitter: string;
    instagram: string;
    linkedin: string;
    facebook: string;
    youtube: string;
  };
  privacy: {
    profileVisibility: string;
    diaryVisibility: string;
    allowMessages: string;
    showEmail: boolean;
    showAnalytics: boolean;
    showOnlineStatus: boolean;
    indexProfile: boolean;
  };
  notifications: {
    email: boolean;
    push: boolean;
    newFollowers: boolean;
    messages: boolean;
    purchases: boolean;
    marketing: boolean;
  };
  theme: {
    current: string;
  };
  account: {
    profileCompleted: boolean;
    firstLogin: boolean;
    joinedDate: string | null;
  };
}

const DEFAULT_SETTINGS: Settings = {
  profile: {
    username: "",
    displayName: "",
    email: "",
    bio: "",
    profileImage: null,
    userId: "",
    uid: "",
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
  account: {
    profileCompleted: false,
    firstLogin: false,
    joinedDate: null,
  },
};

const sections = [
  { id: "general", label: "General", icon: "settings-outline" },
  { id: "theme", label: "Theme", icon: "color-palette-outline" },
  { id: "privacy", label: "Privacy", icon: "shield-outline" },
  {
    id: "notifications",
    label: "Notifications",
    icon: "notifications-outline",
  },
  { id: "account", label: "Account", icon: "person-outline" },
];

const themes = [
  {
    id: "ocean-blue",
    name: "Ocean Blue",
    icon: "sunny-outline",
    colors: ["#eff6ff", "#ffffff"],
    primary: "#3b82f6",
    description: "Clean and professional",
  },
  {
    id: "jungle",
    name: "Jungle",
    icon: "leaf-outline",
    colors: ["#f0fdf4", "#d1fae5"],
    primary: "#10b981",
    description: "Earthy and natural 🌿",
  },
  {
    id: "dark-night",
    name: "Dark Night",
    icon: "moon-outline",
    colors: ["#1e293b", "#0f172a"],
    primary: "#475569",
    description: "Easy on the eyes",
  },
  {
    id: "sunset",
    name: "Sunset",
    icon: "flame-outline",
    colors: ["#fff7ed", "#fed7aa"],
    primary: "#f97316",
    description: "Warm and vibrant 🌅",
  },
  {
    id: "vibrant",
    name: "Vibrant",
    icon: "flash-outline",
    colors: ["#fef3c7", "#fde047"],
    primary: "#eab308",
    description: "Bold and energetic ⚡",
  },
  {
    id: "romance",
    name: "Romance",
    icon: "heart-outline",
    colors: ["#fce7f3", "#fbcfe8"],
    primary: "#ec4899",
    description: "Soft and dreamy 💕",
  },
];

export default function SettingsScreen() {
  const { user, token, profile, refreshProfile } = useAuth();
  const { theme, themeName, setThemeName } = useAppTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [activeSection, setActiveSection] = useState<string>(
    (params.section as string) || "general"
  );
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState({
    type: "idle",
    message: "",
  });
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(
    null
  );
  const [previewTheme, setPreviewTheme] = useState<string>(themeName);
  const originalUsernameRef = useRef("");

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${token}` },
  });

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      if (!token) return;

      setLoading(true);
      try {
        const response = await axios.get(
          `${API_URL}/users/settings`,
          getAuthHeaders()
        );
        if (response.data.settings) {
          const normalized = { ...DEFAULT_SETTINGS, ...response.data.settings };
          setSettings(normalized);
          originalUsernameRef.current = normalized.profile?.username || "";
          setProfileImagePreview(normalized.profile?.profileImage?.url || null);
          const savedTheme = normalized.theme?.current || themeName;
          setPreviewTheme(savedTheme);
        }
      } catch (error: any) {
        console.error("Failed to fetch settings:", error);
        // If 404, user settings don't exist yet - use defaults
        if (error?.response?.status === 404) {
          console.log("No settings found, using defaults");
        } else {
          Alert.alert("Error", "Failed to load settings");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [token]);

  // Update from profile if available
  useEffect(() => {
    if (profile && !loading) {
      setSettings((prev) => ({
        ...prev,
        profile: {
          username: profile.username || prev.profile.username || "",
          displayName: profile.displayName || prev.profile.displayName || "",
          email: profile.email || prev.profile.email || "",
          bio: profile.bio || prev.profile.bio || "",
          profileImage: profile.profileImage || prev.profile.profileImage,
          userId: profile.userId || prev.profile.userId || "",
          uid: profile.userId || prev.profile.uid || "",
        },
        account: {
          ...prev.account,
          profileCompleted:
            profile.profileCompleted ?? prev.account.profileCompleted,
          firstLogin: profile.firstLogin ?? prev.account.firstLogin,
          joinedDate: profile.createdAt || prev.account.joinedDate,
        },
      }));
    }
  }, [profile, loading]);

  const handleSettingChange = (
    section: keyof Settings,
    field: string,
    value: any
  ) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [field]: value,
      },
    }));
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username === originalUsernameRef.current) {
      setUsernameStatus({ type: "idle", message: "" });
      return;
    }

    if (username.length < 3) {
      setUsernameStatus({
        type: "error",
        message: "Username must be at least 3 characters",
      });
      return;
    }

    setCheckingUsername(true);
    try {
      const response = await axios.get(
        `${API_URL}/users/check-username/${username}`,
        getAuthHeaders()
      );

      if (response.data.available) {
        setUsernameStatus({
          type: "success",
          message: "✓ Username is available",
        });
      } else {
        setUsernameStatus({ type: "error", message: "✗ Username is taken" });
      }
    } catch (error: any) {
      setUsernameStatus({
        type: "error",
        message: "Unable to check availability",
      });
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleUsernameBlur = () => {
    checkUsernameAvailability(settings.profile.username);
  };

  const handleImagePick = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library"
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await handleImageUpload(result.assets[0]);
    }
  };

  const handleImageUpload = async (imageAsset: any) => {
    setUploadingImage(true);
    try {
      console.log("=== Starting image upload ===");
      console.log("API_URL:", API_URL);
      console.log("Token:", token ? "Present" : "Missing");
      console.log("Image URI:", imageAsset.uri);

      // Get file info
      const fileName =
        imageAsset.uri.split("/").pop() || `profile_${Date.now()}.jpg`;
      const fileType = fileName.split(".").pop() || "jpg";

      console.log("File name:", fileName);
      console.log("File type:", fileType);

      // Create FormData with proper file structure
      const formData = new FormData();
      formData.append("profileImage", {
        uri: imageAsset.uri,
        type: `image/${fileType}`,
        name: fileName,
      } as any);

      console.log("Uploading to:", `${API_URL}/profile/upload/profile-image`);

      // Use XMLHttpRequest for better compatibility with multipart/form-data
      const uploadUrl = `${API_URL}/profile/upload/profile-image`;

      const response = (await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open("POST", uploadUrl);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve({ data });
            } catch (e) {
              reject(new Error("Invalid JSON response"));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Network error occurred"));
        xhr.ontimeout = () => reject(new Error("Request timeout"));

        xhr.timeout = 30000; // 30 second timeout
        xhr.send(formData as any);
      })) as any;

      console.log("Upload response:", response.data);

      if (response.data.profileImage) {
        setProfileImagePreview(response.data.profileImage.url);
        setSettings((prev) => ({
          ...prev,
          profile: {
            ...prev.profile,
            profileImage: response.data.profileImage,
          },
        }));
        Alert.alert("Success", "Profile image updated!");
        await refreshProfile();
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      console.error("Error message:", error.message);

      let errorMessage = "Failed to upload image";

      if (error.message.includes("Network error")) {
        errorMessage =
          "Network Error: Please check your connection and try again";
      } else if (error.message.includes("timeout")) {
        errorMessage = "Upload timeout: Please try again with a smaller image";
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert("Upload Error", errorMessage);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!settings.profile.username.trim()) {
      Alert.alert("Error", "Username is required");
      return;
    }

    if (!settings.profile.displayName.trim()) {
      Alert.alert("Error", "Display name is required");
      return;
    }

    if (
      usernameStatus.type === "error" &&
      settings.profile.username !== originalUsernameRef.current
    ) {
      Alert.alert("Error", "Please choose a different username");
      return;
    }

    setSaving(true);
    try {
      const response = await axios.put(
        `${API_URL}/users/settings`,
        {
          username: settings.profile.username,
          displayName: settings.profile.displayName,
          bio: settings.profile.bio,
        },
        getAuthHeaders()
      );

      if (response.data.user) {
        originalUsernameRef.current = response.data.user.username;
        await refreshProfile();
      }

      Alert.alert("Success", "Profile updated successfully!");

      // If first-time user completing profile, navigate to home
      if (!profile?.profileCompleted) {
        setTimeout(() => {
          router.replace("/");
        }, 1500);
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to update profile"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleThemeSave = async () => {
    setSaving(true);
    try {
      // Apply theme immediately
      setThemeName(previewTheme as any);

      // Save to backend
      await axios.put(
        `${API_URL}/users/settings/theme`,
        { theme: previewTheme },
        getAuthHeaders()
      );

      setSettings((prev) => ({
        ...prev,
        theme: { current: previewTheme },
      }));

      Alert.alert("Success", "Theme updated!");
    } catch (error) {
      Alert.alert("Error", "Failed to update theme");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrivacy = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${API_URL}/users/settings/privacy`,
        { privacy: settings.privacy },
        getAuthHeaders()
      );
      Alert.alert("Success", "Privacy settings updated!");
    } catch (error) {
      Alert.alert("Error", "Failed to update privacy settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${API_URL}/users/settings/notifications`,
        { notifications: settings.notifications },
        getAuthHeaders()
      );
      Alert.alert("Success", "Notification settings updated!");
    } catch (error) {
      Alert.alert("Error", "Failed to update notification settings");
    } finally {
      setSaving(false);
    }
  };

  const styles = React.useMemo(() => createStyles(theme), [theme]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.navbarWrapper}>
          <Navbar onAvatarPress={() => router.push("/more")} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.navbarWrapper}>
        <Navbar onAvatarPress={() => router.push("/more")} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 130 }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>
            Manage your account, privacy, and preferences
          </Text>
        </View>

        {/* Section Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabs}
          contentContainerStyle={styles.tabsContent}
        >
          {sections.map((section) => (
            <TouchableOpacity
              key={section.id}
              style={[
                styles.tab,
                activeSection === section.id && styles.tabActive,
              ]}
              onPress={() => setActiveSection(section.id)}
            >
              <Ionicons
                name={section.icon as any}
                size={18}
                color={activeSection === section.id ? "#3b82f6" : "#6b7280"}
              />
              <Text
                style={[
                  styles.tabText,
                  activeSection === section.id && styles.tabTextActive,
                ]}
              >
                {section.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Content Card */}
        <View style={styles.card}>
          {/* GENERAL SETTINGS */}
          {activeSection === "general" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>General Settings</Text>

              {/* Profile Picture */}
              <View style={styles.imageSection}>
                <Image
                  source={{
                    uri:
                      profileImagePreview ||
                      settings.profile.profileImage?.url ||
                      "https://via.placeholder.com/80",
                  }}
                  style={styles.profileImage}
                />
                <View style={styles.imageActions}>
                  <TouchableOpacity
                    style={styles.changePhotoButton}
                    onPress={handleImagePick}
                    disabled={uploadingImage}
                  >
                    <Text style={styles.changePhotoButtonText}>
                      {uploadingImage ? "Uploading..." : "Change Photo"}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.imageHint}>JPG, PNG up to 5MB</Text>
                </View>
              </View>

              {/* User ID (Read-only) */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Unique User ID{" "}
                  <Text style={styles.labelHint}>(Cannot be changed)</Text>
                </Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={settings.profile.userId || settings.profile.uid}
                  editable={false}
                  placeholder="User ID will appear here"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Username */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.input}
                  value={settings.profile.username}
                  onChangeText={(text) =>
                    handleSettingChange("profile", "username", text)
                  }
                  onBlur={handleUsernameBlur}
                  placeholder="Choose your username"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                />
                {checkingUsername && (
                  <Text style={styles.hintInfo}>Checking availability...</Text>
                )}
                {!checkingUsername && usernameStatus.message && (
                  <Text
                    style={[
                      styles.hint,
                      usernameStatus.type === "error"
                        ? styles.hintError
                        : styles.hintSuccess,
                    ]}
                  >
                    {usernameStatus.message}
                  </Text>
                )}
              </View>

              {/* Display Name */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Display Name</Text>
                <TextInput
                  style={styles.input}
                  value={settings.profile.displayName}
                  onChangeText={(text) =>
                    handleSettingChange("profile", "displayName", text)
                  }
                  placeholder="Your display name"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Email (Read-only) */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Email Address{" "}
                  <Text style={styles.labelHint}>(Cannot be changed)</Text>
                </Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={settings.profile.email}
                  editable={false}
                  placeholder="Email will appear here"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Bio */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Bio</Text>
                <TextInput
                  style={styles.textArea}
                  value={settings.profile.bio}
                  onChangeText={(text) =>
                    handleSettingChange("profile", "bio", text)
                  }
                  placeholder="Tell us about yourself..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (saving || uploadingImage || checkingUsername) &&
                    styles.saveButtonDisabled,
                ]}
                onPress={handleSaveProfile}
                disabled={saving || uploadingImage || checkingUsername}
              >
                <Ionicons name="save-outline" size={18} color="#ffffff" />
                <Text style={styles.saveButtonText}>
                  {saving ? "Saving..." : "Save Changes"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* THEME SETTINGS */}
          {activeSection === "theme" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Theme Settings</Text>
              <Text style={styles.sectionSubtitle}>
                Choose your preferred theme. Changes will be applied after
                saving.
              </Text>

              <View style={styles.themesGrid}>
                {themes.map((theme) => (
                  <TouchableOpacity
                    key={theme.id}
                    style={[
                      styles.themeCard,
                      previewTheme === theme.id && styles.themeCardActive,
                    ]}
                    onPress={() => setPreviewTheme(theme.id)}
                  >
                    <View
                      style={[
                        styles.themePreview,
                        { backgroundColor: theme.colors[0] },
                      ]}
                    >
                      <View
                        style={[
                          styles.themeIcon,
                          { backgroundColor: theme.primary },
                        ]}
                      >
                        <Ionicons
                          name={theme.icon as any}
                          size={16}
                          color="#ffffff"
                        />
                      </View>
                    </View>
                    <Text style={styles.themeName}>{theme.name}</Text>
                    <Text style={styles.themeDescription}>
                      {theme.description}
                    </Text>
                    {previewTheme === theme.id && (
                      <View style={styles.themeCheck}>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#3b82f6"
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleThemeSave}
                disabled={saving}
              >
                <Ionicons name="save-outline" size={18} color="#ffffff" />
                <Text style={styles.saveButtonText}>
                  {saving ? "Applying..." : "Apply Theme"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* PRIVACY SETTINGS */}
          {activeSection === "privacy" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Privacy Settings</Text>

              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Profile Visibility</Text>
                  <Text style={styles.settingDescription}>
                    Who can view your profile
                  </Text>
                </View>
                <View style={styles.segmentedControl}>
                  {["public", "followers", "private"].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.segmentOption,
                        settings.privacy.profileVisibility === option &&
                          styles.segmentOptionActive,
                      ]}
                      onPress={() =>
                        handleSettingChange(
                          "privacy",
                          "profileVisibility",
                          option
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.segmentOptionText,
                          settings.privacy.profileVisibility === option &&
                            styles.segmentOptionTextActive,
                        ]}
                      >
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Diary Visibility</Text>
                  <Text style={styles.settingDescription}>
                    Who can see your diary entries
                  </Text>
                </View>
                <View style={styles.segmentedControl}>
                  {["public", "followers", "private"].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.segmentOption,
                        settings.privacy.diaryVisibility === option &&
                          styles.segmentOptionActive,
                      ]}
                      onPress={() =>
                        handleSettingChange(
                          "privacy",
                          "diaryVisibility",
                          option
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.segmentOptionText,
                          settings.privacy.diaryVisibility === option &&
                            styles.segmentOptionTextActive,
                        ]}
                      >
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Allow Messages</Text>
                  <Text style={styles.settingDescription}>
                    Who can message you
                  </Text>
                </View>
                <View style={styles.segmentedControl}>
                  {["everyone", "followers", "nobody"].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.segmentOption,
                        settings.privacy.allowMessages === option &&
                          styles.segmentOptionActive,
                      ]}
                      onPress={() =>
                        handleSettingChange("privacy", "allowMessages", option)
                      }
                    >
                      <Text
                        style={[
                          styles.segmentOptionText,
                          settings.privacy.allowMessages === option &&
                            styles.segmentOptionTextActive,
                        ]}
                      >
                        {option === "nobody"
                          ? "None"
                          : option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.toggleItem}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Show Email</Text>
                  <Text style={styles.toggleDescription}>
                    Display email on profile
                  </Text>
                </View>
                <Switch
                  value={settings.privacy.showEmail}
                  onValueChange={(val) =>
                    handleSettingChange("privacy", "showEmail", val)
                  }
                  trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
                  thumbColor={
                    settings.privacy.showEmail ? "#3b82f6" : "#f3f4f6"
                  }
                />
              </View>

              <View style={styles.toggleItem}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Show Analytics</Text>
                  <Text style={styles.toggleDescription}>
                    Display stats on profile
                  </Text>
                </View>
                <Switch
                  value={settings.privacy.showAnalytics}
                  onValueChange={(val) =>
                    handleSettingChange("privacy", "showAnalytics", val)
                  }
                  trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
                  thumbColor={
                    settings.privacy.showAnalytics ? "#3b82f6" : "#f3f4f6"
                  }
                />
              </View>

              <View style={styles.toggleItem}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Show Online Status</Text>
                  <Text style={styles.toggleDescription}>
                    Let others know when you're active
                  </Text>
                </View>
                <Switch
                  value={settings.privacy.showOnlineStatus}
                  onValueChange={(val) =>
                    handleSettingChange("privacy", "showOnlineStatus", val)
                  }
                  trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
                  thumbColor={
                    settings.privacy.showOnlineStatus ? "#3b82f6" : "#f3f4f6"
                  }
                />
              </View>

              <View style={styles.toggleItem}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Index Profile</Text>
                  <Text style={styles.toggleDescription}>
                    Allow search engines to find your profile
                  </Text>
                </View>
                <Switch
                  value={settings.privacy.indexProfile}
                  onValueChange={(val) =>
                    handleSettingChange("privacy", "indexProfile", val)
                  }
                  trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
                  thumbColor={
                    settings.privacy.indexProfile ? "#3b82f6" : "#f3f4f6"
                  }
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSavePrivacy}
                disabled={saving}
              >
                <Ionicons name="save-outline" size={18} color="#ffffff" />
                <Text style={styles.saveButtonText}>
                  {saving ? "Saving..." : "Save Privacy Settings"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* NOTIFICATION SETTINGS */}
          {activeSection === "notifications" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notification Settings</Text>

              <View style={styles.toggleItem}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Email Notifications</Text>
                  <Text style={styles.toggleDescription}>
                    Receive updates via email
                  </Text>
                </View>
                <Switch
                  value={settings.notifications.email}
                  onValueChange={(val) =>
                    handleSettingChange("notifications", "email", val)
                  }
                  trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
                  thumbColor={
                    settings.notifications.email ? "#3b82f6" : "#f3f4f6"
                  }
                />
              </View>

              <View style={styles.toggleItem}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Push Notifications</Text>
                  <Text style={styles.toggleDescription}>
                    Get push notifications on your device
                  </Text>
                </View>
                <Switch
                  value={settings.notifications.push}
                  onValueChange={(val) =>
                    handleSettingChange("notifications", "push", val)
                  }
                  trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
                  thumbColor={
                    settings.notifications.push ? "#3b82f6" : "#f3f4f6"
                  }
                />
              </View>

              <View style={styles.toggleItem}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>New Followers</Text>
                  <Text style={styles.toggleDescription}>
                    When someone follows you
                  </Text>
                </View>
                <Switch
                  value={settings.notifications.newFollowers}
                  onValueChange={(val) =>
                    handleSettingChange("notifications", "newFollowers", val)
                  }
                  trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
                  thumbColor={
                    settings.notifications.newFollowers ? "#3b82f6" : "#f3f4f6"
                  }
                />
              </View>

              <View style={styles.toggleItem}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Messages</Text>
                  <Text style={styles.toggleDescription}>
                    New messages and replies
                  </Text>
                </View>
                <Switch
                  value={settings.notifications.messages}
                  onValueChange={(val) =>
                    handleSettingChange("notifications", "messages", val)
                  }
                  trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
                  thumbColor={
                    settings.notifications.messages ? "#3b82f6" : "#f3f4f6"
                  }
                />
              </View>

              <View style={styles.toggleItem}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Purchases</Text>
                  <Text style={styles.toggleDescription}>
                    Updates about your purchases
                  </Text>
                </View>
                <Switch
                  value={settings.notifications.purchases}
                  onValueChange={(val) =>
                    handleSettingChange("notifications", "purchases", val)
                  }
                  trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
                  thumbColor={
                    settings.notifications.purchases ? "#3b82f6" : "#f3f4f6"
                  }
                />
              </View>

              <View style={styles.toggleItem}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Marketing</Text>
                  <Text style={styles.toggleDescription}>
                    News, updates, and offers
                  </Text>
                </View>
                <Switch
                  value={settings.notifications.marketing}
                  onValueChange={(val) =>
                    handleSettingChange("notifications", "marketing", val)
                  }
                  trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
                  thumbColor={
                    settings.notifications.marketing ? "#3b82f6" : "#f3f4f6"
                  }
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSaveNotifications}
                disabled={saving}
              >
                <Ionicons name="save-outline" size={18} color="#ffffff" />
                <Text style={styles.saveButtonText}>
                  {saving ? "Saving..." : "Save Notification Settings"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ACCOUNT SETTINGS */}
          {activeSection === "account" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account Settings</Text>

              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Profile Completed</Text>
                  <Text style={styles.infoValue}>
                    {settings.account.profileCompleted ? "Yes" : "No"}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Member Since</Text>
                  <Text style={styles.infoValue}>
                    {settings.account.joinedDate
                      ? new Date(
                          settings.account.joinedDate
                        ).toLocaleDateString()
                      : "Unknown"}
                  </Text>
                </View>
              </View>

              <View style={styles.dangerZone}>
                <Text style={styles.dangerTitle}>Danger Zone</Text>

                <TouchableOpacity
                  style={styles.dangerButton}
                  onPress={() => {
                    Alert.alert(
                      "Export Data",
                      "Export your account data as JSON",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Export",
                          onPress: () =>
                            Alert.alert(
                              "Coming Soon",
                              "Data export will be available soon"
                            ),
                        },
                      ]
                    );
                  }}
                >
                  <Ionicons name="download-outline" size={18} color="#f97316" />
                  <Text style={styles.dangerButtonText}>Export Data</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dangerButton, styles.dangerButtonCritical]}
                  onPress={() => {
                    Alert.alert(
                      "Delete Account",
                      "This action cannot be undone. All your data will be permanently deleted.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () =>
                            Alert.alert(
                              "Coming Soon",
                              "Account deletion will be available soon"
                            ),
                        },
                      ]
                    );
                  }}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  <Text style={[styles.dangerButtonText, { color: "#ef4444" }]}>
                    Delete Account
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    navbarWrapper: {
      position: "absolute" as "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      backgroundColor: "transparent",
      paddingTop: 35,
      paddingBottom: 12,
      paddingHorizontal: 0,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
      color: theme.colors.primary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingBottom: 90,
    },
    header: {
      marginBottom: 20,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 6,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.colors.primary,
      lineHeight: 20,
    },
    tabs: {
      marginBottom: 20,
    },
    tabsContent: {
      gap: 8,
    },
    tab: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    tabActive: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    tabTextActive: {
      color: theme.colors.primary,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    section: {
      gap: 20,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    sectionSubtitle: {
      fontSize: 14,
      color: theme.colors.primary,
      marginTop: -12,
      lineHeight: 20,
    },
    subsectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginTop: 8,
    },
    imageSection: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    profileImage: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 4,
      borderColor: theme.colors.border,
    },
    imageActions: {
      gap: 6,
    },
    changePhotoButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
    },
    changePhotoButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.onPrimary,
    },
    imageHint: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    formGroup: {
      gap: 8,
    },
    formRow: {
      flexDirection: "row",
      gap: 12,
    },
    formSpacer: {
      width: 12,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    labelHint: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      fontWeight: "400",
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 14,
      color: theme.colors.textPrimary,
    },
    inputDisabled: {
      backgroundColor: theme.colors.surfaceMuted,
      color: theme.colors.textSecondary,
    },
    textArea: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 14,
      color: theme.colors.textPrimary,
      minHeight: 80,
    },
    hint: {
      fontSize: 11,
      color: theme.colors.textSecondary,
    },
    hintInfo: {
      fontSize: 11,
      color: theme.colors.primary,
    },
    hintError: {
      color: theme.colors.danger,
    },
    hintSuccess: {
      color: theme.colors.success,
    },
    saveButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: theme.colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    saveButtonDisabled: {
      backgroundColor: theme.colors.surfaceMuted,
      opacity: 0.6,
    },
    saveButtonText: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.onPrimary,
    },
    themesGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    themeCard: {
      width: "48%",
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: 16,
      padding: 12,
      position: "relative",
    },
    themeCardActive: {
      borderColor: theme.colors.primary,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    themePreview: {
      height: 80,
      borderRadius: 12,
      marginBottom: 8,
      justifyContent: "flex-end",
      alignItems: "flex-end",
      padding: 8,
    },
    themeIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
    },
    themeName: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    themeDescription: {
      fontSize: 11,
      color: theme.colors.textSecondary,
    },
    themeCheck: {
      position: "absolute",
      top: 8,
      right: 8,
    },
    settingItem: {
      gap: 12,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceMuted,
    },
    settingInfo: {
      gap: 4,
    },
    settingLabel: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    settingDescription: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    segmentedControl: {
      flexDirection: "row",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 10,
      padding: 2,
    },
    segmentOption: {
      flex: 1,
      paddingVertical: 8,
      alignItems: "center",
      borderRadius: 8,
    },
    segmentOptionActive: {
      backgroundColor: theme.colors.primary,
    },
    segmentOptionText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    segmentOptionTextActive: {
      color: theme.colors.onPrimary,
    },
    toggleItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceMuted,
    },
    toggleInfo: {
      flex: 1,
      gap: 4,
    },
    toggleLabel: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    toggleDescription: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    infoCard: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
      padding: 16,
      gap: 12,
    },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    infoLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    dangerZone: {
      backgroundColor: theme.colors.dangerSoft,
      borderRadius: 12,
      padding: 16,
      gap: 12,
    },
    dangerTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.danger,
    },
    dangerButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: theme.colors.surface,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.dangerSoft,
    },
    dangerButtonCritical: {
      borderColor: theme.colors.danger,
    },
    dangerButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.warning,
    },
  });
