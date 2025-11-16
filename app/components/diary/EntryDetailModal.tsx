import React, { useState } from "react";
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { DiaryEntry } from "@/hooks/useDiaryEntries";
import { platformShadow } from "@/utils/shadow";

type EntryDetailModalProps = {
  visible: boolean;
  entry: DiaryEntry | null;
  isFavorite: boolean;
  isPinned: boolean;
  onClose: () => void;
  onToggleFavorite: (entryId: string) => void;
  onTogglePin: (entryId: string) => void;
  onEdit: (entry: DiaryEntry) => void;
  onDelete: (entryId: string) => void;
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

export const EntryDetailModal: React.FC<EntryDetailModalProps> = ({
  visible,
  entry,
  isFavorite,
  isPinned,
  onClose,
  onToggleFavorite,
  onTogglePin,
  onEdit,
  onDelete,
}) => {
  if (!entry) return null;

  const handleShare = async () => {
    try {
      await Share.share({
        title: entry.title || "Diary Entry",
        message: `${entry.title}\n\n${entry.content}\n\n${
          entry.tags.length ? `Tags: ${entry.tags.join(", ")}` : ""
        }`,
      });
    } catch (error) {
      console.error("Error sharing entry:", error);
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
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={24} color="#3142C6" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Entry Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Date Badge */}
          <View style={styles.dateBadge}>
            <Ionicons name="calendar-outline" size={14} color="#4B5CD7" />
            <Text style={styles.dateText}>
              {formatDisplayDate(entry.createdAt)}
            </Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{entry.title || "Untitled entry"}</Text>

          {/* Action Buttons Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                isFavorite && styles.actionButtonActive,
              ]}
              onPress={() => onToggleFavorite(entry.id)}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={18}
                color={isFavorite ? "#E11D48" : "#4B5CD7"}
              />
              <Text
                style={[
                  styles.actionText,
                  isFavorite && styles.actionTextActive,
                ]}
              >
                {isFavorite ? "Favorited" : "Favorite"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                isPinned && styles.actionButtonPinned,
              ]}
              onPress={() => onTogglePin(entry.id)}
            >
              <Ionicons
                name={isPinned ? "pin" : "pin-outline"}
                size={18}
                color={isPinned ? "#C27803" : "#4B5CD7"}
              />
              <Text
                style={[styles.actionText, isPinned && styles.actionTextPinned]}
              >
                {isPinned ? "Pinned" : "Pin"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Meta Info */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color="#6B739B" />
              <Text style={styles.metaText}>
                {entry.readingMinutes} min read
              </Text>
            </View>
            <View style={styles.metaDot} />
            <View style={styles.metaItem}>
              <Ionicons
                name="document-text-outline"
                size={16}
                color="#6B739B"
              />
              <Text style={styles.metaText}>{entry.wordCount} words</Text>
            </View>
          </View>

          {/* Mood */}
          {entry.mood && (
            <View style={styles.moodContainer}>
              <Ionicons name="sparkles" size={16} color="#8B5CF6" />
              <Text style={styles.moodText}>{entry.mood}</Text>
            </View>
          )}

          {/* Tags */}
          {entry.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              <Text style={styles.tagsLabel}>Tags</Text>
              <View style={styles.tagsRow}>
                {entry.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Ionicons name="pricetag" size={12} color="#0EA5E9" />
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Content */}
          <View style={styles.contentContainer}>
            <Text style={styles.contentLabel}>Content</Text>
            <Text style={styles.contentText}>{entry.content}</Text>
          </View>

          {/* Media */}
          {entry.media.length > 0 && (
            <View style={styles.mediaContainer}>
              <Text style={styles.mediaLabel}>Attachments</Text>
              <View style={styles.mediaGrid}>
                {entry.media.map((mediaItem, index) => (
                  <View key={index} style={styles.mediaItem}>
                    <Image
                      source={{ uri: mediaItem.url }}
                      style={styles.mediaImage}
                      resizeMode="cover"
                    />
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Bottom Actions */}
          <View style={styles.bottomActions}>
            <TouchableOpacity style={styles.bottomButton} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={20} color="#3142C6" />
              <Text style={styles.bottomButtonText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bottomButton}
              onPress={() => {
                onEdit(entry);
                onClose();
              }}
            >
              <Ionicons name="create-outline" size={20} color="#3142C6" />
              <Text style={styles.bottomButtonText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bottomButton, styles.deleteButton]}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={20} color="#DC2626" />
              <Text style={[styles.bottomButtonText, styles.deleteButtonText]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E7FF",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEF1FF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A224A",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#EEF1FF",
    borderRadius: 12,
    marginBottom: 16,
  },
  dateText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5CD7",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A224A",
    marginBottom: 20,
    lineHeight: 36,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#EEF1FF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E7FF",
  },
  actionButtonActive: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FECACA",
  },
  actionButtonPinned: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5CD7",
  },
  actionTextActive: {
    color: "#E11D48",
  },
  actionTextPinned: {
    color: "#C27803",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#C4C9EE",
  },
  metaText: {
    fontSize: 14,
    color: "#6B739B",
  },
  moodContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#F3E8FF",
    borderRadius: 14,
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  moodText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8B5CF6",
    textTransform: "capitalize",
  },
  tagsContainer: {
    marginBottom: 24,
  },
  tagsLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#5F6DAF",
    marginBottom: 10,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#E0F2FE",
    borderRadius: 12,
  },
  tagText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0EA5E9",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  contentContainer: {
    marginBottom: 24,
  },
  contentLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#5F6DAF",
    marginBottom: 12,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 26,
    color: "#1A224A",
  },
  mediaContainer: {
    marginBottom: 24,
  },
  mediaLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#5F6DAF",
    marginBottom: 12,
  },
  mediaGrid: {
    gap: 12,
  },
  mediaItem: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#E2E7FF",
    ...platformShadow({
      offsetY: 4,
      opacity: 0.1,
      radius: 8,
      elevation: 3,
    }),
  },
  mediaImage: {
    width: "100%",
    height: 200,
    backgroundColor: "#F8FAFF",
  },
  bottomActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  bottomButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: "#EEF1FF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E7FF",
  },
  deleteButton: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FECACA",
  },
  bottomButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3142C6",
  },
  deleteButtonText: {
    color: "#DC2626",
  },
});
