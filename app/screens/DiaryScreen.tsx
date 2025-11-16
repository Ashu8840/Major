import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";

import { Navbar } from "@/components/layout/Navbar";
import { EntryDetailModal } from "@/components/diary/EntryDetailModal";
import {
  DiaryEntry,
  DiaryInsights,
  useDiaryEntries,
} from "@/hooks/useDiaryEntries";
import { platformShadow } from "@/utils/shadow";
import { AppTheme, useAppTheme } from "@/context/ThemeContext";

const FAVORITES_KEY = "diary:favorites";
const PINNED_KEY = "diary:pinned";
const RECENT_DAYS = 7;
const BASE_MOODS = [
  "happy",
  "calm",
  "neutral",
  "grateful",
  "excited",
  "sad",
  "angry",
  "anxious",
  "tired",
  "confident",
  "overwhelmed",
  "love",
];

const loadStoredSet = async (key: string) => {
  try {
    const value = await SecureStore.getItemAsync(key);
    if (!value) return new Set<string>();
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? new Set<string>(parsed) : new Set<string>();
  } catch (error) {
    console.warn(`SecureStore read failed for ${key}`, error);
    return new Set<string>();
  }
};

const persistSet = async (key: string, values: Set<string>) => {
  try {
    await SecureStore.setItemAsync(key, JSON.stringify(Array.from(values)));
  } catch (error) {
    console.warn(`SecureStore write failed for ${key}`, error);
  }
};

const formatDisplayDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
};

type EntryCardProps = {
  entry: DiaryEntry;
  isFavorite: boolean;
  isPinned: boolean;
  onPress: () => void;
  onToggleFavorite: (entryId: string) => void;
  onTogglePin: (entryId: string) => void;
};

const EntryCard: React.FC<EntryCardProps> = ({
  entry,
  isFavorite,
  isPinned,
  onPress,
  onToggleFavorite,
  onTogglePin,
}) => {
  const { theme } = useAppTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <TouchableOpacity
      style={[styles.entryCard, isPinned && styles.entryCardPinned]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.entryHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.entryDate}>
            {formatDisplayDate(entry.createdAt)}
          </Text>
          <Text style={styles.entryTitle}>
            {entry.title || "Untitled entry"}
          </Text>
        </View>
        <View style={styles.entryActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={(e) => {
              e.stopPropagation();
              onTogglePin(entry.id);
            }}
            accessibilityRole="button"
          >
            <Ionicons
              name={isPinned ? "pin" : "pin-outline"}
              size={18}
              color={isPinned ? "#C27803" : "#4B5CD7"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={(e) => {
              e.stopPropagation();
              onToggleFavorite(entry.id);
            }}
            accessibilityRole="button"
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={18}
              color={isFavorite ? "#E11D48" : "#4B5CD7"}
            />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.entryMeta}>
        <Ionicons name="time-outline" size={14} color="#6B739B" />
        <Text style={styles.entryMetaText}>
          {entry.readingMinutes} min read
        </Text>
        <Ionicons name="ellipse" size={4} color="#C4C9EE" />
        <Text style={styles.entryMetaText}>{entry.wordCount} words</Text>
        {entry.mood ? (
          <>
            <Ionicons name="ellipse" size={4} color="#C4C9EE" />
            <Text style={styles.entryMetaText}>{entry.mood}</Text>
          </>
        ) : null}
        {entry.isDraft ? (
          <View style={styles.draftBadge}>
            <Text style={styles.draftBadgeText}>Draft</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.entryContent} numberOfLines={4}>
        {entry.content || "Start writing to see your story here."}
      </Text>
      <View style={styles.tagRow}>
        {entry.tags.slice(0, 3).map((tag) => (
          <View key={`${entry.id}-tag-${tag}`} style={styles.tagChip}>
            <Ionicons name="pricetag-outline" size={12} color="#4B5CD7" />
            <Text style={styles.tagText}>#{tag}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingHorizontal: 24,
      paddingBottom: 90,
      paddingTop: 35,
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
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 24,
    },
    titleBlock: {
      flex: 1,
      paddingRight: 16,
    },
    title: {
      fontSize: 26,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    subtitle: {
      marginTop: 6,
      fontSize: 15,
      color: theme.colors.textSecondary,
    },
    newEntryButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 16,
      ...platformShadow({
        offsetY: 10,
        opacity: 0.18,
        radius: 20,
        elevation: 6,
        webFallback: "0px 8px 18px rgba(49, 66, 198, 0.2)",
      }),
    },
    newEntryText: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.onPrimary,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 20,
      gap: 12,
      ...platformShadow({
        offsetY: 6,
        opacity: 0.08,
        radius: 14,
        elevation: 4,
        webFallback: "0px 6px 16px rgba(26, 34, 74, 0.08)",
      }),
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: theme.colors.textPrimary,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 24,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 14,
      backgroundColor: theme.colors.surfaceMuted,
    },
    chipActive: {
      backgroundColor: theme.colors.primary,
    },
    chipText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    chipTextActive: {
      color: theme.colors.onPrimary,
    },
    insightsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 14,
      marginBottom: 28,
    },
    insightCard: {
      flexGrow: 1,
      minWidth: "48%",
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...platformShadow({
        offsetY: 10,
        opacity: 0.06,
        radius: 18,
        elevation: 5,
        webFallback: "0px 10px 20px rgba(26, 34, 74, 0.05)",
      }),
      gap: 12,
    },
    insightLabel: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontWeight: "600",
    },
    insightValue: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    insightHelper: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    entryCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 22,
      padding: 20,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...platformShadow({
        offsetY: 8,
        opacity: 0.05,
        radius: 16,
        elevation: 5,
        webFallback: "0px 8px 18px rgba(13, 27, 94, 0.05)",
      }),
      gap: 12,
    },
    entryCardPinned: {
      borderColor: "#F7C478",
    },
    entryHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    entryDate: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.primary,
      letterSpacing: 0.3,
      textTransform: "uppercase",
    },
    entryTitle: {
      marginTop: 6,
      fontSize: 19,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    entryActions: {
      flexDirection: "row",
      gap: 8,
    },
    iconButton: {
      padding: 8,
      borderRadius: 999,
      backgroundColor: theme.colors.surfaceMuted,
    },
    entryMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    entryMetaText: {
      fontSize: 13,
      color: theme.colors.textMuted,
    },
    draftBadge: {
      marginLeft: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: theme.colors.dangerSoft,
    },
    draftBadgeText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.danger,
    },
    entryContent: {
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.textSecondary,
    },
    tagRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    tagChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: theme.colors.surfaceMuted,
    },
    tagText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    loadMoreButton: {
      marginTop: 12,
      alignSelf: "center",
      paddingVertical: 11,
      paddingHorizontal: 22,
      borderRadius: 999,
      backgroundColor: theme.colors.primary,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    loadMoreText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.onPrimary,
      letterSpacing: 0.3,
    },
    footer: {
      marginTop: 8,
      alignItems: "center",
      gap: 12,
    },
    errorText: {
      fontSize: 13,
      color: theme.colors.danger,
      textAlign: "center",
    },
    emptyState: {
      marginTop: 36,
      alignItems: "center",
      gap: 12,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    emptySubtitle: {
      fontSize: 14,
      color: theme.colors.textMuted,
      textAlign: "center",
      lineHeight: 20,
      maxWidth: 260,
    },
    filterButton: {
      padding: 8,
      marginLeft: 8,
    },
    toggleContainer: {
      flexDirection: "row",
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 16,
      padding: 4,
      marginBottom: 20,
    },
    toggleButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: "center",
    },
    toggleButtonActive: {
      backgroundColor: theme.colors.surface,
      ...platformShadow({
        offsetY: 2,
        opacity: 0.1,
        radius: 6,
        elevation: 3,
      }),
    },
    toggleText: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    toggleTextActive: {
      color: theme.colors.primary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(26, 34, 74, 0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 20,
      paddingBottom: 40,
      paddingHorizontal: 20,
      maxHeight: "70%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    moodGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    moodChip: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 2,
      borderColor: "transparent",
    },
    moodChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    moodChipText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.primary,
      textTransform: "capitalize",
    },
    moodChipTextActive: {
      color: theme.colors.onPrimary,
    },
    paginationContainer: {
      marginTop: 16,
      alignItems: "center",
      gap: 12,
    },
    paginationInfo: {
      fontSize: 13,
      fontWeight: "500",
      color: theme.colors.primary,
      letterSpacing: 0.2,
    },
    chevronIcon: {
      marginLeft: 6,
    },
    endMessage: {
      fontSize: 13,
      fontWeight: "500",
      color: theme.colors.textMuted,
      textAlign: "center",
      marginTop: 12,
      letterSpacing: 0.2,
    },
  });

const InsightCards: React.FC<{ insights: DiaryInsights }> = ({ insights }) => {
  const { theme } = useAppTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const dominantMood = insights.dominantMood ?? "—";
  const topTags = insights.topTags.length
    ? insights.topTags.map((tag) => `#${tag}`).join("  ")
    : "No tags yet";

  return (
    <View style={styles.insightsGrid}>
      <View style={styles.insightCard}>
        <Text style={styles.insightLabel}>Total entries</Text>
        <Text style={styles.insightValue}>{insights.totalEntries}</Text>
        <Text style={styles.insightHelper}>
          including published reflections
        </Text>
      </View>
      <View style={styles.insightCard}>
        <Text style={styles.insightLabel}>Dominant mood</Text>
        <Text style={styles.insightValue}>{dominantMood}</Text>
        <Text style={styles.insightHelper}>based on your latest entries</Text>
      </View>
      <View style={styles.insightCard}>
        <Text style={styles.insightLabel}>Top tags</Text>
        <Text style={styles.insightValue}>{topTags}</Text>
        <Text style={styles.insightHelper}>updated from the last 2 weeks</Text>
      </View>
      <View style={styles.insightCard}>
        <Text style={styles.insightLabel}>Average words</Text>
        <Text style={styles.insightValue}>{insights.averageWords}</Text>
        <Text style={styles.insightHelper}>
          roughly {Math.max(1, insights.averageWords / 200).toFixed(1)} min read
        </Text>
      </View>
    </View>
  );
};

export const DiaryScreen: React.FC = () => {
  const { theme } = useAppTheme();
  const ITEMS_PER_PAGE = 12;
  const { entries, loading, error, hasMore, refresh, loadMore, insights } =
    useDiaryEntries({ pageSize: ITEMS_PER_PAGE });
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMood, setSelectedMood] = useState("all");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [showMoodFilter, setShowMoodFilter] = useState(false);
  const [viewMode, setViewMode] = useState<"entries" | "analytics">("entries");
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const router = useRouter();

  // Calculate current page based on loaded entries
  const currentPage = Math.ceil(entries.length / ITEMS_PER_PAGE);
  const displayedCount = entries.length;

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [favorites, pinned] = await Promise.all([
        loadStoredSet(FAVORITES_KEY),
        loadStoredSet(PINNED_KEY),
      ]);
      if (mounted) {
        setFavoriteIds(favorites);
        setPinnedIds(pinned);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const toggleFavorite = useCallback((entryId: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      persistSet(FAVORITES_KEY, next);
      return next;
    });
  }, []);

  const togglePin = useCallback((entryId: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      persistSet(PINNED_KEY, next);
      return next;
    });
  }, []);

  const handleEntryPress = useCallback((entry: DiaryEntry) => {
    setSelectedEntry(entry);
    setShowDetailModal(true);
  }, []);

  const handleEditEntry = useCallback(
    (entry: DiaryEntry) => {
      // Navigate to edit screen with entry data
      router.push({
        pathname: "/(tabs)/diary/new",
        params: {
          entryId: entry.id,
          title: entry.title,
          content: entry.content,
          mood: entry.mood || "",
          tags: entry.tags.join(", "),
        },
      });
    },
    [router]
  );

  const handleDeleteEntry = useCallback(
    async (entryId: string) => {
      try {
        const { deleteDiaryEntry } = await import("@/services/api");
        await deleteDiaryEntry(entryId);
        Alert.alert("Success", "Entry deleted successfully!");
        refresh();
      } catch (error) {
        console.error("Failed to delete entry:", error);
        Alert.alert("Error", "Failed to delete entry. Please try again.");
      }
    },
    [refresh]
  );

  const filteredEntries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesSearch = term
        ? [entry.title, entry.content, entry.tags.join(" ")]
            .filter(Boolean)
            .map((value) => value.toLowerCase())
            .some((value) => value.includes(term))
        : true;
      const mood = entry.mood ? entry.mood.toLowerCase() : null;
      const matchesMood = selectedMood === "all" || mood === selectedMood;
      return matchesSearch && matchesMood;
    });
  }, [entries, searchTerm, selectedMood]);

  const displayEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filteredEntries, pinnedIds]);

  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <View style={styles.navbarWrapper}>
        <Navbar onAvatarPress={() => router.push("/(tabs)/profile")} />
      </View>
      <FlatList
        contentContainerStyle={[styles.content, { paddingTop: 130 }]}
        data={viewMode === "entries" ? displayEntries : []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EntryCard
            entry={item}
            isFavorite={favoriteIds.has(item.id)}
            isPinned={pinnedIds.has(item.id)}
            onPress={() => handleEntryPress(item)}
            onToggleFavorite={toggleFavorite}
            onTogglePin={togglePin}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <View style={styles.titleBlock}>
                <Text style={styles.title}>Diary</Text>
                <Text style={styles.subtitle}>
                  Track moods, capture wins, and revisit the peaks of your
                  creative journey.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.newEntryButton}
                onPress={() => router.push("/(tabs)/diary/new")}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.newEntryText}>New entry</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color="#6B739B" />
              <TextInput
                value={searchTerm}
                onChangeText={setSearchTerm}
                style={styles.searchInput}
                placeholder="Search by title, content, or tags"
                placeholderTextColor="#8F96C7"
              />
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setShowMoodFilter(true)}
              >
                <Ionicons name="filter" size={18} color="#3142C6" />
              </TouchableOpacity>
            </View>

            {/* Toggle between Entries and Analytics */}
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  viewMode === "entries" && styles.toggleButtonActive,
                ]}
                onPress={() => setViewMode("entries")}
              >
                <Text
                  style={[
                    styles.toggleText,
                    viewMode === "entries" && styles.toggleTextActive,
                  ]}
                >
                  Entries
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  viewMode === "analytics" && styles.toggleButtonActive,
                ]}
                onPress={() => setViewMode("analytics")}
              >
                <Text
                  style={[
                    styles.toggleText,
                    viewMode === "analytics" && styles.toggleTextActive,
                  ]}
                >
                  Analytics
                </Text>
              </TouchableOpacity>
            </View>

            {/* Show Analytics only when viewMode is analytics */}
            {viewMode === "analytics" && <InsightCards insights={insights} />}
          </View>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {loading ? <ActivityIndicator color="#3142C6" /> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {!loading && hasMore ? (
              <View style={styles.paginationContainer}>
                <Text style={styles.paginationInfo}>
                  Showing {displayedCount} entries • Page {currentPage}
                </Text>
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={loadMore}
                >
                  <Text style={styles.loadMoreText}>Load more entries</Text>
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color="#FFFFFF"
                    style={styles.chevronIcon}
                  />
                </TouchableOpacity>
              </View>
            ) : null}
            {!loading && !hasMore && displayEntries.length > 0 ? (
              <Text style={styles.endMessage}>
                You've reached the end • {displayedCount} total entries
              </Text>
            ) : null}
            {!loading && displayEntries.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="book-outline" size={36} color="#3142C6" />
                <Text style={styles.emptyTitle}>No entries yet</Text>
                <Text style={styles.emptySubtitle}>
                  Tap "New entry" to capture your first reflection and build
                  momentum.
                </Text>
              </View>
            ) : null}
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Mood Filter Modal */}
      <Modal
        visible={showMoodFilter}
        animationType="slide"
        transparent
        onRequestClose={() => setShowMoodFilter(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMoodFilter(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Mood</Text>
              <TouchableOpacity onPress={() => setShowMoodFilter(false)}>
                <Ionicons name="close" size={24} color="#1A224A" />
              </TouchableOpacity>
            </View>
            <View style={styles.moodGrid}>
              <TouchableOpacity
                style={[
                  styles.moodChip,
                  selectedMood === "all" && styles.moodChipActive,
                ]}
                onPress={() => {
                  setSelectedMood("all");
                  setShowMoodFilter(false);
                }}
              >
                <Text
                  style={[
                    styles.moodChipText,
                    selectedMood === "all" && styles.moodChipTextActive,
                  ]}
                >
                  All Moods
                </Text>
              </TouchableOpacity>
              {BASE_MOODS.map((mood) => {
                const isActive = selectedMood === mood;
                return (
                  <TouchableOpacity
                    key={mood}
                    style={[styles.moodChip, isActive && styles.moodChipActive]}
                    onPress={() => {
                      setSelectedMood(mood);
                      setShowMoodFilter(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.moodChipText,
                        isActive && styles.moodChipTextActive,
                      ]}
                    >
                      {mood}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Entry Detail Modal */}
      <EntryDetailModal
        visible={showDetailModal}
        entry={selectedEntry}
        isFavorite={selectedEntry ? favoriteIds.has(selectedEntry.id) : false}
        isPinned={selectedEntry ? pinnedIds.has(selectedEntry.id) : false}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedEntry(null);
        }}
        onToggleFavorite={toggleFavorite}
        onTogglePin={togglePin}
        onEdit={handleEditEntry}
        onDelete={handleDeleteEntry}
      />
    </View>
  );
};
