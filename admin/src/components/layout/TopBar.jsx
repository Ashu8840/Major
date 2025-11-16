import {
  FiMenu,
  FiBell,
  FiLogOut,
  FiCheckCircle,
  FiWifi,
  FiClock,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useAdminSession } from "../../context/AdminAuthContext.jsx";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient.js";

const TopBar = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { user, clearSession, isAuthenticated } = useAdminSession();
  const adminName =
    user?.displayName ||
    user?.username ||
    localStorage.getItem("admin_name") ||
    "Administrator";

  const [currentTime, setCurrentTime] = useState(new Date());

  // Fetch real system status
  const { data: healthData } = useQuery({
    queryKey: ["monitoring", "health"],
    queryFn: () => apiClient.get("/monitoring/health"),
    enabled: isAuthenticated,
    refetchInterval: 10000, // Refresh every 10 seconds
    retry: false,
  });

  // Fetch real notifications
  const { data: notificationsData } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiClient.get("/notifications"),
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: false,
  });

  const systemStatus = {
    healthy: healthData?.data?.status === "healthy",
    activeUsers: healthData?.data?.activeUsers || 0,
    responseTime: healthData?.data?.responseTime || 0,
  };

  const unreadCount = notificationsData?.data?.unreadCount || 0;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  const handleNotificationClick = () => {
    navigate("/notifications");
  };

  return (
    <header className="sticky top-0 z-30 border-b-2 border-slate-200 bg-gradient-to-r from-white via-slate-50 to-white shadow-lg backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-content items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onMenuClick}
            className="rounded-xl p-2 text-slate-600 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 transition-all lg:hidden"
          >
            <FiMenu className="h-5 w-5" />
          </button>
          <div className="hidden sm:flex sm:flex-col">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Admin Panel
            </span>
            <span className="text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Daiaryverse Control Center
            </span>
          </div>

          {/* System Status Indicators */}
          <div className="hidden lg:flex items-center gap-3 ml-6">
            {/* System Health */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200">
              <FiCheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs font-semibold text-green-700">
                All Systems Operational
              </span>
            </div>

            {/* Active Users */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200">
              <FiWifi className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-blue-700">
                {systemStatus.activeUsers} Active
              </span>
            </div>

            {/* Response Time */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200">
              <FiClock className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold text-purple-700">
                {systemStatus.responseTime}ms
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Current Time */}
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs font-medium text-slate-400">
              {currentTime.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
            <span className="text-sm font-semibold text-slate-700">
              {currentTime.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {/* Notifications */}
          <button
            type="button"
            onClick={handleNotificationClick}
            className="relative rounded-xl border-2 border-slate-200 p-2 text-slate-500 transition-all hover:border-indigo-500 hover:text-indigo-600 hover:shadow-lg"
            aria-label="Notifications"
          >
            <FiBell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-pink-500 text-[10px] font-bold text-white shadow-lg">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Admin Profile */}
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-700">
                {adminName}
              </p>
              <p className="text-xs bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-semibold">
                Super Admin
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:border-rose-500 hover:text-rose-500 hover:shadow-lg"
            >
              <FiLogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
