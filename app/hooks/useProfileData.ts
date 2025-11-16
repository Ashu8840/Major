import { useCallback, useEffect, useMemo, useState } from "react";

import {
  buildAssetUrl,
  getProfile,
  isUnauthorizedError,
  stripHtml,
} from "@/services/api";

type ProfileSummary = {
  id: string;
  displayName: string;
  username: string;
  bio?: string;
  location?: string;
  joinedAt?: string;
  avatar?: string;
  cover?: string;
  isVerified?: boolean;
  completion?: number;
};

type ProfileStats = {
  entries: number;
  posts: number;
  stories: number;
  books: number;
  followers: number;
  following: number;
  reads: number;
  streakCurrent: number;
  streakLongest: number;
};

type ProfileHighlight = {
  id: string;
  title: string;
  type: "entry" | "post" | "story";
  snippet: string;
  createdAt: string;
};

type ProfileAchievement = {
  id: string;
  title: string;
  description: string;
};

type ProfileState = {
  loading: boolean;
  error: string | null;
  profile: ProfileSummary;
  stats: ProfileStats;
  highlights: ProfileHighlight[];
  achievements: ProfileAchievement[];
};

const fallbackProfile: ProfileSummary = {
  id: "demo-user",
  displayName: "Creative Explorer",
  username: "creative_explorer",
  bio: "Writing reflections, sharing insights, and building habits—one entry at a time.",
  location: "San Francisco, USA",
  joinedAt: "2024-01-02T00:00:00.000Z",
  isVerified: true,
  completion: 72,
};

const fallbackStats: ProfileStats = {
  entries: 18,
  posts: 11,
  stories: 4,
  books: 2,
  followers: 248,
  following: 186,
  reads: 1240,
  streakCurrent: 5,
  streakLongest: 14,
};

const fallbackHighlights: ProfileHighlight[] = [
  {
    id: "demo-highlight-1",
    title: "Morning reflections",
    type: "entry",
    snippet:
      "Outlined the focus and gratitude statements for the upcoming creative sprint.",
    createdAt: "2024-01-04T09:30:00.000Z",
  },
  {
    id: "demo-highlight-2",
    title: "How I stay consistent with diary writing",
    type: "post",
    snippet:
      "Shared the rituals that transformed weekend writing into an everyday habit.",
    createdAt: "2023-12-29T18:45:00.000Z",
  },
];

const fallbackAchievements: ProfileAchievement[] = [
  {
    id: "demo-achievement-1",
    title: "Welcome aboard",
    description: "Created your profile and joined the Major community.",
  },
  {
    id: "demo-achievement-2",
    title: "Streak keeper",
    description:
      "Maintained a five-day writing streak. Keep the momentum going!",
  },
];

const buildLocation = (address: any) => {
  if (!address) return undefined;
  const parts = [address.city, address.state, address.country].filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
};

const mapHighlights = (payload: any): ProfileHighlight[] => {
  const preview = payload?.contentPreview || {};
  const mapItems = (items: any[], type: ProfileHighlight["type"]) =>
    (items || []).slice(0, 3).map((item: any) => ({
      id:
        item?._id ??
        item?.id ??
        `${type}-${Math.random().toString(36).slice(2)}`,
      title: item?.title || "Untitled",
      type,
      snippet:
        stripHtml(item?.content || item?.summary || "").slice(0, 160) ||
        "Preview unavailable.",
      createdAt: item?.createdAt || new Date().toISOString(),
    }));

  return [
    ...mapItems(preview.entries || [], "entry"),
    ...mapItems(preview.posts || [], "post"),
    ...mapItems(preview.stories || [], "story"),
  ].slice(0, 6);
};

const mapAchievements = (items: any[]): ProfileAchievement[] => {
  if (!Array.isArray(items) || items.length === 0) return fallbackAchievements;
  return items.slice(0, 4).map((item) => ({
    id: item?._id ?? item?.id ?? Math.random().toString(36).slice(2),
    title: item?.name || item?.title || "Achievement unlocked",
    description:
      item?.description || "Keep engaging to unlock more milestones.",
  }));
};

const mapStats = (payload: any): ProfileStats => {
  const stats = payload?.stats || {};
  const counts = payload?.contentCounts || {};
  const streak = stats?.dayStreak || {};
  return {
    entries: stats?.totalEntries ?? counts?.entries ?? fallbackStats.entries,
    posts: stats?.totalPosts ?? counts?.posts ?? fallbackStats.posts,
    stories: stats?.totalStories ?? counts?.stories ?? fallbackStats.stories,
    books: stats?.totalBooks ?? counts?.books ?? fallbackStats.books,
    followers:
      payload?.followerCount ?? stats?.followers ?? fallbackStats.followers,
    following:
      payload?.followingCount ?? stats?.following ?? fallbackStats.following,
    reads: stats?.totalReads ?? fallbackStats.reads,
    streakCurrent: streak?.current ?? fallbackStats.streakCurrent,
    streakLongest: streak?.longest ?? fallbackStats.streakLongest,
  };
};

const mapProfile = (payload: any): ProfileSummary => ({
  id: payload?._id ?? payload?.id ?? fallbackProfile.id,
  displayName:
    payload?.displayName || payload?.username || fallbackProfile.displayName,
  username: payload?.username || fallbackProfile.username,
  bio: payload?.bio || fallbackProfile.bio,
  location: buildLocation(payload?.address) || fallbackProfile.location,
  joinedAt:
    payload?.joinedDate || payload?.createdAt || fallbackProfile.joinedAt,
  avatar: buildAssetUrl(
    typeof payload?.profileImage === "string"
      ? payload.profileImage
      : payload?.profileImage?.url
  ),
  cover: buildAssetUrl(
    typeof payload?.coverPhoto === "string"
      ? payload.coverPhoto
      : payload?.coverPhoto?.url
  ),
  isVerified: Boolean(payload?.isVerified ?? fallbackProfile.isVerified),
  completion:
    typeof payload?.profileCompletionPercentage === "number"
      ? payload.profileCompletionPercentage
      : typeof payload?.profileCompletion === "number"
      ? payload.profileCompletion
      : fallbackProfile.completion,
});

export const useProfileData = () => {
  const [state, setState] = useState<ProfileState>({
    loading: true,
    error: null,
    profile: fallbackProfile,
    stats: fallbackStats,
    highlights: fallbackHighlights,
    achievements: fallbackAchievements,
  });

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getProfile().catch((err) => {
        if (isUnauthorizedError(err)) return null;
        throw err;
      });

      if (!data) {
        setState({
          loading: false,
          error: "Sign in to view your profile. Showing demo data for now.",
          profile: fallbackProfile,
          stats: fallbackStats,
          highlights: fallbackHighlights,
          achievements: fallbackAchievements,
        });
        return;
      }

      const payload = data?.data ?? data;

      setState({
        loading: false,
        error: null,
        profile: mapProfile(payload),
        stats: mapStats(payload),
        highlights: mapHighlights(payload),
        achievements: mapAchievements(payload?.achievements),
      });
    } catch (err) {
      console.error("Profile fetch failed", err);
      setState({
        loading: false,
        error: "Unable to load your profile right now. Pull to refresh soon.",
        profile: fallbackProfile,
        stats: fallbackStats,
        highlights: fallbackHighlights,
        achievements: fallbackAchievements,
      });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return useMemo(() => ({ ...state, refresh }), [state, refresh]);
};
