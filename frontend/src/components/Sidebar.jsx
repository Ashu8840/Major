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
} from "react-icons/io5";

export default function Sidebar() {
  const currentPath = window.location.pathname;

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
      className="hidden lg:block fixed left-0 w-64 bg-white border-r border-blue-100 z-20 scrollable"
      style={{ top: "80px", height: "calc(100vh - 80px)" }}
    >
      <div className="p-6">
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <a
                key={item.path}
                href={item.path}
                className={`flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                    : "text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                {item.icon}
                <span>{item.name}</span>
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
