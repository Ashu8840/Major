import {
  FiUsers,
  FiMessageSquare,
  FiBookOpen,
  FiTrendingUp,
} from "react-icons/fi";
import { useQuery } from "@tanstack/react-query";
import StatCard from "../components/common/StatCard.jsx";
import AreaTrendChart from "../components/common/AreaTrendChart.jsx";
import { apiClient } from "../lib/apiClient.js";
import { useAdminSession } from "../context/AdminAuthContext.jsx";
import Loader from "../components/loading/Loader.jsx";

const DashboardPage = () => {
  const { isAuthenticated } = useAdminSession();

  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: () => apiClient.get("/analytics/overview?period=month"),
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: basicStats, isLoading: loadingStats } = useQuery({
    queryKey: ["community", "stats"],
    queryFn: () => apiClient.get("/community/stats"),
    enabled: isAuthenticated,
    retry: false,
  });

  const stats = [
    {
      title: "Total Users",
      value: basicStats?.totalUsers?.toLocaleString() || "-",
      delta: analytics?.engagement?.growth || "",
      icon: FiUsers,
      trend: analytics?.engagement?.delta >= 0 ? "up" : "down",
    },
    {
      title: "Posts (30d)",
      value: analytics?.entries?.periodEntries?.toLocaleString() || "-",
      delta: analytics?.entries?.growth || "",
      icon: FiMessageSquare,
      trend: analytics?.entries?.delta >= 0 ? "up" : "down",
    },
    {
      title: "Marketplace Revenue",
      value: analytics?.marketplace?.revenueFormatted || "₹0",
      delta: analytics?.marketplace?.growth || "",
      icon: FiTrendingUp,
      trend: analytics?.marketplace?.delta >= 0 ? "up" : "down",
    },
    {
      title: "Books Published",
      value: analytics?.marketplace?.newBooks || "-",
      delta: analytics?.marketplace?.bookGrowth || "",
      icon: FiBookOpen,
      trend: analytics?.marketplace?.bookDelta >= 0 ? "up" : "down",
    },
  ];

  const activityChartData = analytics?.entries?.trend || [];

  if (loadingAnalytics || loadingStats) {
    return <Loader label="Loading dashboard" />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Dashboard Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor high-level performance across the Daiaryverse platform.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-primary-500 hover:text-primary-500">
            Export Report
          </button>
          <button className="rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-600">
            Schedule Sync
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Writing Activity
              </h2>
              <span className="text-xs font-medium text-slate-400">
                {analytics?.entries?.trend?.length || 0} days
              </span>
            </div>
            <AreaTrendChart
              data={activityChartData}
              dataKey="count"
              labelKey="date"
              label="Entries per day"
            />
          </div>
        </section>

        <section className="lg:col-span-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Mood Distribution
            </h2>
            <div className="mt-6 space-y-4">
              {analytics?.mood?.distribution?.map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-medium text-slate-600">
                    <span className="capitalize">{item.label}</span>
                    <span>{item.percentage}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-primary-500"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              )) || (
                <p className="text-sm text-slate-400">
                  No mood entries recorded this period.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Top Performing Posts
            </h2>
            <p className="text-sm text-slate-500">
              Based on engagement and reach in the last 30 days.
            </p>
          </div>
          <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-primary-500 hover:text-primary-500">
            View all
          </button>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm text-slate-600">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                <th className="py-3 font-medium">Post</th>
                <th className="py-3 font-medium">Author</th>
                <th className="py-3 font-medium">Likes</th>
                <th className="py-3 font-medium">Comments</th>
                <th className="py-3 font-medium">Shares</th>
                <th className="py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(analytics?.community?.topPosts || []).map((post) => (
                <tr key={post.id}>
                  <td className="py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-800">
                        {post.title || post.summary || "Untitled"}
                      </span>
                      <span className="text-xs text-slate-400">
                        {post.type}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-sm text-slate-500">
                    {post.author?.displayName || post.author?.username}
                  </td>
                  <td className="py-3 text-sm text-slate-500">{post.likes}</td>
                  <td className="py-3 text-sm text-slate-500">
                    {post.comments}
                  </td>
                  <td className="py-3 text-sm text-slate-500">{post.shares}</td>
                  <td className="py-3 text-sm text-slate-500">
                    {post.created}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!analytics?.community?.topPosts?.length && (
            <p className="py-6 text-center text-sm text-slate-400">
              No posts available for the selected period.
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
