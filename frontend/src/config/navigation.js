import {
  IoHomeOutline as IoHome,
  IoBook,
  IoPeople,
  IoTrophy,
  IoHeart,
  IoAnalytics,
  IoCreate,
  IoStorefront,
  IoLibrary,
  IoPersonCircle,
  IoSettings,
  IoHelpBuoy,
  IoStar,
  IoChatbubbles,
} from "react-icons/io5";

export const NAVIGATION_ITEMS = [
  { id: "dashboard", label: "Dashboard", path: "/", icon: IoHome },
  { id: "diary", label: "Diary", path: "/diary", icon: IoBook },
  { id: "community", label: "Community", path: "/community", icon: IoPeople },
  {
    id: "leaderboard",
    label: "Leaderboard",
    path: "/leaderboard",
    icon: IoTrophy,
  },
  { id: "social", label: "Social", path: "/social", icon: IoHeart },
  {
    id: "analytics",
    label: "Analytics",
    path: "/analytics",
    icon: IoAnalytics,
  },
  {
    id: "creatorStudio",
    label: "Creator Studio",
    path: "/creator-studio",
    icon: IoCreate,
  },
  {
    id: "marketplace",
    label: "Marketplace",
    path: "/marketplace",
    icon: IoStorefront,
  },
  {
    id: "readersLounge",
    label: "Reader's Lounge",
    path: "/readers-lounge",
    icon: IoLibrary,
  },
  { id: "profile", label: "Profile", path: "/profile", icon: IoPersonCircle },
  { id: "settings", label: "Settings", path: "/settings", icon: IoSettings },
  { id: "contact", label: "Contact", path: "/contact", icon: IoHelpBuoy },
  { id: "upgrade", label: "Upgrade", path: "/upgrade", icon: IoStar },
  { id: "chat", label: "Connect", path: "/chat", icon: IoChatbubbles },
];

export const NAVIGATION_ITEM_IDS = NAVIGATION_ITEMS.map((item) => item.id);
