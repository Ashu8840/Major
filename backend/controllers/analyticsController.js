const Entry = require("../models/Entry");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const User = require("../models/User");

const PERIOD_WINDOWS = {
  week: 7,
  month: 30,
  year: 365,
};

const HEATMAP_DAYS = 35;
const DAY_IN_MS = 1000 * 60 * 60 * 24;

const MOOD_CLASSIFICATION = {
  happy: "positive",
  excited: "positive",
  grateful: "positive",
  love: "positive",
  confident: "positive",
  content: "positive",
  calm: "neutral",
  neutral: "neutral",
  tired: "neutral",
  confused: "neutral",
  sad: "negative",
  angry: "negative",
  anxious: "negative",
  disappointed: "negative",
  frustrated: "negative",
  overwhelmed: "negative",
  "": "neutral",
};

const POSITIVE_WORDS = new Set([
  "amazing",
  "awesome",
  "brilliant",
  "enjoy",
  "enjoyed",
  "excited",
  "fantastic",
  "good",
  "great",
  "happy",
  "love",
  "lovely",
  "nice",
  "positive",
  "proud",
  "sweet",
  "wonderful",
]);

const NEGATIVE_WORDS = new Set([
  "angry",
  "awful",
  "bad",
  "boring",
  "disappointed",
  "disappointing",
  "hate",
  "horrible",
  "sad",
  "terrible",
  "upset",
  "worst",
]);

const DEFAULT_BADGES = [
  {
    id: "first_entry",
    name: "First Entry",
    description: "Write your first diary entry",
    check: ({ totalEntries }) => totalEntries > 0,
  },
  {
    id: "weekly_writer",
    name: "Weekly Writer",
    description: "Write entries on 7 different days",
    check: ({ streak }) => streak.longest >= 7,
  },
  {
    id: "streak_master",
    name: "Streak Master",
    description: "Maintain a 30-day writing streak",
    check: ({ streak }) => streak.longest >= 30,
  },
  {
    id: "wordsmith",
    name: "Wordsmith",
    description: "Write an entry with 2000+ words",
    check: ({ longestEntry }) => (longestEntry?.words || 0) >= 2000,
  },
  {
    id: "community_star",
    name: "Community Star",
    description: "Receive 100 likes across your posts",
    check: ({ community }) => (community.likesReceived || 0) >= 100,
  },
  {
    id: "mood_tracker",
    name: "Mood Tracker",
    description: "Log your mood 30 times",
    check: ({ moodEntries }) => moodEntries >= 30,
  },
];

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const dateKey = (value) => startOfDay(value).toISOString().slice(0, 10);

const wordCount = (content = "") => {
  const tokens = content
    .replace(/<[^>]*>/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return tokens.length;
};

const analyzeSentiment = (text = "") => {
  if (!text) return "neutral";

  const tokens = text.toLowerCase().match(/[a-z']+/g) || [];
  let score = 0;

  tokens.forEach((token) => {
    if (POSITIVE_WORDS.has(token)) score += 1;
    if (NEGATIVE_WORDS.has(token)) score -= 1;
  });

  if (score > 0) return "positive";
  if (score < 0) return "negative";
  return "neutral";
};

const calculateStreaks = (entries) => {
  if (!entries.length) {
    return {
      current: 0,
      longest: 0,
      lastEntryDate: null,
    };
  }

  const uniqueDays = Array.from(
    new Set(entries.map((entry) => startOfDay(entry.createdAt).getTime()))
  ).sort((a, b) => a - b);

  let longest = 1;
  let currentRun = 1;

  for (let i = 1; i < uniqueDays.length; i += 1) {
    const diff = Math.round((uniqueDays[i] - uniqueDays[i - 1]) / DAY_IN_MS);
    if (diff === 1) {
      currentRun += 1;
    } else {
      currentRun = 1;
    }
    longest = Math.max(longest, currentRun);
  }

  const todayStart = startOfDay(new Date()).getTime();
  const lastEntryTime = uniqueDays[uniqueDays.length - 1];
  const diffFromToday = Math.round((todayStart - lastEntryTime) / DAY_IN_MS);

  let current = 0;
  if (diffFromToday <= 1) {
    current = 1;
    for (let i = uniqueDays.length - 2; i >= 0; i -= 1) {
      const diff = Math.round((uniqueDays[i + 1] - uniqueDays[i]) / DAY_IN_MS);
      if (diff === 1) {
        current += 1;
      } else {
        break;
      }
    }
  }

  return {
    current,
    longest,
    lastEntryDate: new Date(lastEntryTime),
  };
};

const buildBadges = ({
  badgesFromUser,
  longestEntry,
  community,
  totalEntries,
  streak,
  moodEntries,
}) => {
  const earnedIds = new Set((badgesFromUser || []).map((badge) => badge.id));

  const context = {
    longestEntry,
    community,
    totalEntries,
    streak,
    moodEntries,
  };

  const mapped = DEFAULT_BADGES.map((badge) => {
    const unlockedByCheck = badge.check(context);
    const earned = badgesFromUser?.find(
      (userBadge) => userBadge.id === badge.id
    );

    return {
      id: badge.id,
      name: badge.name,
      description: badge.description,
      unlocked: unlockedByCheck || Boolean(earned),
      earnedAt: earned?.earnedAt || null,
    };
  });

  const additional = (badgesFromUser || [])
    .filter(
      (badge) =>
        !DEFAULT_BADGES.some((defaultBadge) => defaultBadge.id === badge.id)
    )
    .map((badge) => ({
      id: badge.id,
      name: badge.name,
      description: badge.description,
      unlocked: true,
      earnedAt: badge.earnedAt,
    }));

  return [...mapped, ...additional];
};

const getMoodAnalytics = async (req, res) => {
  const { period } = req.query; // 'weekly' or 'monthly'
  const date = new Date();
  let startDate;

  if (period === "weekly") {
    startDate = new Date(date.setDate(date.getDate() - 7));
  } else if (period === "monthly") {
    startDate = new Date(date.setMonth(date.getMonth() - 1));
  } else {
    return res.status(400).json({ message: "Invalid period" });
  }

  try {
    const moodData = await Entry.aggregate([
      {
        $match: {
          author: req.user._id,
          createdAt: { $gte: startDate },
          mood: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$mood",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          mood: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);
    res.json(moodData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching mood analytics" });
  }
};

const getActivityAnalytics = async (req, res) => {
  try {
    const activityData = await Entry.aggregate([
      {
        $match: {
          author: req.user._id,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        $project: {
          date: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);
    res.json(activityData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching activity analytics" });
  }
};

const getAnalyticsOverview = async (req, res) => {
  const rawPeriod = (req.query.period || "month").toLowerCase();
  const period = Object.keys(PERIOD_WINDOWS).includes(rawPeriod)
    ? rawPeriod
    : "month";

  const windowDays = PERIOD_WINDOWS[period];
  const now = new Date();
  const startDate = new Date(now.getTime() - (windowDays - 1) * DAY_IN_MS);
  startDate.setHours(0, 0, 0, 0);

  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const entries = await Entry.find({
      author: req.user._id,
    })
      .select("title content mood visibility createdAt")
      .sort({ createdAt: 1 })
      .lean();

    const entriesInPeriod = entries.filter(
      (entry) => entry.createdAt >= startDate
    );

    const totalEntries = entries.length;
    const totalWords = entries.reduce(
      (sum, entry) => sum + wordCount(entry.content),
      0
    );

    const longestEntryRecord = entries.reduce((acc, entry) => {
      const words = wordCount(entry.content);
      if (!acc || words > acc.words) {
        return {
          id: entry._id,
          title: entry.title,
          words,
          createdAt: entry.createdAt,
        };
      }
      return acc;
    }, null);

    const publicEntries = entries.filter(
      (entry) => entry.visibility !== "private"
    ).length;
    const privateEntries = totalEntries - publicEntries;

    const periodWords = entriesInPeriod.reduce(
      (sum, entry) => sum + wordCount(entry.content),
      0
    );

    const periodPublicEntries = entriesInPeriod.filter(
      (entry) => entry.visibility !== "private"
    ).length;
    const periodPrivateEntries = entriesInPeriod.length - periodPublicEntries;

    const moodCounts = entriesInPeriod.reduce(
      (acc, entry) => {
        if (!entry.mood) return acc;
        const category = MOOD_CLASSIFICATION[entry.mood] || "neutral";
        acc[category] += 1;
        return acc;
      },
      { positive: 0, neutral: 0, negative: 0 }
    );

    const totalMoodEntries =
      moodCounts.positive + moodCounts.neutral + moodCounts.negative;

    const moodDistribution = {
      positive: {
        count: moodCounts.positive,
        percentage: totalMoodEntries
          ? Math.round((moodCounts.positive / totalMoodEntries) * 100)
          : 0,
      },
      neutral: {
        count: moodCounts.neutral,
        percentage: totalMoodEntries
          ? Math.round((moodCounts.neutral / totalMoodEntries) * 100)
          : 0,
      },
      negative: {
        count: moodCounts.negative,
        percentage: totalMoodEntries
          ? Math.round((moodCounts.negative / totalMoodEntries) * 100)
          : 0,
      },
    };

    const entriesByDayOfWeek = entriesInPeriod.reduce((acc, entry) => {
      const day = new Date(entry.createdAt).getDay();
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});

    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const writingHabits = [1, 2, 3, 4, 5, 6, 0].map((dayIndex) => ({
      day: dayLabels[dayIndex],
      count: entriesByDayOfWeek[dayIndex] || 0,
    }));

    const mostActiveDay = writingHabits.reduce((top, item) => {
      if (!top || item.count > top.count) return item;
      return top;
    }, null);

    const streak = calculateStreaks(entries);

    const heatmapStart = new Date(
      now.getTime() - (HEATMAP_DAYS - 1) * DAY_IN_MS
    );
    heatmapStart.setHours(0, 0, 0, 0);

    const activityMap = entries.reduce((acc, entry) => {
      if (entry.createdAt >= heatmapStart) {
        const key = dateKey(entry.createdAt);
        acc[key] = (acc[key] || 0) + 1;
      }
      return acc;
    }, {});

    const recentActivity = Array.from({ length: HEATMAP_DAYS }, (_, index) => {
      const date = new Date(heatmapStart.getTime() + index * DAY_IN_MS);
      const key = dateKey(date);
      return {
        date: key,
        count: activityMap[key] || 0,
      };
    });

    const posts = await Post.find({
      author: req.user._id,
    })
      .select("likes shares comments views createdAt")
      .lean();

    const postIds = posts.map((post) => post._id);
    const comments = postIds.length
      ? await Comment.find({ post: { $in: postIds } })
          .select("text createdAt")
          .lean()
      : [];

    const likesReceived = posts.reduce(
      (sum, post) => sum + (post.likes?.length || 0),
      0
    );
    const shares = posts.reduce(
      (sum, post) => sum + (post.shares?.length || 0),
      0
    );
    const commentsReceived = comments.length;
    const impressions = posts.reduce((sum, post) => sum + (post.views || 0), 0);

    const rawEngagementRate = impressions
      ? ((likesReceived + commentsReceived + shares) / impressions) * 100
      : 0;

    const community = {
      followers: user.followers?.length || 0,
      following: user.following?.length || 0,
      likesReceived,
      commentsReceived,
      shares,
      posts: posts.length,
      impressions,
      engagementRate: Number(rawEngagementRate.toFixed(2)),
    };

    const sentimentCounts = comments.reduce(
      (acc, comment) => {
        const sentiment = analyzeSentiment(comment.text);
        acc[sentiment] += 1;
        return acc;
      },
      { positive: 0, neutral: 0, negative: 0 }
    );

    const totalSentiment =
      sentimentCounts.positive +
        sentimentCounts.neutral +
        sentimentCounts.negative || 1;

    const commentSentiment = {
      positive: Math.round((sentimentCounts.positive / totalSentiment) * 100),
      neutral: Math.round((sentimentCounts.neutral / totalSentiment) * 100),
      negative: Math.round((sentimentCounts.negative / totalSentiment) * 100),
    };

    const badges = buildBadges({
      badgesFromUser: user.achievements,
      longestEntry: longestEntryRecord,
      community,
      totalEntries,
      streak,
      moodEntries: totalMoodEntries,
    });

    const topMoodEntry = Object.entries(moodCounts).reduce(
      (top, [key, value]) => {
        if (!top || value > top.value) return { key, value };
        return top;
      },
      null
    );

    const insights = [];

    insights.push(
      `You've written ${entriesInPeriod.length} ${
        entriesInPeriod.length === 1 ? "entry" : "entries"
      } this ${period}.`
    );

    if (streak.current) {
      insights.push(
        `Your current streak is ${streak.current} ${
          streak.current === 1 ? "day" : "days"
        }, with a longest streak of ${streak.longest}.`
      );
    }

    if (mostActiveDay && mostActiveDay.count) {
      insights.push(
        `${mostActiveDay.day} is your most active writing day this ${period}.`
      );
    }

    if (topMoodEntry && topMoodEntry.value) {
      insights.push(
        `Your entries lean ${topMoodEntry.key} (${
          moodDistribution[topMoodEntry.key].percentage
        }%).`
      );
    }

    if (!insights.length) {
      insights.push("Keep writing to unlock personalized insights!");
    }

    const response = {
      period,
      streak,
      totals: {
        entries: totalEntries,
        publicEntries,
        privateEntries,
        avgWordsPerEntry: totalEntries
          ? Math.round(totalWords / totalEntries)
          : 0,
        longestEntry: longestEntryRecord,
      },
      periodStats: {
        entryCount: entriesInPeriod.length,
        avgWordsPerEntry: entriesInPeriod.length
          ? Math.round(periodWords / entriesInPeriod.length)
          : 0,
        totalWords: periodWords,
        publicEntries: periodPublicEntries,
        privateEntries: periodPrivateEntries,
        mostActiveDay: mostActiveDay?.day || null,
        topMood: topMoodEntry?.key || null,
      },
      recentActivity,
      writingHabits,
      moodDistribution,
      community,
      commentSentiment,
      badges,
      aiInsights: insights.slice(0, 6),
    };

    return res.json(response);
  } catch (error) {
    console.error("Analytics overview error:", error);
    return res.status(500).json({ message: "Error fetching analytics" });
  }
};

module.exports = {
  getMoodAnalytics,
  getActivityAnalytics,
  getAnalyticsOverview,
};
