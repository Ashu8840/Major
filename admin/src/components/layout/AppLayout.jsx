import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { FiMenu, FiLogOut } from "react-icons/fi";
import Sidebar from "./Sidebar.jsx";
import TopBar from "./TopBar.jsx";

const navigationItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/users", label: "Users" },
  { to: "/moderation", label: "Moderation" },
  { to: "/community", label: "Community" },
  { to: "/marketplace-control", label: "Marketplace" },
  { to: "/support", label: "Support" },
  { to: "/analytics-deep", label: "Analytics" },
  { to: "/chatbot-training", label: "Chatbot Training" },
  { to: "/monitoring", label: "Monitoring" },
  { to: "/admins", label: "Admins" },
  { to: "/settings", label: "Settings" },
];

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar
        navigationItems={navigationItems}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen((prev) => !prev)} />

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
