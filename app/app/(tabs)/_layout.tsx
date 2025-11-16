import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Tabs, Redirect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useAuth } from "@/context/AuthContext";
import { useTabs } from "@/context/TabsContext";
import { useAppTheme } from "@/context/ThemeContext";

export default function TabsLayout() {
  const { initializing, isAuthenticated } = useAuth();
  const { selectedTabs, availableTabs } = useTabs();
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    loader: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.background,
    },
  });

  const screenOptions = {
    tabBarActiveTintColor: theme.colors.primary,
    tabBarInactiveTintColor: theme.colors.textMuted,
    tabBarLabelStyle: {
      fontSize: 12,
      fontWeight: "600" as "600",
    },
    tabBarStyle: {
      position: "absolute" as "absolute",
      bottom: 20,
      left: 0,
      right: 0,
      marginHorizontal: 16,
      height: 60,
      marginTop: 10,
      paddingBottom: 6,
      paddingTop: 6,
      borderTopWidth: 0,
      borderTopColor: "transparent",
      backgroundColor: theme.isDark
        ? "rgba(30, 35, 65, 0.85)"
        : "rgba(255, 255, 255, 0.85)",
      borderRadius: 20,
      shadowColor: theme.colors.shadowColor,
      shadowOffset: {
        width: 0,
        height: -2,
      },
      shadowOpacity: theme.isDark ? 0.3 : 0.15,
      shadowRadius: 12,
      elevation: 8,
      backdropFilter: "blur(10px)",
    },
    headerShown: false,
  };

  if (initializing) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color="#3142C6" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  // Get tab configurations for selected tabs
  const tabConfigs = selectedTabs
    .map((tabId) => availableTabs.find((t) => t.id === tabId))
    .filter(Boolean);

  // Get all tab names that should be hidden (not selected)
  // Exclude 'connect', 'leaderboard', 'analytics', 'creator-studio', 'marketplace', and 'readers-lounge' as they're handled separately
  const hiddenTabs = availableTabs
    .filter((tab) => !selectedTabs.includes(tab.id))
    .filter(
      (tab) =>
        tab.name !== "connect" &&
        tab.name !== "leaderboard" &&
        tab.name !== "analytics" &&
        tab.name !== "creator-studio" &&
        tab.name !== "marketplace" &&
        tab.name !== "readers-lounge"
    )
    .map((tab) => tab.name);

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      {tabConfigs.map((tab: any) => (
        <Tabs.Screen
          key={tab.id}
          name={tab.name}
          options={{
            title: tab.label,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={tab.icon as any} color={color} size={size} />
            ),
          }}
        />
      ))}
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" color={color} size={size} />
          ),
        }}
      />
      {/* Hidden routes - only render tabs that are NOT selected */}
      {hiddenTabs.map((tabName) => (
        <Tabs.Screen
          key={tabName}
          name={tabName}
          options={{
            href: null,
          }}
        />
      ))}
      {/* Additional hidden routes - accessible but not in tab bar - only render if NOT selected */}
      {!selectedTabs.includes("analytics") && (
        <Tabs.Screen
          name="analytics"
          options={{
            href: null,
          }}
        />
      )}
      {!selectedTabs.includes("connect") && (
        <Tabs.Screen
          name="connect"
          options={{
            href: null,
          }}
        />
      )}
      {!selectedTabs.includes("leaderboard") && (
        <Tabs.Screen
          name="leaderboard"
          options={{
            href: null,
          }}
        />
      )}
      {!selectedTabs.includes("creatorStudio") && (
        <Tabs.Screen
          name="creator-studio"
          options={{
            href: null,
          }}
        />
      )}
      {!selectedTabs.includes("marketplace") && (
        <Tabs.Screen
          name="marketplace"
          options={{
            href: null,
          }}
        />
      )}
      {!selectedTabs.includes("readersLounge") && (
        <Tabs.Screen
          name="readers-lounge"
          options={{
            href: null,
          }}
        />
      )}
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
