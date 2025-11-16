import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/context/AuthContext";
import { AppTheme, useAppTheme } from "@/context/ThemeContext";
import { api } from "@/services/api";
import { platformShadow } from "@/utils/shadow";

interface ProfileData {
  _id: string;
  username: string;
  displayName?: string;
  bio?: string;
  userId?: string;
  email?: string;
  profileImage?: {
    url?: string;
    cloudinaryId?: string;
  };
  coverPhoto?: {
    url?: string;
    cloudinaryId?: string;
  };
  isVerified?: boolean;
  joinedDate?: string;
  address?: {
    city?: string;
    country?: string;
  };
  socialLinks?: {
    website?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  stats?: {
    totalEntries?: number;
    totalStories?: number;
    totalPosts?: number;
    totalReads?: number;
    dayStreak?: {
      current: number;
      longest: number;
    };
  };
  followerCount?: number;
  followingCount?: number;
  profileCompletionPercentage?: number;
  contentCounts?: {
    entries?: number;
    posts?: number;
    stories?: number;
    books?: number;
  };
  analytics?: {
    engagementRate?: number;
    avgWordsPerEntry?: number;
    profileViews?: number;
    profileViewsGrowth?: string;
    readsGrowth?: string;
  };
}

interface ContentItem {
  _id: string;
  title?: string;
  content?: string;
  description?: string;
  thumbnail?: string;
  media?: any[];
  createdAt: string;
  viewCount?: number;
  likesCount?: number;
  commentsCount?: number;
  type?: string;
}

interface Book {
  _id: string;
  title: string;
  description?: string;
  coverImage?: string;
  chapters?: number;
  totalReads?: number;
  createdAt: string;
}

export const ProfileScreen: React.FC = () => {
  const { profile: userProfile, refreshProfile } = useAuth();
  const { theme } = useAppTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "books" | "analytics">(
    "posts"
  );
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const styles = React.useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const response = await api.get("/profile");
      setProfileData(response.data);

      // Load initial content
      loadContent();
    } catch (error) {
      console.error("Error loading profile:", error);
      Alert.alert("Error", "Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const loadContent = async () => {
    try {
      console.log("=== Loading content from /profile/content ===");

      // Fetch all content from profile/content endpoint
      const response = await api.get("/profile/content", {
        params: {
          type: "all",
          limit: 50, // Get up to 50 items
        },
      });

      console.log("Raw response data:", JSON.stringify(response.data, null, 2));

      // Get entries and posts from response - API returns { content: { entries: [], posts: [] } }
      const entriesData =
        response.data.content?.entries || response.data.entries || [];
      const postsData =
        response.data.content?.posts || response.data.posts || [];

      console.log("Entries data:", entriesData);
      console.log("Posts data:", postsData);

      const entries = entriesData.map((e: any) => {
        console.log("Processing entry:", e);
        return {
          ...e,
          type: "entry",
          _id: e._id || e.id,
          title: e.title || "Untitled Entry",
          content: e.content || "",
          createdAt: e.createdAt || new Date().toISOString(),
        };
      });

      const posts = postsData.map((p: any) => {
        console.log("Processing post:", p);
        return {
          ...p,
          type: "post",
          _id: p._id || p.id,
          title: p.title || p.content?.substring(0, 50) || "Untitled Post",
          content: p.content || p.description || "",
          createdAt: p.createdAt || new Date().toISOString(),
          media: p.media || [],
          likesCount: p.likes?.length || p.likesCount || 0,
          commentsCount: p.comments?.length || p.commentsCount || 0,
          viewCount: p.views || p.viewCount || 0,
        };
      });

      console.log(
        `✅ Loaded ${entries.length} entries and ${posts.length} posts`
      );

      // Combine and sort by createdAt
      const allContent = [...entries, ...posts].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      console.log("Total content items:", allContent.length);
      console.log("All content:", allContent);
      setContent(allContent);
    } catch (error: any) {
      console.error("❌ Error loading content:", error);
      console.error("Error details:", error.response?.data);
      console.error("Error message:", error.message);
    }
  };

  const loadBooks = async () => {
    try {
      console.log("=== Loading books from /profile/books ===");
      const response = await api.get("/profile/books");
      console.log("Books response:", response.data);

      // The API returns { content: { books: [] } }
      const booksData = response.data?.content?.books || [];
      console.log("Parsed books:", booksData);

      setBooks(booksData);
    } catch (error: any) {
      console.error("❌ Error loading books:", error);
      console.error("Error details:", error.response?.data);
      setBooks([]); // Set to empty array on error to prevent undefined
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    Alert.alert(
      "Delete Entry",
      "Are you sure you want to delete this entry? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/entry/${entryId}`);
              Alert.alert("Success", "Entry deleted successfully");
              loadContent(); // Reload content
            } catch (error: any) {
              console.error("Error deleting entry:", error);
              Alert.alert(
                "Error",
                error.response?.data?.message || "Failed to delete entry"
              );
            }
          },
        },
      ]
    );
  };

  const handleDeletePost = async (postId: string) => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/community/post/${postId}`);
              Alert.alert("Success", "Post deleted successfully");
              loadContent(); // Reload content
            } catch (error: any) {
              console.error("Error deleting post:", error);
              Alert.alert(
                "Error",
                error.response?.data?.message || "Failed to delete post"
              );
            }
          },
        },
      ]
    );
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadProfileData(), refreshProfile?.()]);
    setRefreshing(false);
  }, [refreshProfile]);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (tab === "books") {
      loadBooks();
    } else if (tab === "posts") {
      loadContent();
    }
  };

  const handleImageUpload = async (type: "profile" | "cover") => {
    try {
      // Request permission first
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant camera roll permissions to upload images"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === "profile" ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;

        if (type === "profile") {
          setUploadingProfile(true);
        } else {
          setUploadingCover(true);
        }

        // Get file info
        const fileName =
          imageUri.split("/").pop() || `${type}_${Date.now()}.jpg`;
        const fileType = fileName.split(".").pop() || "jpg";

        const formData = new FormData();
        const fieldName = type === "profile" ? "profileImage" : "coverPhoto";

        // Append file to form data
        formData.append(fieldName, {
          uri: imageUri,
          type: `image/${fileType}`,
          name: fileName,
        } as any);

        const endpoint =
          type === "profile"
            ? "/profile/upload/profile-image"
            : "/profile/upload/cover-photo";

        console.log(`Uploading ${type} image to ${endpoint}...`);

        const response = await api.post(endpoint, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          transformRequest: (data) => data, // Don't transform the form data
        });

        if (response.data) {
          Alert.alert(
            "Success",
            `${
              type === "profile" ? "Profile picture" : "Cover photo"
            } updated successfully!`
          );
          await loadProfileData();
          await refreshProfile?.();
        }
      }
    } catch (error: any) {
      console.error(`Error uploading ${type}:`, error);
      console.error("Error details:", error.response?.data);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        `Failed to upload ${type} image`;
      Alert.alert("Upload Error", errorMessage);
    } finally {
      setUploadingProfile(false);
      setUploadingCover(false);
    }
  };

  const handleShare = async () => {
    try {
      const currentProfile = profileData || userProfile;
      const displayName =
        currentProfile?.displayName || currentProfile?.username;

      await Share.share({
        message: `Check out ${displayName}'s profile on Major!\n@${currentProfile?.username}`,
        title: `${displayName}'s Profile`,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const formatNumber = (num: number = 0) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.navbarWrapper}>
          <Navbar />
        </View>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#3142C6" />
        </View>
      </View>
    );
  }

  const currentProfile = profileData || userProfile;
  const profileImageUrl = currentProfile?.profileImage?.url;
  const coverPhotoUrl = currentProfile?.coverPhoto?.url;
  const displayName =
    currentProfile?.displayName || currentProfile?.username || "User";
  const username = currentProfile?.username || "";
  const bio = currentProfile?.bio || "";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const stats = {
    posts:
      currentProfile?.contentCounts?.posts ||
      currentProfile?.stats?.totalPosts ||
      0,
    entries:
      currentProfile?.contentCounts?.entries ||
      currentProfile?.stats?.totalEntries ||
      0,
    stories:
      currentProfile?.contentCounts?.stories ||
      currentProfile?.stats?.totalStories ||
      0,
    books: currentProfile?.contentCounts?.books || 0,
    followers: currentProfile?.followerCount || 0,
    following: currentProfile?.followingCount || 0,
    reads: currentProfile?.stats?.totalReads || 0,
  };

  return (
    <View style={styles.container}>
      <View style={styles.navbarWrapper}>
        <Navbar />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: 130 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Cover Photo */}
        <View style={styles.coverWrapper}>
          {coverPhotoUrl ? (
            <Image source={{ uri: coverPhotoUrl }} style={styles.coverImage} />
          ) : (
            <View style={styles.coverPlaceholder} />
          )}
          <View style={styles.coverOverlay} />

          <TouchableOpacity
            style={styles.coverUploadButton}
            onPress={() => handleImageUpload("cover")}
            disabled={uploadingCover}
          >
            {uploadingCover ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="camera" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Profile Header Card */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.profileTop}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatarFrame}>
                {profileImageUrl ? (
                  <Image
                    source={{ uri: profileImageUrl }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarInitials}>{initials}</Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.avatarUploadButton}
                onPress={() => handleImageUpload("profile")}
                disabled={uploadingProfile}
              >
                {uploadingProfile ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>

              {currentProfile?.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={24} color="#3142C6" />
                </View>
              )}
            </View>

            {/* Share Button */}
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={20} color="#6B739B" />
            </TouchableOpacity>
          </View>

          {/* Name and Username */}
          <View style={styles.profileInfo}>
            <Text style={styles.displayName}>{displayName}</Text>
            <View style={styles.usernameRow}>
              {currentProfile?.userId && (
                <View style={styles.userIdBadge}>
                  <Text style={styles.userIdText}>{currentProfile.userId}</Text>
                </View>
              )}
              <Text style={styles.username}>@{username}</Text>
            </View>
          </View>

          {/* Bio */}
          {bio && <Text style={styles.bio}>{bio}</Text>}

          {/* Location and Joined Date */}
          <View style={styles.metaRow}>
            {currentProfile?.address?.city && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={16} color="#6B739B" />
                <Text style={styles.metaText}>
                  {currentProfile.address.city}
                  {currentProfile.address.country &&
                    `, ${currentProfile.address.country}`}
                </Text>
              </View>
            )}
            {currentProfile?.joinedDate && (
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={16} color="#6B739B" />
                <Text style={styles.metaText}>
                  Joined{" "}
                  {new Date(currentProfile.joinedDate).toLocaleDateString(
                    "en-US",
                    { month: "short", year: "numeric" }
                  )}
                </Text>
              </View>
            )}
          </View>

          {/* Social Links */}
          {currentProfile?.socialLinks &&
            Object.values(currentProfile.socialLinks).some((link) => link) && (
              <View style={styles.socialLinks}>
                {currentProfile.socialLinks.website && (
                  <TouchableOpacity style={styles.socialButton}>
                    <Ionicons name="globe-outline" size={20} color="#3142C6" />
                  </TouchableOpacity>
                )}
                {currentProfile.socialLinks.twitter && (
                  <TouchableOpacity style={styles.socialButton}>
                    <Ionicons name="logo-twitter" size={20} color="#3142C6" />
                  </TouchableOpacity>
                )}
                {currentProfile.socialLinks.instagram && (
                  <TouchableOpacity style={styles.socialButton}>
                    <Ionicons name="logo-instagram" size={20} color="#3142C6" />
                  </TouchableOpacity>
                )}
                {currentProfile.socialLinks.linkedin && (
                  <TouchableOpacity style={styles.socialButton}>
                    <Ionicons name="logo-linkedin" size={20} color="#3142C6" />
                  </TouchableOpacity>
                )}
              </View>
            )}
        </View>

        {/* Stats Cards - 6 cards in 3x2 grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatNumber(stats.entries)}</Text>
            <Text style={styles.statLabel}>Entries</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: "#9333EA" }]}>
              {formatNumber(stats.stories)}
            </Text>
            <Text style={styles.statLabel}>Stories</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: "#22C55E" }]}>
              {formatNumber(stats.followers)}
            </Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: "#F59E0B" }]}>
              {formatNumber(stats.following)}
            </Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: "#EF4444" }]}>
              {formatNumber(stats.reads)}
            </Text>
            <Text style={styles.statLabel}>Reads</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: "#8B5CF6" }]}>
              {formatNumber(stats.posts)}
            </Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
        </View>

        {/* Content Tabs */}
        <View style={styles.tabsContainer}>
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "posts" && styles.tabActive]}
              onPress={() => handleTabChange("posts")}
            >
              <Ionicons
                name="document-text-outline"
                size={20}
                color={activeTab === "posts" ? "#FFFFFF" : "#6B739B"}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "posts" && styles.tabTextActive,
                ]}
              >
                Posts & Entries
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === "books" && styles.tabActive]}
              onPress={() => handleTabChange("books")}
            >
              <Ionicons
                name="book-outline"
                size={20}
                color={activeTab === "books" ? "#FFFFFF" : "#6B739B"}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "books" && styles.tabTextActive,
                ]}
              >
                Books
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "analytics" && styles.tabActive,
              ]}
              onPress={() => handleTabChange("analytics")}
            >
              <Ionicons
                name="analytics-outline"
                size={20}
                color={activeTab === "analytics" ? "#FFFFFF" : "#6B739B"}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "analytics" && styles.tabTextActive,
                ]}
              >
                Analytics
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Content */}
        {activeTab === "posts" && (
          <View style={styles.contentList}>
            {(() => {
              console.log("=== Rendering content ===");
              console.log("Content length:", content.length);
              console.log("Content array:", content);
              return null;
            })()}
            {content.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-outline" size={48} color="#C5CAE9" />
                <Text style={styles.emptyText}>No posts or entries yet</Text>
                <Text style={styles.emptyHint}>
                  Create your first entry or post in the community!
                </Text>
              </View>
            ) : (
              content.map((item) => {
                console.log("Rendering item:", item._id, item.type, item.title);
                return (
                  <View key={item._id} style={styles.contentItemList}>
                    {item.media && item.media.length > 0 ? (
                      <Image
                        source={{
                          uri:
                            typeof item.media[0] === "string"
                              ? item.media[0]
                              : item.media[0]?.url,
                        }}
                        style={styles.contentThumbnailList}
                      />
                    ) : (
                      <View style={styles.contentPlaceholderList}>
                        <Ionicons
                          name="document-text-outline"
                          size={32}
                          color="#8892C0"
                        />
                      </View>
                    )}
                    <View style={styles.contentInfo}>
                      <View style={styles.contentHeader}>
                        <View style={styles.contentTypeBadge}>
                          <Text style={styles.contentTypeBadgeText}>
                            {item.type === "entry" ? "Entry" : "Post"}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() =>
                            item.type === "entry"
                              ? handleDeleteEntry(item._id)
                              : handleDeletePost(item._id)
                          }
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color="#EF4444"
                          />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.contentTitle} numberOfLines={2}>
                        {item.title ||
                          item.content?.substring(0, 50) ||
                          "Untitled"}
                      </Text>
                      <View style={styles.contentMeta}>
                        <View style={styles.contentMetaItem}>
                          <Ionicons
                            name="eye-outline"
                            size={12}
                            color="#8892C0"
                          />
                          <Text style={styles.contentMetaText}>
                            {item.viewCount || 0}
                          </Text>
                        </View>
                        <View style={styles.contentMetaItem}>
                          <Ionicons
                            name="heart-outline"
                            size={12}
                            color="#8892C0"
                          />
                          <Text style={styles.contentMetaText}>
                            {item.likesCount || 0}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {activeTab === "books" && (
          <View style={styles.contentList}>
            {!books || books.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="book-outline" size={48} color="#C5CAE9" />
                <Text style={styles.emptyText}>No books yet</Text>
              </View>
            ) : (
              books.map((book) => (
                <View key={book._id} style={styles.bookItem}>
                  {book.coverImage ? (
                    <Image
                      source={{ uri: book.coverImage }}
                      style={styles.bookCover}
                    />
                  ) : (
                    <View style={styles.bookCoverPlaceholder}>
                      <Ionicons name="book" size={32} color="#8892C0" />
                    </View>
                  )}
                  <View style={styles.bookInfo}>
                    <Text style={styles.bookTitle} numberOfLines={2}>
                      {book.title}
                    </Text>
                    {book.description && (
                      <Text style={styles.bookDescription} numberOfLines={2}>
                        {book.description}
                      </Text>
                    )}
                    <View style={styles.bookMeta}>
                      <View style={styles.bookMetaItem}>
                        <Ionicons
                          name="document-text-outline"
                          size={14}
                          color="#8892C0"
                        />
                        <Text style={styles.bookMetaText}>
                          {book.chapters || 0} chapters
                        </Text>
                      </View>
                      <View style={styles.bookMetaItem}>
                        <Ionicons
                          name="eye-outline"
                          size={14}
                          color="#8892C0"
                        />
                        <Text style={styles.bookMetaText}>
                          {book.totalReads || 0} reads
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === "analytics" && (
          <View style={styles.analyticsContainer}>
            <Text style={styles.analyticsTitle}>Analytics Overview</Text>

            <View style={styles.analyticsGrid}>
              {/* Profile Views */}
              <View style={styles.analyticsCard}>
                <View
                  style={[styles.analyticsIcon, { backgroundColor: "#DBEAFE" }]}
                >
                  <Ionicons name="trending-up" size={24} color="#3B82F6" />
                </View>
                <Text style={styles.analyticsLabel}>Profile Views</Text>
                <Text style={styles.analyticsValue}>
                  {formatNumber(currentProfile?.analytics?.profileViews || 0)}
                </Text>
                <Text style={styles.analyticsGrowth}>
                  {currentProfile?.analytics?.profileViewsGrowth || "+0"}% from
                  last week
                </Text>
              </View>

              {/* Writing Streak */}
              <View style={styles.analyticsCard}>
                <View
                  style={[styles.analyticsIcon, { backgroundColor: "#F3E8FF" }]}
                >
                  <Ionicons name="flame" size={24} color="#9333EA" />
                </View>
                <Text style={styles.analyticsLabel}>Writing Streak</Text>
                <Text style={styles.analyticsValue}>
                  {currentProfile?.stats?.dayStreak?.current || 0} days
                </Text>
                <Text style={styles.analyticsGrowth}>
                  Longest: {currentProfile?.stats?.dayStreak?.longest || 0} days
                </Text>
              </View>

              {/* Total Reads */}
              <View style={styles.analyticsCard}>
                <View
                  style={[styles.analyticsIcon, { backgroundColor: "#D1FAE5" }]}
                >
                  <Ionicons name="eye" size={24} color="#22C55E" />
                </View>
                <Text style={styles.analyticsLabel}>Total Reads</Text>
                <Text style={styles.analyticsValue}>
                  {formatNumber(currentProfile?.stats?.totalReads || 0)}
                </Text>
                <Text style={styles.analyticsGrowth}>
                  {currentProfile?.analytics?.readsGrowth || "+0"}% from last
                  month
                </Text>
              </View>

              {/* Engagement Rate */}
              <View style={styles.analyticsCard}>
                <View
                  style={[styles.analyticsIcon, { backgroundColor: "#FEF3C7" }]}
                >
                  <Ionicons name="sparkles" size={24} color="#F59E0B" />
                </View>
                <Text style={styles.analyticsLabel}>Engagement Rate</Text>
                <Text style={styles.analyticsValue}>
                  {(currentProfile?.analytics?.engagementRate || 0).toFixed(1)}%
                </Text>
                <Text style={styles.analyticsGrowth}>Average engagement</Text>
              </View>

              {/* Avg Words/Entry */}
              <View style={styles.analyticsCard}>
                <View
                  style={[styles.analyticsIcon, { backgroundColor: "#FEE2E2" }]}
                >
                  <Ionicons name="document-text" size={24} color="#EF4444" />
                </View>
                <Text style={styles.analyticsLabel}>Avg Words/Entry</Text>
                <Text style={styles.analyticsValue}>
                  {Math.round(currentProfile?.analytics?.avgWordsPerEntry || 0)}
                </Text>
                <Text style={styles.analyticsGrowth}>Per entry</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      paddingBottom: 90,
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
    loader: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    coverWrapper: {
      height: 200,
      position: "relative",
    },
    coverImage: {
      width: "100%",
      height: "100%",
    },
    coverPlaceholder: {
      width: "100%",
      height: "100%",
      backgroundColor: theme.colors.primary,
    },
    coverOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.2)",
    },
    coverUploadButton: {
      position: "absolute",
      top: 16,
      right: 16,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    profileHeaderCard: {
      marginTop: -40,
      marginHorizontal: 24,
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      padding: 24,
      ...platformShadow({
        offsetY: 8,
        opacity: 0.1,
        radius: 16,
        elevation: 8,
      }),
    },
    profileTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
    },
    avatarContainer: {
      position: "relative",
    },
    avatarFrame: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      borderWidth: 4,
      borderColor: theme.colors.surface,
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    avatarInitials: {
      fontSize: 36,
      fontWeight: "700",
      color: theme.colors.primary,
    },
    avatarUploadButton: {
      position: "absolute",
      bottom: 0,
      right: 0,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: theme.colors.surface,
    },
    verifiedBadge: {
      position: "absolute",
      top: -4,
      right: -4,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
    },
    shareButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceMuted,
      justifyContent: "center",
      alignItems: "center",
    },
    profileInfo: {
      marginTop: 16,
      gap: 8,
    },
    displayName: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    usernameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
    },
    userIdBadge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
    },
    userIdText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    username: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    bio: {
      marginTop: 16,
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.textSecondary,
    },
    metaRow: {
      marginTop: 12,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 16,
    },
    metaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    metaText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    socialLinks: {
      marginTop: 16,
      flexDirection: "row",
      gap: 12,
    },
    socialButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceMuted,
      justifyContent: "center",
      alignItems: "center",
    },
    statsGrid: {
      marginTop: 20,
      marginHorizontal: 24,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    statCard: {
      flex: 1,
      minWidth: "30%",
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      alignItems: "center",
      ...platformShadow({
        offsetY: 4,
        opacity: 0.06,
        radius: 12,
        elevation: 4,
      }),
    },
    statValue: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.colors.primary,
    },
    statLabel: {
      marginTop: 4,
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    tabsContainer: {
      marginTop: 24,
      marginHorizontal: 24,
    },
    tabsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
    },
    tab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 14,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 16,
    },
    tabActive: {
      backgroundColor: theme.colors.primary,
    },
    tabText: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    tabTextActive: {
      color: theme.colors.onPrimary,
    },
    viewModeToggle: {
      flexDirection: "row",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
      padding: 4,
    },
    viewModeButton: {
      padding: 8,
      borderRadius: 8,
    },
    viewModeButtonActive: {
      backgroundColor: theme.colors.surface,
    },
    contentGrid: {
      marginTop: 20,
      marginHorizontal: 24,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    contentList: {
      marginTop: 20,
      marginHorizontal: 24,
      gap: 12,
    },
    contentItemGrid: {
      width: "48%",
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      overflow: "hidden",
      ...platformShadow({
        offsetY: 4,
        opacity: 0.06,
        radius: 12,
        elevation: 4,
      }),
    },
    contentItemList: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      overflow: "hidden",
      flexDirection: "row",
      ...platformShadow({
        offsetY: 4,
        opacity: 0.06,
        radius: 12,
        elevation: 4,
      }),
    },
    contentThumbnail: {
      width: "100%",
      height: 120,
      backgroundColor: theme.colors.surfaceMuted,
    },
    contentThumbnailList: {
      width: 100,
      height: 100,
      backgroundColor: theme.colors.surfaceMuted,
    },
    contentPlaceholder: {
      width: "100%",
      height: 120,
      backgroundColor: theme.colors.surfaceMuted,
      justifyContent: "center",
      alignItems: "center",
    },
    contentPlaceholderList: {
      width: 100,
      height: 100,
      backgroundColor: theme.colors.surfaceMuted,
      justifyContent: "center",
      alignItems: "center",
    },
    contentInfo: {
      padding: 12,
      flex: 1,
    },
    contentHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    contentTypeBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 8,
    },
    deleteButton: {
      padding: 6,
      borderRadius: 8,
      backgroundColor: theme.colors.dangerSoft,
    },
    contentTypeBadgeText: {
      fontSize: 11,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    contentTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: 8,
    },
    contentMeta: {
      flexDirection: "row",
      gap: 12,
    },
    contentMetaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    contentMetaText: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    bookItem: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      overflow: "hidden",
      flexDirection: "row",
      ...platformShadow({
        offsetY: 4,
        opacity: 0.06,
        radius: 12,
        elevation: 4,
      }),
    },
    bookCover: {
      width: 80,
      height: 120,
      backgroundColor: theme.colors.surfaceMuted,
    },
    bookCoverPlaceholder: {
      width: 80,
      height: 120,
      backgroundColor: theme.colors.surfaceMuted,
      justifyContent: "center",
      alignItems: "center",
    },
    bookInfo: {
      flex: 1,
      padding: 16,
    },
    bookTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: 8,
    },
    bookDescription: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginBottom: 12,
    },
    bookMeta: {
      flexDirection: "row",
      gap: 16,
    },
    bookMetaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    bookMetaText: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    analyticsContainer: {
      marginTop: 20,
      marginHorizontal: 24,
    },
    analyticsTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 20,
    },
    analyticsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    analyticsCard: {
      flex: 1,
      minWidth: "47%",
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      ...platformShadow({
        offsetY: 4,
        opacity: 0.06,
        radius: 12,
        elevation: 4,
      }),
    },
    analyticsIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 12,
    },
    analyticsLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    analyticsValue: {
      fontSize: 28,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    analyticsGrowth: {
      fontSize: 12,
      color: theme.colors.success,
    },
    emptyState: {
      width: "100%",
      paddingVertical: 48,
      alignItems: "center",
      gap: 12,
    },
    emptyText: {
      fontSize: 15,
      color: theme.colors.textMuted,
      fontWeight: "600",
    },
    emptyHint: {
      fontSize: 13,
      color: theme.colors.textSoft,
      textAlign: "center",
      marginTop: 4,
    },
  });
