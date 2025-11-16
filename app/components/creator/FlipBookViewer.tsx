import React, { useMemo, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { platformShadow } from "@/utils/shadow";

interface FlipBookViewerProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  content: string;
  subtitle?: string;
  category?: string;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const PAGE_WIDTH = SCREEN_WIDTH * 0.85;
const PAGE_HEIGHT = SCREEN_HEIGHT * 0.7;
const WORDS_PER_PAGE = 250;

// Split content into pages
const splitContentIntoPages = (
  content: string,
  wordsPerPage: number
): string[] => {
  if (!content || content.trim().length === 0) {
    return ["No content available"];
  }

  const words = content.trim().split(/\s+/);
  const pages: string[] = [];

  for (let i = 0; i < words.length; i += wordsPerPage) {
    const pageWords = words.slice(i, i + wordsPerPage);
    pages.push(pageWords.join(" "));
  }

  return pages.length > 0 ? pages : ["No content available"];
};

export const FlipBookViewer: React.FC<FlipBookViewerProps> = ({
  visible,
  onClose,
  title,
  content,
  subtitle,
  category,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [flipAnimation] = useState(new Animated.Value(0));

  const pages = useMemo(
    () => splitContentIntoPages(content, WORDS_PER_PAGE),
    [content]
  );
  const totalPages = pages.length;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderRelease: (_, gestureState) => {
          const { dx } = gestureState;

          // Swipe right (previous page)
          if (dx > 50 && currentPage > 0) {
            flipToPreviousPage();
          }
          // Swipe left (next page)
          else if (dx < -50 && currentPage < totalPages - 1) {
            flipToNextPage();
          }
        },
      }),
    [currentPage, totalPages]
  );

  const flipToNextPage = () => {
    if (currentPage < totalPages - 1) {
      Animated.sequence([
        Animated.timing(flipAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(flipAnimation, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]).start();

      setTimeout(() => {
        setCurrentPage(currentPage + 1);
      }, 150);
    }
  };

  const flipToPreviousPage = () => {
    if (currentPage > 0) {
      Animated.sequence([
        Animated.timing(flipAnimation, {
          toValue: -1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(flipAnimation, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]).start();

      setTimeout(() => {
        setCurrentPage(currentPage - 1);
      }, 150);
    }
  };

  const flipRotation = flipAnimation.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-180deg", "0deg", "180deg"],
  });

  const pageOpacity = flipAnimation.interpolate({
    inputRange: [-1, -0.5, 0, 0.5, 1],
    outputRange: [0, 0.5, 1, 0.5, 0],
  });

  const handleClose = () => {
    setCurrentPage(0);
    flipAnimation.setValue(0);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="book" size={24} color="#3C4CC2" />
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {title}
                </Text>
                {subtitle && (
                  <Text style={styles.headerSubtitle} numberOfLines={1}>
                    {subtitle}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={24} color="#1A224A" />
            </TouchableOpacity>
          </View>

          {/* Page Counter */}
          <View style={styles.pageCounter}>
            <Text style={styles.pageCounterText}>
              Page {currentPage + 1} of {totalPages}
            </Text>
            {category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{category}</Text>
              </View>
            )}
          </View>

          {/* Flip Book Container */}
          <View style={styles.bookContainer} {...panResponder.panHandlers}>
            <Animated.View
              style={[
                styles.page,
                {
                  transform: [{ rotateY: flipRotation }],
                  opacity: pageOpacity,
                },
              ]}
            >
              <View style={styles.pageContent}>
                <Text style={styles.pageText}>{pages[currentPage]}</Text>
              </View>

              {/* Page number at bottom */}
              <View style={styles.pageFooter}>
                <Text style={styles.pageNumber}>{currentPage + 1}</Text>
              </View>
            </Animated.View>

            {/* Swipe hint */}
            {currentPage === 0 && (
              <View style={styles.swipeHint}>
                <Ionicons name="chevron-back" size={20} color="#9CA3AF" />
                <Text style={styles.swipeHintText}>Swipe to flip pages</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            )}
          </View>

          {/* Navigation Controls */}
          <View style={styles.controls}>
            <TouchableOpacity
              style={[
                styles.controlButton,
                currentPage === 0 && styles.controlButtonDisabled,
              ]}
              onPress={flipToPreviousPage}
              disabled={currentPage === 0}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={currentPage === 0 ? "#9CA3AF" : "#3C4CC2"}
              />
              <Text
                style={[
                  styles.controlButtonText,
                  currentPage === 0 && styles.controlButtonTextDisabled,
                ]}
              >
                Previous
              </Text>
            </TouchableOpacity>

            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${((currentPage + 1) / totalPages) * 100}%` },
                  ]}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.controlButton,
                currentPage === totalPages - 1 && styles.controlButtonDisabled,
              ]}
              onPress={flipToNextPage}
              disabled={currentPage === totalPages - 1}
            >
              <Text
                style={[
                  styles.controlButtonText,
                  currentPage === totalPages - 1 &&
                    styles.controlButtonTextDisabled,
                ]}
              >
                Next
              </Text>
              <Ionicons
                name="chevron-forward"
                size={24}
                color={currentPage === totalPages - 1 ? "#9CA3AF" : "#3C4CC2"}
              />
            </TouchableOpacity>
          </View>

          {/* Quick Jump */}
          <View style={styles.quickJump}>
            <TouchableOpacity
              style={styles.quickJumpButton}
              onPress={() => {
                setCurrentPage(0);
                flipAnimation.setValue(0);
              }}
            >
              <Ionicons name="play-back" size={18} color="#6B739B" />
              <Text style={styles.quickJumpButtonText}>First Page</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickJumpButton}
              onPress={() => {
                setCurrentPage(totalPages - 1);
                flipAnimation.setValue(0);
              }}
            >
              <Text style={styles.quickJumpButtonText}>Last Page</Text>
              <Ionicons name="play-forward" size={18} color="#6B739B" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: SCREEN_WIDTH * 0.95,
    maxHeight: SCREEN_HEIGHT * 0.95,
    backgroundColor: "#F4F6FE",
    borderRadius: 24,
    padding: 20,
    ...platformShadow({
      offsetY: 8,
      opacity: 0.3,
      radius: 24,
      elevation: 12,
    }),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E9FF",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A224A",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B739B",
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  pageCounter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  pageCounterText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4A5280",
  },
  categoryBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E9FF",
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3C4CC2",
  },
  bookContainer: {
    height: PAGE_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  page: {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    ...platformShadow({
      offsetY: 4,
      opacity: 0.15,
      radius: 16,
      elevation: 8,
    }),
  },
  pageContent: {
    flex: 1,
  },
  pageText: {
    fontSize: 16,
    lineHeight: 26,
    color: "#1A224A",
    textAlign: "justify",
  },
  pageFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E9FF",
    alignItems: "center",
  },
  pageNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B739B",
  },
  swipeHint: {
    position: "absolute",
    bottom: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  swipeHintText: {
    fontSize: 12,
    color: "#6B739B",
    fontWeight: "600",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 12,
  },
  controlButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E9FF",
  },
  controlButtonDisabled: {
    opacity: 0.4,
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3C4CC2",
  },
  controlButtonTextDisabled: {
    color: "#9CA3AF",
  },
  progressContainer: {
    flex: 1,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#E5E9FF",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3C4CC2",
    borderRadius: 3,
  },
  quickJump: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  quickJumpButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E9FF",
  },
  quickJumpButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B739B",
  },
});
