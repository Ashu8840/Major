import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "../lib/apiClient";

export const useAdminAuth = () => {
  const [state, setState] = useState({
    loading: true,
    isAuthenticated: false,
    user: null,
  });

  const checkAuth = useCallback(async () => {
    try {
      const profile = await apiClient.get("/users/profile");
      const isAdmin =
        profile?.role === "admin" || profile?.role === "moderator";

      setState({
        loading: false,
        isAuthenticated: isAdmin,
        user: profile,
      });
    } catch (error) {
      console.error("Admin auth failed:", error);
      setState({ loading: false, isAuthenticated: false, user: null });
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setState({ loading: false, isAuthenticated: false, user: null });
      return;
    }

    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleStorage = (event) => {
      if (event.key === "admin_token") {
        const token = event.newValue;
        if (token) {
          checkAuth();
        } else {
          setState({ loading: false, isAuthenticated: false, user: null });
        }
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => window.removeEventListener("storage", handleStorage);
  }, [checkAuth]);

  return useMemo(
    () => ({
      ...state,
      refresh: checkAuth,
      clearSession: () => {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_name");
        localStorage.removeItem("admin_refresh_token");
        setState({ loading: false, isAuthenticated: false, user: null });
      },
    }),
    [state, checkAuth]
  );
};
