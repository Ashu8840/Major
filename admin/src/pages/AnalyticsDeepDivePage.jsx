import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FiBarChart2,
  FiDownload,
  FiCalendar,
  FiUsers,
  FiTrendingUp,
  FiActivity,
  FiClock,
  FiTarget,
} from "react-icons/fi";
import { apiClient } from "../lib/apiClient.js";
import Loader from "../components/loading/Loader.jsx";
import { useAdminSession } from "../context/AdminAuthContext.jsx";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const AnalyticsDeepDivePage = () => {
  const { isAuthenticated } = useAdminSession();
  const [dateRange, setDateRange] = useState("30"); // 7, 30, 90, 365 days
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [customDateRange, setCustomDateRange] = useState(false);

  // Fetch analytics data
  const { data, isLoading } = useQuery({
    queryKey: [
      "analytics",
      "deep-dive",
      customDateRange ? { startDate, endDate } : dateRange,
    ],
    queryFn: () => {
      const params = customDateRange
        ? `startDate=${startDate}&endDate=${endDate}`
        : `days=${dateRange}`;
      return apiClient.get(`/analytics/deep-dive?${params}`);
    },
    enabled: isAuthenticated && (customDateRange ? startDate && endDate : true),
    retry: false,
  });

  const handleExportReport = () => {
    const params = customDateRange
      ? `startDate=${startDate}&endDate=${endDate}`
      : `days=${dateRange}`;
    window.open(
      `${apiClient.defaults.baseURL}/analytics/export?${params}`,
      "_blank"
    );
  };

  // Sample data for charts
  const userEngagementData = data?.userEngagement || [
    {
      date: "2024-01-01",
      activeUsers: 1200,
      newUsers: 150,
      returningUsers: 1050,
    },
    {
      date: "2024-01-02",
      activeUsers: 1350,
      newUsers: 180,
      returningUsers: 1170,
    },
    {
      date: "2024-01-03",
      activeUsers: 1450,
      newUsers: 200,
      returningUsers: 1250,
    },
    {
      date: "2024-01-04",
      activeUsers: 1300,
      newUsers: 160,
      returningUsers: 1140,
    },
    {
      date: "2024-01-05",
      activeUsers: 1550,
      newUsers: 220,
      returningUsers: 1330,
    },
    {
      date: "2024-01-06",
      activeUsers: 1650,
      newUsers: 250,
      returningUsers: 1400,
    },
    {
      date: "2024-01-07",
      activeUsers: 1700,
      newUsers: 270,
      returningUsers: 1430,
    },
  ];

  const retentionData = data?.retention || [
    { cohort: "Week 1", day1: 100, day7: 65, day30: 45, day90: 30 },
    { cohort: "Week 2", day1: 100, day7: 68, day30: 48, day90: 32 },
    { cohort: "Week 3", day1: 100, day7: 70, day30: 50, day90: 35 },
    { cohort: "Week 4", day1: 100, day7: 72, day30: 52, day90: 37 },
  ];

  const activityDistribution = data?.activityDistribution || [
    { name: "Posts", value: 35, color: "#8b5cf6" },
    { name: "Entries", value: 40, color: "#3b82f6" },
    { name: "Comments", value: 15, color: "#10b981" },
    { name: "Marketplace", value: 10, color: "#f59e0b" },
  ];

  const peakHoursData = data?.peakHours || [
    { hour: "00:00", users: 120 },
    { hour: "03:00", users: 80 },
    { hour: "06:00", users: 150 },
    { hour: "09:00", users: 450 },
    { hour: "12:00", users: 650 },
    { hour: "15:00", users: 580 },
    { hour: "18:00", users: 720 },
    { hour: "21:00", users: 680 },
  ];

  const stats = data?.stats || {
    totalUsers: 15234,
    activeUsers: 8456,
    avgSessionDuration: "12m 34s",
    engagementRate: "68.5%",
  };

  if (isLoading) {
    return <Loader label="Loading analytics data" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Analytics Deep Dive
          </h1>
          <p className="mt-2 text-sm text-slate-600 flex items-center gap-2">
            <FiBarChart2 className="w-4 h-4" />
            Comprehensive insights and metrics
          </p>
        </div>
        <button
          onClick={handleExportReport}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-100 transition-all"
        >
          <FiDownload className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setCustomDateRange(false);
                setDateRange("7");
              }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                !customDateRange && dateRange === "7"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => {
                setCustomDateRange(false);
                setDateRange("30");
              }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                !customDateRange && dateRange === "30"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => {
                setCustomDateRange(false);
                setDateRange("90");
              }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                !customDateRange && dateRange === "90"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Last 90 Days
            </button>
            <button
              onClick={() => {
                setCustomDateRange(false);
                setDateRange("365");
              }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                !customDateRange && dateRange === "365"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Last Year
            </button>
          </div>

          <div className="flex items-center gap-3">
            <FiCalendar className="w-5 h-5 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCustomDateRange(true);
              }}
              className="rounded-lg border-2 border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCustomDateRange(true);
              }}
              className="rounded-lg border-2 border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Users</p>
              <p className="mt-2 text-3xl font-bold text-indigo-600">
                {stats.totalUsers.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-indigo-100 p-3">
              <FiUsers className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Active Users</p>
              <p className="mt-2 text-3xl font-bold text-green-600">
                {stats.activeUsers.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-green-100 p-3">
              <FiActivity className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Avg Session</p>
              <p className="mt-2 text-3xl font-bold text-purple-600">
                {stats.avgSessionDuration}
              </p>
            </div>
            <div className="rounded-xl bg-purple-100 p-3">
              <FiClock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">
                Engagement Rate
              </p>
              <p className="mt-2 text-3xl font-bold text-orange-600">
                {stats.engagementRate}
              </p>
            </div>
            <div className="rounded-xl bg-orange-100 p-3">
              <FiTarget className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* User Engagement Chart */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <FiTrendingUp className="w-5 h-5 text-indigo-600" />
          User Engagement Trends
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={userEngagementData}>
            <defs>
              <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorReturning" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="activeUsers"
              stroke="#6366f1"
              fill="url(#colorActive)"
              name="Active Users"
            />
            <Area
              type="monotone"
              dataKey="newUsers"
              stroke="#10b981"
              fill="url(#colorNew)"
              name="New Users"
            />
            <Area
              type="monotone"
              dataKey="returningUsers"
              stroke="#8b5cf6"
              fill="url(#colorReturning)"
              name="Returning Users"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Retention Analysis */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">
            Retention Analysis
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={retentionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="cohort" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="day1"
                stroke="#6366f1"
                strokeWidth={2}
                name="Day 1"
              />
              <Line
                type="monotone"
                dataKey="day7"
                stroke="#10b981"
                strokeWidth={2}
                name="Day 7"
              />
              <Line
                type="monotone"
                dataKey="day30"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Day 30"
              />
              <Line
                type="monotone"
                dataKey="day90"
                stroke="#ef4444"
                strokeWidth={2}
                name="Day 90"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Activity Distribution */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">
            Activity Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={activityDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {activityDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Peak Hours */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <FiClock className="w-5 h-5 text-purple-600" />
          Peak Activity Hours
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={peakHoursData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="hour" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip />
            <Bar
              dataKey="users"
              fill="#8b5cf6"
              radius={[8, 8, 0, 0]}
              name="Active Users"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AnalyticsDeepDivePage;
