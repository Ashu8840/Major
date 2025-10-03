import { useContext, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  IoNotificationsOutline as IoNotifications,
  IoSearch,
  IoBook,
  IoChevronDown,
  IoPerson,
  IoSettings,
  IoExit,
  IoMoon,
  IoSunny,
  IoStar,
  IoMenuOutline as IoMenu,
  IoCloseOutline as IoClose,
  IoHomeOutline as IoHome,
  IoPeople,
  IoChatbubbles,
  IoTrophy,
  IoHeart,
  IoAnalytics,
  IoCreate,
  IoStorefront,
  IoLibrary,
} from "react-icons/io5";

export default function Navbar() {
  const { user, userProfile, token, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const displayName =
    userProfile?.displayName || user?.username || user?.name || "User";
  const profileImage = userProfile?.profileImage;
  const [notificationCount, setNotificationCount] = useState(0);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage or system preference
    const saved = localStorage.getItem("theme");
    if (saved) {
      return saved === "dark";
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const dropdownRef = useRef(null);

  // You can fetch notifications here or use a context/state management
  useEffect(() => {
    // This is where you would fetch notifications from your API
    // For now, we'll simulate with no notifications
    setNotificationCount(0);
  }, [user]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
      // Close mobile menu when clicking outside
      if (showMobileMenu && !event.target.closest(".mobile-menu-container")) {
        setShowMobileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMobileMenu]);

  const handleNotificationClick = () => {
    // For testing: toggle between 0 and 1 notification
    setNotificationCount((prev) => (prev > 0 ? 0 : 1));
  };

  const handleThemeToggle = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");

    // Apply theme to document
    if (newTheme) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Apply theme on component mount
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const handleProfileClick = () => {
    setShowProfileDropdown(!showProfileDropdown);
  };

  const handleProfileNavigate = () => {
    navigate("/profile");
    setShowProfileDropdown(false);
  };

  const handleLogout = () => {
    logout();
    setShowProfileDropdown(false);
    window.location.href = "/";
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-blue-100 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur transition-colors">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          {/* Logo / Mobile Menu Button */}
          <div className="flex items-center">
            {/* Desktop Logo */}
            <a href="/" className="hidden lg:flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <IoBook className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-blue-900 dark:text-white">
                DiaryApp
              </span>
            </a>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden flex items-center space-x-2 text-blue-900 dark:text-white hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <IoMenu className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">DiaryApp</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search"
                className="w-full pl-10 pr-4 py-2 bg-blue-50 dark:bg-gray-700 border border-blue-100 dark:border-gray-600 rounded-lg text-sm text-blue-900 dark:text-gray-100 placeholder-blue-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white dark:focus:bg-gray-600 transition-colors"
              />
              <IoSearch className="w-4 h-4 text-blue-400 dark:text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {token ? (
              <>
                {/* Notifications */}
                <button
                  onClick={handleNotificationClick}
                  className="relative p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  <IoNotifications className="w-5 h-5" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {notificationCount}
                    </span>
                  )}
                </button>

                {/* Theme Toggle - Hidden on mobile */}
                <button
                  onClick={handleThemeToggle}
                  className="hidden lg:block p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  aria-label="Toggle theme"
                >
                  {isDarkMode ? (
                    <IoSunny className="w-5 h-5" />
                  ) : (
                    <IoMoon className="w-5 h-5" />
                  )}
                </button>

                {/* User Profile Dropdown - Hidden on mobile */}
                <div className="relative hidden lg:block" ref={dropdownRef}>
                  <button
                    onClick={handleProfileClick}
                    className="flex items-center space-x-2 p-2 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt="Profile"
                        className="w-8 h-8 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          {displayName[0]?.toUpperCase() || "U"}
                        </span>
                      </div>
                    )}
                    <span className="font-medium text-blue-900 dark:text-white">
                      {displayName}
                    </span>
                    <IoChevronDown
                      className={`w-4 h-4 text-blue-600 dark:text-blue-400 transition-transform ${
                        showProfileDropdown ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {showProfileDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 z-50">
                      <div className="py-2">
                        <button
                          onClick={handleProfileNavigate}
                          className="flex items-center gap-3 w-full px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <IoPerson className="w-5 h-5" />
                          <span className="font-medium">Profile</span>
                        </button>
                        <button
                          onClick={() => {
                            navigate("/upgrade");
                            setShowProfileDropdown(false);
                          }}
                          className="flex items-center gap-3 w-full px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <IoStar className="w-5 h-5" />
                          <span className="font-medium">Upgrade to Pro</span>
                        </button>
                        <button
                          onClick={() => {
                            navigate("/settings");
                            setShowProfileDropdown(false);
                          }}
                          className="flex items-center gap-3 w-full px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <IoSettings className="w-5 h-5" />
                          <span className="font-medium">Settings</span>
                        </button>
                        <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors rounded-b-lg"
                        >
                          <IoExit className="w-5 h-5" />
                          <span className="font-medium">Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <a
                  href="/login"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Login
                </a>
                <a
                  href="/signup"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Sign Up
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Menu Sidebar Overlay */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transition-all duration-300 ${
          showMobileMenu ? "visible" : "invisible"
        }`}
      >
        {/* Backdrop */}
        <div
          className={`fixed inset-0 backdrop-blur-sm bg-white/20 dark:bg-black/20 transition-all duration-300 ${
            showMobileMenu
              ? "backdrop-blur-sm bg-opacity-20"
              : "backdrop-blur-none bg-opacity-0"
          }`}
          onClick={() => setShowMobileMenu(false)}
        ></div>

        {/* Sliding Sidebar */}
        <div
          className={`mobile-menu-container fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white dark:bg-gray-800 shadow-2xl transform transition-transform duration-300 ease-out ${
            showMobileMenu ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-6 border-b border-blue-100 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <IoBook className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-blue-900 dark:text-white">
                DiaryApp
              </span>
            </div>
            <button
              onClick={() => setShowMobileMenu(false)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <IoClose className="w-6 h-6" />
            </button>
          </div>

          <div className="px-6 py-4 space-y-3 overflow-y-auto h-full pb-20">
            {/* Mobile Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search"
                className="w-full pl-10 pr-4 py-2 bg-blue-50 dark:bg-gray-700 border border-blue-100 dark:border-gray-600 rounded-lg text-sm text-blue-900 dark:text-gray-100 placeholder-blue-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <IoSearch className="w-4 h-4 text-blue-400 dark:text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>

            {/* Mobile Navigation */}
            {token && (
              <nav className="space-y-2">
                <a
                  href="/"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center space-x-3 px-3 py-3 rounded-lg text-blue-900 dark:text-white hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <IoHome className="w-5 h-5" />
                  <span className="font-medium">Home</span>
                </a>
                <a
                  href="/diary"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center space-x-3 px-3 py-3 rounded-lg text-blue-900 dark:text-white hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <IoBook className="w-5 h-5" />
                  <span className="font-medium">Diary</span>
                </a>
                <a
                  href="/community"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center space-x-3 px-3 py-3 rounded-lg text-blue-900 dark:text-white hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <IoPeople className="w-5 h-5" />
                  <span className="font-medium">Community</span>
                </a>
                <a
                  href="/leaderboard"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center space-x-3 px-3 py-3 rounded-lg text-blue-900 dark:text-white hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <IoTrophy className="w-5 h-5" />
                  <span className="font-medium">Leaderboard</span>
                </a>
                <a
                  href="/social"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center space-x-3 px-3 py-3 rounded-lg text-blue-900 dark:text-white hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <IoHeart className="w-5 h-5" />
                  <span className="font-medium">Social</span>
                </a>
                <a
                  href="/analytics"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center space-x-3 px-3 py-3 rounded-lg text-blue-900 dark:text-white hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <IoAnalytics className="w-5 h-5" />
                  <span className="font-medium">Analytics</span>
                </a>
                <a
                  href="/creator-studio"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center space-x-3 px-3 py-3 rounded-lg text-blue-900 dark:text-white hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <IoCreate className="w-5 h-5" />
                  <span className="font-medium">Creator Studio</span>
                </a>
                <a
                  href="/marketplace"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center space-x-3 px-3 py-3 rounded-lg text-blue-900 dark:text-white hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <IoStorefront className="w-5 h-5" />
                  <span className="font-medium">Marketplace</span>
                </a>
                <a
                  href="/readers-lounge"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center space-x-3 px-3 py-3 rounded-lg text-blue-900 dark:text-white hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <IoLibrary className="w-5 h-5" />
                  <span className="font-medium">Reader's Lounge</span>
                </a>
                <a
                  href="/upgrade"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center space-x-3 px-3 py-3 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <IoStar className="w-5 h-5" />
                  <span className="font-medium">Upgrade</span>
                </a>
                <a
                  href="/chat"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center space-x-3 px-3 py-3 rounded-lg text-blue-900 dark:text-white hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <IoChatbubbles className="w-5 h-5" />
                  <span className="font-medium">Connect</span>
                </a>
              </nav>
            )}

            {/* Mobile User Actions */}
            {token ? (
              <div className="pt-4 border-t border-blue-100 dark:border-gray-600 space-y-2">
                <button
                  onClick={() => {
                    handleProfileNavigate();
                    setShowMobileMenu(false);
                  }}
                  className="flex items-center space-x-3 w-full px-3 py-3 rounded-lg text-blue-900 dark:text-white hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <IoPerson className="w-5 h-5" />
                  <span className="font-medium">Profile</span>
                </button>
                <button
                  onClick={() => {
                    navigate("/settings");
                    setShowMobileMenu(false);
                  }}
                  className="flex items-center space-x-3 w-full px-3 py-3 rounded-lg text-blue-900 dark:text-white hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <IoSettings className="w-5 h-5" />
                  <span className="font-medium">Settings</span>
                </button>
                <button
                  onClick={handleThemeToggle}
                  className="flex items-center space-x-3 w-full px-3 py-3 rounded-lg text-blue-900 dark:text-white hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {isDarkMode ? (
                    <IoSunny className="w-5 h-5" />
                  ) : (
                    <IoMoon className="w-5 h-5" />
                  )}
                  <span className="font-medium">
                    {isDarkMode ? "Light Mode" : "Dark Mode"}
                  </span>
                </button>
                <button
                  onClick={() => {
                    handleLogout();
                    setShowMobileMenu(false);
                  }}
                  className="flex items-center space-x-3 w-full px-3 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  <IoExit className="w-5 h-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            ) : (
              <div className="pt-4 border-t border-blue-100 dark:border-gray-600 space-y-2">
                <a
                  href="/login"
                  onClick={() => setShowMobileMenu(false)}
                  className="block w-full text-center py-3 text-blue-600 hover:text-blue-800 font-medium border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Login
                </a>
                <a
                  href="/signup"
                  onClick={() => setShowMobileMenu(false)}
                  className="block w-full text-center py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Sign Up
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
