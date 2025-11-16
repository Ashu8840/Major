import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { decode as base64Decode } from "base-64";

import {
  getProfile,
  loginRequest,
  registerRequest,
  setAuthToken,
} from "@/services/api";

type AuthUser = {
  id: string;
  email?: string;
  username?: string;
  displayName?: string;
  [key: string]: unknown;
};

type AuthContextValue = {
  initializing: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  profile: any | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: {
    username: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = "major-auth-token";

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
        console.warn("LocalStorage read failed", error);
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
        console.warn("LocalStorage write failed", error);
        memoryStore.set(key, value);
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  deleteItem: async (key: string) => {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") {
        memoryStore.delete(key);
        return;
      }
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        console.warn("LocalStorage delete failed", error);
      }
      memoryStore.delete(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

const parseJwt = (token: string): AuthUser | null => {
  try {
    const [, payload = ""] = token.split(".");
    const sanitized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const normalized = sanitized.padEnd(
      sanitized.length + ((4 - (sanitized.length % 4)) % 4),
      "="
    );
    const json = base64Decode(normalized);
    return JSON.parse(json) as AuthUser;
  } catch (error) {
    console.warn("Failed to parse token", error);
    return null;
  }
};

export const AuthProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [initializing, setInitializing] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<any | null>(null);

  const applyToken = useCallback(async (value: string | null) => {
    setToken(value);
    setAuthToken(value);
    try {
      if (value) {
        await storage.setItem(TOKEN_KEY, value);
        setUser(parseJwt(value));
      } else {
        await storage.deleteItem(TOKEN_KEY);
        setUser(null);
      }
    } catch (error) {
      console.warn("Token persistence failed", error);
      setUser(value ? parseJwt(value) : null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!token) {
      setProfile(null);
      return;
    }
    try {
      const data = await getProfile();
      setProfile(data?.data ?? data);
    } catch (error) {
      console.error("Failed to refresh profile", error);
    }
  }, [token]);

  const bootstrap = useCallback(async () => {
    try {
      const storedToken = await storage.getItem(TOKEN_KEY);
      if (storedToken) {
        await applyToken(storedToken);
      }
    } catch (error) {
      console.error("Failed to restore auth token", error);
    } finally {
      setInitializing(false);
    }
  }, [applyToken]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (token) {
      refreshProfile();
    } else {
      setProfile(null);
    }
  }, [token, refreshProfile]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { token: authToken } = await loginRequest(email, password);
      await applyToken(authToken);
      await refreshProfile();
    },
    [applyToken, refreshProfile]
  );

  const signup = useCallback(
    async (payload: { username: string; email: string; password: string }) => {
      const { token: authToken } = await registerRequest(payload);
      await applyToken(authToken);
      await refreshProfile();
    },
    [applyToken, refreshProfile]
  );

  const logout = useCallback(async () => {
    await applyToken(null);
    setProfile(null);
  }, [applyToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      initializing,
      isAuthenticated: Boolean(token),
      user,
      profile,
      token,
      login,
      signup,
      logout,
      refreshProfile,
    }),
    [initializing, token, user, profile, login, signup, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
