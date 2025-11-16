import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FiUser,
  FiShield,
  FiTrash2,
  FiPlus,
  FiSearch,
  FiMail,
  FiCalendar,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { apiClient } from "../lib/apiClient";
import Loader from "../components/loading/Loader";

const AdminManagementPage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    email: "",
    username: "",
    password: "",
    displayName: "",
  });

  // Fetch all users with admin role
  const { data: admins, isLoading } = useQuery({
    queryKey: ["admins"],
    queryFn: async () => {
      // Since there's no admin-specific endpoint, we'll fetch users and filter
      // In real implementation, you'd have a backend endpoint for this
      const response = await apiClient.get("/users/all?role=admin");
      return response;
    },
  });

  // Delete admin mutation
  const deleteMutation = useMutation({
    mutationFn: async (adminId) => {
      return await apiClient.delete(`/users/${adminId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["admins"]);
      toast.success("Admin removed successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to remove admin");
    },
  });

  // Add admin mutation
  const addMutation = useMutation({
    mutationFn: async (adminData) => {
      return await apiClient.post("/users/register", {
        ...adminData,
        role: "admin",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["admins"]);
      toast.success("Admin added successfully");
      setShowAddModal(false);
      setNewAdmin({ email: "", username: "", password: "", displayName: "" });
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to add admin");
    },
  });

  const handleDeleteAdmin = (adminId, isFirstAdmin) => {
    if (isFirstAdmin) {
      toast.error("Cannot delete the primary administrator");
      return;
    }

    if (window.confirm("Are you sure you want to remove this administrator?")) {
      deleteMutation.mutate(adminId);
    }
  };

  const handleAddAdmin = (e) => {
    e.preventDefault();
    if (!newAdmin.email || !newAdmin.username || !newAdmin.password) {
      toast.error("Please fill in all required fields");
      return;
    }
    addMutation.mutate(newAdmin);
  };

  const filteredAdmins =
    admins?.filter(
      (admin) =>
        admin.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  if (isLoading) {
    return <Loader label="Loading administrators" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FiShield className="text-indigo-600" />
            Administrator Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage admin users and their permissions
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all"
        >
          <FiPlus className="w-5 h-5" />
          Add Administrator
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by email, username, or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
        />
      </div>

      {/* Admin Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredAdmins.map((admin, index) => {
          const isFirstAdmin = index === 0;
          return (
            <div
              key={admin._id}
              className="bg-white rounded-2xl border-2 border-slate-200 p-6 hover:shadow-lg hover:border-indigo-300 transition-all"
            >
              {/* Admin Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                    {admin.displayName?.[0] || admin.username?.[0] || "A"}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {admin.displayName || admin.username}
                    </h3>
                    {isFirstAdmin && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600">
                        <FiShield className="w-3 h-3" />
                        Primary Admin
                      </span>
                    )}
                  </div>
                </div>
                {!isFirstAdmin && (
                  <button
                    onClick={() => handleDeleteAdmin(admin._id, false)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove admin"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Admin Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <FiMail className="w-4 h-4 text-slate-400" />
                  <span className="truncate">{admin.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <FiUser className="w-4 h-4 text-slate-400" />
                  <span>@{admin.username}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <FiCalendar className="w-4 h-4 text-slate-400" />
                  <span>
                    Joined {new Date(admin.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {admin.isVerified ? (
                    <>
                      <FiCheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-green-600">Verified</span>
                    </>
                  ) : (
                    <>
                      <FiAlertCircle className="w-4 h-4 text-orange-500" />
                      <span className="text-orange-600">
                        Pending Verification
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredAdmins.length === 0 && (
        <div className="text-center py-12">
          <FiUser className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-600 mb-2">
            No administrators found
          </h3>
          <p className="text-slate-500">
            Try adjusting your search or add a new administrator.
          </p>
        </div>
      )}

      {/* Add Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                Add New Administrator
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) =>
                    setNewAdmin({ ...newAdmin, email: e.target.value })
                  }
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="admin@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Username *
                </label>
                <input
                  type="text"
                  value={newAdmin.username}
                  onChange={(e) =>
                    setNewAdmin({ ...newAdmin, username: e.target.value })
                  }
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="adminuser"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={newAdmin.displayName}
                  onChange={(e) =>
                    setNewAdmin({ ...newAdmin, displayName: e.target.value })
                  }
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  value={newAdmin.password}
                  onChange={(e) =>
                    setNewAdmin({ ...newAdmin, password: e.target.value })
                  }
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border-2 border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMutation.isLoading}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {addMutation.isLoading ? "Adding..." : "Add Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagementPage;
