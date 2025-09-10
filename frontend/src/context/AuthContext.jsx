import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import api from "../utils/api";

export const AuthContext = createContext(null);

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem("userProfile");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);
  
  const user = useMemo(() => (token ? parseJwt(token) : null), [token]);

  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);

  useEffect(() => {
    if (userProfile) {
      localStorage.setItem("userProfile", JSON.stringify(userProfile));
    } else {
      localStorage.removeItem("userProfile");
    }
  }, [userProfile]);

  // Auto logout on token expiry (simple check)
  useEffect(() => {
    if (!user?.exp) return;
    const ms = user.exp * 1000 - Date.now();
    if (ms <= 0) setToken("");
    const t = setTimeout(() => setToken(""), Math.max(0, ms));
    return () => clearTimeout(t);
  }, [user?.exp]);

  // Fetch user profile on token change
  useEffect(() => {
    if (token && !userProfile) {
      fetchUserProfile();
    } else if (!token) {
      setUserProfile(null);
    }
  }, [token]);

  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/users/profile");
      setUserProfile(data);
      return data;
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      const { data } = await api.post("/users/login", { email, password });
      setToken(data.token);
      setUserProfile(data); // Set user profile from login response
      return data;
    } catch (error) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (payload) => {
    try {
      setLoading(true);
      const { data } = await api.post("/users/register", payload);
      setToken(data.token);
      setUserProfile(data); // Set user profile from signup response
      return data;
    } catch (error) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (profileData) => {
    try {
      setLoading(true);
      const { data } = await api.put("/users/profile", profileData);
      setUserProfile(data);
      return data;
    } catch (error) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken("");
    setUserProfile(null);
  }, []);

  const value = useMemo(
    () => ({ 
      user, 
      userProfile, 
      token, 
      loading,
      login, 
      signup, 
      logout, 
      updateProfile,
      fetchUserProfile,
      setToken 
    }),
    [user, userProfile, token, loading, login, signup, logout, updateProfile, fetchUserProfile]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
