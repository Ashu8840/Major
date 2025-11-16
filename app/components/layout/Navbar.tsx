import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  ScrollView,
  Image,
  Animated,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";

import { useAuth } from "@/context/AuthContext";
import { AppTheme, useAppTheme } from "@/context/ThemeContext";
import { useWallet } from "@/context/WalletContext";
import { useNotifications } from "@/context/NotificationContext";
import { platformShadow } from "@/utils/shadow";

// Helper function to format currency
const formatCurrency = (value: number): string => {
  return `₹${value.toLocaleString("en-IN")}`;
};

// Helper function to format relative time
const formatRelativeTime = (timestamp: string): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      height: 64,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.isDark
        ? "rgba(30, 35, 65, 0.85)"
        : "rgba(255, 255, 255, 0.85)",
      borderRadius: 20,
      paddingHorizontal: 20,
      marginHorizontal: 16,
      ...platformShadow({
        color: theme.colors.shadowColor,
        offsetY: 8,
        opacity: theme.isDark ? 0.3 : 0.15,
        radius: 24,
        elevation: 8,
        webFallback: `0px 10px 32px ${theme.colors.shadowColor}`,
      }),
    },
    brand: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    brandIcon: {
      width: 40,
      height: 40,
      borderRadius: 16,
      backgroundColor: theme.colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    brandText: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 14,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
    },
    walletButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: theme.colors.primarySoft,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    walletText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    notificationBadge: {
      position: "absolute",
      top: -4,
      right: -4,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: theme.colors.danger,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    avatar: {
      width: 38,
      height: 38,
      borderRadius: 16,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    avatarInitials: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.onPrimary,
      letterSpacing: 0.4,
    },
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    dropdown: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      ...platformShadow({
        color: theme.colors.shadowColor,
        offsetY: 4,
        opacity: 0.2,
        radius: 12,
        elevation: 8,
      }),
    },
    walletDropdown: {
      width: 280,
    },
    notificationsDropdown: {
      width: 320,
      maxHeight: 400,
    },
    profileDropdown: {
      width: 260,
    },
    dropdownHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    dropdownTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textPrimary,
    },
    dropdownSubtitle: {
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    balanceText: {
      fontSize: 28,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    balanceLabel: {
      fontSize: 10,
      fontWeight: "600",
      color: theme.colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    progressBar: {
      height: 8,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 4,
      overflow: "hidden",
      marginBottom: 12,
    },
    progressFill: {
      height: "100%",
      backgroundColor: theme.colors.primary,
    },
    topUpButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 10,
      borderRadius: 12,
      alignItems: "center",
    },
    topUpButtonDisabled: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    topUpButtonText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.onPrimary,
    },
    warningBox: {
      marginTop: 12,
      padding: 10,
      backgroundColor: theme.colors.warningSoft,
      borderRadius: 8,
    },
    warningText: {
      fontSize: 11,
      color: theme.colors.textSecondary,
    },
    notificationList: {
      maxHeight: 320,
    },
    notificationItem: {
      flexDirection: "row",
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      gap: 12,
    },
    notificationUnread: {
      backgroundColor: theme.colors.primarySoft,
    },
    notificationIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    notificationContent: {
      flex: 1,
    },
    notificationTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    notificationMessage: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    notificationTime: {
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    emptyState: {
      paddingVertical: 40,
      alignItems: "center",
    },
    emptyStateText: {
      fontSize: 13,
      color: theme.colors.textMuted,
    },
    markAllButton: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    menuItemText: {
      fontSize: 14,
      color: theme.colors.textPrimary,
    },
    menuDivider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: 8,
    },
    logoutButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    logoutText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.danger,
    },
    profileHeader: {
      paddingBottom: 12,
      marginBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    profileName: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    profileEmail: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    progressTag: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: theme.colors.primarySoft,
      borderRadius: 8,
    },
    progressTagText: {
      fontSize: 11,
      fontWeight: "600",
      color: theme.colors.primary,
    },
  });

type NavbarProps = {
  onAvatarPress?: () => void;
};

export const Navbar: React.FC<NavbarProps> = ({ onAvatarPress }) => {
  const { theme, toggleTheme } = useAppTheme();
  const { profile, user } = useAuth();
  const { balance, maxBalance, topUpAmount, canTopUp, topUp } = useWallet();
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();
  const router = useRouter();

  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] =
    useState(false);

  const initials = React.useMemo(() => {
    const source = profile?.displayName || profile?.username || "Major";
    return source
      .split(" ")
      .filter(Boolean)
      .map((part: string) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [profile?.displayName, profile?.username]);

  // Handle profileImage - it might be a string or an object with url property
  const profileImage = React.useMemo(() => {
    const img = profile?.profileImage;
    console.log("Profile Image Data:", img); // Debug log
    if (!img) return null;
    if (typeof img === "string") return img;
    if (typeof img === "object" && img.url) return img.url;
    if (typeof img === "object" && img.uri) return img.uri;
    return null;
  }, [profile?.profileImage]);

  const walletProgress = Math.min(
    100,
    Math.round((balance / maxBalance) * 100)
  );

  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const modeIcon = theme.isDark ? "sunny" : "moon";
  const modeIconColor = theme.isDark
    ? theme.colors.chipText
    : theme.colors.primary;
  const accentIconColor = theme.colors.primary;

  const handleTopUp = () => {
    const result = topUp();
    if (result.success) {
      // Could show a success toast here
      console.log("Top-up successful:", result.amount);
    }
  };

  const handleNotificationPress = (notification: any) => {
    markAsRead(notification.id);
    setShowNotificationsDropdown(false);
    if (notification.link) {
      // Navigate to the link
      router.push(notification.link);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "message":
        return "chatbubble";
      case "streak":
        return "flame";
      case "community":
        return "people";
      case "voice_call":
        return "call";
      case "video_call":
        return "videocam";
      default:
        return "notifications";
    }
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.brand}>
          <View style={styles.brandIcon}>
            <Ionicons name="sparkles" size={18} color={accentIconColor} />
          </View>
          <Text style={styles.brandText}>Major</Text>
        </View>
        <View style={styles.actions}>
          {/* Wallet Button */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
              setShowWalletDropdown(true);
              setShowNotificationsDropdown(false);
            }}
          >
            <Ionicons name="wallet-outline" size={18} color={accentIconColor} />
          </TouchableOpacity>

          {/* Notifications Button */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
              setShowNotificationsDropdown(true);
              setShowWalletDropdown(false);
            }}
          >
            <Ionicons
              name="notifications-outline"
              size={18}
              color={accentIconColor}
            />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Theme Toggle Button */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={toggleTheme}
            accessibilityRole="button"
            accessibilityLabel="Toggle appearance"
          >
            <Ionicons name={modeIcon} size={18} color={modeIconColor} />
          </TouchableOpacity>

          {/* Profile Button */}
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => {
              router.push("/profile");
            }}
            activeOpacity={0.8}
          >
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.avatarInitials}>{initials}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Wallet Dropdown Modal */}
      <Modal
        visible={showWalletDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWalletDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowWalletDropdown(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.dropdown, styles.walletDropdown]}>
              <View style={styles.dropdownHeader}>
                <View>
                  <Text style={styles.dropdownTitle}>Wallet balance</Text>
                  <Text style={styles.dropdownSubtitle}>
                    Limit {formatCurrency(maxBalance)}
                  </Text>
                </View>
                <View style={styles.progressTag}>
                  <Text style={styles.progressTagText}>
                    {walletProgress}% full
                  </Text>
                </View>
              </View>
              <Text style={styles.balanceText}>{formatCurrency(balance)}</Text>
              <Text style={styles.balanceLabel}>Available balance</Text>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${walletProgress}%` }]}
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.topUpButton,
                  !canTopUp && styles.topUpButtonDisabled,
                ]}
                onPress={handleTopUp}
                disabled={!canTopUp}
              >
                <Text style={styles.topUpButtonText}>
                  Top up {formatCurrency(topUpAmount)}
                </Text>
              </TouchableOpacity>
              {!canTopUp && (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                    You've reached the maximum balance. Spend funds to enable
                    the next top-up.
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Notifications Dropdown Modal */}
      <Modal
        visible={showNotificationsDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotificationsDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowNotificationsDropdown(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.dropdown, styles.notificationsDropdown]}>
              <View style={styles.dropdownHeader}>
                <Text style={styles.dropdownTitle}>Notifications</Text>
                <TouchableOpacity onPress={markAllAsRead}>
                  <Text style={styles.markAllButton}>Mark all read</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.notificationList}>
                {notifications.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      You're all caught up!
                    </Text>
                  </View>
                ) : (
                  notifications.map((notification) => (
                    <TouchableOpacity
                      key={notification.id}
                      style={[
                        styles.notificationItem,
                        !notification.isRead && styles.notificationUnread,
                      ]}
                      onPress={() => handleNotificationPress(notification)}
                    >
                      <View style={styles.notificationIcon}>
                        <Ionicons
                          name={getNotificationIcon(notification.type)}
                          size={20}
                          color={accentIconColor}
                        />
                      </View>
                      <View style={styles.notificationContent}>
                        <Text style={styles.notificationTitle}>
                          {notification.title}
                        </Text>
                        {notification.message && (
                          <Text
                            style={styles.notificationMessage}
                            numberOfLines={2}
                          >
                            {notification.message}
                          </Text>
                        )}
                        <Text style={styles.notificationTime}>
                          {formatRelativeTime(notification.timestamp)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};
