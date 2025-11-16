import React from "react";
import { Redirect } from "expo-router";

import { useAuth } from "@/context/AuthContext";
import { SplashScreen } from "@/screens/SplashScreen";

export default function Index() {
  const { initializing, isAuthenticated } = useAuth();

  if (initializing) {
    return <SplashScreen status="Authenticating your session..." />;
  }

  return <Redirect href={isAuthenticated ? "/(tabs)/home" : "/(auth)/login"} />;
}
