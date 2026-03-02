import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  IoCloseOutline as IoClose,
  IoLogOutOutline,
  IoHandRight,
} from "react-icons/io5";
import { NAVIGATION_ITEMS, NAVIGATION_ITEM_IDS } from "../config/navigation";
import { useCurrentUser } from "../hooks/useAuth";

export default function Sidebar({ isOpen = true, onClose, onOpenGrab }) {
  const currentPath = window.location.pathname;
  const navigate = useNavigate();
  const { logout, userProfile } = useCurrentUser();

  const menuPreference = userProfile?.preferences?.navigation?.menuItems;

  const menuItems = useMemo(() => {
    const baseOrder = NAVIGATION_ITEM_IDS;

    // If user has saved preferences, merge with any new items they might be missing
    let allowedIds;
    if (Array.isArray(menuPreference) && menuPreference.length) {
      // Start with user's preferences
      allowedIds = menuPreference.filter((id) => baseOrder.includes(id));
      // Add any new navigation items that might have been added after user saved preferences
      baseOrder.forEach((id) => {
        if (!allowedIds.includes(id)) {
          allowedIds.push(id);
        }
      });
    } else {
      // No preferences saved, use all items
      allowedIds = [...baseOrder];
    }

    return NAVIGATION_ITEMS.filter((item) => allowedIds.includes(item.id)).sort(
      (a, b) => allowedIds.indexOf(a.id) - allowedIds.indexOf(b.id),
    );
  }, [menuPreference]);

  return (
    <aside
      className={`fixed left-0 top-16 sm:top-[80px] z-40 h-[calc(100vh-64px)] sm:h-[calc(100vh-80px)] w-64 transform transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } xl:translate-x-0`}
    >
      <div className="relative h-full overflow-hidden border-r border-theme bg-theme-surface shadow-lg backdrop-blur-xl theme-transition">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-theme px-5 pt-4 pb-3 backdrop-blur xl:hidden">
            <span className="text-sm font-semibold text-theme-primary">
              Navigation
            </span>
            {typeof onClose === "function" && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-theme-primary-soft text-theme-primary transition-colors hover:opacity-80"
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
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.id}
                      href={item.path}
                      className={`group relative flex items-center gap-3 rounded-2xl px-4 py-3 pl-5 transition-all duration-200 ${
                        isActive
                          ? "bg-theme-accent text-white shadow-lg"
                          : "text-theme-primary hover:bg-theme-primary-soft"
                      }`}
                    >
                      {isActive && (
                        <span
                          className="absolute inset-y-0 left-0 my-1 w-1.5 rounded-full bg-white/80 shadow-lg shadow-white/30"
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
                          isActive
                            ? "border-white/50 bg-white/20 text-white"
                            : "border-theme bg-theme-surface text-theme-accent group-hover:opacity-80"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </span>
                      <span className="text-sm font-semibold">
                        {item.label}
                      </span>
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
                  className="xl:hidden mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-theme-primary-soft px-4 py-3 text-sm font-semibold text-theme-primary shadow-lg transition-all duration-200 hover:opacity-80"
                >
                  <IoLogOutOutline className="h-5 w-5" />
                  Log out
                </button>
              </nav>

              <div className="hidden xl:block rounded-3xl border border-theme bg-theme-primary-soft p-4 text-sm shadow-inner">
                <h4 className="text-sm font-semibold text-theme-primary">
                  Need a nudge?
                </h4>
                <p className="mt-2 text-xs text-theme-secondary">
                  Visit the Reader&apos;s Lounge or Analytics to spark new story
                  ideas and track your progress.
                </p>
              </div>

              {/* AirGrab – cross device gesture transfer */}
              {typeof onOpenGrab === "function" && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenGrab();
                    if (typeof onClose === "function") onClose();
                  }}
                  className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 pl-5 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:from-violet-500/20 hover:to-fuchsia-500/20 transition-all duration-200 group"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md group-hover:shadow-lg transition-shadow">
                    <IoHandRight className="w-5 h-5" />
                  </span>
                  <div className="text-left">
                    <span className="text-sm font-semibold block">AirGrab</span>
                    <span className="text-[10px] opacity-70">
                      Gesture transfer
                    </span>
                  </div>
                </button>
              )}
            </div>
          </div>
          <div className="border-t border-theme px-5 pt-4 pb-[10px] backdrop-blur">
            <button
              type="button"
              onClick={() => {
                logout();
                if (typeof onClose === "function") {
                  onClose();
                }
                navigate("/login");
              }}
              className="mt-[10px] inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-theme-primary-soft px-4 py-3 text-sm font-semibold text-theme-primary shadow-lg transition-all duration-200 hover:opacity-80"
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
