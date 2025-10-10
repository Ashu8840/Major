import {
  IoHomeOutline as IoHome,
  IoBook,
  IoPeople,
  IoStar,
  IoChatbubbles,
  IoAnalytics,
  IoTrophy,
  IoHeart,
  IoCreate,
  IoStorefront,
  IoLibrary,
  IoPersonCircle,
  IoSettings,
  IoHelpBuoy,
  IoCloseOutline as IoClose,
  IoLogOutOutline,
} from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "../hooks/useAuth";

export default function Sidebar({ isOpen = true, onClose }) {
  const currentPath = window.location.pathname;
  const navigate = useNavigate();
  const { logout } = useCurrentUser();

  const menuItems = [
    {
      name: "Dashboard",
      path: "/",
      icon: <IoHome className="w-5 h-5" />,
    },
    {
      name: "Diary",
      path: "/diary",
      icon: <IoBook className="w-5 h-5" />,
    },
    {
      name: "Community",
      path: "/community",
      icon: <IoPeople className="w-5 h-5" />,
    },
    {
      name: "Leaderboard",
      path: "/leaderboard",
      icon: <IoTrophy className="w-5 h-5" />,
    },
    {
      name: "Social",
      path: "/social",
      icon: <IoHeart className="w-5 h-5" />,
    },
    {
      name: "Analytics",
      path: "/analytics",
      icon: <IoAnalytics className="w-5 h-5" />,
    },
    {
      name: "Creator Studio",
      path: "/creator-studio",
      icon: <IoCreate className="w-5 h-5" />,
    },
    {
      name: "Marketplace",
      path: "/marketplace",
      icon: <IoStorefront className="w-5 h-5" />,
    },
    {
      name: "Reader's Lounge",
      path: "/readers-lounge",
      icon: <IoLibrary className="w-5 h-5" />,
    },
    {
      name: "Profile",
      path: "/profile",
      icon: <IoPersonCircle className="w-5 h-5" />,
    },
    {
      name: "Settings",
      path: "/settings",
      icon: <IoSettings className="w-5 h-5" />,
    },
    {
      name: "Contact",
      path: "/contact",
      icon: <IoHelpBuoy className="w-5 h-5" />,
    },
    {
      name: "Upgrade",
      path: "/upgrade",
      icon: <IoStar className="w-5 h-5" />,
    },
    {
      name: "Connect",
      path: "/chat",
      icon: <IoChatbubbles className="w-5 h-5" />,
    },
  ];

  return (
    <aside
      className={`fixed left-0 top-[80px] z-40 h-[calc(100vh-80px)] w-64 transform transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } lg:translate-x-0`}
    >
      <div className="relative h-full overflow-hidden border-r border-white/40 bg-gradient-to-b from-white/95 via-blue-50/80 to-blue-100/70 shadow-[0_28px_50px_-35px_rgba(37,99,235,0.65)] backdrop-blur-xl dark:border-gray-800/70 dark:from-gray-950/95 dark:via-gray-900/90 dark:to-gray-950/90">
        <div
          className="hidden lg:block absolute inset-y-0 -right-px w-px bg-gradient-to-b from-blue-100/70 via-blue-100/40 to-transparent dark:from-gray-800/60 dark:via-gray-800/40"
          aria-hidden="true"
        />
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-white/50 px-5 pt-4 pb-3 backdrop-blur lg:hidden dark:border-gray-800/70">
            <span className="text-sm font-semibold text-blue-900 dark:text-gray-100">
              Navigation
            </span>
            {typeof onClose === "function" && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 transition-colors hover:bg-blue-200 dark:bg-gray-800 dark:text-gray-200"
                aria-label="Close sidebar"
              >
                <IoClose className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="scrollable flex-1 px-5 pb-8 pt-5">
            <div className="space-y-6">
              <nav className="space-y-2">
                {menuItems.map((item) => {
                  const isActive = currentPath === item.path;
                  return (
                    <a
                      key={item.path}
                      href={item.path}
                      className={`group relative flex items-center gap-3 rounded-2xl px-4 py-3 pl-5 transition-all duration-200 ${
                        isActive
                          ? "bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 text-white shadow-lg shadow-blue-700/30"
                          : "text-blue-900/80 hover:bg-white/50 hover:text-blue-900 dark:text-gray-200 dark:hover:bg-gray-800/60"
                      }`}
                    >
                      {isActive && (
                        <span
                          className="absolute inset-y-0 left-0 my-1 w-1.5 rounded-full bg-white/80 shadow-lg shadow-white/30 dark:bg-blue-400"
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
                          isActive
                            ? "border-white/50 bg-white/20 text-white"
                            : "border-blue-200/60 bg-white/80 text-blue-600 group-hover:border-blue-300 group-hover:text-blue-700 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-200"
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className="text-sm font-semibold">{item.name}</span>
                    </a>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    if (typeof onClose === "function") {
                      onClose();
                    }
                    navigate("/login");
                  }}
                  className="lg:hidden mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white/80 px-4 py-3 text-sm font-semibold text-blue-700 shadow-lg shadow-blue-800/10 transition-all duration-200 hover:bg-white hover:text-blue-800 dark:bg-gray-900/70 dark:text-gray-100 dark:hover:bg-gray-800"
                >
                  <IoLogOutOutline className="h-5 w-5" />
                  Log out
                </button>
              </nav>

              <div className="hidden lg:block rounded-3xl border border-white/60 bg-white/70 p-4 text-sm shadow-inner dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-200">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-gray-100">
                  Need a nudge?
                </h4>
                <p className="mt-2 text-xs text-blue-700/80 dark:text-gray-300">
                  Visit the Reader&apos;s Lounge or Analytics to spark new story
                  ideas and track your progress.
                </p>
              </div>
            </div>
          </div>
          <div className="border-t border-white/50 px-5 pt-4 pb-[10px] backdrop-blur dark:border-gray-800/70">
            <button
              type="button"
              onClick={() => {
                logout();
                if (typeof onClose === "function") {
                  onClose();
                }
                navigate("/login");
              }}
              className="mt-[10px] inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white/80 px-4 py-3 text-sm font-semibold text-blue-700 shadow-lg shadow-blue-800/10 transition-all duration-200 hover:bg-white hover:text-blue-800 dark:bg-gray-900/70 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              <IoLogOutOutline className="h-5 w-5" />
              Log out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
