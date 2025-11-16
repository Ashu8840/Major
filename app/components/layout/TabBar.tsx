import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import { useAppTheme } from "@/context/ThemeContext";
import { useTabs } from "@/context/TabsContext";

export const TabBar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useAppTheme();
  const { selectedTabs, availableTabs } = useTabs();

  // Get the three selected tabs
  const tabConfigs = selectedTabs
    .map((tabId) => availableTabs.find((t) => t.id === tabId))
    .filter(Boolean);

  const styles = StyleSheet.create({
    container: {
      position: "absolute",
      bottom: 20,
      left: 0,
      right: 0,
      marginHorizontal: 16,
      height: 60,
      backgroundColor: theme.isDark
        ? "rgba(30, 35, 65, 0.85)"
        : "rgba(255, 255, 255, 0.85)",
      borderRadius: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      paddingHorizontal: 8,
      shadowColor: theme.colors.shadowColor,
      shadowOffset: {
        width: 0,
        height: -2,
      },
      shadowOpacity: theme.isDark ? 0.3 : 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    tab: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8,
    },
    tabLabel: {
      fontSize: 12,
      fontWeight: "600",
      marginTop: 4,
    },
  });

  const isActive = (routeName: string) => {
    return pathname.includes(routeName);
  };

  const handlePress = (routeName: string) => {
    router.push(`/(tabs)/${routeName}` as any);
  };

  return (
    <View style={styles.container}>
      {tabConfigs.map((tab) => {
        if (!tab) return null;
        const active = isActive(tab.name);
        const color = active ? theme.colors.primary : theme.colors.textMuted;

        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => handlePress(tab.name)}
          >
            <Ionicons name={tab.icon as any} size={24} color={color} />
            <Text style={[styles.tabLabel, { color }]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
