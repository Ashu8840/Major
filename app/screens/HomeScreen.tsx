import React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";

import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/context/AuthContext";
import { AppTheme, useAppTheme } from "@/context/ThemeContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { platformShadow } from "@/utils/shadow";

const formatNumber = (value: number) => {
  if (!Number.isFinite(value)) return "0";
  if (value >= 1_000_000) {
    const formatted = (value / 1_000_000).toFixed(1);
    return `${formatted.endsWith(".0") ? formatted.slice(0, -2) : formatted}M`;
  }
  if (value >= 1_000) {
    const formatted = (value / 1_000).toFixed(1);
    return `${formatted.endsWith(".0") ? formatted.slice(0, -2) : formatted}K`;
  }
  return `${Math.round(value)}`;
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
      paddingHorizontal: 24,
      paddingBottom: 90,
      paddingTop: 12,
      gap: 24,
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
    heroCard: {
      backgroundColor: theme.colors.heroCard,
      borderRadius: 28,
      padding: 26,
      borderWidth: 1,
      borderColor: theme.colors.heroCardSecondary,
      overflow: "hidden",
      gap: 14,
      ...platformShadow({
        color: theme.colors.shadowColor,
        offsetY: 18,
        opacity: theme.isDark ? 0.28 : 0.16,
        radius: 32,
        elevation: 8,
        webFallback: `0px 18px 48px ${theme.colors.shadowColor}`,
      }),
    },
    heroAccent: {
      position: "absolute",
      top: -40,
      right: -40,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: theme.colors.heroCardSecondary,
      opacity: 0.4,
    },
    heroGreeting: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.heroLabel,
      textTransform: "uppercase",
      letterSpacing: 1.2,
    },
    heroTitle: {
      fontSize: 26,
      fontWeight: "800",
      color: theme.colors.textInverted,
      lineHeight: 34,
    },
    heroPromptLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.heroLabel,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginTop: 8,
    },
    heroPrompt: {
      fontSize: 15,
      fontWeight: "500",
      color: theme.colors.heroMuted,
      lineHeight: 22,
    },
    heroActions: {
      flexDirection: "row",
      gap: 12,
      marginTop: 8,
    },
    heroCta: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 18,
      gap: 8,
      ...platformShadow({
        color: theme.colors.shadowColor,
        offsetY: 6,
        opacity: theme.isDark ? 0.2 : 0.1,
        radius: 12,
        elevation: 4,
        webFallback: `0px 6px 16px ${theme.colors.shadowColor}`,
      }),
    },
    heroCtaText: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.primary,
    },
    heroSecondary: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 18,
      gap: 8,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.2)",
    },
    heroSecondaryText: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.heroLabel,
    },
    quickActionsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    quickAction: {
      flex: 1,
      minWidth: "47%",
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 18,
      gap: 10,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      ...platformShadow({
        color: theme.colors.shadowColor,
        offsetY: 6,
        opacity: theme.isDark ? 0.18 : 0.08,
        radius: 14,
        elevation: 4,
        webFallback: `0px 6px 18px ${theme.colors.shadowColor}`,
      }),
    },
    quickIcon: {
      width: 44,
      height: 44,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    quickLabel: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    quickHint: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.colors.textMuted,
      lineHeight: 16,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    sectionAction: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    statCard: {
      flex: 1,
      minWidth: "47%",
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 18,
      gap: 8,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      ...platformShadow({
        color: theme.colors.shadowColor,
        offsetY: 6,
        opacity: theme.isDark ? 0.18 : 0.08,
        radius: 14,
        elevation: 4,
        webFallback: `0px 6px 18px ${theme.colors.shadowColor}`,
      }),
    },
    statLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    statValue: {
      fontSize: 24,
      fontWeight: "800",
      color: theme.colors.textPrimary,
    },
    statMeta: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.colors.textSoft,
    },
    insightCard: {
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      padding: 18,
      gap: 10,
      marginBottom: 12,
      ...platformShadow({
        color: theme.colors.shadowColor,
        offsetY: 6,
        opacity: theme.isDark ? 0.18 : 0.08,
        radius: 14,
        elevation: 4,
        webFallback: `0px 6px 18px ${theme.colors.shadowColor}`,
      }),
    },
    insightIndex: {
      width: 28,
      height: 28,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primarySoft,
    },
    insightIndexText: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.primary,
    },
    insightText: {
      fontSize: 15,
      lineHeight: 21,
      color: theme.colors.textSecondary,
    },
    entryCard: {
      borderRadius: 22,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      padding: 20,
      gap: 10,
      marginBottom: 12,
      ...platformShadow({
        color: theme.colors.shadowColor,
        offsetY: 9,
        opacity: theme.isDark ? 0.14 : 0.06,
        radius: 16,
        elevation: 5,
        webFallback: `0px 9px 22px ${theme.colors.shadowColor}`,
      }),
    },
    entryTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    entryMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    entryMetaText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textMuted,
    },
    entryPreview: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textSecondary,
    },
    communityCard: {
      borderRadius: 24,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      padding: 22,
      gap: 16,
      ...platformShadow({
        color: theme.colors.shadowColor,
        offsetY: 10,
        opacity: theme.isDark ? 0.22 : 0.1,
        radius: 20,
        elevation: 6,
        webFallback: `0px 10px 28px ${theme.colors.shadowColor}`,
      }),
    },
    communityGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    communityTile: {
      flexBasis: "30%",
      flexGrow: 1,
      borderRadius: 18,
      padding: 16,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      gap: 6,
    },
    communityLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    communityValue: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    moodRow: {
      gap: 8,
    },
    moodLabelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    moodLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    moodCount: {
      fontSize: 13,
      color: theme.colors.textSoft,
    },
    moodBarTrack: {
      height: 10,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceMuted,
      overflow: "hidden",
    },
    moodBarFill: {
      height: "100%",
      borderRadius: 8,
    },
    sentimentRow: {
      flexDirection: "row",
      gap: 10,
    },
    sentimentChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 14,
      backgroundColor: theme.colors.surfaceMuted,
    },
    sentimentText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    errorBanner: {
      borderRadius: 18,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderWidth: 1,
      borderColor: theme.colors.danger,
      backgroundColor: theme.colors.dangerSoft,
    },
    errorText: {
      fontSize: 14,
      color: theme.colors.danger,
      flex: 1,
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.textSoft,
      textAlign: "center",
      marginVertical: 10,
    },
    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    loadingText: {
      fontSize: 13,
      color: theme.colors.heroMuted,
    },
    // New Progress Card Styles
    progressCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      padding: 20,
      gap: 20,
      ...platformShadow({
        color: theme.colors.shadowColor,
        offsetY: 8,
        opacity: theme.isDark ? 0.2 : 0.1,
        radius: 16,
        elevation: 5,
        webFallback: `0px 8px 20px ${theme.colors.shadowColor}`,
      }),
    },
    streakCard: {
      backgroundColor: theme.colors.warningSoft,
      borderRadius: 18,
      padding: 16,
    },
    streakHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    streakInfo: {
      flex: 1,
    },
    streakLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.warning,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    streakValue: {
      fontSize: 28,
      fontWeight: "800",
      color: theme.colors.warning,
      marginVertical: 4,
    },
    streakMeta: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.colors.textMuted,
    },
    moodSection: {
      gap: 14,
    },
    moodTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    moodItem: {
      gap: 6,
    },
    moodHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    moodPercentage: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    // New Section Card Styles
    sectionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      padding: 20,
      gap: 16,
      ...platformShadow({
        color: theme.colors.shadowColor,
        offsetY: 6,
        opacity: theme.isDark ? 0.18 : 0.08,
        radius: 14,
        elevation: 4,
        webFallback: `0px 6px 18px ${theme.colors.shadowColor}`,
      }),
    },
    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    // Empty State Styles
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 32,
      gap: 12,
    },
    emptyButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 16,
      marginTop: 8,
    },
    emptyButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.onPrimary,
    },
    // Entry Card Styles (Updated)
    entryHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 8,
    },
    entryDate: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textMuted,
    },
    entryFooter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 8,
    },
    entryMood: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.colors.textMuted,
    },
    // Insight Card Styles (Updated)
    insightEmpty: {
      backgroundColor: theme.colors.accentSoft,
      borderRadius: 16,
      padding: 16,
    },
    insightEmptyText: {
      fontSize: 13,
      fontWeight: "500",
      color: theme.colors.accent,
      lineHeight: 20,
    },
    insightIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.accentSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    // Community Metrics Styles
    communityMetric: {
      flex: 1,
      minWidth: "47%",
      backgroundColor: theme.colors.successSoft,
      borderRadius: 16,
      padding: 14,
      alignItems: "center",
      gap: 4,
    },
    // Trending Post Styles
    trendingPost: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 18,
      padding: 16,
      gap: 10,
      marginBottom: 12,
    },
    trendingHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    trendingAuthor: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    trendingAuthorName: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    trendingLikes: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    trendingLikesCount: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.danger,
    },
    trendingTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 6,
    },
    trendingSummary: {
      fontSize: 13,
      fontWeight: "400",
      color: theme.colors.textSoft,
      lineHeight: 20,
    },
  });

export const HomeScreen: React.FC = () => {
  const router = useRouter();
  const { profile } = useAuth();
  const { theme } = useAppTheme();
  const {
    prompt,
    entries,
    posts,
    streakCurrent,
    streakLongest,
    entriesThisMonth,
    totals,
    community,
    insights,
    moodDistribution,
    commentSentiment,
    loading,
    error,
    refresh,
  } = useDashboardData();

  const [refreshing, setRefreshing] = React.useState(false);
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const handleNewEntry = React.useCallback(() => {
    router.push("/(tabs)/diary/new");
  }, [router]);

  const handleOpenDiary = React.useCallback(() => {
    router.push("/(tabs)/diary");
  }, [router]);

  const handleExploreCommunity = React.useCallback(() => {
    router.push("/(tabs)/community");
  }, [router]);

  const greetingName = React.useMemo(() => {
    return profile?.displayName || profile?.username || "there";
  }, [profile?.displayName, profile?.username]);

  const quickActions = React.useMemo(
    () => [
      {
        key: "quick-entry",
        label: "Quick entry",
        hint: "Capture today's thoughts",
        icon: "create",
        background: theme.colors.primarySoft,
        iconColor: theme.colors.primary,
        onPress: handleNewEntry,
      },
      {
        key: "diary",
        label: "Open diary",
        hint: "Review recent logs",
        icon: "book",
        background: theme.colors.accentSoft,
        iconColor: theme.colors.accent,
        onPress: handleOpenDiary,
      },
      {
        key: "share",
        label: "Share insight",
        hint: "Join community stories",
        icon: "megaphone",
        background: theme.colors.successSoft,
        iconColor: theme.colors.success,
        onPress: handleExploreCommunity,
      },
      {
        key: "metrics",
        label: "Track progress",
        hint: "See detailed analytics",
        icon: "pulse",
        background: theme.colors.warningSoft,
        iconColor: theme.colors.warning,
        onPress: handleOpenDiary,
      },
    ],
    [
      handleExploreCommunity,
      handleNewEntry,
      handleOpenDiary,
      theme.colors.accent,
      theme.colors.accentSoft,
      theme.colors.primary,
      theme.colors.primarySoft,
      theme.colors.success,
      theme.colors.successSoft,
      theme.colors.warning,
      theme.colors.warningSoft,
    ]
  );

  const moodBreakdown = React.useMemo(
    () => [
      {
        key: "positive",
        label: "Positive",
        percentage: Math.max(
          0,
          Math.min(100, moodDistribution.positive.percentage)
        ),
        count: moodDistribution.positive.count,
        color: theme.colors.success,
      },
      {
        key: "neutral",
        label: "Neutral",
        percentage: Math.max(
          0,
          Math.min(100, moodDistribution.neutral.percentage)
        ),
        count: moodDistribution.neutral.count,
        color: theme.colors.chartNeutral,
      },
      {
        key: "negative",
        label: "Grounded",
        percentage: Math.max(
          0,
          Math.min(100, moodDistribution.negative.percentage)
        ),
        count: moodDistribution.negative.count,
        color: theme.colors.danger,
      },
    ],
    [
      moodDistribution.negative.count,
      moodDistribution.negative.percentage,
      moodDistribution.neutral.count,
      moodDistribution.neutral.percentage,
      moodDistribution.positive.count,
      moodDistribution.positive.percentage,
      theme.colors.chartNeutral,
      theme.colors.danger,
      theme.colors.success,
    ]
  );

  return (
    <View style={styles.container}>
      <View style={styles.navbarWrapper}>
        <Navbar onAvatarPress={() => router.push("/(tabs)/profile")} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: 130 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroAccent} />
          <Text style={styles.heroGreeting}>Welcome back</Text>
          <Text style={styles.heroTitle}>
            Hey {greetingName}, ready to write?
          </Text>
          <Text style={styles.heroPromptLabel}>Today's prompt</Text>
          <Text style={styles.heroPrompt}>{prompt}</Text>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator
                size="small"
                color={theme.colors.textInverted}
              />
              <Text style={styles.loadingText}>Refreshing your dashboard…</Text>
            </View>
          ) : null}
          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.heroCta}
              onPress={handleNewEntry}
              accessibilityRole="button"
              accessibilityLabel="Write a new entry"
            >
              <Ionicons name="pencil" size={18} color={theme.colors.primary} />
              <Text style={styles.heroCtaText}>Write now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroSecondary}
              onPress={handleOpenDiary}
              accessibilityRole="button"
            >
              <Ionicons
                name="journal"
                size={18}
                color={theme.colors.heroLabel}
              />
              <Text style={styles.heroSecondaryText}>View diary</Text>
            </TouchableOpacity>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={18} color={theme.colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Quick Access Section */}
        <View style={styles.quickActionsRow}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.key}
              style={styles.quickAction}
              onPress={action.onPress}
              accessibilityRole="button"
            >
              <View
                style={[
                  styles.quickIcon,
                  { backgroundColor: action.background },
                ]}
              >
                <Ionicons
                  name={action.icon as any}
                  size={20}
                  color={action.iconColor}
                />
              </View>
              <Text style={styles.quickLabel}>{action.label}</Text>
              <Text style={styles.quickHint}>{action.hint}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Progress Snapshot Card - Real Data */}
        <View style={styles.progressCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy" size={20} color={theme.colors.warning} />
            <Text style={styles.sectionTitle}>Progress Snapshot</Text>
          </View>

          {/* Streak Section */}
          <View style={styles.streakCard}>
            <View style={styles.streakHeader}>
              <Ionicons name="flame" size={24} color={theme.colors.warning} />
              <View style={styles.streakInfo}>
                <Text style={styles.streakLabel}>Writing Streak</Text>
                <Text style={styles.streakValue}>{streakCurrent} days</Text>
                <Text style={styles.streakMeta}>
                  Longest: {streakLongest} days
                </Text>
              </View>
            </View>
          </View>

          {/* Entry Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Entries</Text>
              <Text style={styles.statValue}>{totals.entries}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Avg Words</Text>
              <Text style={styles.statValue}>{totals.avgWordsPerEntry}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>This Month</Text>
              <Text style={styles.statValue}>{entriesThisMonth}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Public</Text>
              <Text style={styles.statValue}>{totals.publicEntries}</Text>
            </View>
          </View>

          {/* Mood Distribution */}
          <View style={styles.moodSection}>
            <Text style={styles.moodTitle}>Mood Mix</Text>
            {moodBreakdown.map((item) => (
              <View key={item.key} style={styles.moodItem}>
                <View style={styles.moodHeader}>
                  <Text style={styles.moodLabel}>{item.label}</Text>
                  <Text style={styles.moodPercentage}>
                    {Math.round(item.percentage)}%
                  </Text>
                </View>
                <View style={styles.moodBarTrack}>
                  <View
                    style={[
                      styles.moodBarFill,
                      {
                        width: `${Math.round(item.percentage)}%`,
                        backgroundColor: item.color,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.moodCount}>{item.count} entries</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Entries Section - Real Data */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="time" size={20} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Recent Entries</Text>
            </View>
            <TouchableOpacity onPress={handleOpenDiary}>
              <Text style={styles.sectionAction}>View Diary →</Text>
            </TouchableOpacity>
          </View>

          {entries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="document-text-outline"
                size={40}
                color={theme.colors.textMuted}
              />
              <Text style={styles.emptyText}>
                No entries yet. Start your first story today!
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={handleNewEntry}
              >
                <Text style={styles.emptyButtonText}>Create Entry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            entries.slice(0, 4).map((entry) => (
              <TouchableOpacity key={entry.id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>
                    {entry.title || "Untitled entry"}
                  </Text>
                  <Text style={styles.entryDate}>
                    {new Date(entry.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </View>
                <Text style={styles.entryPreview} numberOfLines={2}>
                  {entry.preview}
                </Text>
                {entry.mood && (
                  <View style={styles.entryFooter}>
                    <Ionicons
                      name="happy-outline"
                      size={14}
                      color={theme.colors.textMuted}
                    />
                    <Text style={styles.entryMood}>{entry.mood}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* AI Insights Section - Real Data */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="sparkles" size={20} color={theme.colors.accent} />
              <Text style={styles.sectionTitle}>AI Insights</Text>
            </View>
            <TouchableOpacity onPress={handleNewEntry}>
              <Text style={styles.sectionAction}>Get AI Help →</Text>
            </TouchableOpacity>
          </View>

          {insights.length === 0 ? (
            <View style={styles.insightEmpty}>
              <Text style={styles.insightEmptyText}>
                Keep writing to unlock personalized suggestions and reflections
              </Text>
            </View>
          ) : (
            insights.slice(0, 4).map((insight, index) => (
              <View key={`insight-${index}`} style={styles.insightCard}>
                <View style={styles.insightIconContainer}>
                  <Ionicons name="bulb" size={16} color={theme.colors.accent} />
                </View>
                <Text style={styles.insightText}>{insight}</Text>
              </View>
            ))
          )}
        </View>

        {/* Community Reach Section - Real Data */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="people" size={20} color={theme.colors.success} />
              <Text style={styles.sectionTitle}>Community Reach</Text>
            </View>
            <TouchableOpacity onPress={handleExploreCommunity}>
              <Text style={styles.sectionAction}>Share →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.communityGrid}>
            <View style={styles.communityMetric}>
              <Text style={styles.communityLabel}>Followers</Text>
              <Text style={styles.communityValue}>{community.followers}</Text>
            </View>
            <View style={styles.communityMetric}>
              <Text style={styles.communityLabel}>Likes Received</Text>
              <Text style={styles.communityValue}>
                {community.likesReceived}
              </Text>
            </View>
            <View style={styles.communityMetric}>
              <Text style={styles.communityLabel}>Posts Shared</Text>
              <Text style={styles.communityValue}>{community.posts}</Text>
            </View>
            <View style={styles.communityMetric}>
              <Text style={styles.communityLabel}>Engagement</Text>
              <Text style={styles.communityValue}>
                {community.engagementRate.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Trending in Community Section - Real Data */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons
                name="trending-up"
                size={20}
                color={theme.colors.accent}
              />
              <Text style={styles.sectionTitle}>Trending in Community</Text>
            </View>
            <TouchableOpacity onPress={handleExploreCommunity}>
              <Ionicons
                name="arrow-forward"
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>

          {posts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="megaphone-outline"
                size={40}
                color={theme.colors.textMuted}
              />
              <Text style={styles.emptyText}>
                Community posts will appear here soon
              </Text>
            </View>
          ) : (
            posts.slice(0, 3).map((post) => (
              <TouchableOpacity key={post.id} style={styles.trendingPost}>
                <View style={styles.trendingHeader}>
                  <View style={styles.trendingAuthor}>
                    <Ionicons
                      name="person-circle"
                      size={24}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.trendingAuthorName}>{post.author}</Text>
                  </View>
                  <View style={styles.trendingLikes}>
                    <Ionicons
                      name="heart"
                      size={16}
                      color={theme.colors.danger}
                    />
                    <Text style={styles.trendingLikesCount}>
                      {formatNumber(post.likes)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.trendingTitle}>{post.title}</Text>
                <Text style={styles.trendingSummary} numberOfLines={2}>
                  {post.summary}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};
