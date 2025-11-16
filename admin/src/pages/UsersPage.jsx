import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FiUsers,
  FiSearch,
  FiFilter,
  FiMoreVertical,
  FiMail,
  FiCalendar,
  FiCheckCircle,
  FiXCircle,
  FiShield,
  FiTrash2,
  FiEdit,
  FiEye,
  FiDownload,
  FiUserX,
  FiUserCheck,
  FiAlertTriangle,
  FiActivity,
  FiBook,
  FiMessageSquare,
  FiX,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { apiClient } from "../lib/apiClient.js";
import Loader from "../components/loading/Loader.jsx";
import { useAdminSession } from "../context/AdminAuthContext.jsx";

const UsersPage = () => {
  const { isAuthenticated } = useAdminSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", page, search, filterStatus],
    queryFn: () =>
      apiClient.get(
        `/admin/users?page=${page}&search=${search}&status=${filterStatus}`
      ),
    enabled: isAuthenticated,
    retry: 1,
  });

  // Ban user mutation
  const banUserMutation = useMutation({
    mutationFn: async ({ userId, reason }) => {
      return await apiClient.put(`/admin/users/${userId}/ban`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["admin", "users"]);
      toast.success("User banned successfully");
      setShowActionsMenu(null);
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to ban user");
    },
  });

  // Unban user mutation
  const unbanUserMutation = useMutation({
    mutationFn: async (userId) => {
      return await apiClient.put(`/admin/users/${userId}/unban`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["admin", "users"]);
      toast.success("User unbanned successfully");
      setShowActionsMenu(null);
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to unban user");
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      return await apiClient.delete(`/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["admin", "users"]);
      toast.success("User deleted successfully");
      setShowActionsMenu(null);
      setShowUserModal(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to delete user");
    },
  });

  const handleViewUser = async (user) => {
    // Fetch detailed user info
    const detailedUser = await apiClient.get(`/admin/users/${user._id}`);
    setSelectedUser(detailedUser.data);
    setShowUserModal(true);
  };

  const handleBanUser = (userId) => {
    const reason = prompt("Enter reason for ban:");
    if (reason) {
      banUserMutation.mutate({ userId, reason });
    }
  };

  const handleDeleteUser = (userId) => {
    if (
      window.confirm("Are you sure you want to permanently delete this user?")
    ) {
      deleteUserMutation.mutate(userId);
    }
  };

  const users = data?.data?.users || [];
  const stats = data?.data?.stats || {
    total: 0,
    active: 0,
    banned: 0,
  };
  const pagination = data?.data?.pagination || {};

  if (isLoading) {
    return <Loader label="Loading users" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            User Management
          </h1>
          <p className="mt-2 text-sm text-slate-600 flex items-center gap-2">
            <FiUsers className="w-4 h-4" />
            Manage all platform users and their activities
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl border-2 border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-100 transition-all">
          <FiDownload className="w-4 h-4" />
          Export Users
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          className="rounded-2xl border-2 border-slate-200 bg-white p-6 hover:border-indigo-300 hover:shadow-lg transition-all cursor-pointer"
          onClick={() => setFilterStatus("all")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Users</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {stats.total}
              </p>
            </div>
            <div className="rounded-xl bg-indigo-100 p-3">
              <FiUsers className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl border-2 border-slate-200 bg-white p-6 hover:border-green-300 hover:shadow-lg transition-all cursor-pointer"
          onClick={() => setFilterStatus("active")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Active</p>
              <p className="mt-2 text-3xl font-bold text-green-600">
                {stats.active}
              </p>
            </div>
            <div className="rounded-xl bg-green-100 p-3">
              <FiUserCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl border-2 border-slate-200 bg-white p-6 hover:border-red-300 hover:shadow-lg transition-all cursor-pointer"
          onClick={() => setFilterStatus("banned")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Banned</p>
              <p className="mt-2 text-3xl font-bold text-red-600">
                {stats.banned}
              </p>
            </div>
            <div className="rounded-xl bg-red-100 p-3">
              <FiUserX className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white rounded-2xl border-2 border-slate-200 p-4">
        <div className="relative flex-1">
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border-2 border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
          >
            <option value="all">All Users</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="unverified">Unverified</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              <th className="px-6 py-3 text-left">User</th>
              <th className="px-6 py-3 text-left">Email</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Role</th>
              <th className="px-6 py-3 text-left">Followers</th>
              <th className="px-6 py-3 text-left">Joined</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <FiUsers className="mx-auto w-12 h-12 text-slate-300 mb-2" />
                  <p className="text-slate-500 font-medium">No users found</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Try adjusting your search or filters
                  </p>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user._id || user.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={
                            user.profileImage?.url ||
                            user.profileImage ||
                            "/avatar-fallback.png"
                          }
                          alt={user.displayName || user.username}
                          className="h-10 w-10 rounded-full object-cover ring-2 ring-slate-200"
                        />
                        {user.isVerified && (
                          <FiCheckCircle className="absolute -bottom-1 -right-1 w-4 h-4 text-green-500 bg-white rounded-full" />
                        )}
                      </div>
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
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <FiMail className="w-4 h-4 text-slate-400" />
                      {user.email}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.isBanned ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                        <FiXCircle className="w-3 h-3" />
                        Suspended
                      </span>
                    ) : user.isVerified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        <FiCheckCircle className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                        <FiAlertTriangle className="w-3 h-3" />
                        Unverified
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {user.role === "admin" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                        <FiShield className="w-3 h-3" />
                        Admin
                      </span>
                    ) : (
                      <span className="text-sm text-slate-600">User</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-slate-700">
                      {user.followers?.length || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <FiCalendar className="w-4 h-4 text-slate-400" />
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleViewUser(user)}
                        className="rounded-lg p-2 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        title="View Details"
                      >
                        <FiEye className="w-4 h-4" />
                      </button>
                      <div className="relative">
                        <button
                          onClick={() =>
                            setShowActionsMenu(
                              showActionsMenu === user._id ? null : user._id
                            )
                          }
                          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition-colors"
                          title="More Actions"
                        >
                          <FiMoreVertical className="w-4 h-4" />
                        </button>

                        {showActionsMenu === user._id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border-2 border-slate-200 shadow-xl z-50">
                            <div className="py-2">
                              {user.isBanned ? (
                                <button
                                  onClick={() =>
                                    unbanUserMutation.mutate(user._id)
                                  }
                                  disabled={unbanUserMutation.isPending}
                                  className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2 transition-colors disabled:opacity-50"
                                >
                                  <FiUserCheck className="w-4 h-4" />
                                  Unban User
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleBanUser(user._id)}
                                  disabled={banUserMutation.isPending}
                                  className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2 transition-colors disabled:opacity-50"
                                >
                                  <FiUserX className="w-4 h-4" />
                                  Ban User
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteUser(user._id)}
                                disabled={deleteUserMutation.isPending}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors disabled:opacity-50"
                              >
                                <FiTrash2 className="w-4 h-4" />
                                Delete User
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b-2 border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-3xl">
              <h2 className="text-2xl font-bold text-slate-900">
                User Details
              </h2>
              <button
                onClick={() => setShowUserModal(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* User Profile Section */}
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl">
                <img
                  src={
                    selectedUser.profileImage?.url ||
                    selectedUser.profileImage ||
                    "/avatar-fallback.png"
                  }
                  alt={selectedUser.displayName || selectedUser.username}
                  className="h-20 w-20 rounded-full object-cover ring-4 ring-white shadow-lg"
                />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    {selectedUser.displayName || selectedUser.username}
                    {selectedUser.isVerified && (
                      <FiCheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </h3>
                  <p className="text-slate-600">@{selectedUser.username}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {selectedUser.role === "admin" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                        <FiShield className="w-3 h-3" />
                        Admin
                      </span>
                    )}
                    {selectedUser.isBanned ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                        <FiXCircle className="w-3 h-3" />
                        Suspended
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        <FiCheckCircle className="w-3 h-3" />
                        Active
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* User Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2 text-slate-600 mb-1">
                    <FiMail className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase">
                      Email
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-900">
                    {selectedUser.email}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2 text-slate-600 mb-1">
                    <FiCalendar className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase">
                      Joined
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-900">
                    {selectedUser.createdAt
                      ? new Date(selectedUser.createdAt).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Bio Section */}
              {selectedUser.bio && (
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2 text-slate-600 mb-2">
                    <FiMessageSquare className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase">Bio</span>
                  </div>
                  <p className="text-sm text-slate-700">{selectedUser.bio}</p>
                </div>
              )}

              {/* Activity Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-indigo-50 rounded-xl border-2 border-indigo-100">
                  <FiUsers className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-indigo-600">
                    {selectedUser.followersCount?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs text-slate-600 font-medium mt-1">
                    Followers
                  </p>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-xl border-2 border-purple-100">
                  <FiMessageSquare className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-600">
                    {selectedUser.postsCount || 0}
                  </p>
                  <p className="text-xs text-slate-600 font-medium mt-1">
                    Posts
                  </p>
                </div>

                <div className="text-center p-4 bg-blue-50 rounded-xl border-2 border-blue-100">
                  <FiBook className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600">
                    {selectedUser.booksCount || 0}
                  </p>
                  <p className="text-xs text-slate-600 font-medium mt-1">
                    Books
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t-2 border-slate-200">
                {selectedUser.isBanned ? (
                  <button
                    onClick={() => unbanUserMutation.mutate(selectedUser._id)}
                    disabled={unbanUserMutation.isPending}
                    className="flex-1 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <FiUserCheck className="w-4 h-4" />
                    {unbanUserMutation.isPending
                      ? "Unbanning..."
                      : "Unban User"}
                  </button>
                ) : (
                  <button
                    onClick={() => handleBanUser(selectedUser._id)}
                    disabled={banUserMutation.isPending}
                    className="flex-1 rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <FiUserX className="w-4 h-4" />
                    {banUserMutation.isPending ? "Banning..." : "Ban User"}
                  </button>
                )}
                <button
                  onClick={() => handleDeleteUser(selectedUser._id)}
                  disabled={deleteUserMutation.isPending}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FiTrash2 className="w-4 h-4" />
                  {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
