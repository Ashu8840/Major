import {
  BrowserRouter,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import ChatbotWidget from "./components/ChatbotWidget";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Diary from "./pages/Diary";
import NewEntry from "./pages/NewEntry";
import Community from "./pages/Community";
import NewPost from "./pages/NewPost";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import ProfilePreview from "./pages/ProfilePreview";
import Upgrade from "./pages/Upgrade";
import Analytics from "./pages/Analytics";
import Leaderboard from "./pages/Leaderboard";
import Social from "./pages/Social";
import CircleChat from "./pages/CircleChat";
import CreatorStudio from "./pages/CreatorStudio";
import Marketplace from "./pages/Marketplace";
import BookReader from "./pages/BookReader";
import ReadersLounge from "./pages/ReadersLounge";
import Contact from "./pages/Contact";
import Settings from "./pages/Settings";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { WalletProvider } from "./context/WalletContext";
// import  ThemeProvider  from "./context/ThemeContext";
import { useContext, useEffect, useRef, useState } from "react";
import { IoChatbubbles } from "react-icons/io5";
import SplashScreen from "./components/SplashScreen";

const MOBILE_BREAKPOINT = "(max-width: 768px)";
const CHAT_BUTTON_SIZE = 56;
const CHAT_BUTTON_MARGIN = 32;
const MIN_DRAG_MARGIN = 16;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getInitialChatPosition = () => {
  if (typeof window === "undefined") {
    return { x: CHAT_BUTTON_MARGIN, y: CHAT_BUTTON_MARGIN };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const maxX = Math.max(
    width - CHAT_BUTTON_SIZE - MIN_DRAG_MARGIN,
    MIN_DRAG_MARGIN
  );
  const maxY = Math.max(
    height - CHAT_BUTTON_SIZE - MIN_DRAG_MARGIN,
    MIN_DRAG_MARGIN
  );
  const defaultX = width - CHAT_BUTTON_SIZE - CHAT_BUTTON_MARGIN;
  const defaultY = height - CHAT_BUTTON_SIZE - CHAT_BUTTON_MARGIN;

  return {
    x: clamp(defaultX, MIN_DRAG_MARGIN, maxX),
    y: clamp(defaultY, MIN_DRAG_MARGIN, maxY),
  };
};

function Private({ children }) {
  const { token } = useContext(AuthContext);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function AppContent() {
  const location = useLocation();
  const { token } = useContext(AuthContext);
  const [showDashboardSplash, setShowDashboardSplash] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return false;
    }
    return window.matchMedia(MOBILE_BREAKPOINT).matches;
  });
  const [chatPosition, setChatPosition] = useState(getInitialChatPosition);
  const [isDraggingChat, setIsDraggingChat] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const dragMovedRef = useRef(false);
  const activePointerIdRef = useRef(null);
  const chatButtonRef = useRef(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.innerWidth >= 1024;
  });

  // Show splash screen only when navigating to dashboard
  useEffect(() => {
    if (location.pathname === "/") {
      setShowDashboardSplash(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      setIsMobile(false);
      return;
    }

    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT);

    const updateIsMobile = () => {
      const matches = mediaQuery.matches;
      setIsMobile(matches);
      if (matches) {
        setChatPosition((prev) => {
          const width = window.innerWidth;
          const height = window.innerHeight;
          const maxX = width - CHAT_BUTTON_SIZE - MIN_DRAG_MARGIN;
          const maxY = height - CHAT_BUTTON_SIZE - MIN_DRAG_MARGIN;
          if (!prev) {
            return getInitialChatPosition();
          }
          return {
            x: clamp(prev.x, MIN_DRAG_MARGIN, maxX),
            y: clamp(prev.y, MIN_DRAG_MARGIN, maxY),
          };
        });
      }
    };

    updateIsMobile();
    mediaQuery.addEventListener("change", updateIsMobile);

    return () => {
      mediaQuery.removeEventListener("change", updateIsMobile);
    };
  }, []);

  useEffect(() => {
    if (!isMobile || typeof window === "undefined") {
      return;
    }

    const handleResize = () => {
      setChatPosition((prev) => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const maxX = width - CHAT_BUTTON_SIZE - MIN_DRAG_MARGIN;
        const maxY = height - CHAT_BUTTON_SIZE - MIN_DRAG_MARGIN;
        return {
          x: clamp(prev.x, MIN_DRAG_MARGIN, maxX),
          y: clamp(prev.y, MIN_DRAG_MARGIN, maxY),
        };
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile || !isDraggingChat || typeof window === "undefined") {
      return undefined;
    }

    const handlePointerMove = (event) => {
      dragMovedRef.current = true;
      event.preventDefault();
      const width = window.innerWidth;
      const height = window.innerHeight;
      const maxX = width - CHAT_BUTTON_SIZE - MIN_DRAG_MARGIN;
      const maxY = height - CHAT_BUTTON_SIZE - MIN_DRAG_MARGIN;
      const x = clamp(
        event.clientX - dragOffsetRef.current.x,
        MIN_DRAG_MARGIN,
        maxX
      );
      const y = clamp(
        event.clientY - dragOffsetRef.current.y,
        MIN_DRAG_MARGIN,
        maxY
      );
      setChatPosition({ x, y });
    };

    const finishDrag = () => {
      if (activePointerIdRef.current !== null && chatButtonRef.current) {
        try {
          chatButtonRef.current.releasePointerCapture(
            activePointerIdRef.current
          );
        } catch {
          /* ignore if already released */
        }
        activePointerIdRef.current = null;
      }
      setIsDraggingChat(false);
      if (
        typeof window !== "undefined" &&
        typeof window.requestAnimationFrame === "function"
      ) {
        window.requestAnimationFrame(() => {
          dragMovedRef.current = false;
        });
      } else {
        setTimeout(() => {
          dragMovedRef.current = false;
        }, 0);
      }
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", finishDrag);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
    };
  }, [isDraggingChat, isMobile]);

  const handleDashboardSplashComplete = () => {
    setShowDashboardSplash(false);
  };

  const handleChatDragStart = (event) => {
    if (!isMobile) {
      return;
    }

    dragMovedRef.current = false;
    const rect = event.currentTarget.getBoundingClientRect();
    dragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    activePointerIdRef.current = event.pointerId;
    event.preventDefault();
    if (event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setIsDraggingChat(true);
  };

  // Check if current page is authentication page
  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/signup";

  // Don't show chat button on login/signup pages or chat page itself
  const showChatButton =
    token && !isAuthPage && location.pathname !== "/chat" && !isChatOpen;

  // Hide navbar and sidebar on auth pages
  const showSidebar = !isAuthPage && location.pathname !== "/chat";
  const showNavbar = !isAuthPage;

  useEffect(() => {
    if (!showSidebar) {
      setIsSidebarOpen(false);
      return;
    }

    if (isMobile) {
      setIsSidebarOpen(false);
    } else {
      setIsSidebarOpen(true);
    }
  }, [showSidebar, isMobile]);

  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const effectiveSidebarOpen = showSidebar
    ? !isMobile
      ? true
      : isSidebarOpen
    : false;

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    if (!isMobile) {
      document.body.style.overflow = "";
      return undefined;
    }

    if (effectiveSidebarOpen) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }

    document.body.style.overflow = "";
    return undefined;
  }, [effectiveSidebarOpen, isMobile]);

  const handleChat = () => {
    if (isMobile && (isDraggingChat || dragMovedRef.current)) {
      return;
    }
    setIsChatOpen(true);
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
  };

  useEffect(() => {
    if (!token) {
      setIsChatOpen(false);
    }
  }, [token]);

  useEffect(() => {
    if (isChatOpen) {
      const handleEscape = (event) => {
        if (event.key === "Escape") {
          setIsChatOpen(false);
        }
      };

      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }
    return undefined;
  }, [isChatOpen]);

  useEffect(() => {
    setIsChatOpen(false);
  }, [location.pathname]);

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
      {showNavbar && (
        <Navbar
          onToggleSidebar={() =>
            setIsSidebarOpen((prev) => {
              if (!showSidebar) {
                return prev;
              }
              if (!isMobile) {
                return prev;
              }
              return !prev;
            })
          }
          isSidebarOpen={effectiveSidebarOpen}
        />
      )}
      {showSidebar && (
        <>
          {isMobile && (
            <div
              className={`fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
                effectiveSidebarOpen
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none"
              }`}
              onClick={() => setIsSidebarOpen(false)}
              aria-hidden="true"
            />
          )}
          <Sidebar
            isOpen={effectiveSidebarOpen}
            onClose={isMobile ? () => setIsSidebarOpen(false) : undefined}
          />
        </>
      )}
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
            path="/profile-preview/:slug"
            element={
              <Private>
                <ProfilePreview />
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
            path="/contact"
            element={
              <Private>
                <Contact />
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
          ref={chatButtonRef}
          type="button"
          onClick={handleChat}
          onPointerDown={handleChatDragStart}
          aria-label="Open chat"
          className={`fixed ${
            isMobile ? "" : "bottom-8 right-8"
          } w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110 z-30 flex items-center justify-center`}
          style={
            isMobile
              ? {
                  top: chatPosition.y,
                  left: chatPosition.x,
                  touchAction: "none",
                  cursor: isDraggingChat ? "grabbing" : "grab",
                }
              : undefined
          }
        >
          <IoChatbubbles className="w-7 h-7" />
        </button>
      )}

      {/* In-app chatbot */}
      {token && !isAuthPage && (
        <ChatbotWidget
          isOpen={isChatOpen}
          onClose={handleCloseChat}
          isMobile={isMobile}
        />
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
        <WalletProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </WalletProvider>
      </BrowserRouter>
    </AuthProvider>
    // </ThemeProvider>
  );
}
