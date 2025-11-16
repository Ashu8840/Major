import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";

import { Navbar } from "@/components/layout/Navbar";
import { api } from "@/services/api";
import { platformShadow } from "@/utils/shadow";
import { useAuth } from "@/context/AuthContext";
import { AppTheme, useAppTheme } from "@/context/ThemeContext";

interface Author {
  _id: string;
  username: string;
  displayName?: string;
  profileImage?: {
    url?: string;
    cloudinaryId?: string;
  };
}

interface Post {
  _id: string;
  author: Author;
  content: string;
  postType: "text" | "image" | "poll" | "article" | "event";
  media?: Array<string | { url: string; _id?: string }>;
  likesCount: number;
  commentsCount: number;
  isLikedByUser: boolean;
  createdAt: string;
  poll?: {
    question: string;
    options: Array<{
      id: string;
      text: string;
      votes: number;
      percentage?: number;
      isVotedByCurrentUser?: boolean;
    }>;
    totalVotes: number;
    hasVoted: boolean;
    allowMultiple?: boolean;
    isExpired?: boolean;
    expiresAt?: string;
  };
  article?: {
    title: string;
    summary: string;
    cover?: string;
    coverImage?: {
      url: string;
      mediaId?: string;
    };
  };
  event?: {
    title: string;
    location: string;
    startDate: string;
    endDate: string;
  };
}

interface Comment {
  _id: string;
  text: string;
  author: Author;
  createdAt: string;
  likesCount: number;
  isLikedByUser: boolean;
}

interface CommunityStats {
  totalPosts: number;
  totalUsers: number;
  totalLikes: number;
  newUsersToday: number;
}

interface TrendingHashtag {
  tag: string;
  count: number;
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingHorizontal: 24,
      paddingBottom: 90,
      paddingTop: 130,
      gap: 20,
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
    coverWrapper: {
      height: 180,
      borderRadius: 32,
      overflow: "hidden",
      backgroundColor: theme.colors.primary,
    },
    coverImage: {
      flex: 1,
    },
    coverOverlay: {
      flex: 1,
      backgroundColor: "rgba(21, 28, 68, 0.32)",
    },
    profileCard: {
      marginTop: -56,
      backgroundColor: theme.colors.surface,
      borderRadius: 28,
      padding: 24,
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 18,
      ...platformShadow({
        offsetY: 12,
        opacity: 0.12,
        radius: 20,
        elevation: 10,
        webFallback: "0px 12px 28px rgba(13, 27, 94, 0.12)",
      }),
    },
    avatarFrame: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      borderWidth: 3,
      borderColor: theme.colors.surface,
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    avatarInitials: {
      fontSize: 32,
      fontWeight: "700",
      color: theme.colors.primary,
      letterSpacing: 1,
    },
    profileMeta: {
      flex: 1,
      gap: 10,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    displayName: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    username: {
      fontSize: 15,
      fontWeight: "500",
      color: theme.colors.textSecondary,
    },
    bio: {
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.textSecondary,
    },
    infoRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    infoChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    infoText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    verifiedIcon: {
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
      padding: 4,
    },
    statsCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      padding: 24,
      gap: 20,
      ...platformShadow({
        offsetY: 8,
        opacity: 0.06,
        radius: 18,
        elevation: 6,
        webFallback: "0px 8px 24px rgba(13, 27, 94, 0.06)",
      }),
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    sectionHint: {
      fontSize: 13,
      color: theme.colors.textMuted,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    statTile: {
      width: "47%",
      borderRadius: 18,
      padding: 16,
      backgroundColor: theme.colors.surfaceMuted,
      gap: 6,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      padding: 24,
      gap: 16,
      ...platformShadow({
        offsetY: 8,
        opacity: 0.05,
        radius: 16,
        elevation: 5,
        webFallback: "0px 8px 20px rgba(13, 27, 94, 0.05)",
      }),
    },
    highlightItem: {
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      gap: 8,
    },
    highlightMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    highlightType: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.primary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    highlightTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    highlightSnippet: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textSecondary,
    },
    achievementItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    achievementIcon: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    achievementText: {
      flex: 1,
      gap: 4,
    },
    achievementTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    achievementDescription: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.textSecondary,
    },
    errorBanner: {
      backgroundColor: theme.colors.dangerSoft,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.dangerSoft,
    },
    errorText: {
      fontSize: 14,
      color: theme.colors.danger,
    },
    postCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      ...platformShadow({
        offsetY: 2,
        opacity: 0.1,
        radius: 8,
      }),
    },
    postHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
      position: "relative",
    },
    authorAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceMuted,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    authorInitials: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    authorInfo: {
      flex: 1,
    },
    authorName: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    postTime: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    menuButton: {
      padding: 8,
      borderRadius: 20,
    },
    dropdownMenu: {
      position: "absolute",
      top: 40,
      right: 0,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      minWidth: 160,
      ...platformShadow({
        offsetY: 4,
        opacity: 0.15,
        radius: 12,
        elevation: 8,
      }),
      zIndex: 1000,
    },
    dropdownItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    dropdownItemText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: "500",
    },
    dropdownItemTextDelete: {
      fontSize: 14,
      color: theme.colors.danger,
      fontWeight: "500",
    },
    postContent: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      marginBottom: 12,
    },
    postActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 20,
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    actionText: {
      fontSize: 14,
      color: theme.colors.textMuted,
    },
    emptyState: {
      padding: 32,
      alignItems: "center",
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.textMuted,
      textAlign: "center",
    },
    tabBar: {
      flexDirection: "row",
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 4,
      marginBottom: 16,
      ...platformShadow({
        offsetY: 2,
        opacity: 0.1,
        radius: 8,
      }),
    },
    tabButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: "center",
    },
    tabButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    tabButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textMuted,
    },
    tabButtonTextActive: {
      color: theme.colors.onPrimary,
    },
    composerCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      ...platformShadow({
        offsetY: 2,
        opacity: 0.1,
        radius: 8,
      }),
    },
    composerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    composerAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.surfaceMuted,
      justifyContent: "center",
      alignItems: "center",
    },
    composerInput: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.background,
      borderRadius: 24,
      fontSize: 14,
      color: theme.colors.textMuted,
    },
    quickActions: {
      flexDirection: "row",
      marginTop: 12,
      gap: 8,
    },
    quickActionButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      gap: 6,
    },
    quickActionText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    statsRow: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 16,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 12,
      alignItems: "center",
      ...platformShadow({
        offsetY: 2,
        opacity: 0.1,
        radius: 8,
      }),
    },
    statValue: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginTop: 4,
    },
    statLabel: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    postImage: {
      width: "100%",
      height: 400,
      borderRadius: 12,
      marginBottom: 12,
    },
    imageGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 12,
    },
    gridImage: {
      width: "48%",
      aspectRatio: 1,
      borderRadius: 12,
    },
    pollContainer: {
      marginBottom: 12,
      gap: 8,
    },
    pollQuestion: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: 8,
    },
    pollOption: {
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    pollOptionSelected: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.primary,
    },
    pollOptionText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    pollVotes: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    commentSection: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.background,
    },
    commentItem: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 12,
    },
    commentAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceMuted,
      justifyContent: "center",
      alignItems: "center",
    },
    commentContent: {
      flex: 1,
    },
    commentAuthor: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    commentText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    commentTime: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    commentInput: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 8,
    },
    commentTextInput: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.background,
      borderRadius: 20,
      fontSize: 13,
      maxHeight: 80,
    },
    sendButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: "90%",
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.background,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    modalCloseButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.background,
      justifyContent: "center",
      alignItems: "center",
    },
    modalBody: {
      padding: 16,
    },
    composerTextInput: {
      fontSize: 16,
      color: theme.colors.textPrimary,
      minHeight: 120,
      textAlignVertical: "top",
    },
    postButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignItems: "center",
      marginTop: 16,
    },
    postButtonText: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.onPrimary,
    },
    postButtonDisabled: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    articleCard: {
      marginBottom: 12,
      overflow: "hidden",
      borderRadius: 12,
    },
    articleCover: {
      width: "100%",
      height: 180,
    },
    articleTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    articleSummary: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    eventCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
    },
    eventTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 8,
    },
    eventDetail: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 4,
    },
    eventDetailText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    typeChip: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    typeChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    typeChipText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    typeChipTextActive: {
      color: theme.colors.onPrimary,
    },
    articleTitleInput: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 12,
      padding: 12,
      backgroundColor: theme.colors.background,
      borderRadius: 8,
    },
    articleSummaryInput: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 12,
      padding: 12,
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      minHeight: 60,
    },
    imagePickerButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: 16,
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderStyle: "dashed",
    },
    imagePickerText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    pollOptionInput: {
      padding: 12,
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      fontSize: 14,
      color: theme.colors.textPrimary,
    },
    removeOptionButton: {
      justifyContent: "center",
      alignItems: "center",
      width: 40,
    },
    addOptionButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      padding: 12,
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      marginTop: 8,
    },
    addOptionText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.primary,
    },
  });

export const CommunityScreen: React.FC = () => {
  const { profile } = useAuth();
  const { theme } = useAppTheme();
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [stats, setStats] = useState<CommunityStats>({
    totalPosts: 0,
    totalUsers: 0,
    totalLikes: 0,
    newUsersToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "saved" | "insights">(
    "posts"
  );
  const [showComposer, setShowComposer] = useState(false);
  const [composerType, setComposerType] = useState<
    "text" | "image" | "article" | "poll"
  >("text");
  const [composerText, setComposerText] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [articleTitle, setArticleTitle] = useState("");
  const [articleSummary, setArticleSummary] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const router = useRouter();

  const flatListRef = React.useRef<FlatList>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/community/feed");
      setPosts(response.data.posts || []);
    } catch (error) {
      console.error("Error fetching community feed:", error);
      Alert.alert("Error", "Failed to load community posts");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get("/community/stats");
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  const fetchSavedPosts = useCallback(async () => {
    try {
      // Filter posts that are saved
      const saved = posts.filter((post) => savedPostIds.has(post._id));
      setSavedPosts(saved);
    } catch (error) {
      console.error("Error fetching saved posts:", error);
    }
  }, [posts, savedPostIds]);

  const handleSavePost = useCallback(async (postId: string) => {
    try {
      // Toggle save status
      setSavedPostIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(postId)) {
          newSet.delete(postId);
        } else {
          newSet.add(postId);
        }
        return newSet;
      });
    } catch (error) {
      console.error("Error saving post:", error);
    }
  }, []);

  const pickImages = useCallback(async () => {
    try {
      // Request permission first
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant camera roll permissions to select images"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 4,
      });

      if (!result.canceled && result.assets) {
        const imageUris = result.assets.map((asset) => asset.uri);
        setSelectedImages(imageUris);
      }
    } catch (error) {
      console.error("Error picking images:", error);
      Alert.alert("Error", "Failed to pick images");
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchStats();
  }, [fetchPosts, fetchStats]);

  useEffect(() => {
    if (activeTab === "saved") {
      fetchSavedPosts();
    }
  }, [activeTab, fetchSavedPosts, savedPostIds]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchPosts(), fetchStats()]);
    setRefreshing(false);
  }, [fetchPosts, fetchStats]);

  const handleLike = useCallback(async (postId: string) => {
    try {
      await api.post(`/community/post/${postId}/like`);
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId
            ? {
                ...post,
                isLikedByUser: !post.isLikedByUser,
                likesCount: post.isLikedByUser
                  ? post.likesCount - 1
                  : post.likesCount + 1,
              }
            : post
        )
      );
    } catch (error) {
      console.error("Error liking post:", error);
      Alert.alert("Error", "Failed to like post");
    }
  }, []);

  const handleDeletePost = useCallback(
    async (postId: string) => {
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
                // Remove from local state
                setPosts((prevPosts) =>
                  prevPosts.filter((post) => post._id !== postId)
                );
                setSavedPosts((prevPosts) =>
                  prevPosts.filter((post) => post._id !== postId)
                );
                // Refresh stats
                fetchStats();
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
    },
    [fetchStats]
  );

  const handleOpenComments = useCallback(async (post: Post) => {
    setSelectedPost(post);
    setShowComments(true);
    setLoadingComments(true);

    try {
      const response = await api.get(`/community/post/${post._id}/comments`);
      setComments(response.data.comments || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
      Alert.alert("Error", "Failed to load comments");
    } finally {
      setLoadingComments(false);
    }
  }, []);

  const handleAddComment = useCallback(async () => {
    if (!newComment.trim() || !selectedPost) return;

    try {
      const response = await api.post(
        `/community/post/${selectedPost._id}/comments`,
        {
          text: newComment,
        }
      );

      setComments((prev) => [response.data, ...prev]);
      setNewComment("");

      // Update comment count in posts
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === selectedPost._id
            ? { ...post, commentsCount: post.commentsCount + 1 }
            : post
        )
      );
    } catch (error) {
      console.error("Error adding comment:", error);
      Alert.alert("Error", "Failed to add comment");
    }
  }, [newComment, selectedPost]);

  const handleCreatePost = useCallback(async () => {
    if (composerType === "text" && !composerText.trim()) {
      Alert.alert("Error", "Please enter some content");
      return;
    }

    if (composerType === "poll") {
      if (!pollQuestion.trim()) {
        Alert.alert("Error", "Please enter a poll question");
        return;
      }
      const validOptions = pollOptions.filter((opt) => opt.trim());
      if (validOptions.length < 2) {
        Alert.alert("Error", "Please provide at least 2 poll options");
        return;
      }
    }

    if (composerType === "article") {
      if (!articleTitle.trim()) {
        Alert.alert("Error", "Please enter an article title");
        return;
      }
      if (!composerText.trim()) {
        Alert.alert("Error", "Please enter article content");
        return;
      }
    }

    try {
      const formData = new FormData();
      formData.append("postType", composerType);
      formData.append("content", composerText);

      if (composerType === "image" && selectedImages.length > 0) {
        selectedImages.forEach((uri, index) => {
          const filename = uri.split("/").pop() || `image${index}.jpg`;
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : "image/jpeg";

          formData.append("image", {
            uri,
            name: filename,
            type,
          } as any);
        });
      }

      if (composerType === "poll") {
        formData.append("pollQuestion", pollQuestion);
        const validOptions = pollOptions.filter((opt) => opt.trim());
        validOptions.forEach((option, index) => {
          formData.append(`pollOptions[${index}]`, option);
        });
      }

      if (composerType === "article") {
        formData.append("articleTitle", articleTitle);
        formData.append("articleSummary", articleSummary);
      }

      const response = await api.post("/community/post", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setPosts((prev) => [response.data, ...prev]);

      // Reset composer
      setComposerText("");
      setSelectedImages([]);
      setArticleTitle("");
      setArticleSummary("");
      setPollQuestion("");
      setPollOptions(["", ""]);
      setComposerType("text");
      setShowComposer(false);

      Alert.alert("Success", "Post created successfully!");
    } catch (error) {
      console.error("Error creating post:", error);
      Alert.alert("Error", "Failed to create post");
    }
  }, [
    composerText,
    composerType,
    selectedImages,
    pollQuestion,
    pollOptions,
    articleTitle,
    articleSummary,
  ]);

  const handlePollVote = useCallback(
    async (postId: string, optionId: string) => {
      try {
        const response = await api.post(`/community/post/${postId}/poll/vote`, {
          optionId,
        });

        const nextPoll = response.data?.poll;
        if (nextPoll) {
          // Update the post with the new poll data
          setPosts((prevPosts) =>
            prevPosts.map((post) =>
              post._id === postId ? { ...post, poll: nextPoll } : post
            )
          );

          // Also update saved posts if they exist
          setSavedPosts((prevPosts) =>
            prevPosts.map((post) =>
              post._id === postId ? { ...post, poll: nextPoll } : post
            )
          );

          Alert.alert("Success", "Vote submitted successfully");
        }
      } catch (error: any) {
        console.error("Error voting on poll:", error);
        Alert.alert(
          "Error",
          error.response?.data?.message || "Failed to vote on poll"
        );
      }
    },
    []
  );

  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const renderPost = useCallback(
    ({ item }: { item: Post }) => {
      const authorName =
        item.author?.displayName || item.author?.username || "Unknown User";
      const authorInitials = authorName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

      const isOwnPost =
        profile?._id === item.author?._id || profile?.id === item.author?._id;

      return (
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <View style={styles.authorAvatar}>
              {item.author?.profileImage?.url &&
              typeof item.author.profileImage.url === "string" &&
              item.author.profileImage.url.trim() !== "" ? (
                <Image
                  source={{ uri: item.author.profileImage.url }}
                  style={{ width: 40, height: 40, borderRadius: 20 }}
                />
              ) : (
                <Text style={styles.authorInitials}>{authorInitials}</Text>
              )}
            </View>
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{authorName}</Text>
              <Text style={styles.postTime}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>

            {/* Three-dot menu */}
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() =>
                setOpenMenuPostId(openMenuPostId === item._id ? null : item._id)
              }
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>

            {/* Dropdown menu */}
            {openMenuPostId === item._id && (
              <View style={styles.dropdownMenu}>
                {isOwnPost && (
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setOpenMenuPostId(null);
                      handleDeletePost(item._id);
                    }}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={theme.colors.danger}
                    />
                    <Text style={styles.dropdownItemTextDelete}>
                      Delete Post
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => setOpenMenuPostId(null)}
                >
                  <Ionicons
                    name="flag-outline"
                    size={18}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.dropdownItemText}>Report Post</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Post Content */}
          <Text style={styles.postContent}>{item.content}</Text>

          {/* Media - Images */}
          {item.media && item.media.length > 0 && (
            <View style={{ marginBottom: 12 }}>
              {item.media.length === 1 ? (
                (() => {
                  const mediaUrl =
                    typeof item.media[0] === "string"
                      ? item.media[0]
                      : item.media[0]?.url || "";
                  return mediaUrl && mediaUrl.trim() !== "" ? (
                    <View
                      style={{
                        borderRadius: 12,
                        overflow: "hidden",
                        backgroundColor: "#000",
                      }}
                    >
                      <Image
                        source={{ uri: mediaUrl }}
                        style={styles.postImage}
                        resizeMode="contain"
                      />
                    </View>
                  ) : null;
                })()
              ) : (
                <View style={styles.imageGrid}>
                  {item.media
                    .map((mediaItem) =>
                      typeof mediaItem === "string"
                        ? mediaItem
                        : mediaItem?.url || ""
                    )
                    .filter((url) => url && url.trim() !== "")
                    .slice(0, 4)
                    .map((mediaUrl, index) => (
                      <View
                        key={`media-${item._id}-${index}`}
                        style={{
                          borderRadius: 12,
                          overflow: "hidden",
                          width: "48%",
                          aspectRatio: 1,
                        }}
                      >
                        <Image
                          source={{ uri: mediaUrl }}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode="cover"
                        />
                      </View>
                    ))}
                </View>
              )}
            </View>
          )}

          {/* Poll */}
          {item.postType === "poll" && item.poll && (
            <View style={styles.pollContainer}>
              <Text style={styles.pollQuestion}>{item.poll.question}</Text>
              {item.poll.options.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.pollOption,
                    option.isVotedByCurrentUser && styles.pollOptionSelected,
                  ]}
                  onPress={() => handlePollVote(item._id, option.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pollOptionText}>{option.text}</Text>
                    {item.poll?.hasVoted && (
                      <Text style={styles.pollVotes}>
                        {option.votes} votes ({option.percentage || 0}%)
                      </Text>
                    )}
                  </View>
                  {option.isVotedByCurrentUser && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={theme.colors.success}
                    />
                  )}
                </TouchableOpacity>
              ))}
              <Text style={styles.pollVotes}>
                {item.poll.totalVotes} total votes
              </Text>
            </View>
          )}

          {/* Article */}
          {item.postType === "article" && item.article && (
            <View style={styles.articleCard}>
              {(() => {
                const coverUrl =
                  item.article.coverImage?.url || item.article.cover || "";
                return coverUrl && coverUrl.trim() !== "" ? (
                  <View
                    style={{
                      borderRadius: 12,
                      overflow: "hidden",
                      marginBottom: 8,
                    }}
                  >
                    <Image
                      source={{ uri: coverUrl }}
                      style={styles.articleCover}
                      resizeMode="cover"
                    />
                  </View>
                ) : null;
              })()}
              <View style={{ padding: 12 }}>
                <Text style={styles.articleTitle}>{item.article.title}</Text>
                {item.article.summary && (
                  <Text style={styles.articleSummary}>
                    {item.article.summary}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Event */}
          {item.postType === "event" && item.event && (
            <View style={styles.eventCard}>
              <Text style={styles.eventTitle}>{item.event.title}</Text>
              <View style={styles.eventDetail}>
                <Ionicons
                  name="location-outline"
                  size={16}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.eventDetailText}>
                  {item.event.location}
                </Text>
              </View>
              <View style={styles.eventDetail}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.eventDetailText}>
                  {new Date(item.event.startDate).toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={styles.postActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleLike(item._id)}
            >
              <Ionicons
                name={item.isLikedByUser ? "heart" : "heart-outline"}
                size={20}
                color={
                  item.isLikedByUser
                    ? theme.colors.danger
                    : theme.colors.textSecondary
                }
              />
              <Text style={styles.actionText}>{item.likesCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleOpenComments(item)}
            >
              <Ionicons
                name="chatbubble-outline"
                size={20}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.actionText}>{item.commentsCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleSavePost(item._id)}
            >
              <Ionicons
                name={
                  savedPostIds.has(item._id) ? "bookmark" : "bookmark-outline"
                }
                size={20}
                color={
                  savedPostIds.has(item._id)
                    ? theme.colors.primary
                    : theme.colors.textSecondary
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [
      handleLike,
      handleOpenComments,
      handlePollVote,
      handleSavePost,
      handleDeletePost,
      savedPostIds,
      openMenuPostId,
      profile,
    ]
  );

  const renderHeader = useCallback(
    () => (
      <View>
        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "posts" && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab("posts")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "posts" && styles.tabButtonTextActive,
              ]}
            >
              📝 Posts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "saved" && styles.tabButtonActive,
            ]}
            onPress={() => {
              setActiveTab("saved");
              fetchSavedPosts();
            }}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "saved" && styles.tabButtonTextActive,
              ]}
            >
              🔖 Saved
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "insights" && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab("insights")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "insights" && styles.tabButtonTextActive,
              ]}
            >
              📊 Insights
            </Text>
          </TouchableOpacity>
        </View>

        {/* Post Composer - Only show in Posts tab */}
        {activeTab === "posts" && (
          <View style={styles.composerCard}>
            <View style={styles.composerRow}>
              <View style={styles.composerAvatar}>
                {profile?.profileImage?.url &&
                typeof profile.profileImage.url === "string" &&
                profile.profileImage.url.trim() !== "" ? (
                  <Image
                    source={{ uri: profile.profileImage.url }}
                    style={{ width: 40, height: 40, borderRadius: 20 }}
                  />
                ) : (
                  <Ionicons
                    name="person"
                    size={24}
                    color={theme.colors.primary}
                  />
                )}
              </View>
              <TouchableOpacity
                style={styles.composerInput}
                onPress={() => setShowComposer(true)}
              >
                <Text style={{ color: theme.colors.textSecondary }}>
                  Start a post...
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => {
                  setComposerType("image");
                  setShowComposer(true);
                }}
              >
                <Ionicons
                  name="image-outline"
                  size={20}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.quickActionText}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => {
                  setComposerType("article");
                  setShowComposer(true);
                }}
              >
                <Ionicons
                  name="document-outline"
                  size={20}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.quickActionText}>Article</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => {
                  setComposerType("poll");
                  setShowComposer(true);
                }}
              >
                <Text style={{ fontSize: 18 }}>📊</Text>
                <Text style={styles.quickActionText}>Poll</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Stats - Only show in Insights tab */}
        {activeTab === "insights" && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons
                name="document-text-outline"
                size={24}
                color={theme.colors.primary}
              />
              <Text style={styles.statValue}>{stats.totalPosts}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons
                name="people-outline"
                size={24}
                color={theme.colors.primary}
              />
              <Text style={styles.statValue}>{stats.totalUsers}</Text>
              <Text style={styles.statLabel}>Members</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons
                name="heart-outline"
                size={24}
                color={theme.colors.primary}
              />
              <Text style={styles.statValue}>{stats.totalLikes}</Text>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
          </View>
        )}
      </View>
    ),
    [router, activeTab, stats, fetchSavedPosts]
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyState}>
        <Ionicons
          name="chatbubbles-outline"
          size={48}
          color={theme.colors.border}
        />
        <Text style={styles.emptyText}>
          No posts yet. Be the first to share something!
        </Text>
      </View>
    ),
    [theme]
  );

  if (loading && !refreshing) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const currentPosts = activeTab === "saved" ? savedPosts : posts;

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setScrollY(offsetY);
    setShowScrollTop(offsetY > 300);
  };

  const scrollToTop = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  return (
    <View style={styles.container}>
      <View style={styles.navbarWrapper}>
        <Navbar />
      </View>

      <FlatList
        ref={flatListRef}
        data={activeTab === "insights" ? [] : currentPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <TouchableOpacity
          style={{
            position: "absolute",
            right: 24,
            bottom: 110,
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: theme.colors.primary,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
          onPress={scrollToTop}
        >
          <Ionicons name="arrow-up" size={24} color={theme.colors.onPrimary} />
        </TouchableOpacity>
      )}

      {/* Post Composer Modal */}
      <Modal
        visible={showComposer}
        animationType="slide"
        transparent
        onRequestClose={() => setShowComposer(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  flex: 1,
                }}
              >
                <View style={styles.composerAvatar}>
                  {profile?.profileImage?.url &&
                  typeof profile.profileImage.url === "string" &&
                  profile.profileImage.url.trim() !== "" ? (
                    <Image
                      source={{ uri: profile.profileImage.url }}
                      style={{ width: 40, height: 40, borderRadius: 20 }}
                    />
                  ) : (
                    <Ionicons
                      name="person"
                      size={24}
                      color={theme.colors.primary}
                    />
                  )}
                </View>
                <View>
                  <Text style={styles.modalTitle}>
                    {profile?.displayName || profile?.username || "User"}
                  </Text>
                  <Text
                    style={{ fontSize: 13, color: theme.colors.textSecondary }}
                  >
                    Post to Community
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowComposer(false)}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {/* Type Selector */}
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                <TouchableOpacity
                  style={[
                    styles.typeChip,
                    composerType === "text" && styles.typeChipActive,
                  ]}
                  onPress={() => setComposerType("text")}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      composerType === "text" && styles.typeChipTextActive,
                    ]}
                  >
                    📝 Text
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeChip,
                    composerType === "image" && styles.typeChipActive,
                  ]}
                  onPress={() => setComposerType("image")}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      composerType === "image" && styles.typeChipTextActive,
                    ]}
                  >
                    📷 Photo
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeChip,
                    composerType === "article" && styles.typeChipActive,
                  ]}
                  onPress={() => setComposerType("article")}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      composerType === "article" && styles.typeChipTextActive,
                    ]}
                  >
                    📄 Article
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeChip,
                    composerType === "poll" && styles.typeChipActive,
                  ]}
                  onPress={() => setComposerType("poll")}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      composerType === "poll" && styles.typeChipTextActive,
                    ]}
                  >
                    📊 Poll
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Article Title */}
              {composerType === "article" && (
                <TextInput
                  style={styles.articleTitleInput}
                  placeholder="Article Title"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={articleTitle}
                  onChangeText={setArticleTitle}
                />
              )}

              {/* Poll Question */}
              {composerType === "poll" && (
                <TextInput
                  style={styles.articleTitleInput}
                  placeholder="Poll Question"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={pollQuestion}
                  onChangeText={setPollQuestion}
                />
              )}

              {/* Main Content */}
              {composerType !== "poll" && (
                <TextInput
                  style={styles.composerTextInput}
                  placeholder={
                    composerType === "article"
                      ? "Write your article content..."
                      : "What do you want to share with the community?"
                  }
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  value={composerText}
                  onChangeText={setComposerText}
                  autoFocus={composerType === "text"}
                />
              )}

              {/* Article Summary */}
              {composerType === "article" && (
                <TextInput
                  style={styles.articleSummaryInput}
                  placeholder="Summary (optional)"
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  value={articleSummary}
                  onChangeText={setArticleSummary}
                />
              )}

              {/* Image Picker */}
              {composerType === "image" && (
                <View>
                  <TouchableOpacity
                    style={styles.imagePickerButton}
                    onPress={pickImages}
                  >
                    <Ionicons
                      name="image-outline"
                      size={24}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.imagePickerText}>
                      {selectedImages.length > 0
                        ? `${selectedImages.length} image${
                            selectedImages.length > 1 ? "s" : ""
                          } selected`
                        : "Choose Photos"}
                    </Text>
                  </TouchableOpacity>
                  {selectedImages.length > 0 && (
                    <ScrollView horizontal style={{ marginTop: 12 }}>
                      {selectedImages.map((uri, index) => (
                        <View
                          key={`selected-image-${index}`}
                          style={{ marginRight: 8, position: "relative" }}
                        >
                          <Image
                            source={{ uri }}
                            style={{ width: 80, height: 80, borderRadius: 8 }}
                          />
                          <TouchableOpacity
                            style={{
                              position: "absolute",
                              top: 4,
                              right: 4,
                              backgroundColor: "rgba(0,0,0,0.6)",
                              borderRadius: 12,
                              width: 24,
                              height: 24,
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                            onPress={() => {
                              setSelectedImages((prev) =>
                                prev.filter((_, i) => i !== index)
                              );
                            }}
                          >
                            <Ionicons name="close" size={16} color="#FFF" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}

              {/* Poll Options */}
              {composerType === "poll" && (
                <View>
                  {pollOptions.map((option, index) => (
                    <View
                      key={`poll-option-${index}`}
                      style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}
                    >
                      <TextInput
                        style={[styles.pollOptionInput, { flex: 1 }]}
                        placeholder={`Option ${index + 1}`}
                        placeholderTextColor={theme.colors.textSecondary}
                        value={option}
                        onChangeText={(text) => {
                          const newOptions = [...pollOptions];
                          newOptions[index] = text;
                          setPollOptions(newOptions);
                        }}
                      />
                      {pollOptions.length > 2 && (
                        <TouchableOpacity
                          style={styles.removeOptionButton}
                          onPress={() => {
                            setPollOptions((prev) =>
                              prev.filter((_, i) => i !== index)
                            );
                          }}
                        >
                          <Ionicons
                            name="close-circle"
                            size={24}
                            color={theme.colors.danger}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  {pollOptions.length < 6 && (
                    <TouchableOpacity
                      style={styles.addOptionButton}
                      onPress={() => setPollOptions((prev) => [...prev, ""])}
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={20}
                        color={theme.colors.primary}
                      />
                      <Text style={styles.addOptionText}>Add Option</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.postButton,
                  composerType === "text" &&
                    !composerText.trim() &&
                    styles.postButtonDisabled,
                ]}
                onPress={handleCreatePost}
                disabled={composerType === "text" && !composerText.trim()}
              >
                <Text style={styles.postButtonText}>Post</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Comments Modal */}
      <Modal
        visible={showComments}
        animationType="slide"
        transparent
        onRequestClose={() => setShowComments(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Comments ({selectedPost?.commentsCount || 0})
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowComments(false)}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {loadingComments ? (
                <ActivityIndicator
                  color={theme.colors.primary}
                  style={{ marginTop: 20 }}
                />
              ) : (
                <>
                  {comments.map((comment) => {
                    const commentAuthor =
                      comment.author?.displayName ||
                      comment.author?.username ||
                      "User";
                    const commentInitials = commentAuthor
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);

                    return (
                      <View key={comment._id} style={styles.commentItem}>
                        <View style={styles.commentAvatar}>
                          {comment.author?.profileImage?.url &&
                          typeof comment.author.profileImage.url === "string" &&
                          comment.author.profileImage.url.trim() !== "" ? (
                            <Image
                              source={{ uri: comment.author.profileImage.url }}
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                              }}
                            />
                          ) : (
                            <Text
                              style={{
                                fontSize: 12,
                                color: theme.colors.primary,
                                fontWeight: "600",
                              }}
                            >
                              {commentInitials}
                            </Text>
                          )}
                        </View>
                        <View style={styles.commentContent}>
                          <Text style={styles.commentAuthor}>
                            {commentAuthor}
                          </Text>
                          <Text style={styles.commentText}>{comment.text}</Text>
                          <Text style={styles.commentTime}>
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                  {comments.length === 0 && (
                    <Text style={[styles.emptyText, { marginTop: 40 }]}>
                      No comments yet. Be the first to comment!
                    </Text>
                  )}
                </>
              )}
            </ScrollView>
            <View style={styles.commentInput}>
              <TextInput
                style={styles.commentTextInput}
                placeholder="Add a comment..."
                placeholderTextColor={theme.colors.textSecondary}
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleAddComment}
                disabled={!newComment.trim()}
              >
                <Ionicons
                  name="send"
                  size={18}
                  color={theme.colors.onPrimary}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
