import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type TabOption = {
  id: string;
  name: string;
  label: string;
  icon: string;
  description: string;
};

// All available tabs including the ones currently in tabs
export const ALL_TAB_OPTIONS: TabOption[] = [
  {
    id: "diary",
    name: "diary",
    label: "Diary",
    icon: "book-outline",
    description: "Your personal journal and daily entries",
  },
  {
    id: "community",
    name: "community",
    label: "Community",
    icon: "people-outline",
    description: "Connect and engage with the community",
  },
  {
    id: "profile",
    name: "profile",
    label: "Profile",
    icon: "person-circle-outline",
    description: "View and manage your profile",
  },
  {
    id: "leaderboard",
    name: "leaderboard",
    label: "Leaderboard",
    icon: "trophy-outline",
    description: "Track top creators and achievements",
  },
  {
    id: "social",
    name: "social",
    label: "Social",
    icon: "heart-outline",
    description: "Engage with your network",
  },
  {
    id: "analytics",
    name: "analytics",
    label: "Analytics",
    icon: "analytics-outline",
    description: "Measure growth and performance",
  },
  {
    id: "creatorStudio",
    name: "creator-studio",
    label: "Creator Studio",
    icon: "create-outline",
    description: "Plan launches and manage drafts",
  },
  {
    id: "marketplace",
    name: "marketplace",
    label: "Marketplace",
    icon: "storefront-outline",
    description: "Discover publishing opportunities",
  },
  {
    id: "readersLounge",
    name: "readers-lounge",
    label: "Reader's Lounge",
    icon: "library-outline",
    description: "Connect with readers",
  },
];

const DEFAULT_TABS = ["diary", "community", "profile"];
const STORAGE_KEY = "@major_custom_tabs";

type TabsContextType = {
  selectedTabs: string[];
  setSelectedTabs: (tabs: string[]) => Promise<void>;
  availableTabs: TabOption[];
};

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export const TabsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [selectedTabs, setSelectedTabsState] = useState<string[]>(DEFAULT_TABS);

  useEffect(() => {
    loadSelectedTabs();
  }, []);

  const loadSelectedTabs = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const tabs = JSON.parse(stored);
        setSelectedTabsState(tabs);
      }
    } catch (error) {
      console.error("Error loading selected tabs:", error);
    }
  };

  const setSelectedTabs = async (tabs: string[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
      setSelectedTabsState(tabs);
    } catch (error) {
      console.error("Error saving selected tabs:", error);
    }
  };

  return (
    <TabsContext.Provider
      value={{
        selectedTabs,
        setSelectedTabs,
        availableTabs: ALL_TAB_OPTIONS,
      }}
    >
      {children}
    </TabsContext.Provider>
  );
};

export const useTabs = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("useTabs must be used within TabsProvider");
  }
  return context;
};
