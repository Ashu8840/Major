import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { AppTheme, useAppTheme } from "@/context/ThemeContext";
import { router } from "expo-router";
import { Navbar } from "@/components/layout/Navbar";
import {
  fetchSocialOverview,
  searchSocialUsers,
  updateFavoriteFriends,
  fetchCircles,
  createSocialCircle,
  joinSocialCircle,
  deleteSocialCircle,
  followUser,
  unfollowUser,
  togglePinCircle,
} from "@/services/socialApi";
import {
  normaliseId,
  buildDisplayName,
  formatRelativeTime,
  getInitials,
  resolveAvatarUrl,
} from "@/utils/socialHelpers";

const MAX_FAVORITE_FRIENDS = 4;
const FOLLOWERS_PER_PAGE = 5;
const FOLLOWING_PER_PAGE = 5;
const CIRCLES_PER_PAGE = 4;

const TABS = [
  { id: "friends", label: "Friends", icon: "people" },
  { id: "circles", label: "Circles", icon: "chatbubble" },
  { id: "discover", label: "Discover", icon: "search" },
] as const;

const themes = ["blue", "purple", "emerald", "amber", "rose"];

type TabId = (typeof TABS)[number]["id"];

interface User {
  id: string;
  _id?: string;
  username: string;
  displayName?: string;
  avatar?: any;
  isFavorite?: boolean;
  isMutual?: boolean;
  isFollowing?: boolean;
}

interface Circle {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  visibility: "public" | "private";
  theme: string;
  memberCount: number;
  lastActivityAt?: string;
  requiresKey?: boolean;
  isPinned?: boolean;
  membership?: {
    role: string;
    isPinned?: boolean;
  };
  owner?: any;
  membersPreview?: any[];
}

interface SocialOverview {
  stats?: {
    followers: number;
    following: number;
    mutual: number;
  };
  favoriteFriends?: User[];
  mutualFriends?: User[];
  followers?: User[];
  following?: User[];
}

const EmptyState: React.FC<{ title: string; description?: string }> = ({
  title,
  description,
}) => {
  const { theme } = useAppTheme();
  const localStyles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={localStyles.emptyState}>
      <Text style={localStyles.emptyStateTitle}>{title}</Text>
      {description && (
        <Text style={localStyles.emptyStateDescription}>{description}</Text>
      )}
    </View>
  );
};

const UserAvatar: React.FC<{ user: User; size?: number }> = ({
  user,
  size = 40,
}) => {
  const { theme } = useAppTheme();
  const localStyles = React.useMemo(() => createStyles(theme), [theme]);
  const avatarUrl = resolveAvatarUrl(user.avatar);
  const initials = getInitials(buildDisplayName(user));

  return (
    <View
      style={[
        localStyles.avatarContainer,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={[
            localStyles.avatarImage,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        />
      ) : (
        <View
          style={[
            localStyles.avatarPlaceholder,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          <Text style={[localStyles.avatarText, { fontSize: size / 2.5 }]}>
            {initials}
          </Text>
        </View>
      )}
    </View>
  );
};

export default function SocialScreen() {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const selfId = user?._id || user?.id;

  const [activeTab, setActiveTab] = useState<TabId>("friends");
  const [overview, setOverview] = useState<SocialOverview | null>(null);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const [circleForm, setCircleForm] = useState({
    name: "",
    description: "",
    visibility: "public" as "public" | "private",
    joinKey: "",
    theme: themes[0],
  });

  const [joinDialog, setJoinDialog] = useState<{
    circle: Circle | null;
    key: string;
  }>({ circle: null, key: "" });

  const [deleteDialog, setDeleteDialog] = useState<Circle | null>(null);
  const [circleSearchTerm, setCircleSearchTerm] = useState("");

  // Pagination states
  const [followersPage, setFollowersPage] = useState(1);
  const [followingPage, setFollowingPage] = useState(1);
  const [circlesPage, setCirclesPage] = useState(1);

  // Loading states
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [circlesLoading, setCirclesLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [savingFavorites, setSavingFavorites] = useState(false);
  const [creatingCircle, setCreatingCircle] = useState(false);
  const [joiningCircleId, setJoiningCircleId] = useState<string | null>(null);
  const [processingDelete, setProcessingDelete] = useState(false);

  // Computed values
  const favoriteList = useMemo(() => {
    if (!overview?.favoriteFriends) return [];
    return overview.favoriteFriends.filter((friend) =>
      favoriteIds.has(friend.id)
    );
  }, [overview, favoriteIds]);

  const mutualFriends = useMemo(() => {
    if (!overview?.mutualFriends) return [];
    return overview.mutualFriends.map((friend) => ({
      ...friend,
      isFavorite: favoriteIds.has(friend.id),
    }));
  }, [overview, favoriteIds]);

  const filteredCircles = useMemo(() => {
    // Backend now handles sorting by pin status
    const term = circleSearchTerm.trim().toLowerCase();
    if (!term) return circles;

    return circles.filter((circle) => {
      const name = circle.name?.toLowerCase() || "";
      const description = circle.description?.toLowerCase() || "";
      return name.includes(term) || description.includes(term);
    });
  }, [circles, circleSearchTerm]);

  // Paginated data
  const paginatedFollowers = useMemo(() => {
    const followers = overview?.followers || [];
    return followers.slice(0, followersPage * FOLLOWERS_PER_PAGE);
  }, [overview, followersPage]);

  const paginatedFollowing = useMemo(() => {
    const following = overview?.following || [];
    return following.slice(0, followingPage * FOLLOWING_PER_PAGE);
  }, [overview, followingPage]);

  const paginatedCircles = useMemo(() => {
    return filteredCircles.slice(0, circlesPage * CIRCLES_PER_PAGE);
  }, [filteredCircles, circlesPage]);

  const hasMoreFollowers = useMemo(() => {
    return (
      (overview?.followers || []).length > followersPage * FOLLOWERS_PER_PAGE
    );
  }, [overview, followersPage]);

  const hasMoreFollowing = useMemo(() => {
    return (
      (overview?.following || []).length > followingPage * FOLLOWING_PER_PAGE
    );
  }, [overview, followingPage]);

  const hasMoreCircles = useMemo(() => {
    return filteredCircles.length > circlesPage * CIRCLES_PER_PAGE;
  }, [filteredCircles, circlesPage]);

  // Load data functions
  const loadOverview = useCallback(async () => {
    if (!selfId) return;
    setOverviewLoading(true);
    try {
      const data = await fetchSocialOverview();
      setOverview(data);
      const favourites = new Set<string>(
        (data.favoriteFriends || [])
          .filter((friend: User) => friend.isFavorite)
          .map((friend: User) => friend.id)
      );
      setFavoriteIds(favourites);
    } catch (error: any) {
      console.error("Failed to load social overview", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to load friends"
      );
    } finally {
      setOverviewLoading(false);
    }
  }, [selfId]);

  const loadCircles = useCallback(async () => {
    if (!selfId) return;
    setCirclesLoading(true);
    try {
      const data = await fetchCircles();
      setCircles(data?.circles || []);
    } catch (error: any) {
      console.error("Failed to load circles", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to load circles"
      );
    } finally {
      setCirclesLoading(false);
    }
  }, [selfId]);

  const executeSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const data = await searchSocialUsers(query.trim());
      setSearchResults(data?.results || []);
    } catch (error: any) {
      console.error("User search failed", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to search users"
      );
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!selfId) return;
    loadOverview();
    loadCircles();
  }, [selfId, loadOverview, loadCircles]);

  // Handler functions
  const handleToggleFavorite = async (friendId: string) => {
    const current = new Set(favoriteIds);
    if (current.has(friendId)) {
      current.delete(friendId);
    } else {
      if (current.size >= MAX_FAVORITE_FRIENDS) {
        Alert.alert(
          "Limit Reached",
          `You can only pin ${MAX_FAVORITE_FRIENDS} favorites`
        );
        return;
      }
      current.add(friendId);
    }

    setSavingFavorites(true);
    try {
      await updateFavoriteFriends(Array.from(current));
      setFavoriteIds(current);
      await loadOverview();
    } catch (error: any) {
      console.error("Failed to update favorites", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to update favorites"
      );
    } finally {
      setSavingFavorites(false);
    }
  };

  const handleFollowToggle = async (person: User) => {
    try {
      if (person.isFollowing) {
        await unfollowUser(person.id);
        Alert.alert("Success", `Unfollowed ${buildDisplayName(person)}`);
      } else {
        await followUser(person.id);
        Alert.alert("Success", `Now following ${buildDisplayName(person)}`);
      }
      await loadOverview();
      if (searchQuery.trim()) {
        await executeSearch(searchQuery);
      }
    } catch (error: any) {
      console.error("Follow toggle failed", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to update follow status"
      );
    }
  };

  const performJoinCircle = async (circle: Circle, keyInput: string = "") => {
    if (circle.requiresKey && keyInput.trim().length !== 4) {
      Alert.alert("Invalid Key", "Join key must be 4 digits");
      return;
    }

    setJoiningCircleId(circle.id);
    try {
      const { circle: updated } = await joinSocialCircle(
        circle.id,
        keyInput.trim()
      );
      Alert.alert("Success", `Joined ${updated.name}`);
      setJoinDialog({ circle: null, key: "" });
      await loadCircles();
      // Navigate to circle chat - implement this based on your routing
      // router.push(`/social/chat/${updated.id}`);
    } catch (error: any) {
      console.error("Failed to join circle", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to join circle"
      );
    } finally {
      setJoiningCircleId(null);
    }
  };

  const handleJoinCircleClick = (circle: Circle) => {
    if (circle.requiresKey) {
      setJoinDialog({ circle, key: "" });
    } else {
      performJoinCircle(circle);
    }
  };

  const handleCreateCircle = async () => {
    if (!circleForm.name.trim()) {
      Alert.alert("Error", "Please provide a circle name");
      return;
    }
    if (
      circleForm.visibility === "private" &&
      circleForm.joinKey.trim().length !== 4
    ) {
      Alert.alert("Error", "Private circles require a 4-digit key");
      return;
    }

    const payload: any = {
      name: circleForm.name.trim(),
      description: circleForm.description.trim(),
      visibility: circleForm.visibility,
      theme: circleForm.theme,
    };

    if (circleForm.visibility === "private") {
      payload.joinKey = circleForm.joinKey.trim();
    }

    try {
      setCreatingCircle(true);
      const { circle } = await createSocialCircle(payload);
      Alert.alert("Success", "Circle created");
      setCircleForm({
        name: "",
        description: "",
        visibility: "public",
        joinKey: "",
        theme: circleForm.theme,
      });
      setCircles((prev) => [
        circle,
        ...prev.filter((item) => item.id !== circle.id),
      ]);
      // Navigate to circle chat
      // router.push(`/social/chat/${circle.id}`);
    } catch (error: any) {
      console.error("Failed to create circle", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to create circle"
      );
    } finally {
      setCreatingCircle(false);
    }
  };

  const handleDeleteCircle = async () => {
    if (!deleteDialog?.id) return;
    try {
      setProcessingDelete(true);
      await deleteSocialCircle(deleteDialog.id);
      Alert.alert("Success", "Circle deleted");
      setDeleteDialog(null);
      await loadCircles();
    } catch (error: any) {
      console.error("Failed to delete circle", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to delete circle"
      );
    } finally {
      setProcessingDelete(false);
    }
  };

  const handleTogglePin = async (circleId: string) => {
    try {
      const response = await togglePinCircle(circleId);
      // Update local state
      setCircles((prev) =>
        prev.map((circle) =>
          circle.id === circleId
            ? { ...circle, isPinned: response.isPinned }
            : circle
        )
      );
      // Reload to get proper sorting
      await loadCircles();
    } catch (error: any) {
      console.error("Failed to toggle pin", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to toggle pin status"
      );
    }
  };

  const handleSearchSubmit = () => {
    executeSearch(searchQuery);
  };

  const handleSelectCircle = (circleId: string) => {
    // Navigate to circle chat
    router.push(`/social-chat/${circleId}` as any);
  };

  const styles = React.useMemo(() => createStyles(theme), [theme]);

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.navbarWrapper}>
          <Navbar />
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.loginMessage}>
            Please log in to access social features.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.navbarWrapper}>
        <Navbar />
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 130 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="heart" size={32} color={theme.colors.danger} />
            <Text style={styles.headerTitle}>Social Hub</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Connect with the writers you care about and join circles that match
            your vibe.
          </Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={20}
                  color={
                    activeTab === tab.id
                      ? theme.colors.onPrimary
                      : theme.colors.primary
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab.id && styles.tabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Friends Tab */}
        {activeTab === "friends" && (
          <View style={styles.tabContent}>
            {/* Stats */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: theme.colors.surfaceMuted },
                  ]}
                >
                  <Ionicons
                    name="people"
                    size={24}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={styles.statLabel}>Followers</Text>
                <Text style={styles.statValue}>
                  {overviewLoading ? "--" : overview?.stats?.followers ?? 0}
                </Text>
              </View>
              <View style={styles.statCard}>
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: theme.colors.dangerSoft },
                  ]}
                >
                  <Ionicons
                    name="heart"
                    size={24}
                    color={theme.colors.danger}
                  />
                </View>
                <Text style={styles.statLabel}>Following</Text>
                <Text style={styles.statValue}>
                  {overviewLoading ? "--" : overview?.stats?.following ?? 0}
                </Text>
              </View>
              <View style={styles.statCard}>
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: theme.colors.warningSoft },
                  ]}
                >
                  <Ionicons
                    name="star"
                    size={24}
                    color={theme.colors.warning}
                  />
                </View>
                <Text style={styles.statLabel}>Mutual Friends</Text>
                <Text style={styles.statValue}>
                  {overviewLoading ? "--" : overview?.stats?.mutual ?? 0}
                </Text>
              </View>
            </View>

            {/* Favorite Friends */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>Favorite friends</Text>
                  <Text style={styles.cardSubtitle}>
                    Pin up to {MAX_FAVORITE_FRIENDS} friends you chat with the
                    most.
                  </Text>
                </View>
                <Text style={styles.favoriteCount}>
                  {favoriteIds.size}/{MAX_FAVORITE_FRIENDS}
                </Text>
              </View>
              {overviewLoading ? (
                <EmptyState title="Loading favorites..." />
              ) : favoriteList.length === 0 ? (
                <EmptyState
                  title="No favorites yet"
                  description="Add mutual friends to favorites to see them here."
                />
              ) : (
                favoriteList.map((friend) => (
                  <View key={friend.id} style={styles.listItem}>
                    <View style={styles.listItemLeft}>
                      <UserAvatar user={friend} size={40} />
                      <View>
                        <Text style={styles.listItemName}>
                          {buildDisplayName(friend)}
                        </Text>
                        <Text style={styles.listItemSubtitle}>
                          @{friend.username} • Mutual
                        </Text>
                      </View>
                    </View>
                    <View style={styles.listItemActions}>
                      <TouchableOpacity
                        style={styles.chatButton}
                        onPress={() => {
                          router.push(
                            `/connect?targetUserId=${friend.id}` as any
                          );
                        }}
                      >
                        <Text style={styles.chatButtonText}>Open chat</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleToggleFavorite(friend.id)}
                        disabled={savingFavorites}
                        style={[
                          styles.favoriteButton,
                          friend.isFavorite && styles.favoriteButtonActive,
                        ]}
                      >
                        <Ionicons
                          name="star"
                          size={20}
                          color={friend.isFavorite ? "#f59e0b" : "#93c5fd"}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Mutual Friends */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Mutual friends</Text>
              </View>
              {overviewLoading ? (
                <EmptyState title="Loading mutual friends..." />
              ) : mutualFriends.length === 0 ? (
                <EmptyState
                  title="No mutual friends yet"
                  description="Follow back people who already follow you to build mutual connections."
                />
              ) : (
                mutualFriends.map((friend) => (
                  <View key={friend.id} style={styles.listItem}>
                    <View style={styles.listItemLeft}>
                      <UserAvatar user={friend} size={40} />
                      <View>
                        <Text style={styles.listItemName}>
                          {buildDisplayName(friend)}
                        </Text>
                        <Text style={styles.listItemSubtitle}>
                          @{friend.username} •{" "}
                          {friend.isFavorite ? "Favorite" : "Mutual"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.listItemActions}>
                      <TouchableOpacity
                        onPress={() => handleToggleFavorite(friend.id)}
                        disabled={savingFavorites}
                        style={[
                          styles.favoriteButton,
                          friend.isFavorite && styles.favoriteButtonActive,
                        ]}
                      >
                        <Ionicons
                          name="star"
                          size={20}
                          color={
                            friend.isFavorite
                              ? theme.colors.warning
                              : theme.colors.textMuted
                          }
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.chatButton}
                        onPress={() => {
                          router.push(
                            `/connect?targetUserId=${friend.id}` as any
                          );
                        }}
                      >
                        <Text style={styles.chatButtonText}>Message</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Followers & Following Grid */}
            <View style={styles.fullWidthSection}>
              {/* Followers */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Followers</Text>
                </View>
                {overviewLoading ? (
                  <EmptyState title="Loading followers..." />
                ) : (overview?.followers || []).length === 0 ? (
                  <EmptyState
                    title="No followers yet"
                    description="Share your profile to grow your audience."
                  />
                ) : (
                  <>
                    {paginatedFollowers.map((person) => (
                      <View key={person.id} style={styles.listItem}>
                        <View style={styles.listItemLeft}>
                          <UserAvatar user={person} size={40} />
                          <View style={styles.listItemInfo}>
                            <Text style={styles.listItemName}>
                              {buildDisplayName(person)}
                            </Text>
                            <Text style={styles.listItemSubtitle}>
                              @{person.username} •{" "}
                              {person.isMutual ? "Mutual" : "Follows you"}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleFollowToggle(person)}
                          style={[
                            styles.followButton,
                            person.isFollowing && styles.unfollowButton,
                          ]}
                        >
                          <Ionicons
                            name={
                              person.isFollowing
                                ? "person-remove-outline"
                                : "person-add-outline"
                            }
                            size={16}
                            color={
                              person.isFollowing
                                ? theme.colors.danger
                                : theme.colors.primary
                            }
                          />
                          <Text
                            style={[
                              styles.followButtonText,
                              person.isFollowing && styles.unfollowButtonText,
                            ]}
                          >
                            {person.isFollowing ? "Unfollow" : "Follow back"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                    {hasMoreFollowers && (
                      <TouchableOpacity
                        style={styles.loadMoreButton}
                        onPress={() => setFollowersPage((prev) => prev + 1)}
                      >
                        <Text style={styles.loadMoreText}>Load More</Text>
                        <Ionicons
                          name="chevron-down"
                          size={16}
                          color={theme.colors.primary}
                        />
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>

              {/* Following */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Following</Text>
                </View>
                {overviewLoading ? (
                  <EmptyState title="Loading following..." />
                ) : (overview?.following || []).length === 0 ? (
                  <EmptyState
                    title="You're not following anyone yet"
                    description="Explore the discover tab to find people."
                  />
                ) : (
                  <>
                    {paginatedFollowing.map((person) => (
                      <View key={person.id} style={styles.listItem}>
                        <View style={styles.listItemLeft}>
                          <UserAvatar user={person} size={40} />
                          <View style={styles.listItemInfo}>
                            <Text style={styles.listItemName}>
                              {buildDisplayName(person)}
                            </Text>
                            <Text style={styles.listItemSubtitle}>
                              @{person.username} •{" "}
                              {person.isMutual ? "Mutual" : "You follow"}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() =>
                            handleFollowToggle({ ...person, isFollowing: true })
                          }
                          style={styles.unfollowButton}
                        >
                          <Ionicons
                            name="person-remove-outline"
                            size={16}
                            color={theme.colors.danger}
                          />
                          <Text style={styles.unfollowButtonText}>
                            Unfollow
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                    {hasMoreFollowing && (
                      <TouchableOpacity
                        style={styles.loadMoreButton}
                        onPress={() => setFollowingPage((prev) => prev + 1)}
                      >
                        <Text style={styles.loadMoreText}>Load More</Text>
                        <Ionicons
                          name="chevron-down"
                          size={16}
                          color={theme.colors.primary}
                        />
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Discover Tab */}
        {activeTab === "discover" && (
          <View style={styles.tabContent}>
            {/* Search Form */}
            <View style={styles.card}>
              <View style={styles.searchContainer}>
                <Ionicons
                  name="search"
                  size={20}
                  color={theme.colors.textSecondary}
                  style={styles.searchIcon}
                />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search writers by name or username"
                  style={styles.searchInput}
                  onSubmitEditing={handleSearchSubmit}
                />
                <TouchableOpacity
                  onPress={handleSearchSubmit}
                  disabled={searching}
                  style={styles.searchButton}
                >
                  <Text style={styles.searchButtonText}>
                    {searching ? "Searching..." : "Search"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Search Results */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Search results</Text>
              </View>
              {searching ? (
                <EmptyState title="Searching users..." />
              ) : searchResults.length === 0 ? (
                <EmptyState
                  title="No users yet"
                  description="Try a different search term to discover more writers."
                />
              ) : (
                searchResults.map((person) => (
                  <View key={person.id} style={styles.listItem}>
                    <View style={styles.listItemLeft}>
                      <UserAvatar user={person} size={40} />
                      <View>
                        <Text style={styles.listItemName}>
                          {buildDisplayName(person)}
                        </Text>
                        <Text style={styles.listItemSubtitle}>
                          @{person.username}
                          {person.isMutual && (
                            <Text style={{ color: theme.colors.success }}>
                              {" "}
                              Mutual
                            </Text>
                          )}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleFollowToggle(person)}
                      style={[
                        styles.followButton,
                        person.isFollowing && styles.unfollowButton,
                      ]}
                    >
                      <Ionicons
                        name={
                          person.isFollowing
                            ? "person-remove-outline"
                            : "person-add-outline"
                        }
                        size={16}
                        color={
                          person.isFollowing
                            ? theme.colors.danger
                            : theme.colors.primary
                        }
                      />
                      <Text
                        style={[
                          styles.followButtonText,
                          person.isFollowing && styles.unfollowButtonText,
                        ]}
                      >
                        {person.isFollowing ? "Unfollow" : "Follow"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* Circles Tab */}
        {activeTab === "circles" && (
          <View style={styles.tabContent}>
            {/* Create Circle Form */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Create a circle</Text>
                <TouchableOpacity
                  onPress={handleCreateCircle}
                  disabled={creatingCircle}
                  style={styles.createButton}
                >
                  <Ionicons
                    name="add"
                    size={20}
                    color={theme.colors.onPrimary}
                  />
                  <Text style={styles.createButtonText}>
                    {creatingCircle ? "Creating..." : "Create"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Circle name</Text>
                  <TextInput
                    value={circleForm.name}
                    onChangeText={(text) =>
                      setCircleForm((prev) => ({ ...prev, name: text }))
                    }
                    placeholder="Writers midnight club"
                    style={styles.formInput}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Description</Text>
                  <TextInput
                    value={circleForm.description}
                    onChangeText={(text) =>
                      setCircleForm((prev) => ({ ...prev, description: text }))
                    }
                    placeholder="Let others know what this circle is about"
                    style={[styles.formInput, styles.formTextArea]}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formFieldHalf}>
                    <Text style={styles.formLabel}>Visibility</Text>
                    <View style={styles.pickerContainer}>
                      <TouchableOpacity
                        style={[
                          styles.pickerButton,
                          circleForm.visibility === "public" &&
                            styles.pickerButtonActive,
                        ]}
                        onPress={() =>
                          setCircleForm((prev) => ({
                            ...prev,
                            visibility: "public",
                          }))
                        }
                      >
                        <Text
                          style={[
                            styles.pickerButtonText,
                            circleForm.visibility === "public" &&
                              styles.pickerButtonTextActive,
                          ]}
                        >
                          Public
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.pickerButton,
                          circleForm.visibility === "private" &&
                            styles.pickerButtonActive,
                        ]}
                        onPress={() =>
                          setCircleForm((prev) => ({
                            ...prev,
                            visibility: "private",
                          }))
                        }
                      >
                        <Text
                          style={[
                            styles.pickerButtonText,
                            circleForm.visibility === "private" &&
                              styles.pickerButtonTextActive,
                          ]}
                        >
                          Private
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.formFieldHalf}>
                    <Text style={styles.formLabel}>Theme</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.themeScroll}
                    >
                      {themes.map((theme) => (
                        <TouchableOpacity
                          key={theme}
                          onPress={() =>
                            setCircleForm((prev) => ({ ...prev, theme }))
                          }
                          style={[
                            styles.themeButton,
                            circleForm.theme === theme &&
                              styles.themeButtonActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.themeButtonText,
                              circleForm.theme === theme &&
                                styles.themeButtonTextActive,
                            ]}
                          >
                            {theme.charAt(0).toUpperCase() + theme.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>

                {circleForm.visibility === "private" && (
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Join key</Text>
                    <TextInput
                      value={circleForm.joinKey}
                      onChangeText={(text) =>
                        setCircleForm((prev) => ({
                          ...prev,
                          joinKey: text.slice(0, 4),
                        }))
                      }
                      placeholder="4-digit key"
                      style={styles.formInput}
                      keyboardType="number-pad"
                      maxLength={4}
                    />
                  </View>
                )}
              </View>
            </View>

            {/* Circles List */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>Your circles</Text>
                  <Text style={styles.cardSubtitle}>
                    Public and private circles live together here—join or open
                    any of them.
                  </Text>
                </View>
              </View>
              <View style={styles.searchContainer}>
                <Ionicons
                  name="search"
                  size={20}
                  color={theme.colors.textSecondary}
                  style={styles.searchIcon}
                />
                <TextInput
                  value={circleSearchTerm}
                  onChangeText={setCircleSearchTerm}
                  placeholder="Search circles"
                  style={styles.searchInput}
                />
              </View>

              {circlesLoading ? (
                <EmptyState title="Loading circles..." />
              ) : circles.length === 0 ? (
                <EmptyState
                  title="No circles yet"
                  description="Create a circle or join a public one to get started."
                />
              ) : filteredCircles.length === 0 ? (
                <EmptyState
                  title="No matches"
                  description="Try a different name or description."
                />
              ) : (
                <>
                  {paginatedCircles.map((circle) => {
                    const ownerId = normaliseId(
                      circle.owner?.id || circle.owner?._id || circle.owner
                    );
                    const isOwner = ownerId && ownerId === selfId;
                    const canDelete =
                      isOwner && circle.membership?.role === "owner";

                    return (
                      <View key={circle.id} style={styles.circleItem}>
                        <View style={styles.circleHeader}>
                          <View style={styles.circleInfo}>
                            <View style={styles.circleTitleRow}>
                              <Text style={styles.circleName}>
                                {circle.name}
                              </Text>
                              {circle.isPinned && (
                                <Ionicons
                                  name="pin"
                                  size={16}
                                  color={theme.colors.warning}
                                  style={{ marginLeft: 4 }}
                                />
                              )}
                              {circle.membership?.role && (
                                <View style={styles.roleBadge}>
                                  <Text style={styles.roleBadgeText}>
                                    {circle.membership.role}
                                  </Text>
                                </View>
                              )}
                              {circle.visibility === "private" && (
                                <View style={styles.privateBadge}>
                                  <Ionicons
                                    name="lock-closed"
                                    size={12}
                                    color={theme.colors.primary}
                                  />
                                  <Text style={styles.privateBadgeText}>
                                    Private
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.circleSubtitle}>
                              {circle.memberCount} members •{" "}
                              {circle.lastActivityAt
                                ? `Active ${formatRelativeTime(
                                    circle.lastActivityAt
                                  )}`
                                : "New circle"}
                            </Text>
                            {circle.description && (
                              <Text style={styles.circleDescription}>
                                {circle.description}
                              </Text>
                            )}
                          </View>
                        </View>

                        <View style={styles.circleActions}>
                          {circle.membership ? (
                            <>
                              <TouchableOpacity
                                style={styles.openChatButton}
                                onPress={() => handleSelectCircle(circle.id)}
                              >
                                <Text style={styles.openChatButtonText}>
                                  Open chat
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => handleTogglePin(circle.id)}
                                style={styles.pinButton}
                              >
                                <Ionicons
                                  name={circle.isPinned ? "pin" : "pin-outline"}
                                  size={16}
                                  color={
                                    circle.isPinned ? "#f59e0b" : "#6b7280"
                                  }
                                />
                              </TouchableOpacity>
                              {canDelete && (
                                <TouchableOpacity
                                  onPress={() => setDeleteDialog(circle)}
                                  disabled={
                                    processingDelete &&
                                    deleteDialog?.id === circle.id
                                  }
                                  style={styles.deleteButton}
                                >
                                  <Ionicons
                                    name="trash"
                                    size={16}
                                    color={theme.colors.danger}
                                  />
                                  <Text style={styles.deleteButtonText}>
                                    Delete
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </>
                          ) : (
                            <TouchableOpacity
                              onPress={() => handleJoinCircleClick(circle)}
                              disabled={joiningCircleId === circle.id}
                              style={styles.joinButton}
                            >
                              <Ionicons
                                name="person-add-outline"
                                size={16}
                                color={theme.colors.primary}
                              />
                              <Text style={styles.joinButtonText}>
                                {joiningCircleId === circle.id
                                  ? "Joining..."
                                  : circle.requiresKey
                                  ? "Join with key"
                                  : "Join"}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        {circle.membersPreview &&
                          circle.membersPreview.length > 0 && (
                            <View style={styles.membersPreview}>
                              <View style={styles.membersAvatars}>
                                {circle.membersPreview
                                  .slice(0, 5)
                                  .map((member: any) => (
                                    <View
                                      key={member.id}
                                      style={styles.memberAvatarWrapper}
                                    >
                                      <UserAvatar
                                        user={member.user}
                                        size={30}
                                      />
                                    </View>
                                  ))}
                              </View>
                              {circle.memberCount >
                                circle.membersPreview.length && (
                                <Text style={styles.membersMore}>
                                  +
                                  {circle.memberCount -
                                    circle.membersPreview.length}{" "}
                                  more
                                </Text>
                              )}
                            </View>
                          )}
                      </View>
                    );
                  })}
                  {hasMoreCircles && (
                    <TouchableOpacity
                      style={styles.loadMoreButton}
                      onPress={() => setCirclesPage((prev) => prev + 1)}
                    >
                      <Text style={styles.loadMoreText}>Load More Circles</Text>
                      <Ionicons
                        name="chevron-down"
                        size={16}
                        color={theme.colors.primary}
                      />
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Join Circle Dialog */}
      <Modal
        visible={joinDialog.circle !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setJoinDialog({ circle: null, key: "" })}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Join circle</Text>
            <Text style={styles.modalSubtitle}>
              Enter the 4-digit key to join "{joinDialog.circle?.name}".
            </Text>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Join key</Text>
              <TextInput
                autoFocus
                value={joinDialog.key}
                onChangeText={(text) => {
                  const nextValue = text.replace(/\D/g, "").slice(0, 4);
                  setJoinDialog((prev) => ({ ...prev, key: nextValue }));
                }}
                placeholder="••••"
                style={[styles.formInput, styles.keyInput]}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setJoinDialog({ circle: null, key: "" })}
                disabled={joiningCircleId === joinDialog.circle?.id}
                style={styles.modalCancelButton}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (joinDialog.circle) {
                    performJoinCircle(joinDialog.circle, joinDialog.key);
                  }
                }}
                disabled={
                  joiningCircleId === joinDialog.circle?.id ||
                  joinDialog.key.trim().length !== 4
                }
                style={[
                  styles.modalSubmitButton,
                  (joiningCircleId === joinDialog.circle?.id ||
                    joinDialog.key.trim().length !== 4) &&
                    styles.modalSubmitButtonDisabled,
                ]}
              >
                <Text style={styles.modalSubmitButtonText}>
                  {joiningCircleId === joinDialog.circle?.id
                    ? "Joining..."
                    : "Join circle"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Circle Dialog */}
      <Modal
        visible={deleteDialog !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteDialog(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete circle</Text>
            <Text style={styles.modalSubtitle}>
              Deleting "{deleteDialog?.name}" removes all members and messages.
              This action cannot be undone.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setDeleteDialog(null)}
                disabled={processingDelete}
                style={styles.modalCancelButton}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteCircle}
                disabled={processingDelete}
                style={[
                  styles.modalDeleteButton,
                  processingDelete && styles.modalSubmitButtonDisabled,
                ]}
              >
                <Text style={styles.modalSubmitButtonText}>
                  {processingDelete ? "Deleting..." : "Delete"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    centerContent: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 90, // Add space for footer/tab bar
      gap: 24,
    },
    header: {
      gap: 8,
    },
    headerTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "bold",
      color: theme.colors.textPrimary,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.colors.primary,
    },
    tabsContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    tab: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      marginRight: 8,
    },
    tabActive: {
      backgroundColor: theme.colors.primary,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    tabText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    tabTextActive: {
      color: theme.colors.onPrimary,
    },
    tabContent: {
      gap: 16,
    },
    statsGrid: {
      flexDirection: "row",
      gap: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      gap: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    statIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    statValue: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.colors.textPrimary,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
      overflow: "hidden",
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    cardSubtitle: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    favoriteCount: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    listItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceMuted,
    },
    listItemLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    listItemInfo: {
      flex: 1,
    },
    listItemName: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    listItemSubtitle: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    listItemActions: {
      flexDirection: "row",
      gap: 8,
    },
    chatButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 8,
    },
    chatButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    favoriteButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    favoriteButtonActive: {
      backgroundColor: "#fef3c7",
      borderColor: "#fcd34d",
    },
    followButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    followButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    unfollowButton: {
      borderColor: theme.colors.dangerSoft,
    },
    unfollowButtonText: {
      color: theme.colors.danger,
    },
    fullWidthSection: {
      gap: 16,
    },
    loadMoreButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginHorizontal: 16,
      marginVertical: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceMuted,
    },
    loadMoreText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    twoColumnGrid: {
      flexDirection: "row",
      gap: 12,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      position: "relative",
    },
    searchIcon: {
      position: "absolute",
      left: 28,
      zIndex: 1,
    },
    searchInput: {
      flex: 1,
      paddingLeft: 40,
      paddingRight: 120,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      fontSize: 14,
    },
    searchButton: {
      position: "absolute",
      right: 24,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
    },
    searchButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.onPrimary,
    },
    createButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
    },
    createButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.onPrimary,
    },
    formContainer: {
      padding: 16,
      gap: 12,
    },
    formField: {
      gap: 4,
    },
    formLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    formInput: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      fontSize: 14,
    },
    formTextArea: {
      minHeight: 80,
      textAlignVertical: "top",
    },
    formRow: {
      flexDirection: "row",
      gap: 12,
    },
    formFieldHalf: {
      flex: 1,
      gap: 4,
    },
    pickerContainer: {
      flexDirection: "row",
      gap: 8,
    },
    pickerButton: {
      flex: 1,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      alignItems: "center",
    },
    pickerButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    pickerButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    pickerButtonTextActive: {
      color: theme.colors.onPrimary,
    },
    themeScroll: {
      flexGrow: 0,
    },
    themeButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      marginRight: 8,
    },
    themeButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    themeButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    themeButtonTextActive: {
      color: theme.colors.onPrimary,
    },
    circleItem: {
      padding: 16,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.surfaceMuted,
    },
    circleHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    circleInfo: {
      flex: 1,
      gap: 4,
    },
    circleTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8,
    },
    circleName: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    roleBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
    },
    roleBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: theme.colors.primary,
      textTransform: "uppercase",
    },
    privateBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 2,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
    },
    privateBadgeText: {
      fontSize: 10,
      color: theme.colors.primary,
    },
    circleSubtitle: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    circleDescription: {
      fontSize: 12,
      color: theme.colors.primary,
    },
    circleActions: {
      flexDirection: "row",
      gap: 8,
    },
    openChatButton: {
      flex: 1,
      paddingVertical: 8,
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
      alignItems: "center",
    },
    openChatButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.onPrimary,
    },
    deleteButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: theme.colors.dangerSoft,
      borderRadius: 8,
    },
    deleteButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.danger,
    },
    joinButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
    },
    joinButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    membersPreview: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    membersAvatars: {
      flexDirection: "row",
      marginLeft: -8,
    },
    memberAvatarWrapper: {
      marginLeft: -8,
      borderWidth: 2,
      borderColor: theme.colors.surface,
      borderRadius: 15,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    membersMore: {
      fontSize: 10,
      color: theme.colors.textSecondary,
    },
    emptyState: {
      padding: 32,
      alignItems: "center",
    },
    emptyStateTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    emptyStateDescription: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
      textAlign: "center",
    },
    avatarContainer: {
      overflow: "hidden",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    avatarPlaceholder: {
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontWeight: "600",
      color: theme.colors.primary,
    },
    loginMessage: {
      fontSize: 14,
      color: theme.colors.primary,
      textAlign: "center",
      marginTop: 32,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(30, 58, 138, 0.4)",
      justifyContent: "center",
      alignItems: "center",
      padding: 16,
    },
    modalContent: {
      width: "100%",
      maxWidth: 400,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 24,
      gap: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    modalSubtitle: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    keyInput: {
      textAlign: "center",
      letterSpacing: 8,
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
      marginTop: 8,
    },
    modalCancelButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
    },
    modalCancelButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    modalSubmitButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
    },
    modalSubmitButtonDisabled: {
      backgroundColor: theme.colors.textMuted,
    },
    modalSubmitButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.onPrimary,
    },
    modalDeleteButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.colors.danger,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.dangerSoft,
    },
    pinButton: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
    },
  });
