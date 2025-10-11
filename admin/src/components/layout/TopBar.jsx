import { FiMenu, FiBell, FiLogOut } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useAdminSession } from "../../context/AdminAuthContext.jsx";

const TopBar = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { user, clearSession } = useAdminSession();
  const adminName =
    user?.displayName ||
    user?.username ||
    localStorage.getItem("admin_name") ||
    "Administrator";

  const handleLogout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-16 w-full max-w-content items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <FiMenu className="h-5 w-5" />
          </button>
          <div className="hidden sm:flex sm:flex-col">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Admin Panel
            </span>
            <span className="text-sm font-semibold text-slate-700">
              Daiaryverse Control Center
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            className="relative rounded-full border border-slate-200 p-2 text-slate-500 transition hover:text-primary-500"
            aria-label="Notifications"
          >
            <FiBell className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
              3
            </span>
          </button>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-700">
                {adminName}
              </p>
              <p className="text-xs text-slate-400">Super Admin</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-rose-500 hover:text-rose-500"
            >
              <FiLogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
