import { useState } from "react";
import {
  FiUsers,
  FiMessageSquare,
  FiBookOpen,
  FiTrendingUp,
  FiShoppingCart,
  FiDollarSign,
  FiActivity,
  FiGlobe,
  FiDownload,
  FiCalendar,
} from "react-icons/fi";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import StatCard from "../components/common/StatCard.jsx";
import { apiClient } from "../lib/apiClient.js";
import { useAdminSession } from "../context/AdminAuthContext.jsx";
import Loader from "../components/loading/Loader.jsx";

const DashboardPage = () => {
  const { isAuthenticated } = useAdminSession();
  const [period, setPeriod] = useState("7");

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["admin", "dashboard", period],
    queryFn: () => apiClient.get(`/admin/dashboard/stats?period=${period}`),
    enabled: isAuthenticated,
    retry: 1,
  });

  const stats = [
    {
      title: "Total Users",
      value: dashboardData?.data?.stats?.totalUsers?.toLocaleString() || "0",
      delta: `+${dashboardData?.data?.stats?.newUsers || 0} new`,
      icon: FiUsers,
      trend: "up",
      color: "indigo",
    },
    {
      title: "Active Users",
      value: dashboardData?.data?.stats?.activeUsers?.toLocaleString() || "0",
      delta: "Last 7 days",
      icon: FiActivity,
      trend: "up",
      color: "green",
    },
    {
      title: "Total Posts",
      value: dashboardData?.data?.stats?.totalPosts?.toLocaleString() || "0",
      delta: `+${dashboardData?.data?.stats?.newPosts || 0} new`,
      icon: FiMessageSquare,
      trend: "up",
      color: "purple",
    },
    {
      title: "Total Entries",
      value: dashboardData?.data?.stats?.totalEntries?.toLocaleString() || "0",
      delta: "All time",
      icon: FiBookOpen,
      trend: "up",
      color: "blue",
    },
    {
      title: "Marketplace Revenue",
      value: `₹${
        dashboardData?.data?.stats?.totalRevenue?.toLocaleString() || 0
      }`,
      delta: "Total earnings",
      icon: FiDollarSign,
      trend: "up",
      color: "emerald",
    },
    {
      title: "Books Listed",
      value: dashboardData?.data?.stats?.totalBooks?.toLocaleString() || "0",
      delta: "Marketplace",
      icon: FiShoppingCart,
      trend: "up",
      color: "orange",
    },
  ];

  // User growth data from API
  const userGrowthData = dashboardData?.data?.charts?.userGrowth || [];

  // Revenue data from API
  const revenueData = dashboardData?.data?.charts?.revenueTrends || [];

  // Category data from API
  const categoryData = (
    dashboardData?.data?.charts?.popularCategories || []
  ).map((item, index) => ({
    name: item.name,
    value: item.value,
    color: ["#6366f1", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b", "#3b82f6"][
      index % 6
    ],
  }));

  // Activity timeline from API
  const activityChartData = (
    dashboardData?.data?.charts?.activityTimeline || []
  ).map((item) => ({
    hour: `${item.hour}:00`,
    posts: item.posts,
  }));

  // Analytics data from API
  const analytics = dashboardData?.data?.analytics || {};

  if (isLoading) {
    return <Loader label="Loading dashboard" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Dashboard Overview
          </h1>
          <p className="mt-2 text-sm text-slate-600 flex items-center gap-2">
            <FiGlobe className="w-4 h-4" />
            Monitor high-level performance across the Diaryverse platform
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-xl border-2 border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last Year</option>
          </select>
          <button className="rounded-xl border-2 border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-100 transition-all flex items-center gap-2">
            <FiDownload className="w-4 h-4" />
            Export Report
          </button>
          <button className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all">
            <FiCalendar className="inline w-4 h-4 mr-2" />
            Schedule Sync
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm hover:shadow-lg hover:border-indigo-300 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600">
                  {stat.title}
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {stat.value}
                </p>
                <div className="mt-2 flex items-center gap-1">
                  <span
                    className={`inline-flex items-center gap-1 text-sm font-semibold ${
                      stat.trend === "up" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {stat.trend === "up" ? "↑" : "↓"} {stat.delta}
                  </span>
                  <span className="text-xs text-slate-500">vs last period</span>
                </div>
              </div>
              <div
                className={`rounded-xl bg-${stat.color}-100 p-3 group-hover:scale-110 transition-transform`}
              >
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Growth Chart */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                User Growth Trends
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Total vs Active Users
              </p>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                <span className="text-slate-600">Total</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span className="text-slate-600">Active</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={userGrowthData}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "2px solid #e2e8f0",
                  borderRadius: "12px",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                }}
              />
              <Area
                type="monotone"
                dataKey="users"
                stroke="#6366f1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorUsers)"
              />
              <Area
                type="monotone"
                dataKey="active"
                stroke="#8b5cf6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorActive)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Chart */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Revenue & Sales
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Marketplace performance
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "2px solid #e2e8f0",
                  borderRadius: "12px",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                }}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
              <Bar dataKey="sales" fill="#f59e0b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Category Distribution */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm lg:col-span-1">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              Book Categories
            </h2>
            <p className="text-sm text-slate-500 mt-1">Distribution by genre</p>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Activity Timeline */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              Writing Activity
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Daily entries over time
            </p>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart
              data={
                activityChartData.length > 0
                  ? activityChartData
                  : userGrowthData
              }
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey={activityChartData.length > 0 ? "date" : "date"}
                stroke="#64748b"
              />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "2px solid #e2e8f0",
                  borderRadius: "12px",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                }}
              />
              <Line
                type="monotone"
                dataKey={activityChartData.length > 0 ? "count" : "users"}
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ fill: "#8b5cf6", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Performing Content */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Top Performing Posts
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Based on engagement and reach in the last 30 days
            </p>
          </div>
          <button className="rounded-xl border-2 border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-100 transition-colors">
            View All Posts
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="py-3 px-4 font-semibold text-slate-700">Post</th>
                <th className="py-3 px-4 font-semibold text-slate-700">
                  Author
                </th>
                <th className="py-3 px-4 font-semibold text-slate-700">
                  Likes
                </th>
                <th className="py-3 px-4 font-semibold text-slate-700">
                  Comments
                </th>
                <th className="py-3 px-4 font-semibold text-slate-700">
                  Shares
                </th>
                <th className="py-3 px-4 font-semibold text-slate-700">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(analytics?.community?.topPosts || []).map((post) => (
                <tr
                  key={post.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-800">
                        {post.title || post.summary || "Untitled"}
                      </span>
                      <span className="text-xs text-slate-500 mt-1">
                        {post.type}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                        {post.author?.displayName?.[0]?.toUpperCase() ||
                          post.author?.username?.[0]?.toUpperCase() ||
                          "U"}
                      </div>
                      <span className="text-slate-700">
                        {post.author?.displayName ||
                          post.author?.username ||
                          "Unknown"}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                      ❤️ {post.likes || 0}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                      💬 {post.comments || 0}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                      🔄 {post.shares || 0}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-slate-600">
                    {post.created || "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!analytics?.community?.topPosts?.length && (
            <div className="py-12 text-center">
              <FiMessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">
                No posts available for the selected period
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mood Distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6">
            Mood Distribution
          </h2>
          <div className="space-y-4">
            {(
              analytics?.mood?.distribution || [
                { label: "happy", percentage: 35, count: 350 },
                { label: "calm", percentage: 28, count: 280 },
                { label: "excited", percentage: 20, count: 200 },
                { label: "sad", percentage: 10, count: 100 },
                { label: "anxious", percentage: 7, count: 70 },
              ]
            ).map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700 capitalize">
                    {item.label}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">
                      {item.count || 0} entries
                    </span>
                    <span className="font-bold text-indigo-600">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
                <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6">
            Recent Platform Activity
          </h2>
          <div className="space-y-4">
            {[
              {
                action: "New user registered",
                user: "john_doe",
                time: "2 minutes ago",
                icon: FiUsers,
                color: "indigo",
              },
              {
                action: "Book published",
                user: "author_jane",
                time: "15 minutes ago",
                icon: FiBookOpen,
                color: "blue",
              },
              {
                action: "Post created",
                user: "writer_mike",
                time: "1 hour ago",
                icon: FiMessageSquare,
                color: "purple",
              },
              {
                action: "Purchase made",
                user: "reader_sarah",
                time: "2 hours ago",
                icon: FiShoppingCart,
                color: "green",
              },
            ].map((activity, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className={`p-2 rounded-lg bg-${activity.color}-100`}>
                  <activity.icon
                    className={`w-5 h-5 text-${activity.color}-600`}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">
                    {activity.action}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    by @{activity.user}
                  </p>
                </div>
                <span className="text-xs text-slate-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
