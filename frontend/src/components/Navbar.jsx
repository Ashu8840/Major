import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useCurrentUser } from "../hooks/useAuth";
import { useNotifications } from "../context/NotificationContext";
import { useWallet } from "../context/WalletContext";
import { useTheme } from "../context/ThemeContext";
import {
  IoMenuOutline as IoMenu,
  IoPeople,
  IoSparkles,
  IoNotificationsOutline as IoNotifications,
  IoChevronDown,
  IoSettings,
  IoLogOutOutline,
  IoChatbubbles,
  IoMoon,
  IoSunny,
  IoWallet,
  IoPersonCircleOutline,
} from "react-icons/io5";

const NAV_ITEMS = [];

const formatRelativeTime = (value) => {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  try {
    const formatted = amount.toLocaleString("en-IN", {
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    });
    return `₹${formatted}`;
  } catch {
    return `₹${amount.toFixed(2)}`;
  }
};

const getNotificationVisual = (notification) => {
  switch (notification.type) {
    case "message":
      return {
        icon: <IoChatbubbles className="text-purple-500" />,
        badge: "Message",
      };
    case "streak":
      return {
        icon: <IoSparkles className="text-orange-500" />,
        badge: "Milestone",
      };
    case "community":
      return {
        icon: <IoPeople className="text-blue-500" />,
        badge: "Community",
      };
    case "game":
      return {
        icon: <IoGameController className="text-green-500" />,
        badge: "Daily Game",
      };
    case "game_streak":
      return {
        icon: <IoFlame className="text-orange-500" />,
        badge: "Game Streak",
      };
    default:
      return {
        icon: <IoNotifications className="text-blue-500" />,
        badge: "Update",
      };
  }
};

export default function Navbar({ onToggleSidebar, isSidebarOpen }) {
  const navigate = useNavigate();
  const { currentUser, token, logout } = useCurrentUser();
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();
  const { balance, maxBalance, topUpAmount, canTopUp, topUp } = useWallet();

  const displayName =
    currentUser?.displayName || currentUser?.username || "Major writer";
  const profileImage = currentUser?.profileImageUrl;
  const initials =
    currentUser?.initials || displayName?.charAt(0)?.toUpperCase() || "M";

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] =
    useState(false);
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const { isDarkMode, toggleDarkMode } = useTheme();

  const profileRef = useRef(null);
  const notificationsRef = useRef(null);
  const walletRef = useRef(null);

  useEffect(() => {
    const handleClickAway = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target)
      ) {
        setShowNotificationsDropdown(false);
      }
      if (walletRef.current && !walletRef.current.contains(event.target)) {
        setShowWalletDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickAway);
    return () => document.removeEventListener("mousedown", handleClickAway);
  }, []);

  useEffect(() => {
    const handler = () => {
      setShowWalletDropdown(true);
      setShowProfileDropdown(false);
      setShowNotificationsDropdown(false);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("wallet:open", handler);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("wallet:open", handler);
      }
    };
  }, []);

  const navLinkClass = useMemo(
    () =>
      ({ isActive }) =>
        `inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? "bg-blue-600 text-white shadow"
            : "text-blue-900/80 hover:bg-blue-100 hover:text-blue-900 dark:text-gray-200 dark:hover:bg-gray-800"
        }`,
    [],
  );

  const handleThemeToggle = () => {
    toggleDarkMode();
  };

  const handleLogout = () => {
    logout();
    setShowProfileDropdown(false);
    navigate("/login");
  };

  const handleNotificationSelect = (notification) => {
    if (!notification) return;
    markAsRead(notification.id);
    setShowNotificationsDropdown(false);
    if (notification.link) {
      navigate(notification.link, { state: notification.meta || {} });
    } else if (notification.meta?.postId) {
      navigate(`/community?highlight=${notification.meta.postId}`);
    } else if (notification.meta?.partnerId) {
      navigate(`/chat?open=${notification.meta.partnerId}`);
    }
  };

  const handleTopUp = () => {
    const result = topUp();
    if (result.success && result.amount > 0) {
      toast.success(
        `Added ${formatCurrency(result.amount)}. New balance: ${formatCurrency(
          balance + result.amount,
        )}`,
      );
    } else {
      toast.error(
        `Wallet limit reached. You can store up to ${formatCurrency(
          maxBalance,
        )}.`,
      );
    }
  };

  const walletProgress = Math.min(
    100,
    Math.max(
      0,
      Math.round((Number(balance || 0) / Number(maxBalance || 1)) * 100),
    ),
  );

  const renderNotificationItem = (notification) => {
    const visuals = getNotificationVisual(notification);
    const unread = !notification.isRead;
    return (
      <button
        key={notification.id}
        type="button"
        onClick={() => handleNotificationSelect(notification)}
        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
          unread ? "bg-blue-50/80 hover:bg-blue-100" : "hover:bg-gray-50"
        }`}
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-inner">
          {visuals.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-blue-900 dark:text-white">
              {notification.title}
            </p>
            <span className="text-xs text-gray-500">
              {formatRelativeTime(notification.timestamp)}
            </span>
          </div>
          {notification.message && (
            <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
              {notification.message}
            </p>
          )}
          {visuals.badge && (
            <span className="mt-2 inline-flex items-center text-[11px] font-semibold uppercase tracking-wide text-blue-500">
              {visuals.badge}
            </span>
          )}
        </div>
        {unread && <span className="mt-1 h-2 w-2 rounded-full bg-blue-600" />}
      </button>
    );
  };

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-16 sm:h-20 border-b border-theme bg-theme-surface/90 backdrop-blur-xl theme-transition">
      <div className="mx-auto flex h-full max-w-7xl items-center px-4 sm:px-6">
        <div className="flex w-full items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => {
              if (typeof onToggleSidebar === "function") {
                onToggleSidebar();
              }
            }}
            className="inline-flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-theme-primary-soft text-theme-primary transition-colors hover:opacity-80 xl:hidden"
            aria-label="Toggle navigation"
            aria-pressed={Boolean(isSidebarOpen)}
          >
            <IoMenu className="h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 sm:gap-3"
          >
            <img
              src="/Logo.png"
              alt="SoulSpace Logo"
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl shadow-lg object-contain"
            />
            <span className="hidden min-[400px]:inline text-lg font-semibold text-theme-primary">
              SoulSpace
            </span>
          </button>
          {NAV_ITEMS.length > 0 && (
            <nav className="ml-4 hidden items-center gap-1 rounded-full bg-theme-primary-soft px-2 py-1 lg:flex">
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.to} to={item.to} className={navLinkClass}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={handleThemeToggle}
              className="inline-flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-theme-primary-soft text-theme-primary transition-colors hover:opacity-80"
              aria-label="Toggle theme"
            >
              {isDarkMode ? (
                <IoSunny className="h-5 w-5" />
              ) : (
                <IoMoon className="h-5 w-5" />
              )}
            </button>

            <div className="relative" ref={walletRef}>
              <button
                type="button"
                onClick={() => {
                  setShowWalletDropdown((prev) => !prev);
                  setShowProfileDropdown(false);
                  setShowNotificationsDropdown(false);
                }}
                className="inline-flex items-center gap-1 sm:gap-2 rounded-full bg-theme-primary-soft px-1.5 sm:px-2 py-1 sm:py-1.5 text-sm font-semibold text-theme-primary shadow-sm transition-all hover:opacity-80"
                aria-haspopup="true"
                aria-expanded={showWalletDropdown}
                aria-label="Wallet menu"
              >
                <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-theme-surface text-theme-accent shadow-inner">
                  <IoWallet className="h-4 w-4 sm:h-5 sm:w-5" />
                </span>
                <span className="hidden whitespace-nowrap lg:inline">
                  {formatCurrency(balance)}
                </span>
              </button>

              {showWalletDropdown && (
                <div className="absolute right-0 mt-3 w-72 rounded-2xl border border-theme bg-theme-surface p-4 shadow-2xl">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-theme-primary">
                        Wallet balance
                      </p>
                      <p className="text-xs text-theme-secondary">
                        Limit {formatCurrency(maxBalance)}
                      </p>
                    </div>
                    <span className="rounded-full bg-theme-primary-soft px-2 py-1 text-xs font-semibold text-theme-accent">
                      {walletProgress}% full
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-theme-primary">
                    {formatCurrency(balance)}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-theme-secondary">
                    Available balance
                  </p>
                  <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-theme-primary-soft">
                    <div
                      className="h-full rounded-full bg-theme-primary transition-all"
                      style={{
                        width: `${walletProgress}%`,
                        backgroundColor: "var(--theme-primary)",
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleTopUp}
                    disabled={!canTopUp}
                    className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ backgroundColor: "var(--theme-primary)" }}
                  >
                    Top up {formatCurrency(topUpAmount)}
                  </button>
                  {!canTopUp && (
                    <p className="mt-3 rounded-xl bg-theme-primary-soft px-3 py-2 text-xs text-theme-accent">
                      You've reached the maximum balance. Spend funds to enable
                      the next top-up.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={() => {
                  setShowNotificationsDropdown((prev) => !prev);
                  setShowProfileDropdown(false);
                  setShowWalletDropdown(false);
                }}
                className="relative inline-flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-theme-primary-soft text-theme-primary transition-colors hover:opacity-80"
                aria-label="Notifications"
              >
                <IoNotifications className="h-4 w-4 sm:h-5 sm:w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-semibold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {showNotificationsDropdown && (
                <div className="absolute right-0 mt-3 w-80 max-h-96 overflow-hidden rounded-2xl border border-theme bg-theme-surface shadow-2xl">
                  <div className="flex items-center justify-between border-b border-theme bg-theme-primary-soft px-4 py-3">
                    <span className="text-sm font-semibold text-theme-primary">
                      Notifications
                    </span>
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="text-xs font-semibold text-theme-accent hover:opacity-80"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-10 text-center text-sm text-theme-secondary">
                        You're all caught up!
                      </div>
                    ) : (
                      notifications.map((notification) =>
                        renderNotificationItem(notification),
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => {
                  setShowProfileDropdown((prev) => !prev);
                  setShowNotificationsDropdown(false);
                  setShowWalletDropdown(false);
                }}
                className="inline-flex items-center gap-1 sm:gap-2 rounded-full bg-theme-primary-soft px-1.5 sm:px-2 py-1 sm:py-1.5 text-theme-primary transition-colors hover:opacity-80"
              >
                <span className="h-8 w-8 sm:h-9 sm:w-9 overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-sm font-semibold text-white">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      {initials}
                    </span>
                  )}
                </span>
                <div className="hidden flex-col items-start xl:flex">
                  <span className="text-sm font-semibold">{displayName}</span>
                  <span className="text-xs text-blue-500 dark:text-gray-300">
                    {token ? "Creator" : "Guest"}
                  </span>
                </div>
                <IoChevronDown className="hidden h-4 w-4 text-blue-400 xl:block" />
              </button>
              {showProfileDropdown && (
                <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border border-theme bg-theme-surface shadow-2xl">
                  <div className="bg-theme-primary-soft px-4 py-3">
                    <p className="text-sm font-semibold text-theme-primary">
                      {displayName}
                    </p>
                    {currentUser?.email && (
                      <p className="truncate text-xs text-theme-secondary">
                        {currentUser.email}
                      </p>
                    )}
                  </div>
                  <div className="py-2">
                    <button
                      type="button"
                      onClick={() => navigate("/profile")}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-theme-primary hover:bg-theme-primary-soft"
                    >
                      <IoPersonCircleOutline className="h-4 w-4" />
                      View profile
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/settings")}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-theme-primary hover:bg-theme-primary-soft"
                    >
                      <IoSettings className="h-4 w-4" />
                      Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/chat")}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-theme-primary hover:bg-theme-primary-soft"
                    >
                      <IoChatbubbles className="h-4 w-4" />
                      Messages
                    </button>
                  </div>
                  <div className="border-t border-theme px-4 py-3">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 text-sm font-semibold text-rose-600 hover:text-rose-700"
                    >
                      <IoLogOutOutline className="h-4 w-4" />
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
