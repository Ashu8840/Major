import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as SecureStore from "expo-secure-store";
import * as Sharing from "expo-sharing";
import { useRouter } from "expo-router";

import { Navbar } from "@/components/layout/Navbar";
import {
  DiaryEntry,
  DiaryInsights,
  useDiaryEntries,
} from "@/hooks/useDiaryEntries";
import { platformShadow } from "@/utils/shadow";

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

type FilterType = "all" | "favorites" | "recent" | "mood" | "tags";

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

type EntryDetailModalProps = {
  visible: boolean;
  entry: DiaryEntry | null;
  isFavorite: boolean;
  isPinned: boolean;
  onClose: () => void;
  onToggleFavorite: (entryId: string) => void;
  onTogglePin: (entryId: string) => void;
  onDelete: (entryId: string) => void;
  onEdit: (entryId: string, updates: any) => Promise<void>;
  onShare: (entry: DiaryEntry) => void;
};

const EntryDetailModal: React.FC<EntryDetailModalProps> = ({
  visible,
  entry,
  isFavorite,
  isPinned,
  onClose,
  onToggleFavorite,
  onTogglePin,
  onDelete,
  onEdit,
  onShare,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editMood, setEditMood] = useState("");
  const [editTags, setEditTags] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (entry && visible) {
      setEditTitle(entry.title || "");
      setEditContent(entry.content || "");
      setEditMood(entry.mood || "");
      setEditTags(entry.tags.join(", "));
      setIsEditing(false);
    }
  }, [entry, visible]);

  if (!entry) return null;

  const handleSave = async () => {
    if (!editTitle.trim() || !editContent.trim()) {
      Alert.alert("Error", "Title and content are required");
      return;
    }

    setSaving(true);
    try {
      await onEdit(entry.id, {
        title: editTitle.trim(),
        content: editContent.trim(),
        mood: editMood || undefined,
        tags: editTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setIsEditing(false);
      Alert.alert("Success", "Entry updated successfully");
    } catch (error) {
      console.error("Failed to save entry:", error);
      Alert.alert("Error", "Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Entry",
      "Are you sure you want to delete this entry? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            onDelete(entry.id);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.modalCloseButton}
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={28} color="#1A224A" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {isEditing ? "Edit Entry" : "Entry Details"}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          style={styles.modalContent}
          contentContainerStyle={styles.modalContentInner}
          showsVerticalScrollIndicator={false}
        >
          {isEditing ? (
            <View style={styles.editForm}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Title</Text>
                <TextInput
                  style={styles.formInput}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Enter title"
                  placeholderTextColor="#8F96C7"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Mood</Text>
                <View style={styles.moodPicker}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {BASE_MOODS.map((mood) => (
                      <TouchableOpacity
                        key={mood}
                        style={[
                          styles.moodOption,
                          editMood === mood && styles.moodOptionActive,
                        ]}
                        onPress={() => setEditMood(mood)}
                      >
                        <Text
                          style={[
                            styles.moodOptionText,
                            editMood === mood && styles.moodOptionTextActive,
                          ]}
                        >
                          {mood}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Tags (comma separated)</Text>
                <TextInput
                  style={styles.formInput}
                  value={editTags}
                  onChangeText={setEditTags}
                  placeholder="work, creative, personal"
                  placeholderTextColor="#8F96C7"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Content</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  value={editContent}
                  onChangeText={setEditContent}
                  placeholder="Write your story..."
                  placeholderTextColor="#8F96C7"
                  multiline
                  numberOfLines={10}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setIsEditing(false)}
                  disabled={saving}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    saving && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.detailHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailDate}>
                    {formatDisplayDate(entry.createdAt)}
                  </Text>
                  <Text style={styles.detailTitle}>{entry.title}</Text>
                </View>
                <View style={styles.detailHeaderActions}>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => onToggleFavorite(entry.id)}
                  >
                    <Ionicons
                      name={isFavorite ? "heart" : "heart-outline"}
                      size={20}
                      color={isFavorite ? "#E11D48" : "#4B5CD7"}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => onTogglePin(entry.id)}
                  >
                    <Ionicons
                      name={isPinned ? "pin" : "pin-outline"}
                      size={20}
                      color={isPinned ? "#C27803" : "#4B5CD7"}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.detailMeta}>
                {entry.mood && (
                  <View style={styles.metaBadge}>
                    <Ionicons name="sparkles" size={14} color="#8B5CF6" />
                    <Text style={styles.metaBadgeText}>{entry.mood}</Text>
                  </View>
                )}
                <View style={styles.metaBadge}>
                  <Ionicons name="time-outline" size={14} color="#4B5CD7" />
                  <Text style={styles.metaBadgeText}>
                    {entry.readingMinutes} min read
                  </Text>
                </View>
                <View style={styles.metaBadge}>
                  <Ionicons name="text-outline" size={14} color="#6B739B" />
                  <Text style={styles.metaBadgeText}>
                    {entry.wordCount} words
                  </Text>
                </View>
              </View>

              {entry.tags.length > 0 && (
                <View style={styles.detailTags}>
                  {entry.tags.map((tag) => (
                    <View key={tag} style={styles.detailTag}>
                      <Ionicons name="pricetag" size={12} color="#4B5CD7" />
                      <Text style={styles.detailTagText}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.detailContentWrapper}>
                <Text style={styles.detailContent}>{entry.content}</Text>
              </View>

              <View style={styles.detailActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => onShare(entry)}
                >
                  <Ionicons name="share-outline" size={20} color="#4B5CD7" />
                  <Text style={styles.actionButtonText}>Share</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setIsEditing(true)}
                >
                  <Ionicons name="create-outline" size={20} color="#8B5CF6" />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={handleDelete}
                >
                  <Ionicons name="trash-outline" size={20} color="#DC2626" />
                  <Text
                    style={[styles.actionButtonText, styles.deleteButtonText]}
                  >
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const InsightCards: React.FC<{ insights: DiaryInsights }> = ({ insights }) => {
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
  const {
    entries,
    loading,
    error,
    hasMore,
    refresh,
    loadMore,
    insights,
    updateEntryMutation,
    deleteEntryMutation,
  } = useDiaryEntries({ pageSize: 12 });
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [selectedMoodFilter, setSelectedMoodFilter] = useState("");
  const [selectedTagFilter, setSelectedTagFilter] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter();

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

  useEffect(() => {
    if (filterType !== "mood") setSelectedMoodFilter("");
    if (filterType !== "tags") setSelectedTagFilter("");
  }, [filterType]);

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

  const handleEdit = async (entryId: string, updates: any) => {
    await updateEntryMutation(entryId, updates);
  };

  const handleDelete = useCallback(
    async (entryId: string) => {
      try {
        await deleteEntryMutation(entryId);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(entryId);
          persistSet(FAVORITES_KEY, next);
          return next;
        });
        setPinnedIds((prev) => {
          const next = new Set(prev);
          next.delete(entryId);
          persistSet(PINNED_KEY, next);
          return next;
        });
        Alert.alert("Success", "Entry deleted successfully");
      } catch (error) {
        console.error("Failed to delete entry:", error);
        Alert.alert("Error", "Failed to delete entry. Please try again.");
      }
    },
    [deleteEntryMutation]
  );

  const handleShare = async (entry: DiaryEntry) => {
    try {
      const content = `${entry.title}\n\n${entry.content.slice(0, 200)}${
        entry.content.length > 200 ? "..." : ""
      }`;

      if (await Sharing.isAvailableAsync()) {
        // Create a temporary text file
        const tempFilePath = `${FileSystem.cacheDirectory}${entry.title.replace(
          /[^a-z0-9]/gi,
          "_"
        )}.txt`;
        await FileSystem.writeAsStringAsync(tempFilePath, content);
        await Sharing.shareAsync(tempFilePath, {
          mimeType: "text/plain",
          dialogTitle: "Share Entry",
        });
      } else {
        Alert.alert(
          "Sharing not available",
          "Sharing is not supported on this device"
        );
      }
    } catch (error) {
      console.error("Failed to share entry:", error);
      Alert.alert("Error", "Failed to share entry");
    }
  };

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    entries.forEach((entry) => {
      entry.tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [entries]);

  const allMoods = useMemo(() => {
    const moodSet = new Set<string>();
    entries.forEach((entry) => {
      if (entry.mood) moodSet.add(entry.mood);
    });
    return Array.from(moodSet).sort();
  }, [entries]);

  const recencyThreshold = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - RECENT_DAYS);
    return date;
  }, []);

  const filteredEntries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return entries.filter((entry) => {
      // Search filter
      const matchesSearch = term
        ? [entry.title, entry.content, entry.tags.join(" ")]
            .filter(Boolean)
            .map((value) => value.toLowerCase())
            .some((value) => value.includes(term))
        : true;

      if (!matchesSearch) return false;

      // Type filter
      switch (filterType) {
        case "favorites":
          return favoriteIds.has(entry.id);
        case "recent":
          return new Date(entry.createdAt) >= recencyThreshold;
        case "mood":
          return !selectedMoodFilter || entry.mood === selectedMoodFilter;
        case "tags":
          return !selectedTagFilter || entry.tags.includes(selectedTagFilter);
        default:
          return true;
      }
    });
  }, [
    entries,
    searchTerm,
    filterType,
    favoriteIds,
    selectedMoodFilter,
    selectedTagFilter,
    recencyThreshold,
  ]);

  const displayEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filteredEntries, pinnedIds]);

  const handleEntryPress = (entry: DiaryEntry) => {
    setSelectedEntry(entry);
    setModalVisible(true);
  };

  const filterButtons: Array<{ type: FilterType; label: string }> = [
    { type: "all", label: "All entries" },
    { type: "favorites", label: "Favorites" },
    { type: "recent", label: "Recent" },
    { type: "mood", label: "By mood" },
    { type: "tags", label: "By tags" },
  ];

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.content}
        data={displayEntries}
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
            <View style={styles.navbarWrapper}>
              <Navbar onAvatarPress={() => router.push("/(tabs)/profile")} />
            </View>
            <View style={styles.headerRow}>
              <View style={styles.titleBlock}>
                <Text style={styles.title}>My Private Diary</Text>
                <Text style={styles.subtitle}>
                  Reflect, record, and relive your story in beautifully
                  organized entries.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.newEntryButton}
                onPress={() => router.push("/(tabs)/diary/new")}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.newEntryText}>New</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color="#6B739B" />
              <TextInput
                value={searchTerm}
                onChangeText={setSearchTerm}
                style={styles.searchInput}
                placeholder="Search your memories by title, content, or tags"
                placeholderTextColor="#8F96C7"
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {filterButtons.map(({ type, label }) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.chip,
                    filterType === type && styles.chipActive,
                  ]}
                  onPress={() => setFilterType(type)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      filterType === type && styles.chipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {filterType === "mood" && allMoods.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.subFilterRow}
              >
                <TouchableOpacity
                  style={[
                    styles.subFilterChip,
                    !selectedMoodFilter && styles.subFilterChipActive,
                  ]}
                  onPress={() => setSelectedMoodFilter("")}
                >
                  <Text
                    style={[
                      styles.subFilterChipText,
                      !selectedMoodFilter && styles.subFilterChipTextActive,
                    ]}
                  >
                    All moods
                  </Text>
                </TouchableOpacity>
                {allMoods.map((mood) => (
                  <TouchableOpacity
                    key={mood}
                    style={[
                      styles.subFilterChip,
                      selectedMoodFilter === mood && styles.subFilterChipActive,
                    ]}
                    onPress={() => setSelectedMoodFilter(mood)}
                  >
                    <Text
                      style={[
                        styles.subFilterChipText,
                        selectedMoodFilter === mood &&
                          styles.subFilterChipTextActive,
                      ]}
                    >
                      {mood}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {filterType === "tags" && allTags.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.subFilterRow}
              >
                <TouchableOpacity
                  style={[
                    styles.subFilterChip,
                    !selectedTagFilter && styles.subFilterChipActive,
                  ]}
                  onPress={() => setSelectedTagFilter("")}
                >
                  <Text
                    style={[
                      styles.subFilterChipText,
                      !selectedTagFilter && styles.subFilterChipTextActive,
                    ]}
                  >
                    All tags
                  </Text>
                </TouchableOpacity>
                {allTags.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.subFilterChip,
                      selectedTagFilter === tag && styles.subFilterChipActive,
                    ]}
                    onPress={() => setSelectedTagFilter(tag)}
                  >
                    <Text
                      style={[
                        styles.subFilterChipText,
                        selectedTagFilter === tag &&
                          styles.subFilterChipTextActive,
                      ]}
                    >
                      #{tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <InsightCards insights={insights} />
          </View>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {loading ? <ActivityIndicator color="#3142C6" /> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {!loading && hasMore ? (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={loadMore}
              >
                <Text style={styles.loadMoreText}>Load more entries</Text>
              </TouchableOpacity>
            ) : null}
            {!loading && displayEntries.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="book-outline" size={36} color="#3142C6" />
                <Text style={styles.emptyTitle}>No entries yet</Text>
                <Text style={styles.emptySubtitle}>
                  {filterType === "all"
                    ? 'Tap "New" to capture your first reflection and build momentum.'
                    : "Try adjusting your filters or add a new entry to see it here."}
                </Text>
              </View>
            ) : null}
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      <EntryDetailModal
        visible={modalVisible}
        entry={selectedEntry}
        isFavorite={selectedEntry ? favoriteIds.has(selectedEntry.id) : false}
        isPinned={selectedEntry ? pinnedIds.has(selectedEntry.id) : false}
        onClose={() => setModalVisible(false)}
        onToggleFavorite={toggleFavorite}
        onTogglePin={togglePin}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onShare={handleShare}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6FE",
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 35,
  },
  navbarWrapper: {
    marginTop: 20,
    marginBottom: 16,
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
    color: "#1A224A",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#5F6DAF",
  },
  newEntryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#3142C6",
    paddingHorizontal: 16,
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
    color: "#FFFFFF",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E7FF",
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
    color: "#1A224A",
  },
  chipRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
    paddingRight: 24,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#E8ECFF",
  },
  chipActive: {
    backgroundColor: "#3142C6",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3142C6",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  subFilterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    paddingRight: 24,
  },
  subFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#F0F3FF",
  },
  subFilterChipActive: {
    backgroundColor: "#3142C6",
  },
  subFilterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#5F6DAF",
  },
  subFilterChipTextActive: {
    color: "#FFFFFF",
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
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E7FF",
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
    color: "#5F6DAF",
    fontWeight: "600",
  },
  insightValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A224A",
  },
  insightHelper: {
    fontSize: 12,
    color: "#6B739B",
  },
  entryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E2E7FF",
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
    borderWidth: 2,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  entryDate: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5CD7",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  entryTitle: {
    marginTop: 6,
    fontSize: 19,
    fontWeight: "700",
    color: "#1B2554",
  },
  entryActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: "#EEF1FF",
  },
  entryMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  entryMetaText: {
    fontSize: 13,
    color: "#6B739B",
  },
  draftBadge: {
    marginLeft: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#FFE8E8",
  },
  draftBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#B42318",
  },
  entryContent: {
    fontSize: 15,
    lineHeight: 22,
    color: "#3E4671",
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
    backgroundColor: "#EEF1FF",
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5CD7",
  },
  loadMoreButton: {
    marginTop: 12,
    alignSelf: "center",
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: "#3142C6",
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  footer: {
    marginTop: 8,
    alignItems: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 13,
    color: "#B42318",
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
    color: "#1A224A",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B739B",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 260,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#F4F6FE",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E7FF",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A224A",
  },
  modalContent: {
    flex: 1,
  },
  modalContentInner: {
    padding: 24,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  detailDate: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5CD7",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  detailTitle: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: "700",
    color: "#1A224A",
    lineHeight: 36,
  },
  detailHeaderActions: {
    flexDirection: "row",
    gap: 8,
  },
  detailMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#F0F3FF",
  },
  metaBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5CD7",
  },
  detailTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  detailTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#E0E7FF",
  },
  detailTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5CD7",
  },
  detailContentWrapper: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E2E7FF",
    minHeight: 200,
  },
  detailContent: {
    fontSize: 16,
    lineHeight: 26,
    color: "#1A224A",
  },
  detailActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#E8ECFF",
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4B5CD7",
  },
  deleteButton: {
    backgroundColor: "#FEE2E2",
  },
  deleteButtonText: {
    color: "#DC2626",
  },
  // Edit form styles
  editForm: {
    gap: 20,
  },
  formGroup: {
    gap: 8,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A224A",
  },
  formInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#1A224A",
    borderWidth: 1,
    borderColor: "#E2E7FF",
  },
  formTextArea: {
    minHeight: 200,
    textAlignVertical: "top",
  },
  moodPicker: {
    marginVertical: 8,
  },
  moodOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#E8ECFF",
    marginRight: 8,
  },
  moodOptionActive: {
    backgroundColor: "#3142C6",
  },
  moodOptionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3142C6",
  },
  moodOptionTextActive: {
    color: "#FFFFFF",
  },
  editActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#E8ECFF",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4B5CD7",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#3142C6",
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
