import AsyncStorage from "@react-native-async-storage/async-storage";
import jwtDecode from "jwt-decode";
import PropTypes from "prop-types";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import api from "../utils/api";

export const AuthContext = createContext(null);

const TOKEN_STORAGE_KEY = "major_token";
const PROFILE_STORAGE_KEY = "major_user_profile";

function safeDecodeJwt(token) {
  try {
    return jwtDecode(token);
  } catch (error) {
    console.warn("Failed to decode JWT", error);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        const storedProfile = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
        if (storedToken) setToken(storedToken);
        if (storedProfile) setUserProfile(JSON.parse(storedProfile));
      } catch (error) {
        console.warn("Failed to bootstrap auth state", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (token) {
          await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
        } else {
          await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      } catch (error) {
        console.warn("Failed to persist token", error);
      }
    })();
  }, [token]);

  useEffect(() => {
    (async () => {
      try {
        if (userProfile) {
          await AsyncStorage.setItem(
            PROFILE_STORAGE_KEY,
            JSON.stringify(userProfile)
          );
        } else {
          await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);
        }
      } catch (error) {
        console.warn("Failed to persist profile", error);
      }
    })();
  }, [userProfile]);

  const decodedUser = useMemo(() => (token ? safeDecodeJwt(token) : null), [
    token,
  ]);

  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/profile");
      setUserProfile(data);
      return data;
    } catch (error) {
      console.warn("Failed to fetch user profile", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(
    async (email, password) => {
      try {
        setLoading(true);
        const { data } = await api.post("/users/login", { email, password });
        setToken(data.token);
        const profile = await fetchUserProfile();
        return profile || data;
      } catch (error) {
        setLoading(false);
        throw error;
      }
    },
    [fetchUserProfile]
  );

  const logout = useCallback(() => {
    setToken("");
    setUserProfile(null);
  }, []);

  const value = useMemo(
    () => ({
      user: decodedUser,
      userProfile,
      token,
      loading,
      login,
      logout,
      fetchUserProfile,
      setToken,
    }),
    [decodedUser, fetchUserProfile, loading, login, logout, token, userProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
