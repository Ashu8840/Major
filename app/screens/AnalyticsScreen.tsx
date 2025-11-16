import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

interface AnalyticsData {
  streak: {
    current: number;
    longest: number;
    lastEntryDate: string;
  };
  totals: {
    entries: number;
    publicEntries: number;
    privateEntries: number;
    longestEntry: {
      words: number;
      title: string;
      createdAt: string;
    };
  };
  periodStats: {
    entryCount: number;
    avgWordsPerEntry: number;
    topMood: string;
    mostActiveDay: string;
  };
  recentActivity: Array<{
    date: string;
    count: number;
  }>;
  moodDistribution: {
    positive: { percentage: number };
    neutral: { percentage: number };
    negative: { percentage: number };
  };
  writingHabits: Array<{
    day: string;
    count: number;
  }>;
  community: {
    followers: number;
    likesReceived: number;
    commentsReceived: number;
    impressions: number;
    engagementRate: number;
    shares: number;
    posts: number;
  };
  commentSentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  badges: Array<{
    id: string;
    name: string;
    description: string;
    unlocked: boolean;
    earnedAt?: string;
  }>;
  aiInsights: string[];
}

const PERIOD_OPTIONS = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
];

const formatNumber = (value: number | undefined | null): string => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "0";
  }
  return Number(value).toLocaleString();
};

const formatDate = (value: string | undefined): string => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

const getHeatmapColor = (count: number): string => {
  if (count >= 4) return "#1E40AF"; // bg-blue-700
  if (count === 3) return "#2563EB"; // bg-blue-600
  if (count === 2) return "#3B82F6"; // bg-blue-500
  if (count === 1) return "#60A5FA"; // bg-blue-400
  return "#DBEAFE"; // bg-blue-100
};

export const AnalyticsScreen: React.FC = () => {
  const { profile } = useAuth();
  const { theme } = useAppTheme();
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/analytics/overview", {
        params: { period: selectedPeriod },
      });
      setAnalytics(response.data);
    } catch (err: any) {
      console.error("Error fetching analytics:", err);
      setError(err?.response?.data?.message || "Unable to load analytics");
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  }, [fetchAnalytics]);

  useEffect(() => {
    if (profile) {
      fetchAnalytics();
    }
  }, [selectedPeriod, profile, fetchAnalytics]);

  const periodLabel =
    selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1);
  const writingHabits = analytics?.writingHabits || [];
  const maxHabitCount = writingHabits.length
    ? Math.max(...writingHabits.map((item) => item.count))
    : 0;
  const recentActivity = analytics?.recentActivity || [];
  const moodDistribution = analytics?.moodDistribution;
  const community = analytics?.community;
  const commentSentiment = analytics?.commentSentiment;
  const badges = analytics?.badges || [];
  const longestEntry = analytics?.totals?.longestEntry;

  const styles = React.useMemo(() => createStyles(theme), [theme]);

  if (!profile) {
    return (
      <View style={styles.container}>
        <View style={styles.navbarWrapper}>
          <Navbar />
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Please log in to view analytics.</Text>
        </View>
      </View>
    );
  }

  if (loading && !analytics) {
    return (
      <View style={styles.container}>
        <View style={styles.navbarWrapper}>
          <Navbar />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading your analytics…</Text>
        </View>
      </View>
    );
  }

  if (error && !analytics) {
    return (
      <View style={styles.container}>
        <View style={styles.navbarWrapper}>
          <Navbar />
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchAnalytics}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
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
        contentContainerStyle={[styles.content, { paddingTop: 130 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analytics Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Track your writing journey and community engagement
          </Text>

          {/* Period Selector */}
          <View style={styles.periodSelector}>
            {PERIOD_OPTIONS.map((period) => (
              <TouchableOpacity
                key={period.id}
                style={[
                  styles.periodButton,
                  selectedPeriod === period.id && styles.periodButtonActive,
                ]}
                onPress={() => setSelectedPeriod(period.id)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === period.id &&
                      styles.periodButtonTextActive,
                  ]}
                >
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {error && analytics && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
              <TouchableOpacity onPress={fetchAnalytics}>
                <Text style={styles.errorBannerRetry}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Daily Streak Tracker */}
        <View style={styles.section}>
          <View style={styles.streakCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Daily Writing Streak</Text>
              <Ionicons name="flame" size={32} color={theme.colors.warning} />
            </View>

            <View style={styles.streakContent}>
              <Text style={styles.streakNumber}>
                🔥 {analytics?.streak?.current || 0}
              </Text>
              <Text style={styles.streakLabel}>Days in a row</Text>
              <Text style={styles.streakDetails}>
                Longest streak: {analytics?.streak?.longest || 0} days · Last
                entry: {formatDate(analytics?.streak?.lastEntryDate)}
              </Text>
              <Text style={styles.streakHint}>
                Stay consistent to keep the streak growing!
              </Text>
            </View>

            {/* Mini Heatmap */}
            <View style={styles.heatmapContainer}>
              <Text style={styles.heatmapTitle}>Recent Activity</Text>
              <View style={styles.heatmapGrid}>
                {recentActivity.map((activity, index) => (
                  <View
                    key={index}
                    style={[
                      styles.heatmapCell,
                      { backgroundColor: getHeatmapColor(activity.count) },
                    ]}
                  />
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.section}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statCardContent}>
                <View>
                  <Text style={styles.statLabel}>Total Entries</Text>
                  <Text style={styles.statValue}>
                    {formatNumber(analytics?.totals?.entries || 0)}
                  </Text>
                </View>
                <Ionicons name="time" size={32} color={theme.colors.primary} />
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statCardContent}>
                <View style={styles.flex1}>
                  <Text style={styles.statLabel}>
                    Entries this {periodLabel}
                  </Text>
                  <Text style={styles.statValue}>
                    {formatNumber(analytics?.periodStats?.entryCount || 0)}
                  </Text>
                  <Text style={styles.statDetail}>
                    Avg words:{" "}
                    {formatNumber(
                      analytics?.periodStats?.avgWordsPerEntry || 0
                    )}
                  </Text>
                </View>
                <Ionicons
                  name="trending-up"
                  size={32}
                  color={theme.colors.primary}
                />
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statCardContent}>
                <View style={styles.flex1}>
                  <Text style={styles.statLabel}>Visibility Mix</Text>
                  <View style={styles.visibilityRow}>
                    <Ionicons
                      name="earth"
                      size={16}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.visibilityText}>
                      {formatNumber(analytics?.totals?.publicEntries || 0)}{" "}
                      public
                    </Text>
                  </View>
                  <View style={styles.visibilityRow}>
                    <Ionicons
                      name="lock-closed"
                      size={16}
                      color={theme.colors.textSecondary}
                    />
                    <Text style={styles.visibilityTextSecondary}>
                      {formatNumber(analytics?.totals?.privateEntries || 0)}{" "}
                      private
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name="people"
                  size={32}
                  color={theme.colors.primary}
                />
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statCardContent}>
                <View style={styles.flex1}>
                  <Text style={styles.statLabel}>Longest Entry</Text>
                  <Text style={styles.statValue}>
                    {formatNumber(longestEntry?.words || 0)} words
                  </Text>
                  <Text style={styles.statDetail} numberOfLines={1}>
                    {longestEntry?.title || "No entry yet"} ·{" "}
                    {formatDate(longestEntry?.createdAt)}
                  </Text>
                </View>
                <Ionicons name="star" size={32} color={theme.colors.primary} />
              </View>
            </View>
          </View>
        </View>

        {/* Mood Insights */}
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Mood Insights</Text>

            {/* Mood Circle */}
            <View style={styles.moodCircleContainer}>
              <View style={styles.moodCircle}>
                <View style={styles.moodCircleInner}>
                  <Text style={styles.moodEmoji}>😊</Text>
                  <Text style={styles.moodLabel}>Most Common</Text>
                </View>
              </View>
            </View>

            {/* Mood Distribution */}
            <View style={styles.moodDistribution}>
              <View style={styles.moodRow}>
                <View style={styles.moodRowLeft}>
                  <View
                    style={[styles.moodDot, { backgroundColor: "#22C55E" }]}
                  />
                  <Text style={styles.moodText}>😊 Positive</Text>
                </View>
                <Text style={styles.moodPercentage}>
                  {moodDistribution?.positive?.percentage || 0}%
                </Text>
              </View>

              <View style={styles.moodRow}>
                <View style={styles.moodRowLeft}>
                  <View
                    style={[styles.moodDot, { backgroundColor: "#FACC15" }]}
                  />
                  <Text style={styles.moodText}>😐 Neutral</Text>
                </View>
                <Text style={styles.moodPercentage}>
                  {moodDistribution?.neutral?.percentage || 0}%
                </Text>
              </View>

              <View style={styles.moodRow}>
                <View style={styles.moodRowLeft}>
                  <View
                    style={[styles.moodDot, { backgroundColor: "#F87171" }]}
                  />
                  <Text style={styles.moodText}>😢 Negative</Text>
                </View>
                <Text style={styles.moodPercentage}>
                  {moodDistribution?.negative?.percentage || 0}%
                </Text>
              </View>
            </View>

            <View style={styles.insightBox}>
              <Text style={styles.insightText}>
                <Text style={styles.insightBold}>Insight: </Text>
                {analytics?.periodStats?.topMood
                  ? `Most common mood this ${selectedPeriod}: ${analytics.periodStats.topMood}`
                  : "Log your moods to unlock insights."}
              </Text>
            </View>
          </View>
        </View>

        {/* Writing Habits */}
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Writing Habits</Text>

            {/* Bar Chart */}
            <View style={styles.barChartContainer}>
              {writingHabits.map((item) => {
                const barHeight = maxHabitCount
                  ? Math.max(
                      (item.count / maxHabitCount) * 100,
                      item.count ? 10 : 0
                    )
                  : 0;
                return (
                  <View key={item.day} style={styles.barColumn}>
                    <View style={styles.barWrapper}>
                      <View style={[styles.bar, { height: `${barHeight}%` }]} />
                    </View>
                    <Text style={styles.barLabel}>{item.day}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.habitsStats}>
              <View style={styles.habitStatRow}>
                <Text style={styles.habitStatLabel}>Most active day:</Text>
                <Text style={styles.habitStatValue}>
                  {analytics?.periodStats?.mostActiveDay || "—"}
                </Text>
              </View>
              <View style={styles.habitStatRow}>
                <Text style={styles.habitStatLabel}>Weekly average:</Text>
                <Text style={styles.habitStatValue}>
                  {formatNumber(
                    Math.round(
                      (analytics?.periodStats?.entryCount || 0) /
                        (selectedPeriod === "week"
                          ? 1
                          : selectedPeriod === "month"
                          ? 4
                          : 52)
                    )
                  )}{" "}
                  entries
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Community Engagement */}
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Community Engagement</Text>

            <View style={styles.communityGrid}>
              <View style={styles.communityCard}>
                <Ionicons
                  name="people"
                  size={32}
                  color={theme.colors.primary}
                />
                <Text style={styles.communityValue}>
                  {formatNumber(community?.followers || 0)}
                </Text>
                <Text style={styles.communityLabel}>Followers</Text>
              </View>

              <View style={styles.communityCard}>
                <Ionicons name="heart" size={32} color={theme.colors.danger} />
                <Text style={styles.communityValue}>
                  {formatNumber(community?.likesReceived || 0)}
                </Text>
                <Text style={styles.communityLabel}>Likes</Text>
              </View>

              <View style={styles.communityCard}>
                <Ionicons
                  name="chatbubble"
                  size={32}
                  color={theme.colors.primary}
                />
                <Text style={styles.communityValue}>
                  {formatNumber(community?.commentsReceived || 0)}
                </Text>
                <Text style={styles.communityLabel}>Comments</Text>
              </View>

              <View style={styles.communityCard}>
                <Ionicons
                  name="trending-up"
                  size={32}
                  color={theme.colors.success}
                />
                <Text style={styles.communityValue}>
                  {formatNumber(community?.impressions || 0)}
                </Text>
                <Text style={styles.communityLabel}>Impressions</Text>
              </View>
            </View>

            <View style={styles.engagementBox}>
              <Text style={styles.engagementText}>
                <Text style={styles.insightBold}>This {periodLabel}: </Text>
                Engagement rate {community?.engagementRate ?? 0}% ·{" "}
                {formatNumber(community?.shares || 0)} shares ·{" "}
                {formatNumber(community?.posts || 0)} posts
              </Text>
            </View>
          </View>
        </View>

        {/* Comment Sentiment */}
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Comment Sentiment</Text>

            <View style={styles.sentimentContainer}>
              <View style={styles.sentimentRow}>
                <View style={styles.sentimentHeader}>
                  <View style={styles.sentimentIconRow}>
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={theme.colors.success}
                    />
                    <Text style={styles.sentimentLabel}>Positive</Text>
                  </View>
                  <Text style={styles.sentimentValue}>
                    {commentSentiment?.positive ?? 0}%
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${commentSentiment?.positive || 0}%`,
                        backgroundColor: theme.colors.success,
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.sentimentRow}>
                <View style={styles.sentimentHeader}>
                  <View style={styles.sentimentIconRow}>
                    <Ionicons
                      name="remove"
                      size={20}
                      color={theme.colors.textMuted}
                    />
                    <Text style={styles.sentimentLabel}>Neutral</Text>
                  </View>
                  <Text style={styles.sentimentValue}>
                    {commentSentiment?.neutral ?? 0}%
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${commentSentiment?.neutral || 0}%`,
                        backgroundColor: theme.colors.textMuted,
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.sentimentRow}>
                <View style={styles.sentimentHeader}>
                  <View style={styles.sentimentIconRow}>
                    <Ionicons
                      name="close"
                      size={20}
                      color={theme.colors.danger}
                    />
                    <Text style={styles.sentimentLabel}>Negative</Text>
                  </View>
                  <Text style={styles.sentimentValue}>
                    {commentSentiment?.negative ?? 0}%
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${commentSentiment?.negative || 0}%`,
                        backgroundColor: theme.colors.danger,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Achievements & Badges */}
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Achievements & Badges</Text>

            <View style={styles.badgesGrid}>
              {badges.map((badge) => (
                <View
                  key={badge.id || badge.name}
                  style={[
                    styles.badgeCard,
                    badge.unlocked ? styles.badgeUnlocked : styles.badgeLocked,
                  ]}
                >
                  <Ionicons
                    name="trophy"
                    size={32}
                    color={badge.unlocked ? "#FACC15" : "#9CA3AF"}
                  />
                  <Text
                    style={[
                      styles.badgeName,
                      !badge.unlocked && styles.badgeNameLocked,
                    ]}
                    numberOfLines={1}
                  >
                    {badge.name}
                  </Text>
                  <Text style={styles.badgeStatus}>
                    {badge.unlocked
                      ? `Unlocked ${formatDate(badge.earnedAt)}`
                      : "Progress ongoing"}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* AI Insights */}
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>AI Insights</Text>

            <View style={styles.insightsContainer}>
              {(analytics?.aiInsights || []).map((insight, index) => (
                <View key={index} style={styles.insightItem}>
                  <View style={styles.insightBullet} />
                  <Text style={styles.insightItemText}>{insight}</Text>
                </View>
              ))}
              {(!analytics?.aiInsights ||
                analytics.aiInsights.length === 0) && (
                <View style={styles.insightBox}>
                  <Text style={styles.insightText}>
                    Keep journaling to unlock personalized insights.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
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
    },
    centerContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.primary,
      marginTop: 16,
      fontWeight: "600",
    },
    errorText: {
      fontSize: 16,
      color: theme.colors.danger,
      fontWeight: "600",
      marginBottom: 16,
      textAlign: "center",
    },
    retryButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      ...platformShadow({
        offsetY: 2,
        opacity: 0.1,
        radius: 8,
        elevation: 4,
      }),
    },
    retryButtonText: {
      color: theme.colors.onPrimary,
      fontSize: 16,
      fontWeight: "600",
    },
    header: {
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 24,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 8,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.colors.primary,
    },
    periodSelector: {
      flexDirection: "row",
      gap: 8,
      marginTop: 16,
    },
    periodButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
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
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    periodButtonTextActive: {
      color: theme.colors.onPrimary,
    },
    errorBanner: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 16,
      padding: 16,
      backgroundColor: theme.colors.dangerSoft,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.danger,
    },
    errorBannerText: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.danger,
    },
    errorBannerRetry: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.danger,
    },
    section: {
      paddingHorizontal: 24,
      marginBottom: 20,
    },
    streakCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...platformShadow({
        offsetY: 4,
        opacity: 0.1,
        radius: 12,
        elevation: 6,
      }),
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    streakContent: {
      alignItems: "center",
      marginBottom: 20,
    },
    streakNumber: {
      fontSize: 56,
      fontWeight: "700",
      color: theme.colors.primary,
      marginBottom: 8,
    },
    streakLabel: {
      fontSize: 18,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    streakDetails: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginBottom: 8,
      textAlign: "center",
    },
    streakHint: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    heatmapContainer: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 16,
      padding: 16,
    },
    heatmapTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textSecondary,
      marginBottom: 12,
    },
    heatmapGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 4,
    },
    heatmapCell: {
      width: 24,
      height: 24,
      borderRadius: 4,
    },
    statsGrid: {
      gap: 16,
    },
    statCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...platformShadow({
        offsetY: 2,
        opacity: 0.08,
        radius: 8,
        elevation: 4,
      }),
    },
    statCardContent: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    flex1: {
      flex: 1,
    },
    statLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.primary,
      marginBottom: 8,
    },
    statValue: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    statDetail: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    visibilityRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 4,
    },
    visibilityText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    visibilityTextSecondary: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...platformShadow({
        offsetY: 4,
        opacity: 0.1,
        radius: 12,
        elevation: 6,
      }),
    },
    moodCircleContainer: {
      alignItems: "center",
      marginVertical: 24,
    },
    moodCircle: {
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: theme.colors.surfaceMuted,
      justifyContent: "center",
      alignItems: "center",
      ...platformShadow({
        offsetY: 4,
        opacity: 0.1,
        radius: 12,
        elevation: 4,
      }),
    },
    moodCircleInner: {
      alignItems: "center",
    },
    moodEmoji: {
      fontSize: 48,
      marginBottom: 8,
    },
    moodLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    moodDistribution: {
      gap: 16,
      marginBottom: 16,
    },
    moodRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    moodRowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    moodDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
    },
    moodText: {
      fontSize: 15,
      color: theme.colors.textSecondary,
    },
    moodPercentage: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    insightBox: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
      padding: 16,
    },
    insightText: {
      fontSize: 13,
      color: theme.colors.primary,
    },
    insightBold: {
      fontWeight: "700",
    },
    barChartContainer: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      height: 120,
      marginVertical: 20,
      gap: 8,
    },
    barColumn: {
      flex: 1,
      alignItems: "center",
    },
    barWrapper: {
      width: "100%",
      height: 100,
      justifyContent: "flex-end",
    },
    bar: {
      backgroundColor: theme.colors.primary,
      borderTopLeftRadius: 4,
      borderTopRightRadius: 4,
      width: "100%",
    },
    barLabel: {
      fontSize: 11,
      color: theme.colors.primary,
      marginTop: 8,
    },
    habitsStats: {
      gap: 12,
    },
    habitStatRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    habitStatLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    habitStatValue: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    communityGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginVertical: 20,
    },
    communityCard: {
      flex: 1,
      minWidth: "45%",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 16,
      padding: 16,
      alignItems: "center",
    },
    communityValue: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginTop: 8,
    },
    communityLabel: {
      fontSize: 13,
      color: theme.colors.primary,
      marginTop: 4,
    },
    engagementBox: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
      padding: 16,
    },
    engagementText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    sentimentContainer: {
      gap: 20,
      marginTop: 16,
    },
    sentimentRow: {
      gap: 8,
    },
    sentimentHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    sentimentIconRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    sentimentLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    sentimentValue: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    progressBar: {
      height: 8,
      backgroundColor: theme.colors.border,
      borderRadius: 4,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 4,
    },
    badgesGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginTop: 16,
    },
    badgeCard: {
      flex: 1,
      minWidth: "28%",
      padding: 16,
      borderRadius: 16,
      alignItems: "center",
      borderWidth: 2,
    },
    badgeUnlocked: {
      backgroundColor: theme.colors.warningSoft,
      borderColor: theme.colors.warning,
    },
    badgeLocked: {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
    },
    badgeName: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.warning,
      marginTop: 8,
      textAlign: "center",
    },
    badgeNameLocked: {
      color: theme.colors.textMuted,
    },
    badgeStatus: {
      fontSize: 10,
      color: theme.colors.primary,
      marginTop: 4,
      textAlign: "center",
    },
    insightsContainer: {
      gap: 12,
      marginTop: 16,
    },
    insightItem: {
      flexDirection: "row",
      gap: 12,
      backgroundColor: theme.colors.surfaceMuted,
      padding: 16,
      borderRadius: 12,
    },
    insightBullet: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.primary,
      marginTop: 6,
    },
    insightItemText: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
  });
