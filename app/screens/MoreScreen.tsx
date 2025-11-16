import React from "react";
import {
  Alert,
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
import { platformShadow } from "@/utils/shadow";

type MoreOption = {
  id: string;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  message?: string;
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
    header: {
      gap: 8,
    },
    title: {
      fontSize: 26,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    subtitle: {
      fontSize: 15,
      color: theme.colors.textSecondary,
      lineHeight: 22,
    },
    card: {
      borderRadius: 24,
      padding: 24,
      backgroundColor: theme.colors.surface,
      gap: 16,
      ...platformShadow({
        offsetY: 8,
        opacity: 0.06,
        radius: 18,
        elevation: 6,
        webFallback: "0px 8px 22px rgba(13, 27, 94, 0.06)",
      }),
    },
    list: {
      gap: 12,
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      paddingVertical: 14,
      paddingHorizontal: 18,
      borderRadius: 18,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    itemLeading: {
      width: 42,
      height: 42,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.border,
    },
    itemTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    itemDescription: {
      marginTop: 4,
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.textSecondary,
    },
    logoutButton: {
      marginTop: 12,
      paddingVertical: 16,
      borderRadius: 18,
      backgroundColor: theme.colors.danger,
      alignItems: "center",
    },
    logoutText: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.onPrimary,
    },
    infoCard: {
      borderRadius: 20,
      padding: 20,
      backgroundColor: theme.colors.primary,
      gap: 8,
      ...platformShadow({
        offsetY: 10,
        opacity: 0.14,
        radius: 20,
        elevation: 8,
        webFallback: "0px 10px 28px rgba(13, 27, 94, 0.14)",
      }),
    },
    infoTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.onPrimary,
    },
    infoText: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.onPrimary,
    },
  });

const options: MoreOption[] = [
  {
    id: "edit",
    label: "Edit Tabs",
    description:
      "Customize which 3 sections appear in your main navigation bar.",
    icon: "create-outline",
  },
  {
    id: "leaderboard",
    label: "Leaderboard",
    description:
      "Track the top creators, streaks, and achievements across Major.",
    icon: "trophy-outline",
  },
  {
    id: "social",
    label: "Social",
    description:
      "Engage with your network, send reactions, and celebrate wins together.",
    icon: "heart-outline",
  },
  {
    id: "analytics",
    label: "Analytics",
    description:
      "Measure growth, audience reach, and story performance in detail.",
    icon: "analytics-outline",
  },
  {
    id: "creatorStudio",
    label: "Creator Studio",
    description:
      "Plan launches, manage drafts, and organise campaign deliverables.",
    icon: "create-outline",
  },
  {
    id: "marketplace",
    label: "Marketplace",
    description:
      "Discover publishing opportunities and monetise your catalogue.",
    icon: "storefront-outline",
  },
  {
    id: "readersLounge",
    label: "Reader's Lounge",
    description:
      "Host listening sessions, share resources, and connect live with readers.",
    icon: "library-outline",
  },
  {
    id: "settings",
    label: "Settings",
    description:
      "Update your preferences, notifications, and workspace controls.",
    icon: "settings-outline",
  },
  {
    id: "contact",
    label: "Contact & Support",
    description: "Reach the Major support team when you need a hand.",
    icon: "help-buoy-outline",
  },
  {
    id: "upgrade",
    label: "Upgrade",
    description: "Unlock advanced analytics, automation, and partner perks.",
    icon: "star-outline",
  },
  {
    id: "connect",
    label: "Connect",
    description:
      "Jump into direct chats and collaborative spaces with your circles.",
    icon: "chatbubbles-outline",
  },
];

export const MoreScreen: React.FC = () => {
  const router = useRouter();
  const { logout } = useAuth();
  const { theme } = useAppTheme();

  const handleOptionPress = React.useCallback(
    (option: MoreOption) => {
      if (option.id === "edit") {
        router.push("/edit-tabs");
        return;
      }

      if (option.id === "connect") {
        router.push("/(tabs)/connect");
        return;
      }

      if (option.id === "social") {
        router.push("/(tabs)/social");
        return;
      }

      if (option.id === "leaderboard") {
        router.push("/(tabs)/leaderboard");
        return;
      }

      if (option.id === "analytics") {
        router.push("/(tabs)/analytics");
        return;
      }

      if (option.id === "creatorStudio") {
        router.push("/(tabs)/creator-studio");
        return;
      }

      if (option.id === "marketplace") {
        router.push("/(tabs)/marketplace");
        return;
      }

      if (option.id === "readersLounge") {
        router.push("/(tabs)/readers-lounge");
        return;
      }

      if (option.id === "contact") {
        router.push("/contact");
        return;
      }

      if (option.id === "upgrade") {
        router.push("/upgrade");
        return;
      }

      if (option.id === "settings") {
        router.push("/(tabs)/settings");
        return;
      }

      Alert.alert(
        `${option.label} on mobile`,
        option.message ??
          "This section is optimised for the Major web dashboard today. Open the web experience to continue, or stay tuned for the mobile release."
      );
    },
    [router]
  );

  const handleLogout = React.useCallback(async () => {
    await logout();
    router.replace("/(auth)/login");
  }, [logout, router]);

  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <View style={styles.navbarWrapper}>
        <Navbar onAvatarPress={() => router.push("/(tabs)/profile")} />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingTop: 130 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>More</Text>
          <Text style={styles.subtitle}>
            Access the rest of the Major workspace — from analytics and social
            tools to support resources and account preferences.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.list}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.item}
                onPress={() => handleOptionPress(option)}
                activeOpacity={0.85}
              >
                <View style={styles.itemLeading}>
                  <Ionicons
                    name={option.icon}
                    color={theme.colors.primary}
                    size={20}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{option.label}</Text>
                  <Text style={styles.itemDescription}>
                    {option.description}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  color={theme.colors.textSecondary}
                  size={18}
                />
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.85}
          >
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Best experienced on web</Text>
          <Text style={styles.infoText}>
            We are bringing every dashboard module to mobile soon. Until then,
            continue on the desktop workspace for full controls and deep
            insights.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};
