import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { apiClient } from "../lib/apiClient.js";
import Loader from "../components/loading/Loader.jsx";
import { useAdminSession } from "../context/AdminAuthContext.jsx";

const UsersPage = () => {
  const { isAuthenticated } = useAdminSession();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["community", "insights"],
    queryFn: () => apiClient.get("/community/insights"),
    enabled: isAuthenticated,
    retry: false,
  });

  const users = useMemo(() => {
    if (!Array.isArray(data?.topUsers)) {
      return [];
    }

    return data.topUsers.map((user) => ({
      ...user,
      followersCount: user.followersCount || user.followers?.length || 0,
    }));
  }, [data]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) {
      return users;
    }

    const term = search.trim().toLowerCase();
    return users.filter((user) => {
      const display = user.displayName || "";
      const username = user.username || "";
      return (
        display.toLowerCase().includes(term) ||
        username.toLowerCase().includes(term)
      );
    });
  }, [users, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Community Members
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review the most engaged profiles across the Daiaryverse community.
          </p>
        </div>
        <input
          type="search"
          placeholder="Search members"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:w-64"
        />
      </div>

      {isLoading ? (
        <Loader label="Loading members" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-6 py-3 text-left">Member</th>
                <th className="px-6 py-3 text-left">Followers</th>
                <th className="px-6 py-3 text-left">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
              {filteredUsers.map((user) => (
                <tr key={user._id || user.id || user.username}>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          user.profileImage?.url ||
                          user.profileImage ||
                          "/avatar-fallback.png"
                        }
                        alt={user.displayName || user.username}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-semibold text-slate-800">
                          {user.displayName || user.username}
                        </p>
                        <p className="text-xs text-slate-400">
                          @{user.username}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm font-semibold text-slate-700">
                    {user.followersCount.toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-500">
                    {user.createdAt
                      ? formatDistanceToNow(new Date(user.createdAt), {
                          addSuffix: true,
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredUsers.length && (
            <p className="py-6 text-center text-sm text-slate-400">
              No members match the current search.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default UsersPage;
