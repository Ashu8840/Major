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

import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/context/AuthContext";
import { AppTheme, useAppTheme } from "@/context/ThemeContext";
import { api } from "@/services/api";
import { platformShadow } from "@/utils/shadow";

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  profileImage?: string;
  initials: string;
  rank: number;
  xp: number;
  level: number;
  breakdown: {
    diaryEntries: number;
    communityPosts: number;
    likesReceived: number;
    commentsReceived: number;
    streak: number;
  };
}

interface LeaderboardData {
  rankings: LeaderboardEntry[];
  currentUser: {
    rank: number;
    level: number;
    xp: number;
    xpToNextLevel: number;
    progressToNextLevel: number;
    percentile: number;
  } | null;
  totals: {
    totalUsers: number;
    averageXp: number;
  };
  label: string;
  generatedAt: string;
}

interface SeasonalData {
  contest: {
    title: string;
    description: string;
    timeLeft: string;
    prize: string;
  };
  leaderboards: {
    monthly: LeaderboardEntry[];
    weekly: LeaderboardEntry[];
    yearly: LeaderboardEntry[];
  };
}

const CATEGORIES = [
  { id: "global", name: "Global Rankings", icon: "trophy" },
  { id: "seasonal", name: "Seasonal Contest", icon: "sparkles" },
];

const PERIOD_OPTIONS = [
  { id: "all-time", label: "All Time" },
  { id: "this-month", label: "This Month" },
  { id: "this-week", label: "This Week" },
];

const SEASONAL_TABS = [
  { id: "monthly", label: "Monthly Sprint" },
  { id: "weekly", label: "Weekly Blitz" },
  { id: "yearly", label: "Yearly Legends" },
];

const XP_RULES = {
  diary: 50,
  communityPost: 50,
  like: 10,
  comment: 14,
  streak: 25,
};

const formatNumber = (value: number | undefined | null): string => {
  return typeof value === "number" ? value.toLocaleString() : "0";
};

export const LeaderboardScreen: React.FC = () => {
  const { profile } = useAuth();
  const { theme } = useAppTheme();
  const [selectedCategory, setSelectedCategory] = useState<
    "global" | "seasonal"
  >("global");
  const [selectedPeriod, setSelectedPeriod] = useState("all-time");
  const [seasonalTab, setSeasonalTab] = useState<
    "monthly" | "weekly" | "yearly"
  >("monthly");
  const [globalData, setGlobalData] = useState<LeaderboardData | null>(null);
  const [seasonalData, setSeasonalData] = useState<SeasonalData | null>(null);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [loadingSeasonal, setLoadingSeasonal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGlobalLeaderboard = useCallback(async () => {
    try {
      setLoadingGlobal(true);
      const response = await api.get("/leaderboard", {
        params: { period: selectedPeriod },
      });
      setGlobalData(response.data);
    } catch (error: any) {
      console.error("Error fetching global leaderboard:", error);
      Alert.alert("Error", "Failed to load leaderboard");
    } finally {
      setLoadingGlobal(false);
    }
  }, [selectedPeriod]);

  const fetchSeasonalLeaderboard = useCallback(async () => {
    try {
      setLoadingSeasonal(true);
      const response = await api.get("/leaderboard/seasonal");
      setSeasonalData(response.data);
    } catch (error: any) {
      console.error("Error fetching seasonal leaderboard:", error);
      Alert.alert("Error", "Failed to load seasonal contest");
    } finally {
      setLoadingSeasonal(false);
    }
  }, []);

  useEffect(() => {
    fetchGlobalLeaderboard();
  }, [fetchGlobalLeaderboard]);

  useEffect(() => {
    if (selectedCategory === "seasonal") {
      fetchSeasonalLeaderboard();
    }
  }, [selectedCategory, fetchSeasonalLeaderboard]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (selectedCategory === "global") {
      await fetchGlobalLeaderboard();
    } else {
      await fetchSeasonalLeaderboard();
    }
    setRefreshing(false);
  }, [selectedCategory, fetchGlobalLeaderboard, fetchSeasonalLeaderboard]);

  const renderRankIcon = (rank: number) => {
    if (rank === 1) {
      return <Ionicons name="trophy" size={24} color="#FFD700" />;
    }
    if (rank === 2) {
      return <Ionicons name="medal" size={24} color="#C0C0C0" />;
    }
    if (rank === 3) {
      return <Ionicons name="medal" size={24} color="#CD7F32" />;
    }
    return (
      <View style={styles.rankNumber}>
        <Text style={styles.rankNumberText}>#{rank}</Text>
      </View>
    );
  };

  const renderAvatar = (entry: LeaderboardEntry) => {
    if (entry.profileImage) {
      return (
        <Image source={{ uri: entry.profileImage }} style={styles.avatar} />
      );
    }
    return (
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarInitials}>{entry.initials}</Text>
      </View>
    );
  };

  const renderPodiumCard = (
    entry: LeaderboardEntry,
    isCenter: boolean = false
  ) => {
    return (
      <View
        key={entry.userId}
        style={[styles.podiumCard, isCenter && styles.podiumCardCenter]}
      >
        <View style={styles.podiumAvatarContainer}>{renderAvatar(entry)}</View>
        <Text style={styles.podiumName} numberOfLines={1}>
          {entry.displayName}
        </Text>
        <Text style={styles.podiumLevel}>Level {entry.level}</Text>
        <Text style={styles.podiumXP}>{formatNumber(entry.xp)} XP</Text>
        <View style={styles.podiumRankBadge}>
          {renderRankIcon(entry.rank)}
          <Text style={styles.podiumRankText}>#{entry.rank}</Text>
        </View>
      </View>
    );
  };

  const renderLeaderboardItem = ({ item }: { item: LeaderboardEntry }) => (
    <View style={styles.leaderboardItem}>
      <View style={styles.leaderboardItemLeft}>
        {renderRankIcon(item.rank)}
        <View style={styles.leaderboardAvatarContainer}>
          {renderAvatar(item)}
        </View>
        <View style={styles.leaderboardItemInfo}>
          <Text style={styles.leaderboardItemName}>{item.displayName}</Text>
          <View style={styles.leaderboardStats}>
            <View style={styles.statChip}>
              <Ionicons name="pencil" size={12} color="#6B739B" />
              <Text style={styles.statChipText}>
                {formatNumber(item.breakdown.diaryEntries)}
              </Text>
            </View>
            <View style={styles.statChip}>
              <Ionicons name="sparkles" size={12} color="#6B739B" />
              <Text style={styles.statChipText}>
                {formatNumber(item.breakdown.communityPosts)}
              </Text>
            </View>
            <View style={styles.statChip}>
              <Ionicons name="heart" size={12} color="#6B739B" />
              <Text style={styles.statChipText}>
                {formatNumber(item.breakdown.likesReceived)}
              </Text>
            </View>
            <View style={styles.statChip}>
              <Ionicons name="flame" size={12} color="#6B739B" />
              <Text style={styles.statChipText}>{item.breakdown.streak}</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.leaderboardItemRight}>
        <Text style={styles.leaderboardItemXP}>{formatNumber(item.xp)} XP</Text>
        <Text style={styles.leaderboardItemLevel}>Level {item.level}</Text>
      </View>
    </View>
  );

  const renderSeasonalItem = ({ item }: { item: LeaderboardEntry }) => (
    <View style={styles.seasonalItem}>
      <View style={styles.seasonalItemLeft}>
        {renderRankIcon(item.rank)}
        <View style={styles.leaderboardAvatarContainer}>
          {renderAvatar(item)}
        </View>
        <View>
          <Text style={styles.seasonalItemName}>{item.displayName}</Text>
          <Text style={styles.seasonalItemLevel}>Level {item.level}</Text>
        </View>
      </View>
      <Text style={styles.seasonalItemXP}>{formatNumber(item.xp)} XP</Text>
    </View>
  );

  const podium = globalData?.rankings?.slice(0, 3) || [];
  const rankings = globalData?.rankings?.slice(3) || [];
  const currentUser = globalData?.currentUser;
  const periodLabel = globalData?.label || "This period";
  const seasonalList = seasonalData?.leaderboards?.[seasonalTab] || [];

  const styles = React.useMemo(() => createStyles(theme), [theme]);

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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Ionicons name="trophy" size={40} color="#FFD700" />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Leaderboard</Text>
              <Text style={styles.headerSubtitle}>
                Track your creative journey and compete with the community
              </Text>
            </View>
          </View>
        </View>

        {/* User Stats Cards */}
        <View style={styles.statsGrid}>
          {/* Current Rank Card */}
          <View style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <View style={styles.userAvatarSmall}>
                <Text style={styles.userAvatarText}>
                  {profile?.displayName?.[0]?.toUpperCase() ||
                    profile?.username?.[0]?.toUpperCase() ||
                    "👤"}
                </Text>
              </View>
              <View>
                <Text style={styles.statCardLabel}>Current Rank</Text>
                <Text style={styles.statCardValue}>
                  {currentUser ? `#${currentUser.rank}` : "—"}
                </Text>
              </View>
              <View style={styles.statCardRight}>
                <Text style={styles.statCardLabel}>Level</Text>
                <Text style={styles.statCardValueLarge}>
                  {currentUser?.level || 1}
                </Text>
                <Text style={styles.statCardXP}>
                  {currentUser
                    ? `${formatNumber(currentUser.xp)} XP`
                    : "Start earning"}
                </Text>
              </View>
            </View>
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Progress to next level</Text>
                <Text style={styles.progressValue}>
                  {currentUser
                    ? `${formatNumber(currentUser.xpToNextLevel)} XP left`
                    : "—"}
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${currentUser?.progressToNextLevel || 0}%` },
                  ]}
                />
              </View>
              {currentUser && (
                <Text style={styles.percentileText}>
                  Top {currentUser.percentile || 100}% of all writers{" "}
                  {periodLabel.toLowerCase()}
                </Text>
              )}
            </View>
          </View>

          {/* Community Stats Card */}
          <View style={styles.statCard}>
            <View style={styles.statCardRow}>
              <View style={styles.statCardItem}>
                <Ionicons name="stats-chart" size={32} color="#3C4CC2" />
                <Text style={styles.statCardLabel}>Writers Ranked</Text>
                <Text style={styles.statCardValue}>
                  {formatNumber(globalData?.totals?.totalUsers)}
                </Text>
              </View>
              <View style={styles.statCardItem}>
                <Text style={styles.statCardLabel}>Average XP</Text>
                <Text style={styles.statCardValue}>
                  {formatNumber(globalData?.totals?.averageXp)}
                </Text>
              </View>
            </View>
            <View style={styles.xpRulesGrid}>
              <View style={styles.xpRuleChip}>
                <Text style={styles.xpRuleLabel}>Diary entries</Text>
                <Text style={styles.xpRuleValue}>+{XP_RULES.diary} XP</Text>
              </View>
              <View style={styles.xpRuleChip}>
                <Text style={styles.xpRuleLabel}>Community posts</Text>
                <Text style={styles.xpRuleValue}>
                  +{XP_RULES.communityPost} XP
                </Text>
              </View>
              <View style={styles.xpRuleChip}>
                <Text style={styles.xpRuleLabel}>Likes received</Text>
                <Text style={styles.xpRuleValue}>+{XP_RULES.like} XP</Text>
              </View>
              <View style={styles.xpRuleChip}>
                <Text style={styles.xpRuleLabel}>Comments</Text>
                <Text style={styles.xpRuleValue}>+{XP_RULES.comment} XP</Text>
              </View>
            </View>
          </View>

          {/* Streak Card */}
          <View style={styles.streakCard}>
            <Text style={styles.streakLabel}>Daily streak boost</Text>
            <Text style={styles.streakValue}>
              +{XP_RULES.streak} XP per day
            </Text>
            <Text style={styles.streakHint}>
              Keep your journaling streak alive to maintain bonus XP every day.
            </Text>
            <View style={styles.streakNote}>
              <Text style={styles.streakNoteText}>
                Streak XP is automatically added to your leaderboard score.
              </Text>
            </View>
          </View>
        </View>

        {/* Category Tabs */}
        <View style={styles.categoryTabs}>
          {CATEGORIES.map((category) => {
            const isActive = selectedCategory === category.id;
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryTab,
                  isActive && styles.categoryTabActive,
                ]}
                onPress={() => setSelectedCategory(category.id as any)}
              >
                <Ionicons
                  name={category.icon as any}
                  size={20}
                  color={isActive ? "#FFFFFF" : "#3C4CC2"}
                />
                <Text
                  style={[
                    styles.categoryTabText,
                    isActive && styles.categoryTabTextActive,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Global Leaderboard */}
        {selectedCategory === "global" && (
          <View style={styles.section}>
            {/* Period Selector */}
            <View style={styles.periodSelector}>
              {PERIOD_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.periodButton,
                    selectedPeriod === option.id && styles.periodButtonActive,
                  ]}
                  onPress={() => setSelectedPeriod(option.id)}
                >
                  <Text
                    style={[
                      styles.periodButtonText,
                      selectedPeriod === option.id &&
                        styles.periodButtonTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Hall of Fame - Podium */}
            <View style={styles.hallOfFame}>
              <Text style={styles.hallOfFameTitle}>Hall of Fame</Text>
              <Text style={styles.hallOfFameSubtitle}>
                Top creators for {periodLabel.toLowerCase()}
              </Text>
              {loadingGlobal ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3C4CC2" />
                  <Text style={styles.loadingText}>Loading leaderboard…</Text>
                </View>
              ) : podium.length > 0 ? (
                <View style={styles.podiumContainer}>
                  {/* Display in order: 2nd, 1st, 3rd */}
                  {podium[1] && renderPodiumCard(podium[1], false)}
                  {podium[0] && renderPodiumCard(podium[0], true)}
                  {podium[2] && renderPodiumCard(podium[2], false)}
                </View>
              ) : (
                <Text style={styles.emptyText}>
                  No activity yet. Start writing to appear on the board!
                </Text>
              )}
            </View>

            {/* Global Rankings List */}
            <View style={styles.rankingsContainer}>
              <View style={styles.rankingsHeader}>
                <Text style={styles.rankingsTitle}>Global Rankings</Text>
                <Text style={styles.rankingsUpdated}>
                  Updated{" "}
                  {globalData?.generatedAt
                    ? new Date(globalData.generatedAt).toLocaleString()
                    : "just now"}
                </Text>
              </View>
              {loadingGlobal ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3C4CC2" />
                </View>
              ) : rankings.length === 0 && podium.length === 0 ? (
                <Text style={styles.emptyText}>
                  No rankings yet. Create entries or posts to earn XP.
                </Text>
              ) : (
                <FlatList
                  data={rankings}
                  renderItem={renderLeaderboardItem}
                  keyExtractor={(item) => item.userId}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => (
                    <View style={styles.separator} />
                  )}
                />
              )}
            </View>
          </View>
        )}

        {/* Seasonal Leaderboard */}
        {selectedCategory === "seasonal" && (
          <View style={styles.section}>
            {/* Seasonal Banner */}
            <View style={styles.seasonalBanner}>
              <View style={styles.seasonalBannerContent}>
                <Text style={styles.seasonalBannerLabel}>
                  Seasonal Challenge
                </Text>
                <Text style={styles.seasonalBannerTitle}>
                  {seasonalData?.contest?.title || "Seasonal Contest"}
                </Text>
                <Text style={styles.seasonalBannerDescription}>
                  {seasonalData?.contest?.description ||
                    "Earn bonus XP by keeping your creativity flowing."}
                </Text>
              </View>
              <View style={styles.seasonalBannerStats}>
                <View style={styles.seasonalStatBox}>
                  <Ionicons name="time-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.seasonalStatLabel}>Time left</Text>
                  <Text style={styles.seasonalStatValue}>
                    {seasonalData?.contest?.timeLeft || "—"}
                  </Text>
                </View>
                <View style={styles.seasonalStatBox}>
                  <Ionicons name="rocket" size={20} color="#FFFFFF" />
                  <Text style={styles.seasonalStatLabel}>Prize</Text>
                  <Text style={styles.seasonalStatValue}>
                    {seasonalData?.contest?.prize || "Exclusive rewards"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Seasonal Tabs */}
            <View style={styles.seasonalTabs}>
              {SEASONAL_TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.seasonalTab,
                    seasonalTab === tab.id && styles.seasonalTabActive,
                  ]}
                  onPress={() => setSeasonalTab(tab.id as any)}
                >
                  <Text
                    style={[
                      styles.seasonalTabText,
                      seasonalTab === tab.id && styles.seasonalTabTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Seasonal Rankings */}
            <View style={styles.seasonalRankings}>
              {loadingSeasonal ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3C4CC2" />
                </View>
              ) : seasonalList.length === 0 ? (
                <Text style={styles.emptyText}>
                  No seasonal rankings available yet.
                </Text>
              ) : (
                <FlatList
                  data={seasonalList}
                  renderItem={renderSeasonalItem}
                  keyExtractor={(item) => item.userId}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => (
                    <View style={styles.separator} />
                  )}
                />
              )}
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
    scrollView: {
      flex: 1,
    },
    content: {
      paddingBottom: 90,
      gap: 20,
    },
    header: {
      paddingHorizontal: 24,
      gap: 16,
    },
    headerTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    headerTextContainer: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    statsGrid: {
      paddingHorizontal: 24,
      gap: 16,
    },
    statCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 20,
      gap: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...platformShadow({
        offsetY: 4,
        opacity: 0.08,
        radius: 12,
        elevation: 4,
      }),
    },
    statCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    userAvatarSmall: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.surfaceMuted,
      justifyContent: "center",
      alignItems: "center",
    },
    userAvatarText: {
      fontSize: 20,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    statCardLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    statCardValue: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginTop: 2,
    },
    statCardRight: {
      marginLeft: "auto",
      alignItems: "flex-end",
    },
    statCardValueLarge: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.colors.primary,
    },
    statCardXP: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    progressContainer: {
      gap: 8,
    },
    progressHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    progressLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    progressValue: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    progressBar: {
      height: 8,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 4,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: theme.colors.primary,
      borderRadius: 4,
    },
    percentileText: {
      fontSize: 11,
      color: theme.colors.textSecondary,
    },
    statCardRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    statCardItem: {
      gap: 4,
    },
    xpRulesGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    xpRuleChip: {
      flex: 1,
      minWidth: "45%",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
      padding: 12,
    },
    xpRuleLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    xpRuleValue: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    streakCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 20,
      gap: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...platformShadow({
        offsetY: 4,
        opacity: 0.08,
        radius: 12,
        elevation: 4,
      }),
    },
    streakLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    streakValue: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.colors.primary,
    },
    streakHint: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    streakNote: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
      padding: 12,
    },
    streakNoteText: {
      fontSize: 11,
      color: theme.colors.textSecondary,
    },
    categoryTabs: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 24,
    },
    categoryTab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 16,
    },
    categoryTabActive: {
      backgroundColor: theme.colors.primary,
      ...platformShadow({
        offsetY: 2,
        opacity: 0.2,
        radius: 8,
        elevation: 4,
      }),
    },
    categoryTabText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    categoryTabTextActive: {
      color: theme.colors.onPrimary,
    },
    section: {
      paddingHorizontal: 24,
      gap: 20,
    },
    periodSelector: {
      flexDirection: "row",
      gap: 8,
    },
    periodButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    periodButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    periodButtonText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.primary,
      textAlign: "center",
    },
    periodButtonTextActive: {
      color: theme.colors.onPrimary,
    },
    hallOfFame: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 20,
      gap: 16,
      ...platformShadow({
        offsetY: 4,
        opacity: 0.1,
        radius: 12,
        elevation: 6,
      }),
    },
    hallOfFameTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      textAlign: "center",
    },
    hallOfFameSubtitle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    podiumContainer: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 12,
      marginTop: 8,
    },
    podiumCard: {
      width: 110,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 16,
      padding: 12,
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    podiumCardCenter: {
      backgroundColor: theme.colors.surface,
      borderWidth: 2,
      borderColor: "#FFD700",
      ...platformShadow({
        offsetY: 4,
        opacity: 0.15,
        radius: 12,
        elevation: 8,
      }),
    },
    podiumAvatarContainer: {
      marginTop: -24,
    },
    podiumName: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      textAlign: "center",
    },
    podiumLevel: {
      fontSize: 11,
      color: theme.colors.textSecondary,
    },
    podiumXP: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.primary,
    },
    podiumRankBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    podiumRankText: {
      fontSize: 11,
      color: theme.colors.textSecondary,
    },
    rankingsContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      overflow: "hidden",
      ...platformShadow({
        offsetY: 4,
        opacity: 0.1,
        radius: 12,
        elevation: 6,
      }),
    },
    rankingsHeader: {
      backgroundColor: theme.colors.primary,
      padding: 16,
    },
    rankingsTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.onPrimary,
    },
    rankingsUpdated: {
      fontSize: 11,
      color: "rgba(255, 255, 255, 0.8)",
      marginTop: 4,
    },
    leaderboardItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
    },
    leaderboardItemLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    leaderboardAvatarContainer: {
      marginLeft: 4,
    },
    leaderboardItemInfo: {
      flex: 1,
      gap: 8,
    },
    leaderboardItemName: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    leaderboardStats: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    statChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    statChipText: {
      fontSize: 11,
      color: theme.colors.textSecondary,
    },
    leaderboardItemRight: {
      alignItems: "flex-end",
    },
    leaderboardItemXP: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    leaderboardItemLevel: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 2,
      borderColor: theme.colors.surfaceMuted,
    },
    avatarPlaceholder: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.surfaceMuted,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarInitials: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    rankNumber: {
      width: 24,
      height: 24,
      justifyContent: "center",
      alignItems: "center",
    },
    rankNumberText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    separator: {
      height: 1,
      backgroundColor: theme.colors.surfaceMuted,
    },
    loadingContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
      paddingVertical: 32,
    },
    seasonalBanner: {
      backgroundColor: theme.colors.primary,
      borderRadius: 20,
      padding: 20,
      gap: 16,
      ...platformShadow({
        offsetY: 4,
        opacity: 0.2,
        radius: 12,
        elevation: 6,
      }),
    },
    seasonalBannerContent: {
      gap: 8,
    },
    seasonalBannerLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: "rgba(255, 255, 255, 0.7)",
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    seasonalBannerTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: theme.colors.onPrimary,
    },
    seasonalBannerDescription: {
      fontSize: 13,
      color: "rgba(255, 255, 255, 0.8)",
      lineHeight: 20,
    },
    seasonalBannerStats: {
      flexDirection: "row",
      gap: 12,
    },
    seasonalStatBox: {
      flex: 1,
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      borderRadius: 12,
      padding: 12,
      gap: 4,
      alignItems: "center",
    },
    seasonalStatLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: "rgba(255, 255, 255, 0.8)",
      textTransform: "uppercase",
    },
    seasonalStatValue: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.onPrimary,
    },
    seasonalTabs: {
      flexDirection: "row",
      gap: 8,
    },
    seasonalTab: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    seasonalTabActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
      ...platformShadow({
        offsetY: 2,
        opacity: 0.2,
        radius: 8,
        elevation: 4,
      }),
    },
    seasonalTabText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.primary,
      textAlign: "center",
    },
    seasonalTabTextActive: {
      color: theme.colors.onPrimary,
    },
    seasonalRankings: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      overflow: "hidden",
      ...platformShadow({
        offsetY: 4,
        opacity: 0.1,
        radius: 12,
        elevation: 6,
      }),
    },
    seasonalItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
    },
    seasonalItemLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    seasonalItemName: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    seasonalItemLevel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    seasonalItemXP: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.primary,
    },
  });
