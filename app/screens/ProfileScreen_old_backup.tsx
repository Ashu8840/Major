import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
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
}

interface ContentItem {
  _id: string;
  title?: string;
  content?: string;
  thumbnail?: string;
  media?: any[];
  createdAt: string;
  viewCount?: number;
  likesCount?: number;
  commentsCount?: number;
}

export const ProfileScreen: React.FC = () => {
  const { profile: userProfile, refreshProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "entries" | "stories" | "books">("posts");
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const response = await api.get("/profile");
      setProfileData(response.data);
      loadContent("posts");
    } catch (error) {
      console.error("Error loading profile:", error);
      Alert.alert("Error", "Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const loadContent = async (type: string) => {
    try {
      const response = await api.get("/profile/content", {
        params: { type }
      });
      setContent(response.data[type] || []);
    } catch (error) {
      console.error("Error loading content:", error);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadProfileData(),
      refreshProfile?.()
    ]);
    setRefreshing(false);
  }, [refreshProfile]);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    loadContent(tab);
  };

  const handleImageUpload = async (type: "profile" | "cover") => {
    try {
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

        const formData = new FormData();
        formData.append("image", {
          uri: imageUri,
          type: "image/jpeg",
          name: `${type}.jpg`,
        } as any);

        const endpoint = type === "profile" 
          ? "/profile/upload-profile-image"
          : "/profile/upload-cover-photo";

        const response = await api.post(endpoint, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        if (response.data) {
          Alert.alert("Success", `${type === "profile" ? "Profile picture" : "Cover photo"} updated successfully!`);
          loadProfileData();
        }
      }
    } catch (error: any) {
      console.error(`Error uploading ${type}:`, error);
      Alert.alert("Error", error.response?.data?.message || `Failed to upload ${type} image`);
    } finally {
      setUploadingProfile(false);
      setUploadingCover(false);
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
  const displayName = currentProfile?.displayName || currentProfile?.username || "User";
  const username = currentProfile?.username || "";
  const bio = currentProfile?.bio || "";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const stats = {
    posts: currentProfile?.contentCounts?.posts || currentProfile?.stats?.totalPosts || 0,
    entries: currentProfile?.contentCounts?.entries || currentProfile?.stats?.totalEntries || 0,
    stories: currentProfile?.contentCounts?.stories || currentProfile?.stats?.totalStories || 0,
    books: currentProfile?.contentCounts?.books || 0,
    followers: currentProfile?.followerCount || 0,
    following: currentProfile?.followingCount || 0,
    reads: currentProfile?.stats?.totalReads || 0,
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.navbarWrapper}>
          <Navbar />
        </View>

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
          </View>

          {/* Bio */}
          {bio && (
            <Text style={styles.bio}>{bio}</Text>
          )}

          {/* Location and Joined Date */}
          <View style={styles.metaRow}>
            {currentProfile?.address?.city && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={16} color="#6B739B" />
                <Text style={styles.metaText}>
                  {currentProfile.address.city}
                  {currentProfile.address.country && `, ${currentProfile.address.country}`}
                </Text>
              </View>
            )}
            {currentProfile?.joinedDate && (
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={16} color="#6B739B" />
                <Text style={styles.metaText}>
                  Joined {new Date(currentProfile.joinedDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </Text>
              </View>
            )}
          </View>

          {/* Social Links */}
          {currentProfile?.socialLinks && Object.values(currentProfile.socialLinks).some(link => link) && (
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

          {/* Edit Profile Button */}
          <TouchableOpacity style={styles.editButton}>
            <Ionicons name="create-outline" size={18} color="#FFFFFF" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatNumber(stats.posts)}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatNumber(stats.entries)}</Text>
            <Text style={styles.statLabel}>Entries</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatNumber(stats.stories)}</Text>
            <Text style={styles.statLabel}>Stories</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatNumber(stats.followers)}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatNumber(stats.following)}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatNumber(stats.reads)}</Text>
            <Text style={styles.statLabel}>Reads</Text>
          </View>
        </View>

        {/* Day Streak Card */}
        {currentProfile?.stats?.dayStreak && (
          <View style={styles.streakCard}>
            <View style={styles.streakHeader}>
              <View style={styles.streakIcon}>
                <Ionicons name="flame" size={24} color="#FF6B35" />
              </View>
              <Text style={styles.streakTitle}>Day Streak</Text>
            </View>
            <View style={styles.streakStats}>
              <View style={styles.streakStat}>
                <Text style={styles.streakValue}>{currentProfile.stats.dayStreak.current}</Text>
                <Text style={styles.streakLabel}>Current</Text>
              </View>
              <View style={styles.streakDivider} />
              <View style={styles.streakStat}>
                <Text style={styles.streakValue}>{currentProfile.stats.dayStreak.longest}</Text>
                <Text style={styles.streakLabel}>Longest</Text>
              </View>
            </View>
          </View>
        )}

        {/* Profile Completion */}
        {currentProfile?.profileCompletionPercentage !== undefined && (
          <View style={styles.completionCard}>
            <View style={styles.completionHeader}>
              <Text style={styles.completionTitle}>Profile Completion</Text>
              <Text style={styles.completionPercentage}>
                {currentProfile.profileCompletionPercentage}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${currentProfile.profileCompletionPercentage}%` }
                ]}
              />
            </View>
          </View>
        )}

        {/* Content Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {["posts", "entries", "stories", "books"].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tab,
                  activeTab === tab && styles.tabActive,
                ]}
                onPress={() => handleTabChange(tab as typeof activeTab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.tabTextActive,
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content Grid */}
        <View style={styles.contentGrid}>
          {content.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={48} color="#C5CAE9" />
              <Text style={styles.emptyText}>No {activeTab} yet</Text>
            </View>
          ) : (
            content.map((item) => (
              <View key={item._id} style={styles.contentItem}>
                {item.thumbnail || item.media?.[0] ? (
                  <Image
                    source={{ 
                      uri: typeof item.media?.[0] === 'string' 
                        ? item.media[0] 
                        : item.media?.[0]?.url || item.thumbnail 
                    }}
                    style={styles.contentThumbnail}
                  />
                ) : (
                  <View style={styles.contentPlaceholder}>
                    <Ionicons name="document-text-outline" size={32} color="#8892C0" />
                  </View>
                )}
                <View style={styles.contentInfo}>
                  <Text style={styles.contentTitle} numberOfLines={2}>
                    {item.title || item.content?.substring(0, 50) || "Untitled"}
                  </Text>
                  <View style={styles.contentMeta}>
                    <View style={styles.contentMetaItem}>
                      <Ionicons name="eye-outline" size={12} color="#8892C0" />
                      <Text style={styles.contentMetaText}>{item.viewCount || 0}</Text>
                    </View>
                    <View style={styles.contentMetaItem}>
                      <Ionicons name="heart-outline" size={12} color="#8892C0" />
                      <Text style={styles.contentMetaText}>{item.likesCount || 0}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6FE",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 100,
  },
  navbarWrapper: {
    marginTop: 20,
    marginBottom: 0,
    paddingHorizontal: 24,
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
    backgroundColor: "#3142C6",
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
    backgroundColor: "#FFFFFF",
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
    gap: 16,
  },
  avatarContainer: {
    position: "relative",
  },
  avatarFrame: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E5E9FF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarInitials: {
    fontSize: 36,
    fontWeight: "700",
    color: "#3142C6",
  },
  avatarUploadButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#3142C6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  verifiedBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
  },
  profileInfo: {
    flex: 1,
    gap: 8,
  },
  displayName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1B2148",
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
    backgroundColor: "#E5E9FF",
    borderRadius: 12,
  },
  userIdText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3142C6",
  },
  username: {
    fontSize: 14,
    color: "#6B739B",
  },
  bio: {
    marginTop: 16,
    fontSize: 15,
    lineHeight: 22,
    color: "#4A5578",
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
    color: "#6B739B",
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
    backgroundColor: "#F0F3FF",
    justifyContent: "center",
    alignItems: "center",
  },
  editButton: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: "#3142C6",
    borderRadius: 16,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
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
    backgroundColor: "#FFFFFF",
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
    color: "#1B2148",
  },
  statLabel: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B739B",
  },
  streakCard: {
    marginTop: 20,
    marginHorizontal: 24,
    backgroundColor: "#FFF5F0",
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: "#FFE5D9",
  },
  streakHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  streakIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFE5D9",
    justifyContent: "center",
    alignItems: "center",
  },
  streakTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B2148",
  },
  streakStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  streakStat: {
    flex: 1,
    alignItems: "center",
  },
  streakValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FF6B35",
  },
  streakLabel: {
    marginTop: 4,
    fontSize: 14,
    color: "#8892C0",
  },
  streakDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#FFD4C4",
  },
  completionCard: {
    marginTop: 20,
    marginHorizontal: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    ...platformShadow({
      offsetY: 4,
      opacity: 0.08,
      radius: 12,
      elevation: 4,
    }),
  },
  completionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  completionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1B2148",
  },
  completionPercentage: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3142C6",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E5E9FF",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3142C6",
    borderRadius: 4,
  },
  tabsContainer: {
    marginTop: 24,
    marginHorizontal: 24,
  },
  tab: {
    marginRight: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#F0F3FF",
    borderRadius: 16,
  },
  tabActive: {
    backgroundColor: "#3142C6",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B739B",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  contentGrid: {
    marginTop: 20,
    marginHorizontal: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  contentItem: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
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
    backgroundColor: "#F0F3FF",
  },
  contentPlaceholder: {
    width: "100%",
    height: 120,
    backgroundColor: "#F0F3FF",
    justifyContent: "center",
    alignItems: "center",
  },
  contentInfo: {
    padding: 12,
  },
  contentTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1B2148",
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
    color: "#8892C0",
  },
  emptyState: {
    width: "100%",
    paddingVertical: 48,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: "#8892C0",
  },
});
