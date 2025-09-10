import { useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
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
} from "react-icons/io5";

export default function Analytics() {
  const { user } = useContext(AuthContext);
  const [selectedPeriod, setSelectedPeriod] = useState("month");

  // Mock data - in real app, this would come from API
  const [analytics] = useState({
    dailyStreak: 12,
    totalEntries: 143,
    averageWordsPerEntry: 350,
    longestEntry: 1200,
    moodDistribution: {
      positive: 65,
      neutral: 25,
      negative: 10,
    },
    communityStats: {
      followers: 234,
      following: 89,
      likesReceived: 1247,
      commentsReceived: 456,
      impressions: 1200,
    },
    commentSentiment: {
      positive: 78,
      neutral: 18,
      negative: 4,
    },
    weeklyActivity: [3, 5, 2, 7, 4, 6, 8], // Mon-Sun
    badges: [
      {
        name: "First Entry",
        unlocked: true,
        description: "Write your first diary entry",
      },
      {
        name: "Weekly Writer",
        unlocked: true,
        description: "Write entries for 7 consecutive days",
      },
      {
        name: "Mood Tracker",
        unlocked: true,
        description: "Record your mood 30 times",
      },
      {
        name: "Community Star",
        unlocked: false,
        description: "Get 100 likes on your posts",
      },
      {
        name: "Streak Master",
        unlocked: false,
        description: "Maintain a 30-day writing streak",
      },
      {
        name: "Wordsmith",
        unlocked: false,
        description: "Write an entry with 2000+ words",
      },
    ],
  });

  const aiInsights = [
    "You are most active on weekends",
    "70% of your diary entries are positive this month",
    "Your writing streak is 20% longer than average users",
    "Tuesday entries tend to be the most detailed",
  ];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Please log in to view analytics.</p>
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
                🔥{analytics.dailyStreak}
              </div>
              <p className="text-blue-700 text-lg">Days in a row</p>
              <p className="text-blue-500 mt-2">
                Keep writing daily to grow your streak!
              </p>
            </div>

            {/* Mini Calendar Heatmap */}
            <div className="bg-blue-50 rounded-xl p-4">
              <h3 className="text-sm font-medium text-blue-700 mb-3">
                Recent Activity
              </h3>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }, (_, i) => {
                  const isActive = Math.random() > 0.3; // Mock activity
                  return (
                    <div
                      key={i}
                      className={`w-6 h-6 rounded ${
                        isActive ? "bg-blue-600" : "bg-blue-100"
                      } transition-colors hover:scale-110`}
                      title={`Day ${i + 1}`}
                    />
                  );
                })}
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
                    {analytics.totalEntries}
                  </p>
                </div>
                <IoTime className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-lg border border-blue-100 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">
                    Avg Words/Entry
                  </p>
                  <p className="text-2xl font-bold text-blue-900">
                    {analytics.averageWordsPerEntry}
                  </p>
                </div>
                <IoTrendingUp className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-lg border border-blue-100 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">
                    Longest Entry
                  </p>
                  <p className="text-2xl font-bold text-blue-900">
                    {analytics.longestEntry} words
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
                  {analytics.moodDistribution.positive}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-yellow-400 rounded-full"></div>
                  <span className="text-blue-700">😐 Neutral</span>
                </div>
                <span className="font-semibold text-blue-900">
                  {analytics.moodDistribution.neutral}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-400 rounded-full"></div>
                  <span className="text-blue-700">😢 Negative</span>
                </div>
                <span className="font-semibold text-blue-900">
                  {analytics.moodDistribution.negative}%
                </span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600">
                <strong>Insight:</strong> Most common mood this month: Positive
                😊
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
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                  (day, index) => (
                    <div
                      key={day}
                      className="flex flex-col items-center flex-1"
                    >
                      <div
                        className="bg-blue-600 rounded-t w-full transition-all hover:bg-blue-700"
                        style={{
                          height: `${
                            (analytics.weeklyActivity[index] / 8) * 100
                          }%`,
                        }}
                      ></div>
                      <span className="text-xs text-blue-600 mt-2">{day}</span>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-blue-700">Most active day:</span>
                <span className="font-semibold text-blue-900">Sunday</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Weekly average:</span>
                <span className="font-semibold text-blue-900">5 entries</span>
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
                  {analytics.communityStats.followers}
                </div>
                <div className="text-sm text-blue-600">Followers</div>
              </div>

              <div className="text-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
                <IoHeart className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-900">
                  {analytics.communityStats.likesReceived}
                </div>
                <div className="text-sm text-blue-600">Likes</div>
              </div>

              <div className="text-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
                <IoChatbubble className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-900">
                  {analytics.communityStats.commentsReceived}
                </div>
                <div className="text-sm text-blue-600">Comments</div>
              </div>

              <div className="text-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
                <IoTrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-900">
                  {analytics.communityStats.impressions}k
                </div>
                <div className="text-sm text-blue-600">Impressions</div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl">
              <p className="text-blue-700">
                <strong>This Month:</strong> Your posts got{" "}
                {analytics.communityStats.impressions}k impressions and{" "}
                {analytics.communityStats.likesReceived} likes!
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
                    {analytics.commentSentiment.positive}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${analytics.commentSentiment.positive}%` }}
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
                    {analytics.commentSentiment.neutral}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gray-400 h-2 rounded-full transition-all"
                    style={{ width: `${analytics.commentSentiment.neutral}%` }}
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
                    {analytics.commentSentiment.negative}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full transition-all"
                    style={{ width: `${analytics.commentSentiment.negative}%` }}
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
              {analytics.badges.map((badge, index) => (
                <div
                  key={index}
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
              {aiInsights.map((insight, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-blue-700">{insight}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Upgrade Section */}
          <div className="lg:col-span-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Upgrade to Pro
                </h2>
                <p className="text-yellow-100">
                  Unlock advanced analytics, AI insights, and premium features
                </p>
              </div>
              <button className="bg-white text-orange-500 px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors">
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
