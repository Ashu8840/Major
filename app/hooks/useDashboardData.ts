import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getAnalyticsOverview,
  getDailyPrompt,
  getRecentEntries,
  getTrendingPosts,
  isUnauthorizedError,
  stripHtml,
} from "@/services/api";

type DashboardEntry = {
  id: string;
  title: string;
  createdAt: string;
  preview: string;
  mood?: string;
};

type DashboardPost = {
  id: string;
  title: string;
  author: string;
  summary: string;
  likes: number;
};

type MoodDistribution = {
  positive: { count: number; percentage: number };
  neutral: { count: number; percentage: number };
  negative: { count: number; percentage: number };
};

type WritingHabit = {
  day: string;
  count: number;
};

type PeriodStats = {
  entryCount: number;
  avgWordsPerEntry: number;
  totalWords: number;
  publicEntries: number;
  privateEntries: number;
  mostActiveDay: string | null;
  topMood: string | null;
};

type ActivityPoint = {
  date: string;
  count: number;
};

type BadgeSummary = {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  earnedAt?: string | null;
};

type CommentSentiment = {
  positive: number;
  neutral: number;
  negative: number;
};

type DashboardState = {
  prompt: string;
  entries: DashboardEntry[];
  posts: DashboardPost[];
  streakCurrent: number;
  streakLongest: number;
  entriesThisMonth: number;
  totals: {
    entries: number;
    publicEntries: number;
    privateEntries: number;
    avgWordsPerEntry: number;
    longestEntry?: { title?: string; words?: number };
  };
  community: {
    followers: number;
    following: number;
    likesReceived: number;
    commentsReceived: number;
    posts: number;
    engagementRate: number;
  };
  insights: string[];
  periodStats: PeriodStats;
  moodDistribution: MoodDistribution;
  writingHabits: WritingHabit[];
  recentActivity: ActivityPoint[];
  badges: BadgeSummary[];
  commentSentiment: CommentSentiment;
};

const WEEKDAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const fallbackState: DashboardState = {
  prompt:
    "Capture the moment that shaped your day and describe why it matters to you.",
  entries: [],
  posts: [],
  streakCurrent: 0,
  streakLongest: 0,
  entriesThisMonth: 0,
  totals: {
    entries: 0,
    publicEntries: 0,
    privateEntries: 0,
    avgWordsPerEntry: 0,
    longestEntry: {
      title: "",
      words: 0,
    },
  },
  community: {
    followers: 0,
    following: 0,
    likesReceived: 0,
    commentsReceived: 0,
    posts: 0,
    engagementRate: 0,
  },
  insights: [],
  periodStats: {
    entryCount: 0,
    avgWordsPerEntry: 0,
    totalWords: 0,
    publicEntries: 0,
    privateEntries: 0,
    mostActiveDay: null,
    topMood: null,
  },
  moodDistribution: {
    positive: { count: 0, percentage: 0 },
    neutral: { count: 0, percentage: 0 },
    negative: { count: 0, percentage: 0 },
  },
  writingHabits: [
    { day: "Mon", count: 0 },
    { day: "Tue", count: 0 },
    { day: "Wed", count: 0 },
    { day: "Thu", count: 0 },
    { day: "Fri", count: 0 },
    { day: "Sat", count: 0 },
    { day: "Sun", count: 0 },
  ],
  recentActivity: [],
  badges: [],
  commentSentiment: {
    positive: 0,
    neutral: 0,
    negative: 0,
  },
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildPreview = (value?: string, limit = 120) => {
  if (!value) return "Add more details to this entry when you are ready.";
  const text = stripHtml(String(value));
  if (!text) return "Add more details to this entry when you are ready.";
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trim()}...`;
};

const normalizeWritingHabits = (habits?: unknown): WritingHabit[] => {
  if (!Array.isArray(habits) || habits.length === 0) {
    return fallbackState.writingHabits;
  }

  const counts = new Map<string, number>();

  habits.forEach((item) => {
    const dayLabel =
      typeof item === "object" && item !== null
        ? (item as any).day ?? (item as any).label ?? (item as any).name
        : "";
    if (!dayLabel) return;

    const label = String(dayLabel).trim();
    const matchedAbbr = WEEKDAY_ORDER.find((abbr) =>
      label.toLowerCase().startsWith(abbr.toLowerCase())
    );
    const key = matchedAbbr ?? label.slice(0, 3);
    const normalized = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();

    const value = toNumber(
      typeof item === "object" && item !== null
        ? (item as any).count ?? (item as any).entries
        : 0,
      0
    );
    const current = counts.get(normalized) ?? 0;
    counts.set(normalized, current + value);
  });

  return WEEKDAY_ORDER.map((abbr) => ({
    day: abbr,
    count: counts.get(abbr) ?? 0,
  }));
};

const normalizeActivity = (activity?: unknown): ActivityPoint[] => {
  if (!Array.isArray(activity) || activity.length === 0) {
    return fallbackState.recentActivity;
  }

  return activity
    .map((item) => {
      if (typeof item !== "object" || item === null) return null;
      const source = item as any;
      const count = toNumber(source.count ?? source.entries, 0);
      const rawDate = source.date ?? source.day ?? source.label;
      const date =
        typeof rawDate === "string" && rawDate.trim()
          ? rawDate.slice(0, 10)
          : new Date().toISOString().slice(0, 10);
      return { date, count };
    })
    .filter((point): point is ActivityPoint => Boolean(point))
    .slice(0, 14);
};

const coalesceMood = (
  distribution: unknown,
  fallback: MoodDistribution
): MoodDistribution => {
  const source =
    typeof distribution === "object" && distribution !== null
      ? (distribution as any)
      : {};

  return {
    positive: {
      count: toNumber(source.positive?.count, fallback.positive.count),
      percentage: toNumber(
        source.positive?.percentage,
        fallback.positive.percentage
      ),
    },
    neutral: {
      count: toNumber(source.neutral?.count, fallback.neutral.count),
      percentage: toNumber(
        source.neutral?.percentage,
        fallback.neutral.percentage
      ),
    },
    negative: {
      count: toNumber(source.negative?.count, fallback.negative.count),
      percentage: toNumber(
        source.negative?.percentage,
        fallback.negative.percentage
      ),
    },
  };
};

const coalesceSentiment = (
  sentiment: unknown,
  fallback: CommentSentiment
): CommentSentiment => {
  const source =
    typeof sentiment === "object" && sentiment !== null
      ? (sentiment as any)
      : {};

  return {
    positive: toNumber(source.positive, fallback.positive),
    neutral: toNumber(source.neutral, fallback.neutral),
    negative: toNumber(source.negative, fallback.negative),
  };
};

const normalizeBadges = (badges?: unknown): BadgeSummary[] => {
  if (!Array.isArray(badges) || badges.length === 0) {
    return fallbackState.badges;
  }

  return (badges as any[]).map((badge, index) => ({
    id: String(badge?._id ?? badge?.id ?? index),
    name: badge?.name ?? "Achievement unlocked",
    description:
      badge?.description ?? "Keep engaging to reveal more milestones.",
    unlocked: Boolean(
      badge?.unlocked ?? badge?.isUnlocked ?? badge?.status === "unlocked"
    ),
    earnedAt: badge?.earnedAt ?? badge?.unlockedAt ?? badge?.createdAt ?? null,
  }));
};

export const useDashboardData = () => {
  const [state, setState] = useState<DashboardState>(fallbackState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [promptData, entriesResponse, postsResponse, analyticsResponse] =
        await Promise.all([
          getDailyPrompt(),
          getRecentEntries().catch((err) => {
            if (isUnauthorizedError(err)) return { data: [] };
            throw err;
          }),
          getTrendingPosts().catch((err) => {
            if (isUnauthorizedError(err)) return { posts: [] };
            throw err;
          }),
          getAnalyticsOverview().catch((err) => {
            if (isUnauthorizedError(err)) return null;
            throw err;
          }),
        ]);

      const entriesPayload = Array.isArray(entriesResponse?.data)
        ? entriesResponse?.data
        : Array.isArray(entriesResponse?.entries)
        ? entriesResponse.entries
        : [];
      const postsPayload = Array.isArray(postsResponse?.posts)
        ? postsResponse.posts
        : Array.isArray(postsResponse)
        ? postsResponse
        : [];

      const analytics = analyticsResponse ?? {};

      setState({
        prompt: promptData?.dailyPrompt ?? fallbackState.prompt,
        entries: (entriesPayload || []).slice(0, 6).map((entry: any) => ({
          id: entry?._id ?? entry?.id ?? Math.random().toString(36).slice(2),
          title: entry?.title || "Untitled entry",
          createdAt: entry?.createdAt || new Date().toISOString(),
          preview: buildPreview(entry?.content || entry?.body || entry?.text),
          mood: entry?.mood,
        })),
        posts: (postsPayload || []).slice(0, 4).map((post: any) => ({
          id: post?._id ?? post?.id ?? Math.random().toString(36).slice(2),
          title: post?.title || buildPreview(post?.content, 48),
          author:
            post?.author?.displayName ||
            post?.author?.username ||
            post?.author?.name ||
            post?.creatorName ||
            "Community member",
          summary: buildPreview(post?.content || post?.summary),
          likes: Array.isArray(post?.likes)
            ? post.likes.length
            : toNumber(post?.likes, 0),
        })),
        streakCurrent: toNumber(
          analytics?.streak?.current,
          fallbackState.streakCurrent
        ),
        streakLongest: toNumber(
          analytics?.streak?.longest,
          fallbackState.streakLongest
        ),
        entriesThisMonth: toNumber(
          analytics?.periodStats?.entryCount,
          fallbackState.periodStats.entryCount
        ),
        totals: {
          entries: toNumber(
            analytics?.totals?.entries,
            fallbackState.totals.entries
          ),
          publicEntries: toNumber(
            analytics?.totals?.publicEntries,
            fallbackState.totals.publicEntries
          ),
          privateEntries: toNumber(
            analytics?.totals?.privateEntries,
            fallbackState.totals.privateEntries
          ),
          avgWordsPerEntry: toNumber(
            analytics?.totals?.avgWordsPerEntry,
            fallbackState.totals.avgWordsPerEntry
          ),
          longestEntry: {
            title:
              analytics?.totals?.longestEntry?.title ??
              fallbackState.totals.longestEntry?.title,
            words: toNumber(
              analytics?.totals?.longestEntry?.words,
              fallbackState.totals.longestEntry?.words ?? 0
            ),
          },
        },
        community: {
          followers: toNumber(
            analytics?.community?.followers,
            fallbackState.community.followers
          ),
          following: toNumber(
            analytics?.community?.following,
            fallbackState.community.following
          ),
          likesReceived: toNumber(
            analytics?.community?.likesReceived,
            fallbackState.community.likesReceived
          ),
          commentsReceived: toNumber(
            analytics?.community?.commentsReceived,
            fallbackState.community.commentsReceived
          ),
          posts: toNumber(
            analytics?.community?.posts,
            fallbackState.community.posts
          ),
          engagementRate: toNumber(
            analytics?.community?.engagementRate,
            fallbackState.community.engagementRate
          ),
        },
        insights:
          Array.isArray(analytics?.aiInsights) &&
          analytics.aiInsights.length > 0
            ? analytics.aiInsights
            : fallbackState.insights,
        periodStats: {
          entryCount: toNumber(
            analytics?.periodStats?.entryCount,
            fallbackState.periodStats.entryCount
          ),
          avgWordsPerEntry: toNumber(
            analytics?.periodStats?.avgWordsPerEntry,
            fallbackState.periodStats.avgWordsPerEntry
          ),
          totalWords: toNumber(
            analytics?.periodStats?.totalWords,
            fallbackState.periodStats.totalWords
          ),
          publicEntries: toNumber(
            analytics?.periodStats?.publicEntries,
            fallbackState.periodStats.publicEntries
          ),
          privateEntries: toNumber(
            analytics?.periodStats?.privateEntries,
            fallbackState.periodStats.privateEntries
          ),
          mostActiveDay:
            analytics?.periodStats?.mostActiveDay ??
            fallbackState.periodStats.mostActiveDay,
          topMood:
            analytics?.periodStats?.topMood ??
            fallbackState.periodStats.topMood,
        },
        moodDistribution: coalesceMood(
          analytics?.moodDistribution,
          fallbackState.moodDistribution
        ),
        writingHabits: normalizeWritingHabits(analytics?.writingHabits),
        recentActivity: normalizeActivity(analytics?.recentActivity),
        badges: normalizeBadges(analytics?.badges),
        commentSentiment: coalesceSentiment(
          analytics?.commentSentiment,
          fallbackState.commentSentiment
        ),
      });
    } catch (err) {
      console.error("Dashboard data failed", err);
      setError(
        "Unable to refresh your dashboard right now. Pull to refresh in a moment."
      );
      setState((prev) => ({ ...prev }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return useMemo(
    () => ({ ...state, loading, error, refresh: fetchData }),
    [state, loading, error, fetchData]
  );
};
