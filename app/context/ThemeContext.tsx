import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance, Platform } from "react-native";
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  type Theme as NavigationTheme,
} from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";

export type ThemeName =
  | "ocean-blue"
  | "jungle"
  | "dark-night"
  | "sunset"
  | "vibrant"
  | "romance";

export type AppTheme = {
  name: ThemeName;
  isDark: boolean;
  colors: {
    background: string;
    surface: string;
    surfaceElevated: string;
    surfaceMuted: string;
    surfaceAlt: string;
    surfaceTransparent: string;
    primary: string;
    primarySoft: string;
    primaryStrong: string;
    onPrimary: string;
    accent: string;
    accentSoft: string;
    success: string;
    successSoft: string;
    warning: string;
    warningSoft: string;
    danger: string;
    dangerSoft: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    textSoft: string;
    textInverted: string;
    border: string;
    borderMuted: string;
    borderStrong: string;
    chipBackground: string;
    chipBackgroundActive: string;
    chipText: string;
    chipTextActive: string;
    tagBackground: string;
    tagText: string;
    shadowColor: string;
    heroCard: string;
    heroCardSecondary: string;
    heroLabel: string;
    heroMuted: string;
    overlay: string;
    chartPositive: string;
    chartNeutral: string;
    chartNegative: string;
    inputBackground: string;
    inputBorder: string;
    inputPlaceholder: string;
  };
};

const oceanBlueTheme: AppTheme = {
  name: "ocean-blue",
  isDark: false,
  colors: {
    background: "#F4F6FE",
    surface: "#FFFFFF",
    surfaceElevated: "#FFFFFF",
    surfaceMuted: "#EEF1FF",
    surfaceAlt: "#F8F9FF",
    surfaceTransparent: "rgba(255, 255, 255, 0.92)",
    primary: "#3142C6",
    primarySoft: "#E6EAFF",
    primaryStrong: "#22309A",
    onPrimary: "#FFFFFF",
    accent: "#8B5CF6",
    accentSoft: "#F3E8FF",
    success: "#10B981",
    successSoft: "#DCFCE7",
    warning: "#F59E0B",
    warningSoft: "#FEF3C7",
    danger: "#E11D48",
    dangerSoft: "#FEE2E2",
    textPrimary: "#1A224A",
    textSecondary: "#3E4671",
    textMuted: "#5F6DAF",
    textSoft: "#8F96C7",
    textInverted: "#FFFFFF",
    border: "#E2E7FF",
    borderMuted: "#D9DEFF",
    borderStrong: "#C3CAFC",
    chipBackground: "#E8ECFF",
    chipBackgroundActive: "#3142C6",
    chipText: "#3142C6",
    chipTextActive: "#FFFFFF",
    tagBackground: "#EEF1FF",
    tagText: "#4B5CD7",
    shadowColor: "rgba(13, 27, 94, 0.18)",
    heroCard: "#323EBE",
    heroCardSecondary: "#4C53D6",
    heroLabel: "rgba(230, 234, 254, 0.92)",
    heroMuted: "rgba(230, 234, 254, 0.75)",
    overlay: "rgba(14, 21, 48, 0.45)",
    chartPositive: "#34D399",
    chartNeutral: "#60A5FA",
    chartNegative: "#F87171",
    inputBackground: "#F9FAFF",
    inputBorder: "#D9DEFF",
    inputPlaceholder: "#8F96C7",
  },
};

const jungleTheme: AppTheme = {
  name: "jungle",
  isDark: false,
  colors: {
    background: "#F0F9F4",
    surface: "#FFFFFF",
    surfaceElevated: "#FFFFFF",
    surfaceMuted: "#E6F7ED",
    surfaceAlt: "#F5FBF7",
    surfaceTransparent: "rgba(255, 255, 255, 0.92)",
    primary: "#10B981",
    primarySoft: "#D1FAE5",
    primaryStrong: "#059669",
    onPrimary: "#FFFFFF",
    accent: "#34D399",
    accentSoft: "#A7F3D0",
    success: "#10B981",
    successSoft: "#DCFCE7",
    warning: "#F59E0B",
    warningSoft: "#FEF3C7",
    danger: "#E11D48",
    dangerSoft: "#FEE2E2",
    textPrimary: "#064E3B",
    textSecondary: "#047857",
    textMuted: "#059669",
    textSoft: "#10B981",
    textInverted: "#FFFFFF",
    border: "#D1FAE5",
    borderMuted: "#A7F3D0",
    borderStrong: "#6EE7B7",
    chipBackground: "#D1FAE5",
    chipBackgroundActive: "#10B981",
    chipText: "#059669",
    chipTextActive: "#FFFFFF",
    tagBackground: "#E6F7ED",
    tagText: "#047857",
    shadowColor: "rgba(5, 150, 105, 0.18)",
    heroCard: "#047857",
    heroCardSecondary: "#059669",
    heroLabel: "rgba(209, 250, 229, 0.92)",
    heroMuted: "rgba(209, 250, 229, 0.75)",
    overlay: "rgba(6, 78, 59, 0.45)",
    chartPositive: "#34D399",
    chartNeutral: "#10B981",
    chartNegative: "#F87171",
    inputBackground: "#F5FBF7",
    inputBorder: "#D1FAE5",
    inputPlaceholder: "#10B981",
  },
};

const darkNightTheme: AppTheme = {
  name: "dark-night",
  isDark: true,
  colors: {
    background: "#0E1426",
    surface: "#151C35",
    surfaceElevated: "#1C2444",
    surfaceMuted: "#202B52",
    surfaceAlt: "#1A2242",
    surfaceTransparent: "rgba(21, 28, 53, 0.92)",
    primary: "#7C8BFF",
    primarySoft: "#2F3C79",
    primaryStrong: "#AEB6FF",
    onPrimary: "#0B1024",
    accent: "#A855F7",
    accentSoft: "#352358",
    success: "#34D399",
    successSoft: "#1F3A3F",
    warning: "#FBBF24",
    warningSoft: "#3A2E15",
    danger: "#F87171",
    dangerSoft: "#3B1F2B",
    textPrimary: "#E6ECFF",
    textSecondary: "#C7D2FF",
    textMuted: "#9AA4D6",
    textSoft: "#7D86B8",
    textInverted: "#0E1426",
    border: "#27325A",
    borderMuted: "#2F3A68",
    borderStrong: "#3E4A77",
    chipBackground: "#2A3561",
    chipBackgroundActive: "#7C8BFF",
    chipText: "#BFD1FF",
    chipTextActive: "#0B1024",
    tagBackground: "#2A3969",
    tagText: "#AFC5FF",
    shadowColor: "rgba(3, 8, 33, 0.65)",
    heroCard: "#1F2A68",
    heroCardSecondary: "#283B94",
    heroLabel: "rgba(209, 217, 255, 0.95)",
    heroMuted: "rgba(209, 217, 255, 0.68)",
    overlay: "rgba(4, 9, 23, 0.6)",
    chartPositive: "#34D399",
    chartNeutral: "#8AB6FF",
    chartNegative: "#FB7185",
    inputBackground: "#202B52",
    inputBorder: "#2F3A68",
    inputPlaceholder: "#7F89B5",
  },
};

const sunsetTheme: AppTheme = {
  name: "sunset",
  isDark: false,
  colors: {
    background: "#FFF7ED",
    surface: "#FFFFFF",
    surfaceElevated: "#FFFFFF",
    surfaceMuted: "#FFEDD5",
    surfaceAlt: "#FFF4E6",
    surfaceTransparent: "rgba(255, 255, 255, 0.92)",
    primary: "#F97316",
    primarySoft: "#FFEDD5",
    primaryStrong: "#EA580C",
    onPrimary: "#FFFFFF",
    accent: "#FB923C",
    accentSoft: "#FED7AA",
    success: "#10B981",
    successSoft: "#DCFCE7",
    warning: "#F59E0B",
    warningSoft: "#FEF3C7",
    danger: "#E11D48",
    dangerSoft: "#FEE2E2",
    textPrimary: "#7C2D12",
    textSecondary: "#9A3412",
    textMuted: "#C2410C",
    textSoft: "#EA580C",
    textInverted: "#FFFFFF",
    border: "#FED7AA",
    borderMuted: "#FDBA74",
    borderStrong: "#FB923C",
    chipBackground: "#FFEDD5",
    chipBackgroundActive: "#F97316",
    chipText: "#EA580C",
    chipTextActive: "#FFFFFF",
    tagBackground: "#FFF4E6",
    tagText: "#C2410C",
    shadowColor: "rgba(234, 88, 12, 0.18)",
    heroCard: "#EA580C",
    heroCardSecondary: "#F97316",
    heroLabel: "rgba(255, 237, 213, 0.92)",
    heroMuted: "rgba(255, 237, 213, 0.75)",
    overlay: "rgba(124, 45, 18, 0.45)",
    chartPositive: "#34D399",
    chartNeutral: "#FB923C",
    chartNegative: "#F87171",
    inputBackground: "#FFF4E6",
    inputBorder: "#FED7AA",
    inputPlaceholder: "#EA580C",
  },
};

const vibrantTheme: AppTheme = {
  name: "vibrant",
  isDark: false,
  colors: {
    background: "#FEFCE8",
    surface: "#FFFFFF",
    surfaceElevated: "#FFFFFF",
    surfaceMuted: "#FEF9C3",
    surfaceAlt: "#FFFBEB",
    surfaceTransparent: "rgba(255, 255, 255, 0.92)",
    primary: "#EAB308",
    primarySoft: "#FEF9C3",
    primaryStrong: "#CA8A04",
    onPrimary: "#FFFFFF",
    accent: "#FACC15",
    accentSoft: "#FEF08A",
    success: "#10B981",
    successSoft: "#DCFCE7",
    warning: "#F59E0B",
    warningSoft: "#FEF3C7",
    danger: "#E11D48",
    dangerSoft: "#FEE2E2",
    textPrimary: "#713F12",
    textSecondary: "#854D0E",
    textMuted: "#A16207",
    textSoft: "#CA8A04",
    textInverted: "#FFFFFF",
    border: "#FEF08A",
    borderMuted: "#FDE047",
    borderStrong: "#FACC15",
    chipBackground: "#FEF9C3",
    chipBackgroundActive: "#EAB308",
    chipText: "#CA8A04",
    chipTextActive: "#FFFFFF",
    tagBackground: "#FFFBEB",
    tagText: "#A16207",
    shadowColor: "rgba(202, 138, 4, 0.18)",
    heroCard: "#CA8A04",
    heroCardSecondary: "#EAB308",
    heroLabel: "rgba(254, 249, 195, 0.92)",
    heroMuted: "rgba(254, 249, 195, 0.75)",
    overlay: "rgba(113, 63, 18, 0.45)",
    chartPositive: "#34D399",
    chartNeutral: "#FACC15",
    chartNegative: "#F87171",
    inputBackground: "#FFFBEB",
    inputBorder: "#FEF08A",
    inputPlaceholder: "#CA8A04",
  },
};

const romanceTheme: AppTheme = {
  name: "romance",
  isDark: false,
  colors: {
    background: "#FDF2F8",
    surface: "#FFFFFF",
    surfaceElevated: "#FFFFFF",
    surfaceMuted: "#FCE7F3",
    surfaceAlt: "#FEF5FB",
    surfaceTransparent: "rgba(255, 255, 255, 0.92)",
    primary: "#EC4899",
    primarySoft: "#FCE7F3",
    primaryStrong: "#DB2777",
    onPrimary: "#FFFFFF",
    accent: "#F472B6",
    accentSoft: "#FBCFE8",
    success: "#10B981",
    successSoft: "#DCFCE7",
    warning: "#F59E0B",
    warningSoft: "#FEF3C7",
    danger: "#E11D48",
    dangerSoft: "#FEE2E2",
    textPrimary: "#831843",
    textSecondary: "#9F1239",
    textMuted: "#BE185D",
    textSoft: "#DB2777",
    textInverted: "#FFFFFF",
    border: "#FBCFE8",
    borderMuted: "#F9A8D4",
    borderStrong: "#F472B6",
    chipBackground: "#FCE7F3",
    chipBackgroundActive: "#EC4899",
    chipText: "#DB2777",
    chipTextActive: "#FFFFFF",
    tagBackground: "#FEF5FB",
    tagText: "#BE185D",
    shadowColor: "rgba(219, 39, 119, 0.18)",
    heroCard: "#DB2777",
    heroCardSecondary: "#EC4899",
    heroLabel: "rgba(252, 231, 243, 0.92)",
    heroMuted: "rgba(252, 231, 243, 0.75)",
    overlay: "rgba(131, 24, 67, 0.45)",
    chartPositive: "#34D399",
    chartNeutral: "#F472B6",
    chartNegative: "#F87171",
    inputBackground: "#FEF5FB",
    inputBorder: "#FBCFE8",
    inputPlaceholder: "#DB2777",
  },
};

const THEMES: Record<ThemeName, AppTheme> = {
  "ocean-blue": oceanBlueTheme,
  jungle: jungleTheme,
  "dark-night": darkNightTheme,
  sunset: sunsetTheme,
  vibrant: vibrantTheme,
  romance: romanceTheme,
};

const THEME_STORAGE_KEY = "major-appearance";

const memoryStore = new Map<string, string>();

const storage = {
  getItem: async (key: string) => {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") {
        return memoryStore.get(key) ?? null;
      }
      try {
        return window.localStorage.getItem(key);
      } catch (error) {
        console.warn("Theme storage read failed", error);
        return memoryStore.get(key) ?? null;
      }
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") {
        memoryStore.set(key, value);
        return;
      }
      try {
        window.localStorage.setItem(key, value);
      } catch (error) {
        console.warn("Theme storage write failed", error);
        memoryStore.set(key, value);
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
};

const createNavigationTheme = (theme: AppTheme): NavigationTheme => {
  const base = theme.isDark ? NavigationDarkTheme : NavigationDefaultTheme;
  return {
    ...base,
    dark: theme.isDark,
    colors: {
      ...base.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.textPrimary,
      border: theme.colors.border,
      notification: theme.colors.accent,
    },
  };
};

type ThemeContextValue = {
  theme: AppTheme;
  themeName: ThemeName;
  isDark: boolean;
  ready: boolean;
  setThemeName: (value: ThemeName) => void;
  toggleTheme: () => void;
  navigationTheme: NavigationTheme;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const AppThemeProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const systemPreference = Appearance?.getColorScheme?.() ?? "light";
  const systemDefault: ThemeName =
    systemPreference === "dark" ? "dark-night" : "ocean-blue";

  const [themeName, setThemeName] = useState<ThemeName>(systemDefault);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stored = await storage.getItem(THEME_STORAGE_KEY);
        const validThemes: ThemeName[] = [
          "ocean-blue",
          "jungle",
          "dark-night",
          "sunset",
          "vibrant",
          "romance",
        ];
        if (stored && validThemes.includes(stored as ThemeName)) {
          if (mounted) {
            setThemeName(stored as ThemeName);
          }
        }
      } catch (error) {
        console.warn("Theme preference restore failed", error);
      } finally {
        if (mounted) {
          setReady(true);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    storage
      .setItem(THEME_STORAGE_KEY, themeName)
      .catch((error) => console.warn("Theme preference persist failed", error));
  }, [themeName, ready]);

  const applyTheme = useCallback((value: ThemeName) => {
    setThemeName(value);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeName((current) =>
      current === "dark-night" ? "ocean-blue" : "dark-night"
    );
  }, []);

  const theme = THEMES[themeName];
  const navigationTheme = useMemo(() => createNavigationTheme(theme), [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      themeName,
      isDark: theme.isDark,
      ready,
      setThemeName: applyTheme,
      toggleTheme,
      navigationTheme,
    }),
    [theme, themeName, ready, applyTheme, toggleTheme, navigationTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within an AppThemeProvider");
  }
  return context;
};
