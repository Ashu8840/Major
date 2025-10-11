import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { FiMenu, FiLogOut } from "react-icons/fi";
import Sidebar from "./Sidebar.jsx";
import TopBar from "./TopBar.jsx";

const navigationItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/users", label: "Users" },
  { to: "/community", label: "Community" },
  { to: "/marketplace", label: "Marketplace" },
  { to: "/support", label: "Support" },
  { to: "/analytics", label: "Analytics" },
];

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <Sidebar
          navigationItems={navigationItems}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex flex-1 flex-col">
          <TopBar onMenuClick={() => setSidebarOpen((prev) => !prev)} />

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-content">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
