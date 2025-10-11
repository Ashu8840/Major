import { NavLink } from "react-router-dom";
import {
  FiX,
  FiActivity,
  FiUsers,
  FiShoppingBag,
  FiMessageSquare,
  FiBarChart2,
} from "react-icons/fi";

const iconMap = {
  Dashboard: FiActivity,
  Users: FiUsers,
  Community: FiMessageSquare,
  Marketplace: FiShoppingBag,
  Support: FiMessageSquare,
  Analytics: FiBarChart2,
};

const Sidebar = ({ navigationItems, isOpen, onClose }) => {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex h-16 items-center justify-between px-6 shadow-sm">
        <div className="flex flex-col">
          <span className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Admin
          </span>
          <span className="text-lg font-bold text-slate-800">Daiaryverse</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
        >
          <FiX className="h-5 w-5" />
        </button>
      </div>

      <nav className="mt-6 space-y-1 px-4">
        {navigationItems.map((item) => {
          const Icon = iconMap[item.label] || FiActivity;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary-500 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`
              }
              onClick={onClose}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto hidden px-6 pb-6 pt-10 lg:block">
        <div className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-500">
          <p className="font-semibold text-slate-700">Need quick stats?</p>
          <p className="mt-1 leading-relaxed">
            Use the dashboard filters to narrow insights by time range.
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
