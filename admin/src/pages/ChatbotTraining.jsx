import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FiPlus,
  FiUpload,
  FiDownload,
  FiEdit2,
  FiTrash2,
  FiCheckCircle,
  FiXCircle,
  FiSearch,
  FiFilter,
} from "react-icons/fi";
import { IoSparkles, IoAnalytics } from "react-icons/io5";
import toast from "react-hot-toast";
import { apiClient } from "../lib/apiClient.js";

const ChatbotTraining = () => {
  const [trainingData, setTrainingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Form state
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    category: "general",
    keywords: "",
    priority: 1,
    isActive: true,
  });

  // Bulk import state
  const [bulkData, setBulkData] = useState("");
  const [bulkOverwrite, setBulkOverwrite] = useState(false);

  // Test query state
  const [testQuery, setTestQuery] = useState("");
  const [testResult, setTestResult] = useState(null);

  const categories = [
    "features",
    "navigation",
    "diary",
    "community",
    "marketplace",
    "analytics",
    "troubleshooting",
    "account",
    "subscription",
    "general",
  ];

  useEffect(() => {
    fetchTrainingData();
    fetchAnalytics();
  }, [currentPage, categoryFilter, activeFilter, searchTerm]);

  const fetchTrainingData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20,
        ...(categoryFilter !== "all" && { category: categoryFilter }),
        ...(activeFilter !== "all" && { isActive: activeFilter === "active" }),
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await apiClient.get(`/chatbot-training?${params}`);

      setTrainingData(response.data);
      setTotalPages(response.pagination.pages);
    } catch (error) {
      toast.error("Failed to fetch training data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await apiClient.get("/chatbot-training/analytics");
      setAnalytics(response.analytics);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        keywords: formData.keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
      };

      if (editingItem) {
        await apiClient.put(`/chatbot-training/${editingItem._id}`, payload);
        toast.success("Training data updated successfully");
      } else {
        await apiClient.post("/chatbot-training", payload);
        toast.success("Training data added successfully");
      }

      setShowAddModal(false);
      setEditingItem(null);
      resetForm();
      fetchTrainingData();
      fetchAnalytics();
    } catch (error) {
      toast.error(error.payload?.message || "Failed to save training data");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkImport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const data = JSON.parse(bulkData);

      if (!Array.isArray(data)) {
        toast.error("Data must be an array of training objects");
        return;
      }

      const response = await apiClient.post("/chatbot-training/bulk-import", {
        data,
        overwrite: bulkOverwrite,
      });

      toast.success(response.message);
      setShowBulkModal(false);
      setBulkData("");
      setBulkOverwrite(false);
      fetchTrainingData();
      fetchAnalytics();
    } catch (error) {
      toast.error(error.payload?.message || "Failed to import data");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await apiClient.get("/chatbot-training/export");

      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chatbot-training-${
        new Date().toISOString().split("T")[0]
      }.json`;
      a.click();

      toast.success(`Exported ${response.count} training items`);
    } catch (error) {
      toast.error("Failed to export data");
    }
  };

  const handleTestQuery = async () => {
    setLoading(true);
    try {
      const response = await apiClient.post("/chatbot-training/test-match", {
        question: testQuery,
      });

      setTestResult(response);
    } catch (error) {
      toast.error("Failed to test query");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm("Are you sure you want to delete this training data?")
    ) {
      return;
    }

    try {
      await apiClient.delete(`/chatbot-training/${id}`);

      toast.success("Training data deleted");
      fetchTrainingData();
      fetchAnalytics();
    } catch (error) {
      toast.error("Failed to delete training data");
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      question: item.question,
      answer: item.answer,
      category: item.category,
      keywords: item.keywords.join(", "),
      priority: item.priority,
      isActive: item.isActive,
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      question: "",
      answer: "",
      category: "general",
      keywords: "",
      priority: 1,
      isActive: true,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            <IoSparkles className="text-blue-500" />
            Chatbot Training
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Train your AI chatbot with custom responses
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowTestModal(true)}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
          >
            <IoAnalytics />
            Test Query
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            <FiDownload />
            Export
          </button>
          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
          >
            <FiUpload />
            Bulk Import
          </button>
          <button
            onClick={() => {
              setEditingItem(null);
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <FiPlus />
            Add Training
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg bg-white p-4 shadow dark:bg-gray-800"
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total Training Data
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.overview.total}
            </p>
            <p className="text-xs text-green-600">
              {analytics.overview.active} active
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-lg bg-white p-4 shadow dark:bg-gray-800"
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total Usage
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.overview.totalUsage}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-lg bg-white p-4 shadow dark:bg-gray-800"
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Avg Success Rate
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.overview.avgSuccessRate.toFixed(1)}%
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-lg bg-white p-4 shadow dark:bg-gray-800"
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Categories
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.byCategory.length}
            </p>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg bg-white p-4 shadow dark:bg-gray-800">
        <div className="flex-1">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search questions or answers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>

        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Training Data Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Question
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Usage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : trainingData.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-gray-500">
                  No training data found. Click "Add Training" to get started.
                </td>
              </tr>
            ) : (
              trainingData.map((item) => (
                <tr
                  key={item._id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-750"
                >
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {item.question}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {item.answer.substring(0, 100)}...
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {item.priority}/10
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {item.usageCount} times
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.successRate.toFixed(0)}% success
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {item.isActive ? (
                      <FiCheckCircle className="text-green-500" />
                    ) : (
                      <FiXCircle className="text-red-500" />
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`rounded-lg px-4 py-2 ${
                page === currentPage
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-white"
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
          >
            <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
              {editingItem ? "Edit Training Data" : "Add New Training Data"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Question *
                </label>
                <input
                  type="text"
                  value={formData.question}
                  onChange={(e) =>
                    setFormData({ ...formData, question: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Answer *
                </label>
                <textarea
                  value={formData.answer}
                  onChange={(e) =>
                    setFormData({ ...formData, answer: e.target.value })
                  }
                  rows="4"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Priority (1-10)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priority: parseInt(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.keywords}
                  onChange={(e) =>
                    setFormData({ ...formData, keywords: e.target.value })
                  }
                  placeholder="journal, diary, writing, entry"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="rounded"
                />
                <label className="text-sm text-gray-700 dark:text-gray-300">
                  Active (will be used by chatbot)
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingItem(null);
                    resetForm();
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Saving..." : editingItem ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
          >
            <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
              Bulk Import Training Data
            </h2>

            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Paste JSON array of training data. Format:
            </p>

            <pre className="mb-4 rounded-lg bg-gray-100 p-3 text-xs dark:bg-gray-900">
              {`[
  {
    "question": "How do I create a diary entry?",
    "answer": "Click on the + button...",
    "category": "diary",
    "priority": 5
  },
  ...
]`}
            </pre>

            <textarea
              value={bulkData}
              onChange={(e) => setBulkData(e.target.value)}
              rows="10"
              placeholder="Paste JSON array here..."
              className="w-full rounded-lg border border-gray-300 px-4 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />

            <div className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                checked={bulkOverwrite}
                onChange={(e) => setBulkOverwrite(e.target.checked)}
                className="rounded"
              />
              <label className="text-sm text-gray-700 dark:text-gray-300">
                Overwrite existing data (⚠️ Warning: This will delete all
                current training data)
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkData("");
                  setBulkOverwrite(false);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkImport}
                disabled={loading || !bulkData}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? "Importing..." : "Import"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Test Query Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
          >
            <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
              Test Chatbot Response
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Test Question
                </label>
                <input
                  type="text"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  placeholder="Type a question to test..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <button
                onClick={handleTestQuery}
                disabled={loading || !testQuery}
                className="w-full rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? "Testing..." : "Test Query"}
              </button>

              {testResult && (
                <div
                  className={`rounded-lg p-4 ${
                    testResult.matched
                      ? "bg-green-50 dark:bg-green-900"
                      : "bg-yellow-50 dark:bg-yellow-900"
                  }`}
                >
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
                    {testResult.matched
                      ? "✅ Match Found"
                      : "❌ No Match Found"}
                  </h3>
                  {testResult.matched && testResult.data && (
                    <div className="space-y-2 text-sm">
                      <p>
                        <strong>Question:</strong> {testResult.data.question}
                      </p>
                      <p>
                        <strong>Answer:</strong> {testResult.data.answer}
                      </p>
                      <p>
                        <strong>Category:</strong> {testResult.data.category}
                      </p>
                    </div>
                  )}
                  {!testResult.matched && (
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {testResult.message ||
                        "No matching training data found. The chatbot will use AI fallback."}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowTestModal(false);
                  setTestQuery("");
                  setTestResult(null);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ChatbotTraining;
