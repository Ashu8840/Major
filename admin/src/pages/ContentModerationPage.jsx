import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FiAlertTriangle,
  FiSearch,
  FiFilter,
  FiTrash2,
  FiCheckCircle,
  FiXCircle,
  FiEye,
  FiUser,
  FiCalendar,
  FiMessageSquare,
  FiBook,
  FiFlag,
  FiMoreVertical,
  FiX,
  FiAlertCircle,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { apiClient } from "../lib/apiClient.js";
import Loader from "../components/loading/Loader.jsx";
import { useAdminSession } from "../context/AdminAuthContext.jsx";

const ContentModerationPage = () => {
  const { isAuthenticated } = useAdminSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all"); // all, posts, entries, books
  const [filterStatus, setFilterStatus] = useState("pending"); // pending, approved, rejected
  const [selectedContent, setSelectedContent] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showActionsMenu, setShowActionsMenu] = useState(null);

  // Fetch flagged content
  const { data, isLoading } = useQuery({
    queryKey: ["moderation", "flagged", filterType, filterStatus],
    queryFn: () =>
      apiClient.get(
        `/moderation/flagged?type=${filterType}&status=${filterStatus}`
      ),
    enabled: isAuthenticated,
    retry: false,
  });

  // Approve content mutation
  const approveContentMutation = useMutation({
    mutationFn: async (contentId) => {
      return await apiClient.post(`/moderation/${contentId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["moderation", "flagged"]);
      toast.success("Content approved successfully");
      setShowActionsMenu(null);
      setShowDetailModal(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to approve content");
    },
  });

  // Reject content mutation
  const rejectContentMutation = useMutation({
    mutationFn: async (contentId) => {
      return await apiClient.post(`/moderation/${contentId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["moderation", "flagged"]);
      toast.success("Content rejected successfully");
      setShowActionsMenu(null);
      setShowDetailModal(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to reject content");
    },
  });

  // Delete content mutation
  const deleteContentMutation = useMutation({
    mutationFn: async (contentId) => {
      return await apiClient.delete(`/moderation/${contentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["moderation", "flagged"]);
      toast.success("Content deleted successfully");
      setShowActionsMenu(null);
      setShowDetailModal(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to delete content");
    },
  });

  // Bulk actions mutation
  const bulkActionMutation = useMutation({
    mutationFn: async ({ action, contentIds }) => {
      return await apiClient.post("/moderation/bulk", { action, contentIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["moderation", "flagged"]);
      toast.success("Bulk action completed successfully");
      setSelectedItems([]);
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to perform bulk action");
    },
  });

  const handleViewContent = (content) => {
    setSelectedContent(content);
    setShowDetailModal(true);
  };

  const handleApprove = (contentId) => {
    approveContentMutation.mutate(contentId);
  };

  const handleReject = (contentId) => {
    if (window.confirm("Are you sure you want to reject this content?")) {
      rejectContentMutation.mutate(contentId);
    }
  };

  const handleDelete = (contentId) => {
    if (
      window.confirm(
        "Are you sure you want to permanently delete this content?"
      )
    ) {
      deleteContentMutation.mutate(contentId);
    }
  };

  const handleBulkAction = (action) => {
    if (selectedItems.length === 0) {
      toast.error("Please select items first");
      return;
    }
    if (
      window.confirm(
        `Are you sure you want to ${action} ${selectedItems.length} items?`
      )
    ) {
      bulkActionMutation.mutate({ action, contentIds: selectedItems });
    }
  };

  const toggleSelectItem = (itemId) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredContent.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredContent.map((item) => item._id));
    }
  };

  const content = data?.flaggedContent || [];

  const filteredContent = content.filter((item) => {
    const matchesSearch =
      item.content?.toLowerCase().includes(search.toLowerCase()) ||
      item.author?.username?.toLowerCase().includes(search.toLowerCase()) ||
      item.title?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const stats = {
    total: content.length || 0,
    posts: content.filter((c) => c.type === "post").length || 0,
    entries: content.filter((c) => c.type === "entry").length || 0,
    books: content.filter((c) => c.type === "book").length || 0,
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "post":
        return <FiMessageSquare className="w-4 h-4" />;
      case "entry":
        return <FiBook className="w-4 h-4" />;
      case "book":
        return <FiBook className="w-4 h-4" />;
      default:
        return <FiAlertTriangle className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "post":
        return "text-purple-600 bg-purple-100";
      case "entry":
        return "text-blue-600 bg-blue-100";
      case "book":
        return "text-green-600 bg-green-100";
      default:
        return "text-slate-600 bg-slate-100";
    }
  };

  if (isLoading) {
    return <Loader label="Loading flagged content" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
            Content Moderation
          </h1>
          <p className="mt-2 text-sm text-slate-600 flex items-center gap-2">
            <FiAlertTriangle className="w-4 h-4" />
            Review and moderate flagged content
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          className="rounded-2xl border-2 border-slate-200 bg-white p-6 hover:border-red-300 hover:shadow-lg transition-all cursor-pointer"
          onClick={() => setFilterType("all")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">
                Total Flagged
              </p>
              <p className="mt-2 text-3xl font-bold text-red-600">
                {stats.total}
              </p>
            </div>
            <div className="rounded-xl bg-red-100 p-3">
              <FiFlag className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl border-2 border-slate-200 bg-white p-6 hover:border-purple-300 hover:shadow-lg transition-all cursor-pointer"
          onClick={() => setFilterType("posts")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Posts</p>
              <p className="mt-2 text-3xl font-bold text-purple-600">
                {stats.posts}
              </p>
            </div>
            <div className="rounded-xl bg-purple-100 p-3">
              <FiMessageSquare className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl border-2 border-slate-200 bg-white p-6 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer"
          onClick={() => setFilterType("entries")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Entries</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">
                {stats.entries}
              </p>
            </div>
            <div className="rounded-xl bg-blue-100 p-3">
              <FiBook className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl border-2 border-slate-200 bg-white p-6 hover:border-green-300 hover:shadow-lg transition-all cursor-pointer"
          onClick={() => setFilterType("books")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Books</p>
              <p className="mt-2 text-3xl font-bold text-green-600">
                {stats.books}
              </p>
            </div>
            <div className="rounded-xl bg-green-100 p-3">
              <FiBook className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search, Filters, and Bulk Actions */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search flagged content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border-2 border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedItems.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border-2 border-indigo-200">
            <span className="text-sm font-semibold text-indigo-700">
              {selectedItems.length} selected
            </span>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => handleBulkAction("approve")}
                disabled={bulkActionMutation.isPending}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <FiCheckCircle className="w-4 h-4" />
                Approve
              </button>
              <button
                onClick={() => handleBulkAction("reject")}
                disabled={bulkActionMutation.isPending}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <FiXCircle className="w-4 h-4" />
                Reject
              </button>
              <button
                onClick={() => handleBulkAction("delete")}
                disabled={bulkActionMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <FiTrash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content Table */}
      <div className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={
                    selectedItems.length === filteredContent.length &&
                    filteredContent.length > 0
                  }
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300"
                />
              </th>
              <th className="px-6 py-3 text-left">Type</th>
              <th className="px-6 py-3 text-left">Content</th>
              <th className="px-6 py-3 text-left">Author</th>
              <th className="px-6 py-3 text-left">Reports</th>
              <th className="px-6 py-3 text-left">Date</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredContent.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <FiAlertTriangle className="mx-auto w-12 h-12 text-slate-300 mb-2" />
                  <p className="text-slate-500 font-medium">
                    No flagged content found
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    All content is currently moderated
                  </p>
                </td>
              </tr>
            ) : (
              filteredContent.map((item) => (
                <tr
                  key={item._id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item._id)}
                      onChange={() => toggleSelectItem(item._id)}
                      className="rounded border-slate-300"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${getTypeColor(
                        item.type
                      )}`}
                    >
                      {getTypeIcon(item.type)}
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 max-w-md">
                    <p className="text-sm text-slate-800 font-medium truncate">
                      {item.title || "Untitled"}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-1">
                      {item.content || item.description || "—"}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <img
                        src={
                          item.author?.profileImage || "/avatar-fallback.png"
                        }
                        alt={item.author?.username}
                        className="h-8 w-8 rounded-full object-cover ring-2 ring-slate-200"
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {item.author?.displayName || item.author?.username}
                        </p>
                        <p className="text-xs text-slate-500">
                          @{item.author?.username}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FiFlag className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-semibold text-red-600">
                        {item.reportCount || 0}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <FiCalendar className="w-4 h-4 text-slate-400" />
                      {item.flaggedAt
                        ? new Date(item.flaggedAt).toLocaleDateString()
                        : "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleViewContent(item)}
                        className="rounded-lg p-2 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        title="View Details"
                      >
                        <FiEye className="w-4 h-4" />
                      </button>
                      <div className="relative">
                        <button
                          onClick={() =>
                            setShowActionsMenu(
                              showActionsMenu === item._id ? null : item._id
                            )
                          }
                          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition-colors"
                          title="More Actions"
                        >
                          <FiMoreVertical className="w-4 h-4" />
                        </button>

                        {showActionsMenu === item._id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border-2 border-slate-200 shadow-xl z-50">
                            <div className="py-2">
                              <button
                                onClick={() => handleApprove(item._id)}
                                disabled={approveContentMutation.isPending}
                                className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2 transition-colors disabled:opacity-50"
                              >
                                <FiCheckCircle className="w-4 h-4" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(item._id)}
                                disabled={rejectContentMutation.isPending}
                                className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2 transition-colors disabled:opacity-50"
                              >
                                <FiXCircle className="w-4 h-4" />
                                Reject
                              </button>
                              <button
                                onClick={() => handleDelete(item._id)}
                                disabled={deleteContentMutation.isPending}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors disabled:opacity-50"
                              >
                                <FiTrash2 className="w-4 h-4" />
                                Delete
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

      {/* Content Detail Modal */}
      {showDetailModal && selectedContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b-2 border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-3xl">
              <h2 className="text-2xl font-bold text-slate-900">
                Content Details
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Type and Status */}
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${getTypeColor(
                    selectedContent.type
                  )}`}
                >
                  {getTypeIcon(selectedContent.type)}
                  {selectedContent.type}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-700">
                  <FiFlag className="w-4 h-4" />
                  {selectedContent.reportCount || 0} reports
                </span>
              </div>

              {/* Author Info */}
              <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-4">
                <img
                  src={
                    selectedContent.author?.profileImage ||
                    "/avatar-fallback.png"
                  }
                  alt={selectedContent.author?.username}
                  className="h-16 w-16 rounded-full object-cover ring-4 ring-white shadow-lg"
                />
                <div>
                  <p className="text-lg font-bold text-slate-900">
                    {selectedContent.author?.displayName ||
                      selectedContent.author?.username}
                  </p>
                  <p className="text-slate-600">
                    @{selectedContent.author?.username}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    {selectedContent.author?.email}
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-3">
                {selectedContent.title && (
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-600 mb-2 block">
                      Title
                    </label>
                    <p className="text-lg font-bold text-slate-900">
                      {selectedContent.title}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-600 mb-2 block">
                    Content
                  </label>
                  <div className="p-4 bg-slate-50 rounded-xl text-slate-700 leading-relaxed">
                    {selectedContent.content ||
                      selectedContent.description ||
                      "No content available"}
                  </div>
                </div>
              </div>

              {/* Report Reasons */}
              {selectedContent.reportReasons &&
                selectedContent.reportReasons.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold uppercase text-slate-600 mb-2 block">
                      Report Reasons
                    </label>
                    <div className="space-y-2">
                      {selectedContent.reportReasons.map((reason, index) => (
                        <div
                          key={index}
                          className="p-3 bg-red-50 rounded-lg border border-red-200 flex items-start gap-2"
                        >
                          <FiAlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                          <p className="text-sm text-red-800">{reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t-2 border-slate-200">
                <button
                  onClick={() => handleApprove(selectedContent._id)}
                  disabled={approveContentMutation.isPending}
                  className="flex-1 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FiCheckCircle className="w-4 h-4" />
                  {approveContentMutation.isPending
                    ? "Approving..."
                    : "Approve Content"}
                </button>
                <button
                  onClick={() => handleReject(selectedContent._id)}
                  disabled={rejectContentMutation.isPending}
                  className="flex-1 rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FiXCircle className="w-4 h-4" />
                  {rejectContentMutation.isPending
                    ? "Rejecting..."
                    : "Reject Content"}
                </button>
                <button
                  onClick={() => handleDelete(selectedContent._id)}
                  disabled={deleteContentMutation.isPending}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FiTrash2 className="w-4 h-4" />
                  {deleteContentMutation.isPending
                    ? "Deleting..."
                    : "Delete Content"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentModerationPage;
