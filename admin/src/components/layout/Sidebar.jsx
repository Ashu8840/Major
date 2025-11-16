import { NavLink } from "react-router-dom";
import {
  FiX,
  FiActivity,
  FiUsers,
  FiShoppingBag,
  FiMessageSquare,
  FiBarChart2,
  FiShield,
  FiSettings,
  FiAlertTriangle,
  FiServer,
  FiCheckCircle,
} from "react-icons/fi";
import { IoSparkles } from "react-icons/io5";
import { useState, useEffect } from "react";

const iconMap = {
  Dashboard: FiActivity,
  Users: FiUsers,
  Moderation: FiAlertTriangle,
  Community: FiMessageSquare,
  Marketplace: FiShoppingBag,
  Support: FiMessageSquare,
  Analytics: FiBarChart2,
  Monitoring: FiServer,
  Admins: FiShield,
  Settings: FiSettings,
  "Chatbot Training": IoSparkles,
};

const Sidebar = ({ navigationItems, isOpen, onClose }) => {
  const [systemStatus, setSystemStatus] = useState("healthy");

  useEffect(() => {
    // Simulate system status check
    const checkStatus = setInterval(() => {
      // In real implementation, fetch from API
      setSystemStatus("healthy");
    }, 10000);

    return () => clearInterval(checkStatus);
  }, []);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r-2 border-slate-200 bg-gradient-to-b from-white to-slate-50 shadow-2xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 flex flex-col ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Header with Gradient */}
      <div className="relative h-16 flex items-center justify-between px-6 bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <FiActivity className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
              Admin Panel
            </span>
            <span className="text-lg font-bold text-white">Daiaryverse</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-white/80 hover:bg-white/20 transition-colors lg:hidden"
        >
          <FiX className="h-5 w-5" />
        </button>
      </div>

      {/* System Status Indicator */}
      <div className="mx-4 mt-4 p-3 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative">
            <FiCheckCircle className="w-5 h-5 text-green-600" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
          </div>
          <div>
            <p className="text-xs font-semibold text-green-800">
              System Status
            </p>
            <p className="text-xs text-green-600 capitalize">{systemStatus}</p>
          </div>
        </div>
      </div>

      {/* Navigation - Scrollable */}
      <nav className="flex-1 mt-6 space-y-1 px-4 overflow-y-auto sidebar-scroll">
        {navigationItems.map((item) => {
          const Icon = iconMap[item.label] || FiActivity;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200 scale-105"
                    : "text-slate-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:shadow-md hover:scale-102"
                }`
              }
              onClick={onClose}
            >
              <Icon className="h-5 w-5 group-hover:scale-110 transition-transform" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer with Enhanced Design */}
      <div className="px-4 pb-4 bg-gradient-to-t from-slate-100 to-transparent pt-6 flex-shrink-0">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 p-4 text-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <FiBarChart2 className="w-4 h-4 text-white" />
            </div>
            <p className="font-bold text-slate-800">Quick Tip</p>
          </div>
          <p className="text-xs leading-relaxed text-slate-600">
            Use real-time monitoring to track system health and prevent
            downtime.
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
