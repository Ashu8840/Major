import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FiShoppingBag,
  FiSearch,
  FiFilter,
  FiDollarSign,
  FiUsers,
  FiTrendingUp,
  FiCheckCircle,
  FiXCircle,
  FiEye,
  FiMoreVertical,
  FiX,
  FiCalendar,
  FiBook,
  FiDownload,
  FiRefreshCw,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { apiClient } from "../lib/apiClient.js";
import Loader from "../components/loading/Loader.jsx";
import { useAdminSession } from "../context/AdminAuthContext.jsx";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const MarketplaceControlPage = () => {
  const { isAuthenticated } = useAdminSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, pending, approved, rejected
  const [selectedBook, setSelectedBook] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Fetch books
  const { data: booksData, isLoading: booksLoading } = useQuery({
    queryKey: ["marketplace", "books", filterStatus],
    queryFn: () => apiClient.get(`/marketplace/books?status=${filterStatus}`),
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch sellers
  const { data: sellersData } = useQuery({
    queryKey: ["marketplace", "sellers"],
    queryFn: () => apiClient.get("/marketplace/sellers"),
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch transactions
  const { data: transactionsData } = useQuery({
    queryKey: ["marketplace", "transactions"],
    queryFn: () => apiClient.get("/marketplace/transactions"),
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch analytics
  const { data: analyticsData } = useQuery({
    queryKey: ["marketplace", "analytics"],
    queryFn: () => apiClient.get("/marketplace/analytics"),
    enabled: isAuthenticated,
    retry: false,
  });

  // Approve book mutation
  const approveBookMutation = useMutation({
    mutationFn: async (bookId) => {
      return await apiClient.post(`/marketplace/books/${bookId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["marketplace", "books"]);
      toast.success("Book approved successfully");
      setShowActionsMenu(null);
      setShowDetailModal(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to approve book");
    },
  });

  // Reject book mutation
  const rejectBookMutation = useMutation({
    mutationFn: async (bookId) => {
      return await apiClient.post(`/marketplace/books/${bookId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["marketplace", "books"]);
      toast.success("Book rejected successfully");
      setShowActionsMenu(null);
      setShowDetailModal(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to reject book");
    },
  });

  // Refund mutation
  const refundMutation = useMutation({
    mutationFn: async (transactionId) => {
      return await apiClient.post(
        `/marketplace/transactions/${transactionId}/refund`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["marketplace", "transactions"]);
      toast.success("Refund processed successfully");
      setShowRefundModal(false);
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to process refund");
    },
  });

  const handleViewBook = (book) => {
    setSelectedBook(book);
    setShowDetailModal(true);
  };

  const handleApprove = (bookId) => {
    approveBookMutation.mutate(bookId);
  };

  const handleReject = (bookId) => {
    if (window.confirm("Are you sure you want to reject this book listing?")) {
      rejectBookMutation.mutate(bookId);
    }
  };

  const handleRefund = (transaction) => {
    setSelectedTransaction(transaction);
    setShowRefundModal(true);
  };

  const confirmRefund = () => {
    if (selectedTransaction) {
      refundMutation.mutate(selectedTransaction._id);
    }
  };

  const books = booksData?.books || [];
  const sellers = sellersData?.sellers || [];
  const transactions = transactionsData?.transactions || [];

  const filteredBooks = books.filter((book) => {
    const authorName =
      typeof book.author === "string"
        ? book.author
        : book.author?.displayName ||
          book.author?.username ||
          book.author?.name ||
          "";

    const matchesSearch =
      book.title?.toLowerCase().includes(search.toLowerCase()) ||
      authorName.toLowerCase().includes(search.toLowerCase()) ||
      book.seller?.username?.toLowerCase().includes(search.toLowerCase()) ||
      book.seller?.displayName?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  // Calculate stats
  const stats = {
    totalRevenue: transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
    totalSales: transactions.length,
    activeSellers: sellers.filter((s) => s.isActive).length,
    pendingApprovals: books.filter((b) => b.status === "pending").length,
  };

  // Sample revenue chart data
  const revenueChartData = analyticsData?.revenueByMonth || [
    { month: "Jan", revenue: 12500, sales: 45 },
    { month: "Feb", revenue: 15800, sales: 67 },
    { month: "Mar", revenue: 18200, sales: 82 },
    { month: "Apr", revenue: 16500, sales: 74 },
    { month: "May", revenue: 21000, sales: 95 },
    { month: "Jun", revenue: 23500, sales: 108 },
  ];

  const isLoading = booksLoading;

  if (isLoading) {
    return <Loader label="Loading marketplace data" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            Marketplace Control
          </h1>
          <p className="mt-2 text-sm text-slate-600 flex items-center gap-2">
            <FiShoppingBag className="w-4 h-4" />
            Manage books, sellers, and transactions
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl border-2 border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-600 hover:bg-green-100 transition-all">
          <FiDownload className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 hover:border-green-300 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">
                Total Revenue
              </p>
              <p className="mt-2 text-3xl font-bold text-green-600">
                ${stats.totalRevenue.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-green-100 p-3">
              <FiDollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 hover:border-blue-300 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Sales</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">
                {stats.totalSales}
              </p>
            </div>
            <div className="rounded-xl bg-blue-100 p-3">
              <FiTrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 hover:border-purple-300 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">
                Active Sellers
              </p>
              <p className="mt-2 text-3xl font-bold text-purple-600">
                {stats.activeSellers}
              </p>
            </div>
            <div className="rounded-xl bg-purple-100 p-3">
              <FiUsers className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 hover:border-orange-300 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">
                Pending Approvals
              </p>
              <p className="mt-2 text-3xl font-bold text-orange-600">
                {stats.pendingApprovals}
              </p>
            </div>
            <div className="rounded-xl bg-orange-100 p-3">
              <FiBook className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">
          Revenue & Sales Trends
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={revenueChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="revenue"
              fill="#10b981"
              name="Revenue ($)"
              radius={[8, 8, 0, 0]}
            />
            <Bar
              dataKey="sales"
              fill="#3b82f6"
              name="Sales"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search books, authors, sellers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border-2 border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
            >
              <option value="all">All Books</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Books Table */}
      <div className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              <th className="px-6 py-3 text-left">Book</th>
              <th className="px-6 py-3 text-left">Seller</th>
              <th className="px-6 py-3 text-left">Price</th>
              <th className="px-6 py-3 text-left">Sales</th>
              <th className="px-6 py-3 text-left">Revenue</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Date</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredBooks.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <FiShoppingBag className="mx-auto w-12 h-12 text-slate-300 mb-2" />
                  <p className="text-slate-500 font-medium">No books found</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Try adjusting your search or filters
                  </p>
                </td>
              </tr>
            ) : (
              filteredBooks.map((book) => (
                <tr
                  key={book._id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          book.cover?.url ||
                          book.cover ||
                          "/book-placeholder.png"
                        }
                        alt={book.title}
                        className="h-12 w-9 rounded object-cover ring-2 ring-slate-200"
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {book.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {typeof book.author === "string"
                            ? book.author
                            : book.author?.displayName ||
                              book.author?.username ||
                              book.author?.name ||
                              "Unknown Author"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <img
                        src={
                          book.seller?.profileImage || "/avatar-fallback.png"
                        }
                        alt={book.seller?.username || "Seller"}
                        className="h-8 w-8 rounded-full object-cover ring-2 ring-slate-200"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {book.seller?.displayName ||
                            book.seller?.username ||
                            "Unknown Seller"}
                        </p>
                        <p className="text-xs text-slate-500">
                          @{book.seller?.username || "unknown"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-slate-700">
                      ${book.price?.toFixed(2) || "0.00"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-blue-600">
                      {book.salesCount || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-green-600">
                      ${((book.salesCount || 0) * (book.price || 0)).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {book.status === "approved" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        <FiCheckCircle className="w-3 h-3" />
                        Approved
                      </span>
                    ) : book.status === "pending" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                        <FiFilter className="w-3 h-3" />
                        Pending
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                        <FiXCircle className="w-3 h-3" />
                        Rejected
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <FiCalendar className="w-4 h-4 text-slate-400" />
                      {book.createdAt
                        ? new Date(book.createdAt).toLocaleDateString()
                        : "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleViewBook(book)}
                        className="rounded-lg p-2 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        title="View Details"
                      >
                        <FiEye className="w-4 h-4" />
                      </button>
                      <div className="relative">
                        <button
                          onClick={() =>
                            setShowActionsMenu(
                              showActionsMenu === book._id ? null : book._id
                            )
                          }
                          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition-colors"
                          title="More Actions"
                        >
                          <FiMoreVertical className="w-4 h-4" />
                        </button>

                        {showActionsMenu === book._id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border-2 border-slate-200 shadow-xl z-50">
                            <div className="py-2">
                              {book.status !== "approved" && (
                                <button
                                  onClick={() => handleApprove(book._id)}
                                  disabled={approveBookMutation.isPending}
                                  className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2 transition-colors disabled:opacity-50"
                                >
                                  <FiCheckCircle className="w-4 h-4" />
                                  Approve
                                </button>
                              )}
                              {book.status !== "rejected" && (
                                <button
                                  onClick={() => handleReject(book._id)}
                                  disabled={rejectBookMutation.isPending}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors disabled:opacity-50"
                                >
                                  <FiXCircle className="w-4 h-4" />
                                  Reject
                                </button>
                              )}
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

      {/* Recent Transactions */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <FiDollarSign className="w-5 h-5 text-green-600" />
          Recent Transactions
        </h3>
        <div className="space-y-3">
          {transactions.slice(0, 5).map((transaction) => (
            <div
              key={transaction._id}
              className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-2">
                  <FiDollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {transaction.book?.title || "Unknown Book"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {transaction.buyer?.username} purchased from{" "}
                    {transaction.seller?.username}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-green-600">
                  ${transaction.amount?.toFixed(2) || "0.00"}
                </p>
                <button
                  onClick={() => handleRefund(transaction)}
                  className="text-xs text-slate-500 hover:text-red-600 transition-colors flex items-center gap-1 ml-auto mt-1"
                >
                  <FiRefreshCw className="w-3 h-3" />
                  Refund
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Book Detail Modal */}
      {showDetailModal && selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b-2 border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-3xl">
              <h2 className="text-2xl font-bold text-slate-900">
                Book Details
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex gap-6">
                <img
                  src={
                    selectedBook.cover?.url ||
                    selectedBook.cover ||
                    "/book-placeholder.png"
                  }
                  alt={selectedBook.title}
                  className="h-48 w-32 rounded-lg object-cover ring-4 ring-slate-200 shadow-lg"
                />
                <div className="flex-1 space-y-3">
                  <h3 className="text-2xl font-bold text-slate-900">
                    {selectedBook.title}
                  </h3>
                  <p className="text-lg text-slate-600">
                    {selectedBook.author}
                  </p>
                  <div className="flex gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                      <FiDollarSign className="w-4 h-4" />$
                      {selectedBook.price?.toFixed(2)}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
                      <FiTrendingUp className="w-4 h-4" />
                      {selectedBook.salesCount || 0} sales
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl">
                <h4 className="text-sm font-semibold uppercase text-slate-600 mb-2">
                  Description
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {selectedBook.description || "No description available"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <h4 className="text-sm font-semibold uppercase text-slate-600 mb-2">
                    Seller
                  </h4>
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        selectedBook.seller?.profileImage ||
                        "/avatar-fallback.png"
                      }
                      alt={selectedBook.seller?.username}
                      className="h-10 w-10 rounded-full object-cover ring-2 ring-white"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {selectedBook.seller?.displayName ||
                          selectedBook.seller?.username}
                      </p>
                      <p className="text-xs text-slate-500">
                        @{selectedBook.seller?.username}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl">
                  <h4 className="text-sm font-semibold uppercase text-slate-600 mb-2">
                    Revenue
                  </h4>
                  <p className="text-2xl font-bold text-green-600">
                    $
                    {(
                      (selectedBook.salesCount || 0) * (selectedBook.price || 0)
                    ).toFixed(2)}
                  </p>
                </div>
              </div>

              {selectedBook.status === "pending" && (
                <div className="flex gap-3 pt-4 border-t-2 border-slate-200">
                  <button
                    onClick={() => handleApprove(selectedBook._id)}
                    disabled={approveBookMutation.isPending}
                    className="flex-1 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <FiCheckCircle className="w-4 h-4" />
                    {approveBookMutation.isPending
                      ? "Approving..."
                      : "Approve Book"}
                  </button>
                  <button
                    onClick={() => handleReject(selectedBook._id)}
                    disabled={rejectBookMutation.isPending}
                    className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <FiXCircle className="w-4 h-4" />
                    {rejectBookMutation.isPending
                      ? "Rejecting..."
                      : "Reject Book"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Confirm Refund
            </h2>
            <p className="text-slate-600 mb-6">
              Are you sure you want to refund{" "}
              <span className="font-semibold">
                ${selectedTransaction.amount?.toFixed(2)}
              </span>{" "}
              to{" "}
              <span className="font-semibold">
                {selectedTransaction.buyer?.username}
              </span>
              ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRefundModal(false)}
                className="flex-1 rounded-xl border-2 border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRefund}
                disabled={refundMutation.isPending}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {refundMutation.isPending ? "Processing..." : "Confirm Refund"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketplaceControlPage;
