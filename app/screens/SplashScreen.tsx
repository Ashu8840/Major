import React from "react";
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { AppTheme, useAppTheme } from "@/context/ThemeContext";

const createStyles = (theme: AppTheme) => {
  const { width } = Dimensions.get("window");
  const circleSize = Math.min(width * 0.9, 420);

  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.background,
    },
    glow: {
      position: "absolute",
      width: circleSize,
      height: circleSize,
      borderRadius: circleSize / 2,
      backgroundColor: theme.colors.accentSoft,
      opacity: theme.isDark ? 0.18 : 0.14,
      transform: [{ scale: theme.isDark ? 1.15 : 1.05 }],
    },
    card: {
      width: "82%",
      maxWidth: 360,
      borderRadius: 32,
      paddingVertical: 36,
      paddingHorizontal: 28,
      backgroundColor: theme.colors.surfaceTransparent,
      borderWidth: 1,
      borderColor: theme.isDark
        ? theme.colors.borderMuted
        : "rgba(226, 231, 255, 0.6)",
      alignItems: "center",
      gap: 22,
      shadowColor: theme.colors.shadowColor,
      shadowOpacity: theme.isDark ? 0.35 : 0.18,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 18 },
      elevation: 10,
    },
    logo: {
      width: 72,
      height: 72,
      borderRadius: 24,
      backgroundColor: theme.colors.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: theme.colors.shadowColor,
      shadowOpacity: theme.isDark ? 0.4 : 0.2,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: theme.colors.textPrimary,
    },
    subtitle: {
      fontSize: 16,
      lineHeight: 22,
      textAlign: "center",
      color: theme.colors.textMuted,
    },
    footer: {
      alignItems: "center",
      gap: 8,
      paddingTop: 8,
    },
    statusText: {
      fontSize: 13,
      color: theme.colors.textSoft,
      letterSpacing: 0.4,
    },
  });
};

type SplashScreenProps = {
  status?: string;
};

export const SplashScreen: React.FC<SplashScreenProps> = ({ status }) => {
  const { theme } = useAppTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <View style={styles.glow} />
      <View style={styles.card}>
        <View style={styles.logo}>
          <Ionicons name="sparkles" size={28} color={theme.colors.onPrimary} />
        </View>
        <View>
          <Text style={styles.title}>Major</Text>
        </View>
        <Text style={styles.subtitle}>
          Bringing your creative hub online. We're getting things ready.
        </Text>
        <View style={styles.footer}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.statusText}>
            {status ?? "Syncing your writing space..."}
          </Text>
        </View>
      </View>
    </View>
  );
};
