import {
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../utils/api";
import { AuthContext } from "../context/AuthContext";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  IoSearch,
  IoBook,
  IoAdd,
  IoHeart,
  IoHeartOutline,
  IoPin,
  IoPinOutline,
  IoSparkles,
  IoDocument,
  IoShare,
  IoDownload,
  IoCreate,
  IoTrash,
  IoTrendingUp,
  IoTime,
  IoGrid,
  IoList,
  IoClose,
  IoCalendar,
  IoPricetag as IoTag,
} from "react-icons/io5";

const PAGE_SIZE = 12;
const FAVORITES_KEY = "diary:favorites";
const PINNED_KEY = "diary:pinned";
const RECENT_DAYS = 7;
const BASE_MOODS = [
  "happy",
  "calm",
  "neutral",
  "grateful",
  "excited",
  "sad",
  "angry",
  "anxious",
  "tired",
  "confident",
  "overwhelmed",
  "love",
];

const loadStoredSet = (key) => {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch (error) {
    console.warn(`Failed to restore ${key}`, error);
    return new Set();
  }
};

const persistSet = (key, value) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(Array.from(value)));
  } catch (error) {
    console.warn(`Failed to persist ${key}`, error);
  }
};

const formatDisplayDate = (value) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    return "";
  }
};

const extractTags = (entry) => {
  if (!entry) return [];
  if (Array.isArray(entry.tags)) return entry.tags.filter(Boolean);
  if (typeof entry.tags === "string") {
    return entry.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
};

const getWordCount = (text) => {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
};

const getReadingMinutes = (text) => {
  const words = getWordCount(text);
  return Math.max(1, Math.ceil(words / 200));
};

const REGEX_OK_COLOR = /okl(?:ab|ch)/i;

const sanitizeOkColors = (clonedDoc) => {
  if (!clonedDoc) return;
  const root = clonedDoc.querySelector('[data-export-root="true"]');
  if (!root) return;

  const docView = clonedDoc.defaultView || window;
  const targets = [root, ...root.querySelectorAll("*")];

  targets.forEach((node) => {
    try {
      const computed = docView.getComputedStyle(node);
      if (!computed) return;

      const setIfUnsafe = (property, fallback) => {
        const value = computed.getPropertyValue(property);
        if (value && REGEX_OK_COLOR.test(value)) {
          node.style.setProperty(property, fallback);
        }
      };

      setIfUnsafe("background-color", "#ffffff");
      setIfUnsafe("color", "#0f172a");
      [
        "border-top-color",
        "border-right-color",
        "border-bottom-color",
        "border-left-color",
      ].forEach((property) => setIfUnsafe(property, "#e2e8f0"));

      const bgImage = computed.getPropertyValue("background-image");
      if (bgImage && REGEX_OK_COLOR.test(bgImage)) {
        node.style.setProperty("background-image", "none");
      }

      const boxShadow = computed.getPropertyValue("box-shadow");
      if (boxShadow && REGEX_OK_COLOR.test(boxShadow)) {
        node.style.setProperty("box-shadow", "none");
      }

      const gradientStops = computed.getPropertyValue("--tw-gradient-stops");
      if (gradientStops && REGEX_OK_COLOR.test(gradientStops)) {
        node.style.setProperty("--tw-gradient-stops", "#ffffff");
      }
    } catch (error) {
      console.warn("Failed to sanitize export styles", error);
    }
  });
};

const deriveInsights = (entries) => {
  if (!entries.length) {
    return {
      totalEntries: 0,
      dominantMood: "neutral",
      topTags: [],
      averageWords: 0,
    };
  }

  const moodCounts = new Map();
  const tagCounts = new Map();
  let totalWords = 0;

  entries.forEach((entry) => {
    if (entry.mood) {
      moodCounts.set(entry.mood, (moodCounts.get(entry.mood) || 0) + 1);
    }
    extractTags(entry).forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
    totalWords += getWordCount(entry.content);
  });

  const dominantMood =
    Array.from(moodCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "neutral";

  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);

  return {
    totalEntries: entries.length,
    dominantMood,
    topTags,
    averageWords: Math.round(totalWords / entries.length) || 0,
  };
};

const EntryCard = ({
  entry,
  isActive,
  isFavorite,
  isPinned,
  viewMode,
  onSelect,
  onToggleFavorite,
  onTogglePin,
}) => {
  const tags = extractTags(entry);
  const readingMinutes = getReadingMinutes(entry.content);

  const baseClasses = [
    "relative rounded-3xl border border-blue-100 bg-white/80 transition-all duration-200",
    "shadow-sm hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg",
    isActive ? "border-blue-400 bg-white shadow-xl" : "",
    viewMode === "grid" ? "p-5" : "p-4 sm:flex sm:items-start sm:gap-5 sm:py-5", // list layout
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      onClick={() => onSelect(entry)}
      className={`${baseClasses} cursor-pointer backdrop-blur`}
    >
      <div className="absolute inset-x-0 top-0 h-1 rounded-t-3xl bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300" />

      <div
        className={`flex flex-col gap-4 ${
          viewMode === "list" ? "sm:flex-row" : ""
        }`}
      >
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-blue-400">
                <IoCalendar className="h-3 w-3" />
                {formatDisplayDate(entry.createdAt)}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-blue-900 line-clamp-2">
                {entry.title || "Untitled entry"}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleFavorite(entry._id);
                }}
                className="rounded-full bg-blue-50 p-2 text-blue-500 transition-colors hover:bg-blue-100"
                aria-label={
                  isFavorite ? "Remove from favorites" : "Add to favorites"
                }
              >
                {isFavorite ? (
                  <IoHeart className="h-4 w-4" />
                ) : (
                  <IoHeartOutline className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onTogglePin(entry._id);
                }}
                className={`rounded-full p-2 transition-colors ${
                  isPinned
                    ? "bg-amber-100 text-amber-600"
                    : "bg-blue-50 text-blue-500 hover:bg-blue-100"
                }`}
                aria-label={isPinned ? "Unpin entry" : "Pin entry"}
              >
                {isPinned ? (
                  <IoPin className="h-4 w-4" />
                ) : (
                  <IoPinOutline className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <p className="text-sm text-blue-600 line-clamp-3">
            {entry.content || "No content yet."}
          </p>

          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-blue-500">
            {entry.mood && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-3 py-1 text-purple-600">
                <IoSparkles className="h-3 w-3" />
                {entry.mood}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-blue-600">
              <IoTime className="h-3 w-3" /> {readingMinutes} min read
            </span>
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-sky-600"
              >
                <IoTag className="h-3 w-3" /> {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
};

const EmptyState = ({ message }) => (
  <div className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-blue-200 bg-white/70 p-12 text-center">
    <IoBook className="mb-4 h-10 w-10 text-blue-400" />
    <h3 className="text-lg font-semibold text-blue-900">Nothing to show yet</h3>
    <p className="mt-2 max-w-md text-sm text-blue-600">{message}</p>
  </div>
);

const EntryDetailCard = forwardRef(
  (
    {
      entry,
      isEditing,
      editDraft,
      onEditChange,
      onCancelEdit,
      onSave,
      onStartEdit,
      onDelete,
      isFavorite,
      isPinned,
      onToggleFavorite,
      onTogglePin,
      onClose,
      onShare,
      onExport,
      exportMenuOpen,
      setExportMenuOpen,
      exporting,
      moodOptions,
    },
    ref
  ) => {
    if (!entry) return null;

    const tags = extractTags(entry);
    const readingMinutes = getReadingMinutes(entry.content);

    return (
      <section
        ref={ref}
        data-export-root="true"
        className="relative flex h-full w-full max-h-[calc(100vh-20px)] flex-col overflow-hidden rounded-3xl border border-blue-100 bg-white/95 p-6 shadow-xl"
      >
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 rounded-full bg-white/90 p-2 text-blue-500 shadow-md transition-colors hover:bg-blue-50"
            aria-label="Close entry"
          >
            <IoClose className="h-5 w-5" />
          </button>
        ) : null}

        <div className="flex items-start justify-between gap-4 pr-8">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-400">
              <IoCalendar className="h-3 w-3" />
              {formatDisplayDate(entry.createdAt)}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-blue-900">
              {entry.title || "Untitled entry"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleFavorite(entry._id)}
              className="rounded-full bg-blue-50 p-2 text-blue-500 transition-colors hover:bg-blue-100"
              aria-label={
                isFavorite ? "Remove from favorites" : "Add to favorites"
              }
            >
              {isFavorite ? (
                <IoHeart className="h-4 w-4" />
              ) : (
                <IoHeartOutline className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => onTogglePin(entry._id)}
              className={`rounded-full p-2 transition-colors ${
                isPinned
                  ? "bg-amber-100 text-amber-600"
                  : "bg-blue-50 text-blue-500 hover:bg-blue-100"
              }`}
              aria-label={isPinned ? "Unpin entry" : "Pin entry"}
            >
              {isPinned ? (
                <IoPin className="h-4 w-4" />
              ) : (
                <IoPinOutline className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {isEditing ? (
          <form
            onSubmit={onSave}
            className="mt-6 flex flex-1 flex-col gap-5 overflow-y-auto pr-2 hide-scrollbar"
          >
            <label className="flex flex-col gap-2 text-sm font-semibold text-blue-900">
              Title
              <input
                value={editDraft.title}
                onChange={(event) => onEditChange("title", event.target.value)}
                className="w-full rounded-2xl border border-blue-200 bg-white px-4 py-3 text-base text-blue-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="Give your entry a meaningful heading"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold text-blue-900">
              Mood
              <select
                value={editDraft.mood}
                onChange={(event) => onEditChange("mood", event.target.value)}
                className="w-full rounded-2xl border border-blue-200 bg-white px-4 py-3 text-base text-blue-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select a mood (optional)</option>
                {moodOptions.map((mood) => (
                  <option key={mood} value={mood}>
                    {mood}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold text-blue-900">
              Tags
              <input
                value={editDraft.tags}
                onChange={(event) => onEditChange("tags", event.target.value)}
                className="w-full rounded-2xl border border-blue-200 bg-white px-4 py-3 text-base text-blue-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="Separate tags with commas"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold text-blue-900">
              Entry content
              <textarea
                value={editDraft.content}
                onChange={(event) =>
                  onEditChange("content", event.target.value)
                }
                rows={10}
                className="w-full rounded-2xl border border-blue-200 bg-white px-4 py-3 text-base text-blue-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="Write your story, memories, or reflections here..."
              />
            </label>

            <div className="flex flex-wrap justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Save changes
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="mt-6 flex-1 space-y-5 overflow-y-auto pr-2 hide-scrollbar">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-400">
                {entry.mood && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-3 py-1 text-purple-600">
                    <IoSparkles className="h-3 w-3" /> {entry.mood}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-blue-600">
                  <IoTime className="h-3 w-3" /> {readingMinutes} min read
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                  {getWordCount(entry.content)} words
                </span>
              </div>

              {tags.length ? (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-600"
                    >
                      <IoTag className="h-3 w-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="space-y-4 text-base leading-relaxed text-blue-900">
                {entry.content?.split("\n").map((paragraph, index) => (
                  <p key={index} className="whitespace-pre-wrap">
                    {paragraph || "\u00a0"}
                  </p>
                ))}
              </div>

              {Array.isArray(entry.media) && entry.media.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-blue-900">
                    Attachments
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {entry.media.map((mediaItem) => (
                      <div
                        key={mediaItem._id || mediaItem.url}
                        className="overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/40 p-2"
                      >
                        {mediaItem.type === "video" ? (
                          <video
                            controls
                            className="h-56 w-full rounded-xl bg-black object-contain"
                            src={mediaItem.url}
                          />
                        ) : (
                          <img
                            src={mediaItem.url}
                            alt={entry.title || "Diary attachment"}
                            className="h-56 w-full rounded-xl bg-white object-contain"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onShare}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-100"
              >
                <IoShare className="h-4 w-4" /> Share
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setExportMenuOpen((prev) => {
                      const next = !prev;
                      if (!prev) {
                        requestAnimationFrame(() => {
                          if (ref?.current?.scrollIntoView) {
                            ref.current.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                          } else {
                            window.scrollBy({ top: -80, behavior: "smooth" });
                          }
                        });
                      }
                      return next;
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <IoDownload className="h-4 w-4" />
                  {exporting ? "Preparing..." : "Export"}
                </button>
                {exportMenuOpen ? (
                  <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-lg">
                    <button
                      type="button"
                      onClick={() => onExport("pdf")}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-blue-900 transition hover:bg-blue-50"
                    >
                      <IoDocument className="h-4 w-4" /> PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => onExport("doc")}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-blue-900 transition hover:bg-blue-50"
                    >
                      <IoDocument className="h-4 w-4" /> Word (.doc)
                    </button>
                    <button
                      type="button"
                      onClick={() => onExport("txt")}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-blue-900 transition hover:bg-blue-50"
                    >
                      <IoDocument className="h-4 w-4" /> Plain text
                    </button>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={onStartEdit}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-100 px-4 py-2 text-sm font-semibold text-purple-700 transition hover:bg-purple-200"
              >
                <IoCreate className="h-4 w-4" /> Edit
              </button>

              <button
                type="button"
                onClick={() => onDelete(entry._id)}
                className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
              >
                <IoTrash className="h-4 w-4" /> Delete
              </button>
            </div>
          </>
        )}
      </section>
    );
  }
);

EntryDetailCard.displayName = "EntryDetailCard";

export default function Diary() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [favorites, setFavorites] = useState(() =>
    loadStoredSet(FAVORITES_KEY)
  );
  const [pinnedEntries, setPinnedEntries] = useState(() =>
    loadStoredSet(PINNED_KEY)
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedMoodFilter, setSelectedMoodFilter] = useState("");
  const [selectedTagFilter, setSelectedTagFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState("grid");
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showEntryPanel, setShowEntryPanel] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState({
    title: "",
    content: "",
    mood: "",
    tags: "",
  });
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showInsights, setShowInsights] = useState(false);

  const exportRef = useRef(null);
  const listRef = useRef(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/entries/mine");
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load diary entries", err);
      setError(
        err?.response?.data?.message ||
          "Unable to load your diary entries right now."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    persistSet(FAVORITES_KEY, favorites);
  }, [favorites]);

  useEffect(() => {
    persistSet(PINNED_KEY, pinnedEntries);
  }, [pinnedEntries]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, selectedMoodFilter, selectedTagFilter]);

  useEffect(() => {
    if (filterType !== "mood") setSelectedMoodFilter("");
    if (filterType !== "tags") setSelectedTagFilter("");
  }, [filterType]);

  const searchValue = searchTerm.trim().toLowerCase();
  const recencyThreshold = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - RECENT_DAYS);
    return date;
  }, []);

  const filteredEntries = useMemo(() => {
    if (!entries.length) return [];

    return entries.filter((entry) => {
      const tags = extractTags(entry);
      const haystack = [entry.title, entry.content, ...tags]
        .join(" ")
        .toLowerCase();
      const matchesSearch = searchValue ? haystack.includes(searchValue) : true;
      if (!matchesSearch) return false;

      switch (filterType) {
        case "favorites":
          return favorites.has(entry._id);
        case "recent":
          try {
            return new Date(entry.createdAt) >= recencyThreshold;
          } catch (error) {
            return false;
          }
        case "mood":
          return !selectedMoodFilter || entry.mood === selectedMoodFilter;
        case "tags":
          return !selectedTagFilter || tags.includes(selectedTagFilter);
        default:
          return true;
      }
    });
  }, [
    entries,
    favorites,
    filterType,
    searchValue,
    recencyThreshold,
    selectedMoodFilter,
    selectedTagFilter,
  ]);

  const orderedEntries = useMemo(() => {
    if (!filteredEntries.length) return [];

    const pinned = [];
    const regular = [];

    filteredEntries.forEach((entry) => {
      if (pinnedEntries.has(entry._id)) pinned.push(entry);
      else regular.push(entry);
    });

    const sortByDateDesc = (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

    pinned.sort(sortByDateDesc);
    regular.sort(sortByDateDesc);

    return [...pinned, ...regular];
  }, [filteredEntries, pinnedEntries]);

  const totalPages = Math.max(
    1,
    Math.ceil(orderedEntries.length / PAGE_SIZE) || 1
  );

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const paginatedEntries = useMemo(() => {
    if (!orderedEntries.length) return [];
    const start = (currentPage - 1) * PAGE_SIZE;
    return orderedEntries.slice(start, start + PAGE_SIZE);
  }, [orderedEntries, currentPage]);

  useEffect(() => {
    if (!orderedEntries.length) {
      setSelectedEntry(null);
      return;
    }

    setSelectedEntry((current) => {
      if (!current) return orderedEntries[0];
      return (
        orderedEntries.find((entry) => entry._id === current._id) ||
        orderedEntries[0]
      );
    });
  }, [orderedEntries]);

  const moods = useMemo(() => {
    const unique = new Set();
    entries.forEach((entry) => {
      if (entry.mood) unique.add(entry.mood);
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const tags = useMemo(() => {
    const unique = new Set();
    entries.forEach((entry) => {
      extractTags(entry).forEach((tag) => unique.add(tag));
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const insights = useMemo(() => deriveInsights(entries), [entries]);

  const moodOptions = useMemo(() => {
    const set = new Set(BASE_MOODS);
    moods.forEach((mood) => set.add(mood));
    return Array.from(set);
  }, [moods]);

  const handleToggleFavorite = useCallback((entryId) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  }, []);

  const handleTogglePin = useCallback((entryId) => {
    setPinnedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
    setCurrentPage(1);
  }, []);

  const handleSelectEntry = (entry) => {
    setSelectedEntry(entry);
    setExportMenuOpen(false);
    setShowEntryPanel(true);
  };

  const closeEntryPanel = useCallback(() => {
    setShowEntryPanel(false);
    setIsEditing(false);
    setExportMenuOpen(false);
  }, []);

  const handleNewEntry = () => {
    navigate("/diary/new");
  };

  const startEditing = () => {
    if (!selectedEntry) return;
    setEditDraft({
      title: selectedEntry.title || "",
      content: selectedEntry.content || "",
      mood: selectedEntry.mood || "",
      tags: extractTags(selectedEntry).join(", "),
    });
    setIsEditing(true);
    setExportMenuOpen(false);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleEditDraftChange = (field, value) => {
    setEditDraft((prev) => ({ ...prev, [field]: value }));
  };

  const saveEntry = async (event) => {
    event.preventDefault();
    if (!selectedEntry) return;

    const title = editDraft.title.trim();
    const content = editDraft.content.trim();

    if (!title || !content) {
      toast.error("Please provide both a title and content for your entry");
      return;
    }

    const tagsList = editDraft.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    try {
      const { data } = await api.patch(`/entries/${selectedEntry._id}`, {
        title,
        content,
        mood: editDraft.mood || undefined,
        tags: tagsList,
      });

      setEntries((prev) =>
        prev.map((entry) => (entry._id === data._id ? data : entry))
      );
      setSelectedEntry(data);
      toast.success("Entry updated successfully");
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update entry", err);
      toast.error("Unable to update this entry right now. Please try again.");
    }
  };

  const confirmDeleteEntry = (entryId) => {
    toast((t) => (
      <div className="flex flex-col gap-4 rounded-2xl bg-red-600 p-4 text-white shadow-xl">
        <div>
          <p className="text-base font-semibold">Delete this entry?</p>
          <p className="mt-1 text-sm text-red-100">
            This action cannot be undone. Your entry will be removed
            permanently.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await api.delete(`/entries/${entryId}`);
                setEntries((prev) =>
                  prev.filter((entry) => entry._id !== entryId)
                );
                setFavorites((prev) => {
                  const next = new Set(prev);
                  next.delete(entryId);
                  return next;
                });
                setPinnedEntries((prev) => {
                  const next = new Set(prev);
                  next.delete(entryId);
                  return next;
                });
                if (selectedEntry?._id === entryId) {
                  setSelectedEntry(null);
                  setIsEditing(false);
                }
                toast.success("Entry deleted successfully");
              } catch (err) {
                console.error("Failed to delete entry", err);
                toast.error("Unable to delete this entry right now.");
              }
            }}
            className="rounded-lg bg-white px-3 py-1 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => toast.dismiss(t.id)}
            className="rounded-lg border border-white px-3 py-1 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Cancel
          </button>
        </div>
      </div>
    ));
  };

  const handleShare = async () => {
    if (!selectedEntry || typeof navigator === "undefined") return;
    try {
      const sharePayload = {
        title: selectedEntry.title,
        text: selectedEntry.content.slice(0, 140).concat("…"),
        url: `${window.location.origin}/diary`,
      };
      if (navigator.share) {
        await navigator.share(sharePayload);
        toast.success("Entry shared successfully");
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(
          `${selectedEntry.title}\n${sharePayload.url}`
        );
        toast.success("Entry link copied to clipboard");
      } else {
        toast("Sharing is not supported in this browser", { icon: "ℹ️" });
      }
    } catch (err) {
      console.error("Failed to share entry", err);
      toast.error("Unable to share this entry right now.");
    }
  };

  const handleExport = async (format) => {
    if (!selectedEntry) return;

    const normalizedFormat = String(format).toLowerCase();
    const safeTitle = selectedEntry.title
      ? selectedEntry.title.replace(/[^a-z0-9\s-_]/gi, "").trim() ||
        "diary-entry"
      : "diary-entry";

    if (normalizedFormat === "txt") {
      try {
        const content = `Title: ${
          selectedEntry.title
        }\nDate: ${formatDisplayDate(selectedEntry.createdAt)}\nMood: ${
          selectedEntry.mood || "Not specified"
        }\nTags: ${extractTags(selectedEntry).join(", ")}\n\n${
          selectedEntry.content
        }`;
        const blob = new Blob([content], { type: "text/plain" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${safeTitle}.txt`;
        link.click();
        URL.revokeObjectURL(link.href);
        toast.success("Entry exported as plain text");
      } catch (err) {
        console.error("Failed to export entry as text", err);
        toast.error("Unable to export as text right now.");
      } finally {
        setExportMenuOpen(false);
      }
      return;
    }

    if (normalizedFormat === "doc" || normalizedFormat === "docx") {
      try {
        const tagsMarkup = extractTags(selectedEntry).length
          ? `<p><strong>Tags:</strong> ${extractTags(selectedEntry).join(
              ", "
            )}</p>`
          : "";
        const moodMarkup = selectedEntry.mood
          ? `<p><strong>Mood:</strong> ${selectedEntry.mood}</p>`
          : "";
        const paragraphs = selectedEntry.content
          .split("\n")
          .map(
            (line) =>
              `<p>${
                line
                  ? line.replace(/</g, "&lt;").replace(/>/g, "&gt;")
                  : "&nbsp;"
              }</p>`
          )
          .join("");

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body><h1>${
          selectedEntry.title
        }</h1><p><strong>Date:</strong> ${formatDisplayDate(
          selectedEntry.createdAt
        )}</p>${moodMarkup}${tagsMarkup}${paragraphs}</body></html>`;

        const blob = new Blob([html], { type: "application/msword" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${safeTitle}.doc`;
        link.click();
        URL.revokeObjectURL(link.href);
        toast.success("Entry exported as Word document");
      } catch (err) {
        console.error("Failed to export entry as doc", err);
        toast.error("Unable to export as doc right now.");
      } finally {
        setExportMenuOpen(false);
      }
      return;
    }

    if (!exportRef.current) return;
    setExporting(true);

    try {
      const canvas = await html2canvas(exportRef.current, {
        useCORS: true,
        allowTaint: false,
        scale: 2,
        backgroundColor: "#ffffff",
        onclone: sanitizeOkColors,
      });
      const imageData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(
        pageWidth / canvas.width,
        pageHeight / canvas.height
      );
      const width = canvas.width * ratio;
      const height = canvas.height * ratio;
      const offsetX = (pageWidth - width) / 2;
      const offsetY = (pageHeight - height) / 2;

      pdf.addImage(imageData, "PNG", offsetX, offsetY, width, height);
      pdf.save(`${safeTitle}.pdf`);
      toast.success("Entry exported as PDF");
    } catch (err) {
      console.error("Failed to export entry", err);
      toast.error("Unable to export this entry right now.");
    } finally {
      setExportMenuOpen(false);
      setExporting(false);
    }
  };

  const handlePageChange = (direction) => {
    setCurrentPage((prev) => {
      const next = prev + direction;
      if (next < 1) return 1;
      if (next > totalPages) return totalPages;
      return next;
    });
    setExportMenuOpen(false);
    if (listRef.current) {
      listRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const selectedEntryIsFavorite = selectedEntry
    ? favorites.has(selectedEntry._id)
    : false;
  const selectedEntryIsPinned = selectedEntry
    ? pinnedEntries.has(selectedEntry._id)
    : false;

  const renderEntries = () => {
    if (loading) {
      return (
        <div
          className={`grid gap-5 ${
            viewMode === "grid" ? "md:grid-cols-2" : ""
          }`}
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-3xl border border-blue-100 bg-white/50"
            />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-3xl border border-red-200 bg-red-50/60 p-6 text-center text-red-700">
          {error}
        </div>
      );
    }

    if (!paginatedEntries.length) {
      return (
        <EmptyState message="Try adjusting your filters or add a new entry to see it here." />
      );
    }

    const layoutClasses =
      viewMode === "grid" ? "grid gap-5 md:grid-cols-2" : "flex flex-col gap-4";

    return (
      <div className={layoutClasses}>
        {paginatedEntries.map((entry) => (
          <EntryCard
            key={entry._id}
            entry={entry}
            isActive={selectedEntry?._id === entry._id}
            isFavorite={favorites.has(entry._id)}
            isPinned={pinnedEntries.has(entry._id)}
            viewMode={viewMode}
            onSelect={handleSelectEntry}
            onToggleFavorite={handleToggleFavorite}
            onTogglePin={handleTogglePin}
          />
        ))}
      </div>
    );
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-md rounded-3xl bg-white/85 p-10 text-center shadow-xl">
          <IoBook className="mx-auto h-12 w-12 text-blue-500" />
          <h2 className="mt-4 text-2xl font-semibold text-blue-900">
            Sign in to view your diary
          </h2>
          <p className="mt-2 text-sm text-blue-600">
            This space is private and secure. Please log in to continue
            journaling.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 page-scroll">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-6 rounded-3xl bg-white/85 p-8 shadow-xl backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-blue-100 p-4">
                <IoBook className="h-10 w-10 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-blue-900 sm:text-4xl">
                  My Private Diary
                </h1>
                <p className="mt-1 text-sm text-blue-600">
                  Reflect, record, and relive your story in beautifully
                  organized entries.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowInsights((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-100 px-4 py-3 text-sm font-semibold text-purple-700 transition hover:bg-purple-200"
              >
                <IoTrendingUp className="h-4 w-4" />
                AI Insights
              </button>
              <button
                type="button"
                onClick={handleNewEntry}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <IoAdd className="h-4 w-4" /> New entry
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex w-full max-w-xl items-center">
              <IoSearch className="absolute left-4 h-4 w-4 text-blue-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-2xl border border-blue-200 bg-white px-12 py-3 text-sm text-blue-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="Search your memories by title, content, or tags"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/*
                {["all", "favorites", "recent", "mood", "tags"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      filterType === type
                        ? "bg-blue-600 text-white shadow"
                        : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                    }`}
                  >
                    {type === "recent" ? "Last 7 days" : type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              */}
              <button
                type="button"
                onClick={() => setFilterType("all")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  filterType === "all"
                    ? "bg-blue-600 text-white shadow"
                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                }`}
              >
                All entries
              </button>
              <button
                type="button"
                onClick={() => setFilterType("favorites")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  filterType === "favorites"
                    ? "bg-blue-600 text-white shadow"
                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                }`}
              >
                Favorites
              </button>
              <button
                type="button"
                onClick={() => setFilterType("recent")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  filterType === "recent"
                    ? "bg-blue-600 text-white shadow"
                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                }`}
              >
                Recent
              </button>
              <button
                type="button"
                onClick={() => setFilterType("mood")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  filterType === "mood"
                    ? "bg-blue-600 text-white shadow"
                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                }`}
              >
                By mood
              </button>
              <button
                type="button"
                onClick={() => setFilterType("tags")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  filterType === "tags"
                    ? "bg-blue-600 text-white shadow"
                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                }`}
              >
                By tags
              </button>
              <div className="inline-flex rounded-xl border border-blue-200 bg-white p-1 text-blue-500 shadow-sm">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`rounded-lg px-3 py-2 ${
                    viewMode === "grid"
                      ? "bg-blue-600 text-white shadow"
                      : "hover:bg-blue-50"
                  }`}
                >
                  <IoGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`rounded-lg px-3 py-2 ${
                    viewMode === "list"
                      ? "bg-blue-600 text-white shadow"
                      : "hover:bg-blue-50"
                  }`}
                >
                  <IoList className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {filterType === "mood" && moods.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedMoodFilter("")}
                className={`rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                  selectedMoodFilter === ""
                    ? "bg-blue-600 text-white shadow"
                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                }`}
              >
                All moods
              </button>
              {moods.map((mood) => (
                <button
                  key={mood}
                  type="button"
                  onClick={() => setSelectedMoodFilter(mood)}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                    selectedMoodFilter === mood
                      ? "bg-blue-600 text-white shadow"
                      : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                  }`}
                >
                  {mood}
                </button>
              ))}
            </div>
          )}

          {filterType === "tags" && tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedTagFilter("")}
                className={`rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                  selectedTagFilter === ""
                    ? "bg-blue-600 text-white shadow"
                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                }`}
              >
                All tags
              </button>
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTagFilter(tag)}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                    selectedTagFilter === tag
                      ? "bg-blue-600 text-white shadow"
                      : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </header>

        {showInsights && (
          <section className="mt-6 grid gap-4 rounded-3xl border border-blue-100 bg-white/85 p-6 shadow-lg backdrop-blur sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-blue-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                Total entries
              </p>
              <p className="mt-2 text-2xl font-bold text-blue-900">
                {insights.totalEntries}
              </p>
            </div>
            <div className="rounded-2xl bg-purple-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-500">
                Dominant mood
              </p>
              <p className="mt-2 text-2xl font-bold text-purple-900">
                {insights.dominantMood}
              </p>
            </div>
            <div className="rounded-2xl bg-sky-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-500">
                Top tags
              </p>
              <p className="mt-2 text-sm text-sky-700">
                {insights.topTags.length ? insights.topTags.join(", ") : "N/A"}
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
                Avg words
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-900">
                {insights.averageWords}
              </p>
            </div>
          </section>
        )}

        <section
          ref={listRef}
          className="mt-8 rounded-3xl border border-blue-100 bg-white/80 p-6 shadow-lg backdrop-blur"
        >
          {renderEntries()}

          {orderedEntries.length > PAGE_SIZE && (
            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handlePageChange(-1)}
                className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-100"
              >
                Previous
              </button>
              <p className="text-sm font-semibold text-blue-700">
                Page {currentPage} of {totalPages}
              </p>
              <button
                type="button"
                onClick={() => handlePageChange(1)}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Next
              </button>
            </div>
          )}
        </section>
      </div>

      {showEntryPanel && selectedEntry && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-black/40 backdrop-blur-sm hide-scrollbar">
          <div className="mx-auto flex min-h-[calc(100vh-20px)] w-full max-w-4xl items-stretch px-4 py-[10px]">
            <EntryDetailCard
              ref={exportRef}
              entry={selectedEntry}
              isEditing={isEditing}
              editDraft={editDraft}
              onEditChange={handleEditDraftChange}
              onCancelEdit={cancelEditing}
              onSave={saveEntry}
              onStartEdit={startEditing}
              onDelete={(entryId) => {
                confirmDeleteEntry(entryId);
                closeEntryPanel();
              }}
              isFavorite={selectedEntryIsFavorite}
              isPinned={selectedEntryIsPinned}
              onToggleFavorite={handleToggleFavorite}
              onTogglePin={handleTogglePin}
              onShare={handleShare}
              onExport={handleExport}
              exportMenuOpen={exportMenuOpen}
              setExportMenuOpen={setExportMenuOpen}
              exporting={exporting}
              moodOptions={moodOptions}
              onClose={closeEntryPanel}
            />
          </div>
        </div>
      )}
    </div>
  );
}
