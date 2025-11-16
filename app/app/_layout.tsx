import { ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { AuthProvider } from "@/context/AuthContext";
import { AppThemeProvider, useAppTheme } from "@/context/ThemeContext";
import { TabsProvider } from "@/context/TabsContext";
import { WalletProvider } from "@/context/WalletContext";
import { NotificationProvider } from "@/context/NotificationContext";

const AppStack = () => {
  const { navigationTheme, isDark } = useAppTheme();

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="edit-tabs" options={{ presentation: "card" }} />
        <Stack.Screen
          name="social-chat/[circleId]"
          options={{ presentation: "card" }}
        />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>
      <StatusBar
        style={isDark ? "light" : "dark"}
        translucent
        backgroundColor="transparent"
      />
    </ThemeProvider>
  );
};

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <AuthProvider>
        <WalletProvider>
          <NotificationProvider>
            <TabsProvider>
              <AppStack />
            </TabsProvider>
          </NotificationProvider>
        </WalletProvider>
      </AuthProvider>
    </AppThemeProvider>
  );
}
