import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AreaTrendChart from "../components/common/AreaTrendChart.jsx";
import Loader from "../components/loading/Loader.jsx";
import { apiClient } from "../lib/apiClient.js";
import { useAdminSession } from "../context/AdminAuthContext.jsx";

const periods = [
  { label: "Last 7 days", value: "week" },
  { label: "Last 30 days", value: "month" },
  { label: "Last 12 months", value: "year" },
];

const AnalyticsPage = () => {
  const [period, setPeriod] = useState("month");
  const { isAuthenticated } = useAdminSession();

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "overview", period],
    queryFn: () => apiClient.get(`/analytics/overview?period=${period}`),
    enabled: isAuthenticated,
    retry: false,
  });

  const insightCards = [
    {
      label: "Average words per entry",
      value: data?.entries?.avgWords || 0,
      description: "All-time average word count",
    },
    {
      label: "Community engagement rate",
      value: `${data?.community?.engagementRate || 0}%`,
      description: "Interactions per 100 views",
    },
    {
      label: "Marketplace conversion",
      value: `${data?.marketplace?.conversionRate || 0}%`,
      description: "Purchase rate on product views",
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Platform Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Inspect writing habits, mood trends, and community health.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {periods.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setPeriod(item.value)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                period === item.value
                  ? "bg-primary-500 text-white shadow"
                  : "border border-slate-200 text-slate-500 hover:border-primary-400 hover:text-primary-500"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {isLoading ? (
        <Loader label="Loading analytics" />
      ) : (
        <div className="space-y-8">
          <section className="grid gap-5 md:grid-cols-3">
            {insightCards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {card.label}
                </p>
                <p className="mt-3 text-2xl font-semibold text-slate-900">
                  {card.value}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {card.description}
                </p>
              </div>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  Entry Volume Trend
                </h2>
                <span className="text-xs font-medium text-slate-400">
                  {data?.entries?.trend?.length || 0} periods
                </span>
              </div>
              <AreaTrendChart
                data={data?.entries?.trend || []}
                dataKey="count"
                labelKey="date"
                label="Entries"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  Mood Sentiment Trend
                </h2>
                <span className="text-xs font-medium text-slate-400">
                  {data?.mood?.trend?.length || 0} periods
                </span>
              </div>
              <AreaTrendChart
                data={data?.mood?.trend || []}
                dataKey="positive"
                labelKey="label"
                label="Positive sentiment"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Badge Progress
                </h2>
                <p className="text-sm text-slate-500">
                  Top achievements unlocked by the community.
                </p>
              </div>
              <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-primary-500 hover:text-primary-500">
                Manage badges
              </button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {(data?.badges || []).map((badge) => (
                <div
                  key={badge.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <p className="text-sm font-semibold text-slate-800">
                    {badge.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {badge.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>{badge.unlockedCount} users unlocked</span>
                    <span>{badge.progress || 0}% progress</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-white/80">
                    <div
                      className="h-full rounded-full bg-primary-500"
                      style={{ width: `${badge.progress || 0}%` }}
                    />
                  </div>
                </div>
              ))}
              {!data?.badges?.length && (
                <p className="py-6 text-center text-sm text-slate-400">
                  No badge data available.
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
