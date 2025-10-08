import {
  BrowserRouter,
  Route,
  Routes,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Diary from "./pages/Diary";
import NewEntry from "./pages/NewEntry";
import Community from "./pages/Community";
import NewPost from "./pages/NewPost";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import Upgrade from "./pages/Upgrade";
import Analytics from "./pages/Analytics";
import Leaderboard from "./pages/Leaderboard";
import Social from "./pages/Social";
import CircleChat from "./pages/CircleChat";
import CreatorStudio from "./pages/CreatorStudio";
import Marketplace from "./pages/Marketplace";
import BookReader from "./pages/BookReader";
import ReadersLounge from "./pages/ReadersLounge";
import Settings from "./pages/Settings";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
// import  ThemeProvider  from "./context/ThemeContext";
import { useContext, useState } from "react";
import React from "react";
import { IoChatbubbles } from "react-icons/io5";
import SplashScreen from "./components/SplashScreen";

function Private({ children }) {
  const { token } = useContext(AuthContext);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useContext(AuthContext);
  const [showDashboardSplash, setShowDashboardSplash] = useState(false);
  // Show splash screen only when navigating to dashboard
  React.useEffect(() => {
    if (location.pathname === "/") {
      setShowDashboardSplash(true);
    }
  }, [location.pathname]);

  const handleDashboardSplashComplete = () => {
    setShowDashboardSplash(false);
  };

  // Check if current page is authentication page
  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/signup";

  // Don't show chat button on login/signup pages or chat page itself
  const showChatButton = token && !isAuthPage && location.pathname !== "/chat";

  // Hide navbar and sidebar on auth pages
  const showSidebar = !isAuthPage && location.pathname !== "/chat";
  const showNavbar = !isAuthPage;

  const handleChat = () => {
    navigate("/chat");
  };

  // Show splash screen only for dashboard
  if (showDashboardSplash && location.pathname === "/") {
    return <SplashScreen onComplete={handleDashboardSplashComplete} />;
  }

  // If it's an auth page, render without layout
  if (isAuthPage) {
    return (
      <div className="min-h-screen">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 dark:bg-gray-900 text-blue-900 dark:text-gray-100 no-horizontal-scroll">
      {showNavbar && <Navbar />}
      {showSidebar && <Sidebar />}
      <main
        className={`page-scroll ${showSidebar ? "lg:ml-64" : ""}`}
        style={{
          height: showNavbar ? "calc(100vh - 80px)" : "100vh",
          marginTop: showNavbar ? "80px" : "0",
        }}
      >
        <Routes>
          <Route
            path="/"
            element={
              <Private>
                <Home />
              </Private>
            }
          />
          <Route
            path="/diary"
            element={
              <Private>
                <Diary />
              </Private>
            }
          />
          <Route
            path="/diary/new"
            element={
              <Private>
                <NewEntry />
              </Private>
            }
          />
          <Route path="/community" element={<Community />} />
          <Route
            path="/community/new"
            element={
              <Private>
                <NewPost />
              </Private>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <Private>
                <Leaderboard />
              </Private>
            }
          />
          <Route
            path="/social"
            element={
              <Private>
                <Social />
              </Private>
            }
          />
          <Route
            path="/social/chat/:circleId"
            element={
              <Private>
                <CircleChat />
              </Private>
            }
          />
          <Route
            path="/chat"
            element={
              <Private>
                <Chat />
              </Private>
            }
          />
          <Route
            path="/profile"
            element={
              <Private>
                <Profile />
              </Private>
            }
          />
          <Route
            path="/settings"
            element={
              <Private>
                <Settings />
              </Private>
            }
          />
          <Route
            path="/analytics"
            element={
              <Private>
                <Analytics />
              </Private>
            }
          />
          <Route
            path="/creator-studio"
            element={
              <Private>
                <CreatorStudio />
              </Private>
            }
          />
          <Route
            path="/marketplace"
            element={
              <Private>
                <Marketplace />
              </Private>
            }
          />
          <Route
            path="/marketplace/books/:bookId/read"
            element={
              <Private>
                <BookReader />
              </Private>
            }
          />
          <Route
            path="/readers-lounge"
            element={
              <Private>
                <ReadersLounge />
              </Private>
            }
          />
          <Route
            path="/upgrade"
            element={
              <Private>
                <Upgrade />
              </Private>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Global Floating Chat Button */}
      {showChatButton && (
        <button
          onClick={handleChat}
          className="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110 z-30 flex items-center justify-center"
        >
          <IoChatbubbles className="w-7 h-7" />
        </button>
      )}

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#1e40af",
            color: "#fff",
            fontWeight: "500",
          },
          success: {
            style: {
              background: "#059669",
            },
          },
          error: {
            style: {
              background: "#dc2626",
            },
          },
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    // TODO: Re-enable ThemeProvider when theme system is implemented
    // <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </BrowserRouter>
    </AuthProvider>
    // </ThemeProvider>
  );
}
