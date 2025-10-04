import { useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { getAnalyticsOverview } from "../utils/api";
import {
  IoFlame,
  IoHeart,
  IoPeople,
  IoTrophy,
  IoTime,
  IoTrendingUp,
  IoChatbubble,
  IoStar,
  IoCheckmark,
  IoCloseOutline as IoClose,
  IoRemove,
  IoLockClosed,
  IoEarth,
} from "react-icons/io5";

const formatNumber = (value) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "0";
  }
  return Number(value).toLocaleString();
};

const formatDate = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

const getHeatmapClass = (count) => {
  if (count >= 4) return "bg-blue-700";
  if (count === 3) return "bg-blue-600";
  if (count === 2) return "bg-blue-500";
  if (count === 1) return "bg-blue-400";
  return "bg-blue-100";
};

export default function Analytics() {
  const { user } = useContext(AuthContext);
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user) {
      setAnalytics(null);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError(null);

    getAnalyticsOverview(selectedPeriod)
      .then((data) => {
        if (active) {
          setAnalytics(data);
        }
      })
      .catch((err) => {
        if (active) {
          setError(
            err?.response?.data?.message ||
              "Unable to load analytics right now."
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedPeriod, user, refreshKey]);

  const handleRetry = () => {
    setRefreshKey((key) => key + 1);
  };

  const periodLabel =
    selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1);
  const writingHabits = analytics?.writingHabits || [];
  const maxHabitCount = writingHabits.length
    ? Math.max(...writingHabits.map((item) => item.count))
    : 0;
  const recentActivity = analytics?.recentActivity || [];
  const moodDistribution = analytics?.moodDistribution;
  const community = analytics?.community;
  const commentSentiment = analytics?.commentSentiment;
  const badges = analytics?.badges || [];
  const longestEntry = analytics?.totals?.longestEntry;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Please log in to view analytics.</p>
      </div>
    );
  }

  if (loading && !analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-blue-700 font-medium">Loading your analytics…</p>
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50 px-4">
        <p className="text-red-600 font-semibold mb-4">{error}</p>
        <button
          type="button"
          onClick={handleRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-500 transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-blue-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">
            Analytics Dashboard
          </h1>
          <p className="text-blue-600">
            Track your writing journey and community engagement
          </p>

          {/* Period Selector */}
          <div className="mt-4 flex space-x-2">
            {["week", "month", "year"].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedPeriod === period
                    ? "bg-blue-600 text-white"
                    : "bg-white text-blue-600 hover:bg-blue-50"
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>

          {error && analytics && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={handleRetry}
                className="text-red-700 font-semibold hover:underline"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Daily Streak Tracker - Large Card */}
          <div className="lg:col-span-8 bg-white rounded-2xl p-6 shadow-lg border border-blue-100 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-blue-900">
                Daily Writing Streak
              </h2>
              <IoFlame className="w-8 h-8 text-orange-500" />
            </div>

            <div className="text-center mb-6">
              <div className="text-6xl font-bold text-blue-600 mb-2">
                🔥{analytics?.streak?.current || 0}
              </div>
              <p className="text-blue-700 text-lg">Days in a row</p>
              <p className="text-blue-500 mt-2">
                Longest streak: {analytics?.streak?.longest || 0} days · Last
                entry: {formatDate(analytics?.streak?.lastEntryDate)}
              </p>
              <p className="text-blue-500 mt-2">
                Stay consistent to keep the streak growing!
              </p>
            </div>

            {/* Mini Calendar Heatmap */}
            <div className="bg-blue-50 rounded-xl p-4">
              <h3 className="text-sm font-medium text-blue-700 mb-3">
                Recent Activity
              </h3>
              <div className="grid grid-cols-7 gap-1">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.date}
                    className={`w-6 h-6 rounded ${getHeatmapClass(
                      activity.count
                    )} transition-transform duration-150 hover:scale-110`}
                    title={`${formatDate(activity.date)} · ${activity.count} ${
                      activity.count === 1 ? "entry" : "entries"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-lg border border-blue-100 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">
                    Total Entries
                  </p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatNumber(analytics?.totals?.entries || 0)}
                  </p>
                </div>
                <IoTime className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-lg border border-blue-100 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">
                    Entries this {periodLabel}
                  </p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatNumber(analytics?.periodStats?.entryCount || 0)}
                  </p>
                </div>
                <IoTrendingUp className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-xs text-blue-500 mt-2">
                Avg words:{" "}
                {formatNumber(analytics?.periodStats?.avgWordsPerEntry || 0)}
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-lg border border-blue-100 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">
                    Visibility Mix
                  </p>
                  <div className="text-blue-900 text-lg font-bold">
                    <span className="flex items-center gap-2">
                      <IoEarth className="text-blue-500" />
                      {formatNumber(analytics?.totals?.publicEntries || 0)}{" "}
                      public
                    </span>
                  </div>
                  <div className="text-blue-700 text-sm flex items-center gap-2 mt-1">
                    <IoLockClosed className="text-blue-400" />
                    {formatNumber(analytics?.totals?.privateEntries || 0)}{" "}
                    private
                  </div>
                </div>
                <IoPeople className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-lg border border-blue-100 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">
                    Longest Entry
                  </p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatNumber(longestEntry?.words || 0)} words
                  </p>
                  <p className="text-xs text-blue-500 mt-1">
                    {longestEntry?.title || "No entry yet"} ·{" "}
                    {formatDate(longestEntry?.createdAt)}
                  </p>
                </div>
                <IoStar className="w-8 h-8 text-blue-500" />
              </div>
            </div>
          </div>

          {/* Mood Insights */}
          <div className="lg:col-span-6 bg-white rounded-2xl p-6 shadow-lg border border-blue-100 hover:shadow-xl transition-shadow">
            <h2 className="text-xl font-semibold text-blue-900 mb-6">
              Mood Insights
            </h2>

            {/* Pie Chart Representation */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-48 h-48">
                {/* Mock pie chart using CSS */}
                <div className="absolute inset-0 rounded-full bg-gradient-conic from-green-400 via-yellow-400 to-red-400 opacity-80"></div>
                <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl">😊</div>
                    <p className="text-sm text-blue-600 font-medium">
                      Most Common
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Mood Distribution */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span className="text-blue-700">😊 Positive</span>
                </div>
                <span className="font-semibold text-blue-900">
                  {moodDistribution?.positive?.percentage || 0}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
                  <span className="text-blue-700">😐 Neutral</span>
                </div>
                <span className="font-semibold text-blue-900">
                  {moodDistribution?.neutral?.percentage || 0}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-400 rounded-full"></div>
                  <span className="text-blue-700">😢 Negative</span>
                </div>
                <span className="font-semibold text-blue-900">
                  {moodDistribution?.negative?.percentage || 0}%
                </span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600">
                <strong>Insight:</strong>{" "}
                {analytics?.periodStats?.topMood
                  ? `Most common mood this ${selectedPeriod}: ${analytics.periodStats.topMood}`
                  : "Log your moods to unlock insights."}
              </p>
            </div>
          </div>

          {/* Writing Habits */}
          <div className="lg:col-span-6 bg-white rounded-2xl p-6 shadow-lg border border-blue-100 hover:shadow-xl transition-shadow">
            <h2 className="text-xl font-semibold text-blue-900 mb-6">
              Writing Habits
            </h2>

            {/* Bar Chart */}
            <div className="mb-6">
              <div className="flex items-end justify-between h-32 space-x-2">
                {writingHabits.map((item) => {
                  const barHeight = maxHabitCount
                    ? Math.max(
                        (item.count / maxHabitCount) * 100,
                        item.count ? 10 : 0
                      )
                    : 0;
                  return (
                    <div
                      key={item.day}
                      className="flex flex-col items-center flex-1"
                    >
                      <div
                        className="bg-blue-600 rounded-t w-full transition-all hover:bg-blue-700"
                        style={{ height: `${barHeight}%` }}
                        title={`${item.day}: ${item.count} ${
                          item.count === 1 ? "entry" : "entries"
                        }`}
                      ></div>
                      <span className="text-xs text-blue-600 mt-2">
                        {item.day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-blue-700">Most active day:</span>
                <span className="font-semibold text-blue-900">
                  {analytics?.periodStats?.mostActiveDay || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Weekly average:</span>
                <span className="font-semibold text-blue-900">
                  {formatNumber(
                    Math.round(
                      (analytics?.periodStats?.entryCount || 0) /
                        (selectedPeriod === "week"
                          ? 1
                          : selectedPeriod === "month"
                          ? 4
                          : 52)
                    )
                  )}{" "}
                  entries
                </span>
              </div>
            </div>
          </div>

          {/* Community Engagement */}
          <div className="lg:col-span-8 bg-white rounded-2xl p-6 shadow-lg border border-blue-100 hover:shadow-xl transition-shadow">
            <h2 className="text-xl font-semibold text-blue-900 mb-6">
              Community Engagement
            </h2>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
                <IoPeople className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-900">
                  {formatNumber(community?.followers || 0)}
                </div>
                <div className="text-sm text-blue-600">Followers</div>
              </div>

              <div className="text-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
                <IoHeart className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-900">
                  {formatNumber(community?.likesReceived || 0)}
                </div>
                <div className="text-sm text-blue-600">Likes</div>
              </div>

              <div className="text-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
                <IoChatbubble className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-900">
                  {formatNumber(community?.commentsReceived || 0)}
                </div>
                <div className="text-sm text-blue-600">Comments</div>
              </div>

              <div className="text-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
                <IoTrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-900">
                  {formatNumber(community?.impressions || 0)}
                </div>
                <div className="text-sm text-blue-600">Impressions</div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl">
              <p className="text-blue-700">
                <strong>This {periodLabel}:</strong> Engagement rate{" "}
                {community?.engagementRate ?? 0}% ·{" "}
                {formatNumber(community?.shares || 0)} shares ·{" "}
                {formatNumber(community?.posts || 0)} posts
              </p>
            </div>
          </div>

          {/* Comment Sentiment */}
          <div className="lg:col-span-4 bg-white rounded-2xl p-6 shadow-lg border border-blue-100 hover:shadow-xl transition-shadow">
            <h2 className="text-xl font-semibold text-blue-900 mb-6">
              Comment Sentiment
            </h2>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <IoCheckmark className="w-5 h-5 text-green-500" />
                    <span className="text-blue-700">Positive</span>
                  </div>
                  <span className="font-semibold text-blue-900">
                    {commentSentiment?.positive ?? 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${commentSentiment?.positive || 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <IoRemove className="w-5 h-5 text-gray-500" />
                    <span className="text-blue-700">Neutral</span>
                  </div>
                  <span className="font-semibold text-blue-900">
                    {commentSentiment?.neutral ?? 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gray-400 h-2 rounded-full transition-all"
                    style={{ width: `${commentSentiment?.neutral || 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <IoClose className="w-5 h-5 text-red-500" />
                    <span className="text-blue-700">Negative</span>
                  </div>
                  <span className="font-semibold text-blue-900">
                    {commentSentiment?.negative ?? 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full transition-all"
                    style={{ width: `${commentSentiment?.negative || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Achievements & Badges */}
          <div className="lg:col-span-6 bg-white rounded-2xl p-6 shadow-lg border border-blue-100 hover:shadow-xl transition-shadow">
            <h2 className="text-xl font-semibold text-blue-900 mb-6">
              Achievements & Badges
            </h2>

            <div className="grid grid-cols-3 gap-4">
              {badges.map((badge) => (
                <div
                  key={badge.id || badge.name}
                  className={`p-4 rounded-xl text-center cursor-pointer transition-all hover:scale-105 ${
                    badge.unlocked
                      ? "bg-yellow-50 border-2 border-yellow-300"
                      : "bg-gray-50 border-2 border-gray-200 grayscale"
                  }`}
                  title={badge.description}
                >
                  <IoTrophy
                    className={`w-8 h-8 mx-auto mb-2 ${
                      badge.unlocked ? "text-yellow-500" : "text-gray-400"
                    }`}
                  />
                  <p
                    className={`text-xs font-medium ${
                      badge.unlocked ? "text-yellow-700" : "text-gray-500"
                    }`}
                  >
                    {badge.name}
                  </p>
                  <p className="text-[10px] text-blue-500 mt-1">
                    {badge.unlocked
                      ? `Unlocked ${formatDate(badge.earnedAt)}`
                      : "Progress ongoing"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div className="lg:col-span-6 bg-white rounded-2xl p-6 shadow-lg border border-blue-100 hover:shadow-xl transition-shadow">
            <h2 className="text-xl font-semibold text-blue-900 mb-6">
              AI Insights
            </h2>

            <div className="space-y-4">
              {(analytics?.aiInsights || []).map((insight, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-blue-700">{insight}</p>
                </div>
              ))}
              {(!analytics?.aiInsights ||
                analytics.aiInsights.length === 0) && (
                <div className="p-3 bg-blue-50 rounded-lg text-blue-600 text-sm">
                  Keep journaling to unlock personalized insights.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
