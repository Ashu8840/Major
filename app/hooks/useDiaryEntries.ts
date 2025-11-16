import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createDiaryEntry,
  deleteDiaryEntry,
  getDiaryEntries,
  isUnauthorizedError,
  publishDiaryEntry,
  stripHtml,
  updateDiaryEntry,
} from "@/services/api";

type DiaryMedia = {
  id: string;
  url: string;
  type?: string;
  thumbnail?: string;
};

type DiaryEntry = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  content: string;
  tags: string[];
  mood?: string;
  isDraft: boolean;
  visibility: "private" | "public";
  media: DiaryMedia[];
  wordCount: number;
  readingMinutes: number;
};

type DiaryInsights = {
  totalEntries: number;
  dominantMood: string | null;
  topTags: string[];
  averageWords: number;
  recentDays: Array<{
    date: string;
    count: number;
  }>;
  streakCurrent: number;
};

type UseDiaryEntriesOptions = {
  pageSize?: number;
};

type DraftMutation = {
  title: string;
  content: string;
  tags: string[];
  mood?: string;
  visibility: "private" | "public";
  isDraft?: boolean;
  imageUri?: string | null;
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeTags = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
};

const computeWordCount = (content: string) => {
  if (!content) return 0;
  return stripHtml(content).trim().split(/\s+/).filter(Boolean).length;
};

const computeReadingMinutes = (words: number) => {
  return Math.max(1, Math.ceil(words / 200));
};

const normalizeEntry = (raw: any): DiaryEntry => {
  const cleanedContent = raw?.content || raw?.body || "";
  const wordCount = computeWordCount(cleanedContent);
  const visibility = raw?.visibility === "public" ? "public" : "private";

  return {
    id: raw?._id ?? raw?.id ?? Math.random().toString(36).slice(2),
    title: raw?.title || "Untitled entry",
    createdAt: raw?.createdAt || new Date().toISOString(),
    updatedAt: raw?.updatedAt || raw?.createdAt || new Date().toISOString(),
    content: cleanedContent,
    tags: normalizeTags(raw?.tags),
    mood: raw?.mood || undefined,
    isDraft: Boolean(raw?.isDraft),
    visibility,
    media: Array.isArray(raw?.media)
      ? raw.media.map((mediaItem: any) => ({
          id:
            mediaItem?._id ??
            mediaItem?.id ??
            Math.random().toString(36).slice(2),
          url: mediaItem?.url ?? mediaItem?.secure_url ?? "",
          type: mediaItem?.type,
          thumbnail: mediaItem?.thumbnail,
        }))
      : [],
    wordCount,
    readingMinutes: computeReadingMinutes(wordCount),
  };
};

const deriveInsights = (entries: DiaryEntry[]): DiaryInsights => {
  if (!entries.length) {
    return {
      totalEntries: 0,
      dominantMood: null,
      topTags: [],
      averageWords: 0,
      recentDays: [],
      streakCurrent: 0,
    };
  }

  const moodCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();
  let totalWords = 0;
  const recentMap = new Map<string, number>();
  let currentStreak = 0;
  let longestWindowDate: string | null = null;

  const sortedByDate = [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  sortedByDate.forEach((entry) => {
    if (entry.mood) {
      moodCounts.set(entry.mood, (moodCounts.get(entry.mood) ?? 0) + 1);
    }
    totalWords += entry.wordCount;
    entry.tags.forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    });
    const dayKey = new Date(entry.createdAt).toISOString().slice(0, 10);
    recentMap.set(dayKey, (recentMap.get(dayKey) ?? 0) + 1);
  });

  // Compute streak: count consecutive days starting today backwards where entries exist
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let offset = 0; offset < 365; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = date.toISOString().slice(0, 10);
    if (recentMap.has(key) && recentMap.get(key)! > 0) {
      currentStreak += 1;
      longestWindowDate = key;
    } else if (offset === 0) {
      // no entry today, streak resets
      break;
    } else {
      break;
    }
  }

  const dominantMood =
    Array.from(moodCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    null;
  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);

  const recentDays = Array.from(recentMap.entries())
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .slice(-14)
    .map(([date, count]) => ({ date, count }));

  return {
    totalEntries: entries.filter((entry) => !entry.isDraft).length,
    dominantMood,
    topTags,
    averageWords: Math.round(totalWords / entries.length) || 0,
    recentDays,
    streakCurrent: currentStreak,
  };
};

export const useDiaryEntries = (options: UseDiaryEntriesOptions = {}) => {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = options.pageSize ?? 12;

  const fetchEntries = useCallback(
    async (nextPage: number, replace = false) => {
      setLoading(true);
      setError(null);

      try {
        const response = await getDiaryEntries(nextPage, pageSize).catch(
          (err) => {
            if (isUnauthorizedError(err)) {
              return [];
            }
            throw err;
          }
        );

        // Backend returns array directly
        const payload = Array.isArray(response) ? response : [];
        const normalized = payload.map(normalizeEntry);

        setEntries((prev) => (replace ? normalized : [...prev, ...normalized]));
        setHasMore(normalized.length === pageSize);
        setPage(nextPage);
      } catch (err) {
        console.error("Failed to load diary entries", err);
        setError(
          "Unable to load more entries right now. Pull to refresh in a moment."
        );
      } finally {
        setLoading(false);
      }
    },
    [pageSize]
  );

  const refresh = useCallback(async () => {
    setEntries([]);
    setHasMore(true);
    await fetchEntries(1, true);
  }, [fetchEntries]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    await fetchEntries(page + 1);
  }, [fetchEntries, hasMore, loading, page]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const insights = useMemo(() => deriveInsights(entries), [entries]);

  const createEntry = useCallback(
    async (
      draft: DraftMutation,
      onProgress?: (status: "uploading" | "saving") => void
    ) => {
      try {
        onProgress?.("uploading");
        const response = await createDiaryEntry(draft);
        onProgress?.("saving");
        const normalized = normalizeEntry(response);
        setEntries((prev) => [normalized, ...prev]);
        return normalized;
      } catch (err) {
        console.error("Failed to create entry", err);
        throw err;
      }
    },
    []
  );

  const updateEntryMutation = useCallback(
    async (entryId: string, updates: Partial<DraftMutation>) => {
      const response = await updateDiaryEntry(entryId, updates);
      const normalized = normalizeEntry(response);
      setEntries((prev) =>
        prev.map((entry) => (entry.id === normalized.id ? normalized : entry))
      );
      return normalized;
    },
    []
  );

  const publishEntryMutation = useCallback(async (entryId: string) => {
    const response = await publishDiaryEntry(entryId);
    const normalized = normalizeEntry(response);
    setEntries((prev) =>
      prev.map((entry) => (entry.id === normalized.id ? normalized : entry))
    );
    return normalized;
  }, []);

  const deleteEntryMutation = useCallback(async (entryId: string) => {
    await deleteDiaryEntry(entryId);
    setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
  }, []);

  return useMemo(
    () => ({
      entries,
      loading,
      error,
      hasMore,
      insights,
      refresh,
      loadMore,
      createEntry,
      updateEntry: updateEntryMutation,
      publishEntry: publishEntryMutation,
      deleteEntry: deleteEntryMutation,
    }),
    [
      entries,
      loading,
      error,
      hasMore,
      insights,
      refresh,
      loadMore,
      createEntry,
      updateEntryMutation,
      publishEntryMutation,
      deleteEntryMutation,
    ]
  );
};

export type { DiaryEntry, DiaryInsights, DraftMutation };
