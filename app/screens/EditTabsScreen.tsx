import React, { useState } from "react";
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
import { useTabs, ALL_TAB_OPTIONS } from "@/context/TabsContext";
import { platformShadow } from "@/utils/shadow";
import { AppTheme, useAppTheme } from "@/context/ThemeContext";

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingHorizontal: 24,
      paddingBottom: 90,
      paddingTop: 130,
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
    infoCard: {
      borderRadius: 18,
      padding: 16,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    infoText: {
      fontSize: 14,
      color: theme.colors.primary,
      lineHeight: 20,
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
      }),
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 8,
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
      borderWidth: 2,
      borderColor: theme.colors.border,
    },
    itemSelected: {
      backgroundColor: theme.isDark
        ? theme.colors.primary + "20"
        : theme.colors.surfaceMuted,
      borderColor: theme.colors.primary,
    },
    itemLeading: {
      width: 42,
      height: 42,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
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
      color: theme.colors.textMuted,
    },
    checkmark: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    selectedCount: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginTop: 8,
    },
    saveButton: {
      marginTop: 12,
      paddingVertical: 16,
      borderRadius: 18,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
    },
    saveButtonDisabled: {
      backgroundColor: theme.colors.surfaceMuted,
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.onPrimary,
    },
  });

export const EditTabsScreen: React.FC = () => {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { selectedTabs, setSelectedTabs } = useTabs();
  const [tempSelected, setTempSelected] = useState<string[]>(selectedTabs);

  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const handleToggleTab = (tabId: string) => {
    if (tempSelected.includes(tabId)) {
      // Remove if already selected
      setTempSelected(tempSelected.filter((id) => id !== tabId));
    } else {
      // Add if not selected and less than 3 selected
      if (tempSelected.length < 3) {
        setTempSelected([...tempSelected, tabId]);
      } else {
        Alert.alert(
          "Maximum Reached",
          "You can only select 3 tabs. Please deselect one before adding another."
        );
      }
    }
  };

  const handleSave = async () => {
    if (tempSelected.length !== 3) {
      Alert.alert(
        "Selection Required",
        "Please select exactly 3 tabs to display."
      );
      return;
    }

    await setSelectedTabs(tempSelected);
    Alert.alert(
      "Success",
      "Your tab preferences have been saved. Please restart the app to see the changes.",
      [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]
    );
  };

  const isTabSelected = (tabId: string) => tempSelected.includes(tabId);

  return (
    <View style={styles.container}>
      <View style={styles.navbarWrapper}>
        <Navbar onAvatarPress={() => router.push("/(tabs)/profile")} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Customize Tabs</Text>
          <Text style={styles.subtitle}>
            Select any 3 sections to display in your main navigation. Home and
            More tabs are always visible.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            💡 Choose the features you use most often for quick access. You can
            always change this later from the More section.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Available Sections</Text>
          <Text style={styles.selectedCount}>
            {tempSelected.length} of 3 selected
          </Text>

          <View style={styles.list}>
            {ALL_TAB_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.item,
                  isTabSelected(option.id) && styles.itemSelected,
                ]}
                onPress={() => handleToggleTab(option.id)}
                activeOpacity={0.85}
              >
                <View style={styles.itemLeading}>
                  <Ionicons
                    name={option.icon as any}
                    color="#3142C6"
                    size={20}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{option.label}</Text>
                  <Text style={styles.itemDescription}>
                    {option.description}
                  </Text>
                </View>
                {isTabSelected(option.id) && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark" color="#FFFFFF" size={16} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.saveButton,
              tempSelected.length !== 3 && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={tempSelected.length !== 3}
          >
            <Text style={styles.saveButtonText}>Save Preferences</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};
