import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// Theme names matching the mobile app
export const THEME_NAMES = [
  "ocean-blue",
  "jungle",
  "dark-night",
  "sunset",
  "vibrant",
  "romance",
];

// Theme configurations with CSS variables and Tailwind classes
export const THEMES = {
  "ocean-blue": {
    name: "Ocean Blue",
    isDark: false,
    icon: "sunny",
    description: "Clean and professional",
    colors: {
      background: "#EEF2FF",
      surface: "#FFFFFF",
      primary: "#2563EB",
      primarySoft: "#DBEAFE",
      accent: "#7C3AED",
      textPrimary: "#0F172A",
      textSecondary: "#334155",
      border: "#CBD5E1",
    },
    darkColors: {
      background: "#0F172A",
      surface: "#1E293B",
      primary: "#60A5FA",
      primarySoft: "#1E3A5F",
      accent: "#A78BFA",
      textPrimary: "#F1F5F9",
      textSecondary: "#CBD5E1",
      border: "#334155",
    },
    gradientFrom: "from-blue-50",
    gradientTo: "to-white",
    primaryBg: "bg-blue-600",
  },
  jungle: {
    name: "Jungle",
    isDark: false,
    icon: "leaf",
    description: "Earthy and natural 🌿",
    colors: {
      background: "#ECFDF5",
      surface: "#FFFFFF",
      primary: "#059669",
      primarySoft: "#D1FAE5",
      accent: "#10B981",
      textPrimary: "#0F172A",
      textSecondary: "#334155",
      border: "#A7F3D0",
    },
    darkColors: {
      background: "#022C22",
      surface: "#064E3B",
      primary: "#34D399",
      primarySoft: "#065F46",
      accent: "#6EE7B7",
      textPrimary: "#F1F5F9",
      textSecondary: "#CBD5E1",
      border: "#047857",
    },
    gradientFrom: "from-green-50",
    gradientTo: "to-emerald-50",
    primaryBg: "bg-green-600",
  },
  "dark-night": {
    name: "Dark Night",
    isDark: true,
    icon: "moon",
    description: "Easy on the eyes 🌙",
    colors: {
      background: "#0F172A",
      surface: "#1E293B",
      primary: "#818CF8",
      primarySoft: "#312E81",
      accent: "#A78BFA",
      textPrimary: "#F1F5F9",
      textSecondary: "#CBD5E1",
      border: "#334155",
    },
    darkColors: {
      background: "#0F172A",
      surface: "#1E293B",
      primary: "#818CF8",
      primarySoft: "#312E81",
      accent: "#A78BFA",
      textPrimary: "#F1F5F9",
      textSecondary: "#CBD5E1",
      border: "#334155",
    },
    gradientFrom: "from-gray-900",
    gradientTo: "to-slate-900",
    primaryBg: "bg-indigo-500",
  },
  sunset: {
    name: "Sunset",
    isDark: false,
    icon: "flame",
    description: "Warm and vibrant 🌅",
    colors: {
      background: "#FFF7ED",
      surface: "#FFFFFF",
      primary: "#EA580C",
      primarySoft: "#FFEDD5",
      accent: "#F97316",
      textPrimary: "#0F172A",
      textSecondary: "#334155",
      border: "#FED7AA",
    },
    darkColors: {
      background: "#431407",
      surface: "#7C2D12",
      primary: "#FB923C",
      primarySoft: "#9A3412",
      accent: "#FDBA74",
      textPrimary: "#F1F5F9",
      textSecondary: "#CBD5E1",
      border: "#C2410C",
    },
    gradientFrom: "from-orange-50",
    gradientTo: "to-amber-50",
    primaryBg: "bg-orange-500",
  },
  vibrant: {
    name: "Vibrant",
    isDark: false,
    icon: "flash",
    description: "Bold and energetic ⚡",
    colors: {
      background: "#FAF5FF",
      surface: "#FFFFFF",
      primary: "#9333EA",
      primarySoft: "#F3E8FF",
      accent: "#A855F7",
      textPrimary: "#0F172A",
      textSecondary: "#334155",
      border: "#E9D5FF",
    },
    darkColors: {
      background: "#2E1065",
      surface: "#4C1D95",
      primary: "#C084FC",
      primarySoft: "#6B21A8",
      accent: "#D8B4FE",
      textPrimary: "#F1F5F9",
      textSecondary: "#CBD5E1",
      border: "#7C3AED",
    },
    gradientFrom: "from-purple-50",
    gradientTo: "to-violet-50",
    primaryBg: "bg-purple-600",
  },
  romance: {
    name: "Romance",
    isDark: false,
    icon: "heart",
    description: "Soft and dreamy 💕",
    colors: {
      background: "#FDF2F8",
      surface: "#FFFFFF",
      primary: "#DB2777",
      primarySoft: "#FCE7F3",
      accent: "#EC4899",
      textPrimary: "#0F172A",
      textSecondary: "#334155",
      border: "#FBCFE8",
    },
    darkColors: {
      background: "#500724",
      surface: "#831843",
      primary: "#F472B6",
      primarySoft: "#9D174D",
      accent: "#F9A8D4",
      textPrimary: "#F1F5F9",
      textSecondary: "#CBD5E1",
      border: "#BE185D",
    },
    gradientFrom: "from-pink-50",
    gradientTo: "to-rose-50",
    primaryBg: "bg-pink-500",
  },
};

const THEME_STORAGE_KEY = "soulspace-theme";
const DARK_MODE_STORAGE_KEY = "theme";

const ThemeContext = createContext(undefined);

export function ThemeProvider({ children }) {
  const [themeName, setThemeName] = useState(() => {
    if (typeof window === "undefined") return "ocean-blue";
    const stored = window.localStorage?.getItem(THEME_STORAGE_KEY);
    if (stored && THEME_NAMES.includes(stored)) {
      return stored;
    }
    return "ocean-blue";
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = window.localStorage?.getItem(DARK_MODE_STORAGE_KEY);
    if (saved === "dark" || saved === "light") {
      return saved === "dark";
    }
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  // Apply dark mode class to document
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Apply theme CSS variables
  useEffect(() => {
    if (typeof document === "undefined") return;
    const theme = THEMES[themeName];
    if (!theme) return;

    // Use darkColors when dark mode is active, otherwise use light colors
    const colors =
      isDarkMode && theme.darkColors ? theme.darkColors : theme.colors;

    const root = document.documentElement;
    root.style.setProperty("--theme-background", colors.background);
    root.style.setProperty("--theme-surface", colors.surface);
    root.style.setProperty("--theme-primary", colors.primary);
    root.style.setProperty("--theme-primary-soft", colors.primarySoft);
    root.style.setProperty("--theme-accent", colors.accent);
    root.style.setProperty("--theme-text-primary", colors.textPrimary);
    root.style.setProperty("--theme-text-secondary", colors.textSecondary);
    root.style.setProperty("--theme-border", colors.border);

    // Store theme preference
    window.localStorage?.setItem(THEME_STORAGE_KEY, themeName);
  }, [themeName, isDarkMode]);

  // Listen for system dark mode changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (event) => {
      const stored = window.localStorage?.getItem(DARK_MODE_STORAGE_KEY);
      if (!stored) {
        setIsDarkMode(event.matches);
      }
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage?.setItem(
          DARK_MODE_STORAGE_KEY,
          next ? "dark" : "light",
        );
      }
      return next;
    });
  }, []);

  const setTheme = useCallback((name) => {
    if (THEME_NAMES.includes(name)) {
      setThemeName(name);
      // If selecting dark-night theme, also enable dark mode
      if (name === "dark-night") {
        setIsDarkMode(true);
        window.localStorage?.setItem(DARK_MODE_STORAGE_KEY, "dark");
      }
      // Don't force light mode for other themes - let user toggle independently
    }
  }, []);

  const theme = THEMES[themeName];

  const value = useMemo(
    () => ({
      theme,
      themeName,
      isDarkMode,
      setTheme,
      toggleDarkMode,
      themes: THEMES,
      themeNames: THEME_NAMES,
    }),
    [theme, themeName, isDarkMode, setTheme, toggleDarkMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export default ThemeContext;
