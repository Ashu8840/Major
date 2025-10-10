import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import api, {
  getAnalyticsOverview,
  getDailyPrompt,
  getPosts,
  getTrendingPosts,
} from "../utils/api";
import {
  IoSparkles,
  IoBook,
  IoCreate,
  IoPeople,
  IoTrendingUp,
  IoStorefront,
  IoRocketOutline,
  IoFlame,
  IoHeart,
  IoTime,
  IoBulb,
  IoTrophyOutline,
  IoArrowForwardOutline,
  IoCheckmarkCircleOutline,
  IoStatsChart,
  IoLogoLinkedin,
  IoLogoTwitter,
  IoLogoInstagram,
  IoPulse,
} from "react-icons/io5";

const quickAccessItems = [
  {
    icon: IoCreate,
    title: "Write new entry",
    subtitle: "Capture today's thoughts",
    color: "from-blue-500 to-blue-600",
    path: "/diary/new",
  },
  {
    icon: IoPeople,
    title: "Community",
    subtitle: "Explore shared stories",
    color: "from-purple-500 to-purple-600",
    path: "/community",
  },
  {
    icon: IoTrendingUp,
    title: "Analytics",
    subtitle: "Track your progress",
    color: "from-green-500 to-green-600",
    path: "/analytics",
  },
  {
    icon: IoStorefront,
    title: "Marketplace",
    subtitle: "Publish & discover books",
    color: "from-orange-500 to-orange-600",
    path: "/marketplace",
  },
];

const moodIconMap = {
  happy: "😊",
  excited: "🤩",
  grateful: "🙏",
  love: "❤️",
  calm: "😌",
  content: "🙂",
  neutral: "😐",
  tired: "😴",
  confused: "😕",
  sad: "😢",
  angry: "😠",
  anxious: "😟",
  disappointed: "🙁",
  frustrated: "😤",
  overwhelmed: "🥵",
  confident: "💪",
};

const moodDistributionMeta = {
  positive: {
    label: "Positive",
    emoji: "🌞",
    color: "bg-emerald-50 text-emerald-700",
  },
  neutral: { label: "Neutral", emoji: "🌤", color: "bg-blue-50 text-blue-700" },
  negative: {
    label: "Challenging",
    emoji: "⛈",
    color: "bg-rose-50 text-rose-700",
  },
};

const stripHtml = (value = "") =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildPreview = (value = "", limit = 140) => {
  const text = stripHtml(value);
  if (!text) return "Add more details to this entry when you're ready.";
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trim()}…`;
};

const formatDate = (value) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    return value;
  }
};

const getPostStats = (post) => ({
  likes: post?.likes?.length || 0,
  comments: post?.comments?.length || 0,
  shares: post?.shares?.length || 0,
});

export default function Home() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [recentEntries, setRecentEntries] = useState([]);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [dailyPrompt, setDailyPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError("");

    const entriesPromise = user
      ? api.get("/entries/mine", { params: { limit: 6 } }).catch((err) => {
          console.error("Entries fetch failed", err);
          return { data: [] };
        })
      : Promise.resolve({ data: [] });

    const postsPromise = getPosts(1).catch((err) => {
      console.error("Posts fetch failed", err);
      return { posts: [] };
    });

    const trendingPromise = getTrendingPosts(1).catch((err) => {
      console.error("Trending posts fetch failed", err);
      return { posts: [] };
    });

    const promptPromise = getDailyPrompt().catch((err) => {
      console.error("Prompt fetch failed", err);
      return {
        dailyPrompt: "Take a mindful pause and write about what you notice.",
      };
    });

    const analyticsPromise = user
      ? getAnalyticsOverview("month").catch((err) => {
          console.error("Analytics fetch failed", err);
          return null;
        })
      : Promise.resolve(null);

    try {
      const [entriesRes, postsRes, trendingRes, promptRes, analyticsRes] =
        await Promise.all([
          entriesPromise,
          postsPromise,
          trendingPromise,
          promptPromise,
          analyticsPromise,
        ]);

      const entriesData = Array.isArray(entriesRes?.data)
        ? entriesRes.data
        : entriesRes?.data?.entries || [];
      setRecentEntries(entriesData.slice(0, 4));

      const resolvedPosts = postsRes?.posts || postsRes || [];
      setCommunityPosts(resolvedPosts.slice(0, 6));

      const resolvedTrending = trendingRes?.posts || [];
      if (resolvedTrending.length) {
        setTrendingPosts(resolvedTrending.slice(0, 3));
      } else {
        const fallbackTrending = [...resolvedPosts]
          .sort((a, b) => (b?.likes?.length || 0) - (a?.likes?.length || 0))
          .slice(0, 3);
        setTrendingPosts(fallbackTrending);
      }

      setDailyPrompt(
        promptRes?.dailyPrompt || "Capture the moment that defined your day."
      );
      setAnalytics(analyticsRes);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
      setError("We couldn't load your dashboard. Please refresh to try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let isActive = true;
    (async () => {
      await loadDashboardData();
      if (!isActive) return;
    })();
    return () => {
      isActive = false;
    };
  }, [loadDashboardData]);

  const userName = user?.username || user?.name || "Friend";
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
      ? "Good afternoon"
      : "Good evening";

  const streakDays = analytics?.streak?.current || 0;
  const longestStreak = analytics?.streak?.longest || 0;

  const writingHabits = analytics?.writingHabits || [];
  const maxHabitCount = writingHabits.reduce(
    (max, item) => Math.max(max, item.count || 0),
    1
  );

  const moodDistribution = analytics?.moodDistribution || {};

  const aiInsights = analytics?.aiInsights || [];

  const totals = analytics?.totals || {};
  const periodStats = analytics?.periodStats || {};
  const communityStats = analytics?.community || {};

  const processedEntries = useMemo(
    () =>
      (recentEntries || []).map((entry) => ({
        id: entry._id,
        title: entry.title || "Untitled entry",
        mood: moodIconMap[entry.mood] || "📝",
        createdAt: entry.createdAt,
        preview: buildPreview(entry.content, 160),
      })),
    [recentEntries]
  );

  const processedPosts = useMemo(
    () =>
      (communityPosts || []).map((post) => ({
        id: post._id,
        title: post.title || buildPreview(post.content, 60),
        author:
          post.author?.displayName ||
          post.author?.username ||
          post.author?.name ||
          "Anonymous",
        excerpt: buildPreview(post.content, 120),
        stats: getPostStats(post),
        createdAt: post.createdAt,
      })),
    [communityPosts]
  );

  const resolvedTrendingPosts = useMemo(
    () =>
      (trendingPosts || []).map((post) => ({
        id: post._id,
        title: post.title || buildPreview(post.content, 60),
        author:
          post.author?.displayName ||
          post.author?.username ||
          post.author?.name ||
          "Community member",
        likes: post.likes?.length || 0,
        summary: buildPreview(post.content, 90),
      })),
    [trendingPosts]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100/40">
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-6 sm:px-6 sm:py-10">
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-black/15" />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4 lg:w-2/3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1 text-xs font-medium uppercase tracking-wide text-blue-100">
                <IoSparkles className="h-4 w-4" />
                <span>Personalised workspace</span>
              </div>
              <h1 className="text-3xl font-bold sm:text-4xl lg:text-5xl">
                {greeting}, {userName}
              </h1>
              <p className="max-w-2xl text-base text-blue-100 sm:text-lg">
                Capture your story, review your progress, and stay inspired with
                insights curated from your writing journey.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate("/diary/new")}
                  className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-blue-700 shadow-lg transition-all hover:-translate-y-0.5 hover:bg-blue-50"
                >
                  <IoCreate className="h-4 w-4" />
                  <span>Start a new entry</span>
                  <IoArrowForwardOutline className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/diary")}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/40 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10"
                >
                  <IoBook className="h-4 w-4" />
                  <span>Browse your journal</span>
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-3xl bg-white/10 p-6 backdrop-blur">
              <div className="flex items-center gap-3">
                <IoFlame className="h-6 w-6 text-orange-200" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-blue-100">
                    Current streak
                  </p>
                  <p className="text-lg font-semibold">
                    {streakDays || "Let's begin"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <IoTrophyOutline className="h-6 w-6 text-yellow-200" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-blue-100">
                    Longest streak
                  </p>
                  <p className="text-lg font-semibold">
                    {longestStreak || "Set a new record"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <IoStatsChart className="h-6 w-6 text-green-200" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-blue-100">
                    Entries this month
                  </p>
                  <p className="text-lg font-semibold">
                    {periodStats.entryCount ?? 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {quickAccessItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className="group relative overflow-hidden rounded-3xl bg-white/80 p-6 text-left shadow-lg transition-all hover:-translate-y-1 hover:shadow-2xl"
              >
                <div
                  className={`absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br ${item.color} opacity-30 transition group-hover:opacity-50`}
                />
                <div
                  className={`inline-flex rounded-2xl bg-gradient-to-r ${item.color} p-3 text-white shadow-md`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-blue-900">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm text-blue-600">{item.subtitle}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-500">
                  Open
                  <IoArrowForwardOutline className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                </span>
              </button>
            );
          })}
        </section>

        <section className="grid gap-8 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-8">
            <div className="rounded-3xl bg-white/85 p-6 shadow-lg">
              <div className="flex items-center justify-between gap-4">
                <h2 className="flex items-center gap-2 text-xl font-semibold text-blue-900">
                  <IoTime className="h-5 w-5 text-blue-600" />
                  Recent entries
                </h2>
                <button
                  type="button"
                  onClick={() => navigate("/diary")}
                  className="inline-flex items-center gap-1 rounded-full border border-blue-100 px-3 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
                >
                  View diary
                  <IoArrowForwardOutline className="h-3 w-3" />
                </button>
              </div>
              <div className="mt-5 space-y-4">
                {!processedEntries.length && (
                  <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/40 p-6 text-sm text-blue-600">
                    No entries yet. Start your first story today!
                  </div>
                )}
                {processedEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="group flex items-start gap-4 rounded-2xl border border-transparent bg-blue-50/50 p-4 transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <div className="text-3xl" aria-hidden>
                      {entry.mood}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-blue-900 group-hover:text-blue-700">
                          {entry.title}
                        </h3>
                        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-blue-500 shadow-sm">
                          {formatDate(entry.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-blue-600 line-clamp-2">
                        {entry.preview}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white/85 p-6 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-xl font-semibold text-blue-900">
                  <IoSparkles className="h-5 w-5 text-purple-500" />
                  AI insights for you
                </h2>
                <button
                  type="button"
                  onClick={() => navigate("/diary/new")}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:-translate-y-0.5"
                >
                  <IoSparkles className="h-4 w-4" />
                  Get AI help
                </button>
              </div>
              <div className="mt-5 grid gap-3">
                {aiInsights.length ? (
                  aiInsights.slice(0, 4).map((insight, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 rounded-2xl bg-purple-50/70 p-3 text-sm text-purple-700"
                    >
                      <IoSparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-500" />
                      <p>{insight}</p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl bg-purple-50/60 p-4 text-sm text-purple-600">
                    Keep writing to unlock personalised suggestions and
                    reflections.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-3xl bg-white/85 p-6 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-xl font-semibold text-blue-900">
                  <IoTrendingUp className="h-5 w-5 text-green-500" />
                  Weekly writing rhythm
                </h2>
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-600">
                  Last 7 days
                </span>
              </div>
              <div className="mt-6 grid gap-2">
                <div className="flex items-end justify-between gap-2">
                  {(writingHabits.length
                    ? writingHabits
                    : [{ day: "Mon", count: 0 }]
                  ).map((item) => (
                    <div
                      key={item.day}
                      className="flex flex-1 flex-col items-center gap-2"
                    >
                      <div
                        className="w-8 rounded-t-xl bg-gradient-to-t from-blue-500 to-blue-300 transition hover:from-blue-600 hover:to-blue-400"
                        style={{
                          height: `${(item.count / maxHabitCount) * 80 || 0}%`,
                        }}
                        title={`${item.count} entries`}
                      />
                      <span className="text-xs font-medium text-blue-500">
                        {item.day}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 rounded-2xl bg-blue-50/60 p-4 text-xs text-blue-700 sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <IoPulse className="h-4 w-4" />
                    <span>
                      Average words per entry:{" "}
                      <strong>{periodStats.avgWordsPerEntry ?? 0}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <IoStatsChart className="h-4 w-4" />
                    <span>
                      Most active day:{" "}
                      <strong>{periodStats.mostActiveDay || "--"}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-8">
            <div className="rounded-3xl bg-white/85 p-6 shadow-lg">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-blue-900">
                <IoTrophyOutline className="h-5 w-5 text-yellow-500" />
                Progress snapshot
              </h2>
              <div className="mt-6 space-y-4 text-sm text-blue-700">
                <div className="rounded-2xl bg-yellow-50/80 p-4">
                  <p className="text-xs uppercase tracking-wide text-yellow-600">
                    Writing streak
                  </p>
                  <p className="mt-1 text-2xl font-bold text-yellow-700">
                    {streakDays || 0} days
                  </p>
                  <p className="text-xs text-yellow-600">
                    Longest streak: {longestStreak || 0} days
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-blue-50/80 p-3">
                    <p className="text-xs text-blue-500">Total entries</p>
                    <p className="text-lg font-semibold text-blue-700">
                      {totals.entries ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-purple-50/80 p-3">
                    <p className="text-xs text-purple-500">Avg words</p>
                    <p className="text-lg font-semibold text-purple-700">
                      {totals.avgWordsPerEntry ?? 0}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                    Mood mix
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {Object.entries(moodDistributionMeta).map(([key, meta]) => (
                      <div
                        key={key}
                        className={`rounded-2xl p-3 text-center text-xs ${meta.color}`}
                      >
                        <div className="text-lg">{meta.emoji}</div>
                        <div className="mt-1 font-semibold">{meta.label}</div>
                        <div>{moodDistribution[key]?.percentage ?? 0}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-orange-400 via-amber-500 to-rose-500 p-6 text-white shadow-xl">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/80">
                <IoRocketOutline className="h-4 w-4" />
                Upgrade to Pro
              </div>
              <p className="mt-3 text-lg font-semibold">
                Unlock AI-powered creative suites
              </p>
              <ul className="mt-4 space-y-2 text-sm text-white/90">
                <li className="flex items-start gap-2">
                  <IoCheckmarkCircleOutline className="mt-0.5 h-4 w-4 text-white" />
                  <span>Unlimited AI prompts and smart templates</span>
                </li>
                <li className="flex items-start gap-2">
                  <IoCheckmarkCircleOutline className="mt-0.5 h-4 w-4 text-white" />
                  <span>Advanced analytics & export-ready reports</span>
                </li>
                <li className="flex items-start gap-2">
                  <IoCheckmarkCircleOutline className="mt-0.5 h-4 w-4 text-white" />
                  <span>Priority support for teams and authors</span>
                </li>
              </ul>
              <button
                type="button"
                onClick={() => navigate("/upgrade")}
                className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25"
              >
                Explore plans
              </button>
            </div>

            <div className="rounded-3xl bg-white/85 p-6 shadow-lg">
              <h3 className="text-base font-semibold text-blue-900">
                Community reach
              </h3>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-blue-700">
                <div className="rounded-2xl bg-blue-50/70 p-3">
                  <dt className="text-xs uppercase tracking-wide text-blue-500">
                    Followers
                  </dt>
                  <dd className="text-lg font-semibold">
                    {communityStats.followers ?? 0}
                  </dd>
                </div>
                <div className="rounded-2xl bg-purple-50/70 p-3">
                  <dt className="text-xs uppercase tracking-wide text-purple-500">
                    Likes received
                  </dt>
                  <dd className="text-lg font-semibold">
                    {communityStats.likesReceived ?? 0}
                  </dd>
                </div>
                <div className="rounded-2xl bg-green-50/70 p-3">
                  <dt className="text-xs uppercase tracking-wide text-green-500">
                    Posts shared
                  </dt>
                  <dd className="text-lg font-semibold">
                    {communityStats.posts ?? 0}
                  </dd>
                </div>
                <div className="rounded-2xl bg-amber-50/70 p-3">
                  <dt className="text-xs uppercase tracking-wide text-amber-500">
                    Engagement
                  </dt>
                  <dd className="text-lg font-semibold">
                    {communityStats.engagementRate ?? 0}%
                  </dd>
                </div>
              </dl>
              <Link
                to="/community"
                className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Share something with the community
                <IoArrowForwardOutline className="h-3 w-3" />
              </Link>
            </div>
          </aside>
        </section>

        <section className="rounded-3xl bg-white/85 p-6 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-blue-900">
              <IoTrendingUp className="h-5 w-5 text-purple-500" />
              Trending in the community
            </h2>
            <button
              type="button"
              onClick={() => navigate("/community")}
              className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-600 transition hover:bg-purple-100"
            >
              Explore stories
              <IoArrowForwardOutline className="h-3 w-3" />
            </button>
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {resolvedTrendingPosts.length ? (
              resolvedTrendingPosts.map((post) => (
                <article
                  key={post.id}
                  className="group flex h-full flex-col rounded-3xl bg-gradient-to-br from-purple-50 via-blue-50 to-purple-100/60 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-purple-500">
                    <span>{post.author}</span>
                    <span className="inline-flex items-center gap-1 text-rose-500">
                      <IoHeart className="h-3 w-3" />
                      {post.likes}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-blue-900 group-hover:text-purple-700">
                    {post.title}
                  </h3>
                  <p className="mt-2 flex-1 text-xs text-blue-700 line-clamp-3">
                    {post.summary}
                  </p>
                  <Link
                    to={`/community`}
                    className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700"
                  >
                    Join the conversation
                    <IoArrowForwardOutline className="h-3 w-3" />
                  </Link>
                </article>
              ))
            ) : (
              <div className="col-span-full rounded-2xl border border-dashed border-purple-200 bg-purple-50/50 p-6 text-center text-sm text-purple-600">
                Community activity will appear here once new stories are shared.
              </div>
            )}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-black/15" />
          <div className="relative z-10 text-center">
            <div className="flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-wide text-blue-100">
              <IoBulb className="h-5 w-5" />
              Daily inspiration
            </div>
            <p className="mt-5 text-xl font-medium text-blue-100 sm:text-2xl">
              “{dailyPrompt}”
            </p>
            <button
              type="button"
              onClick={() => navigate("/diary/new")}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-blue-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50"
            >
              <IoCreate className="h-4 w-4" />
              Start writing now
            </button>
          </div>
        </section>

        <footer className="rounded-3xl bg-white/90 p-8 shadow-lg">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-blue-900">Major</h4>
              <p className="text-sm text-blue-600">
                The creative operating system for writers. Craft powerful
                entries, build your audience, and publish with confidence.
              </p>
            </div>
            <div className="space-y-3 text-sm text-blue-600">
              <h5 className="text-sm font-semibold uppercase tracking-wide text-blue-500">
                Product
              </h5>
              <Link className="block hover:text-blue-700" to="/analytics">
                Analytics
              </Link>
              <Link className="block hover:text-blue-700" to="/marketplace">
                Marketplace
              </Link>
              <Link className="block hover:text-blue-700" to="/readers-lounge">
                Reader's Lounge
              </Link>
            </div>
            <div className="space-y-3 text-sm text-blue-600">
              <h5 className="text-sm font-semibold uppercase tracking-wide text-blue-500">
                Company
              </h5>
              <Link className="block hover:text-blue-700" to="/community">
                Community
              </Link>
              <Link className="block hover:text-blue-700" to="/contact">
                Contact us
              </Link>
              <Link className="block hover:text-blue-700" to="/settings">
                Preferences
              </Link>
            </div>
            <div className="space-y-3 text-sm text-blue-600">
              <h5 className="text-sm font-semibold uppercase tracking-wide text-blue-500">
                Connect
              </h5>
              <div className="flex gap-3 text-blue-500">
                <a
                  href="https://www.linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 transition hover:bg-blue-100"
                >
                  <IoLogoLinkedin className="h-5 w-5" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 transition hover:bg-blue-100"
                >
                  <IoLogoTwitter className="h-5 w-5" />
                </a>
                <a
                  href="https://www.instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 transition hover:bg-blue-100"
                >
                  <IoLogoInstagram className="h-5 w-5" />
                </a>
              </div>
              <p className="text-xs text-blue-400">
                © {new Date().getFullYear()} Major Labs. All rights reserved.
              </p>
              <div className="flex flex-wrap gap-3 text-xs">
                <Link to="/settings" className="hover:text-blue-700">
                  Privacy
                </Link>
                <Link to="/settings" className="hover:text-blue-700">
                  Terms
                </Link>
                <Link to="/contact" className="hover:text-blue-700">
                  Support
                </Link>
              </div>
            </div>
          </div>
        </footer>

        {loading && (
          <div className="pointer-events-none fixed inset-x-0 bottom-6 mx-auto w-full max-w-xs rounded-2xl bg-blue-900/90 px-4 py-3 text-center text-xs font-medium text-white shadow-2xl">
            Syncing your latest activity…
          </div>
        )}
      </div>
    </div>
  );
}
