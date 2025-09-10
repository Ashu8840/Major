import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { AuthContext } from "../context/AuthContext";
import {
  IoSearch,
  IoBook,
  IoAdd,
  IoFunnel as IoFilter,
  IoHeart,
  IoHeartOutline,
  IoPin,
  IoPinOutline,
  IoCalendar,
  IoPricetag as IoTag,
  IoSparkles,
  IoDocument,
  IoShare,
  IoEye,
  IoCreate,
  IoTrash,
  IoTrendingUp,
  IoTime,
  IoGrid,
  IoList,
} from "react-icons/io5";

export default function Diary() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [filterType, setFilterType] = useState("all"); // all, mood, date, tags, favorites
  const [viewMode, setViewMode] = useState("grid"); // grid, list
  const [favorites, setFavorites] = useState(new Set());
  const [pinnedEntries, setPinnedEntries] = useState(new Set());
  const [selectedMoodFilter, setSelectedMoodFilter] = useState("");
  const [selectedTagFilter, setSelectedTagFilter] = useState("");
  const [showInsights, setShowInsights] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const { data } = await api.get("/entries/mine");
        if (!ignore) {
          setEntries(data);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.tags &&
        entry.tags.some((tag) =>
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        ));

    const matchesFilter = (() => {
      switch (filterType) {
        case "favorites":
          return favorites.has(entry._id);
        case "mood":
          return !selectedMoodFilter || entry.mood === selectedMoodFilter;
        case "tags":
          return (
            !selectedTagFilter ||
            (entry.tags && entry.tags.includes(selectedTagFilter))
          );
        case "date":
          const today = new Date();
          const entryDate = new Date(entry.createdAt);
          const diffDays = Math.floor(
            (today - entryDate) / (1000 * 60 * 60 * 24)
          );
          return diffDays <= 7; // Last week entries
        default:
          return true;
      }
    })();

    return matchesSearch && matchesFilter;
  });

  const deleteEntry = async (entryId) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;

    try {
      await api.delete(`/entries/${entryId}`);
      const updatedEntries = entries.filter((e) => e._id !== entryId);
      setEntries(updatedEntries);

      if (selectedEntry && selectedEntry._id === entryId) {
        setSelectedEntry(updatedEntries.length > 0 ? updatedEntries[0] : null);
      }
    } catch (error) {
      console.error("Error deleting entry:", error);
      alert("Failed to delete entry");
    }
  };

  const toggleFavorite = (entryId) => {
    const newFavorites = new Set(favorites);
    if (favorites.has(entryId)) {
      newFavorites.delete(entryId);
    } else {
      newFavorites.add(entryId);
    }
    setFavorites(newFavorites);
  };

  const togglePin = (entryId) => {
    const newPinned = new Set(pinnedEntries);
    if (pinnedEntries.has(entryId)) {
      newPinned.delete(entryId);
    } else {
      newPinned.add(entryId);
    }
    setPinnedEntries(newPinned);
  };

  const getMoodEmoji = (mood) => {
    const moodMap = {
      happy: "😊",
      neutral: "😐",
      sad: "😕",
      angry: "😤",
      crying: "😢",
      excited: "🤩",
      calm: "😌",
      anxious: "😰",
      grateful: "🙏",
      love: "❤️",
    };
    return moodMap[mood] || "😐";
  };

  const getUniqueValues = (key) => {
    const values = entries.flatMap((entry) => entry[key] || []);
    return [...new Set(values)].filter(Boolean);
  };

  const generateAIInsights = () => {
    const moodCounts = {};
    const tagCounts = {};

    entries.forEach((entry) => {
      if (entry.mood) {
        moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
      }
      if (entry.tags) {
        entry.tags.forEach((tag) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    const mostFrequentMood = Object.keys(moodCounts).reduce(
      (a, b) => (moodCounts[a] > moodCounts[b] ? a : b),
      "neutral"
    );

    const mostUsedTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([tag]) => tag);

    return {
      totalEntries: entries.length,
      mostFrequentMood,
      mostUsedTags,
      averageWordsPerEntry:
        entries.reduce(
          (sum, entry) => sum + entry.content.split(" ").length,
          0
        ) / entries.length || 0,
    };
  };

  const updateEntry = async () => {
    if (!selectedEntry.title.trim() || !selectedEntry.content.trim()) {
      alert("Please fill in both title and content");
      return;
    }

    try {
      const { data } = await api.put(`/entries/${selectedEntry._id}`, {
        title: selectedEntry.title,
        content: selectedEntry.content,
      });

      const updatedEntries = entries.map((e) =>
        e._id === selectedEntry._id ? data : e
      );
      setEntries(updatedEntries);
      setSelectedEntry(data);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating entry:", error);
      alert("Failed to update entry");
    }
  };

  if (!user) return <div className="p-4">Please log in.</div>;

  const insights = generateAIInsights();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 no-horizontal-scroll">
      {/* Notebook Paper Texture Background */}
      <div
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 31px,
            #e2e8f0 31px,
            #e2e8f0 32px
          )`,
        }}
      />

      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <IoBook className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-blue-900">
                    My Private Diary
                  </h1>
                  <p className="text-blue-600 mt-1">
                    Your safe space for thoughts and memories
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowInsights(!showInsights)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-all duration-200"
                >
                  <IoTrendingUp className="w-4 h-4" />
                  AI Insights
                </button>
                <button
                  onClick={() => navigate("/diary/new")}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  <IoAdd className="w-5 h-5" />
                  New Entry
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Search Bar */}
              <div className="lg:col-span-6 relative">
                <input
                  type="text"
                  placeholder="Search your thoughts, memories, and feelings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/70 backdrop-blur-sm border border-blue-200 rounded-xl text-blue-900 placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent shadow-sm"
                />
                <IoSearch className="w-5 h-5 text-blue-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
              </div>

              {/* Filter Options */}
              <div className="lg:col-span-4 flex gap-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="flex-1 px-4 py-3 bg-white/70 backdrop-blur-sm border border-blue-200 rounded-xl text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="all">All Entries</option>
                  <option value="favorites">Favorites</option>
                  <option value="mood">By Mood</option>
                  <option value="tags">By Tags</option>
                  <option value="date">Recent</option>
                </select>

                {filterType === "mood" && (
                  <select
                    value={selectedMoodFilter}
                    onChange={(e) => setSelectedMoodFilter(e.target.value)}
                    className="px-4 py-3 bg-white/70 backdrop-blur-sm border border-blue-200 rounded-xl text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">All Moods</option>
                    {getUniqueValues("mood").map((mood) => (
                      <option key={mood} value={mood}>
                        {getMoodEmoji(mood)}{" "}
                        {mood.charAt(0).toUpperCase() + mood.slice(1)}
                      </option>
                    ))}
                  </select>
                )}

                {filterType === "tags" && (
                  <select
                    value={selectedTagFilter}
                    onChange={(e) => setSelectedTagFilter(e.target.value)}
                    className="px-4 py-3 bg-white/70 backdrop-blur-sm border border-blue-200 rounded-xl text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">All Tags</option>
                    {getUniqueValues("tags").map((tag) => (
                      <option key={tag} value={tag}>
                        #{tag}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* View Mode Toggle */}
              <div className="lg:col-span-2 flex bg-white/70 backdrop-blur-sm rounded-xl border border-blue-200 p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all ${
                    viewMode === "grid"
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  <IoGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all ${
                    viewMode === "list"
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  <IoList className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights Panel */}
        {showInsights && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200 p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <IoSparkles className="w-6 h-6 text-purple-600" />
                <h3 className="text-xl font-bold text-blue-900">AI Insights</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-blue-900">
                    {insights.totalEntries}
                  </div>
                  <div className="text-blue-600">Total Entries</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-purple-900 flex items-center gap-2">
                    {getMoodEmoji(insights.mostFrequentMood)}
                    <span className="capitalize">
                      {insights.mostFrequentMood}
                    </span>
                  </div>
                  <div className="text-purple-600">Most Frequent Mood</div>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-green-900">
                    {Math.round(insights.averageWordsPerEntry)}
                  </div>
                  <div className="text-green-600">Avg Words per Entry</div>
                </div>
                <div className="bg-orange-50 rounded-xl p-4">
                  <div className="text-lg font-bold text-orange-900">
                    {insights.mostUsedTags
                      .slice(0, 2)
                      .map((tag) => `#${tag}`)
                      .join(", ")}
                  </div>
                  <div className="text-orange-600">Top Tags</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Entries Grid/List */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {loading ? (
            <div
              className={`grid gap-6 ${
                viewMode === "grid"
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                  : "grid-cols-1"
              }`}
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200 p-6 animate-pulse"
                >
                  <div className="h-6 bg-blue-100 rounded-lg w-3/4 mb-4"></div>
                  <div className="h-4 bg-blue-50 rounded w-full mb-2"></div>
                  <div className="h-4 bg-blue-50 rounded w-2/3 mb-4"></div>
                  <div className="flex items-center gap-4">
                    <div className="h-6 w-6 bg-blue-100 rounded-full"></div>
                    <div className="h-4 bg-blue-50 rounded w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredEntries.length > 0 ? (
            <div
              className={`grid gap-6 ${
                viewMode === "grid"
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                  : "grid-cols-1"
              }`}
            >
              {filteredEntries.map((entry) => (
                <div
                  key={entry._id}
                  onClick={() => {
                    setSelectedEntry(entry);
                    setIsEditing(false);
                  }}
                  className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200 p-6 cursor-pointer hover:shadow-xl hover:shadow-blue-200/50 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
                >
                  {/* Paper lines effect */}
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: `repeating-linear-gradient(
                        0deg,
                        transparent,
                        transparent 23px,
                        #e2e8f0 23px,
                        #e2e8f0 24px
                      )`,
                    }}
                  />

                  {pinnedEntries.has(entry._id) && (
                    <div className="absolute top-4 right-4 text-blue-600">
                      <IoPin className="w-5 h-5" />
                    </div>
                  )}

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold text-blue-900 text-lg group-hover:text-blue-700 transition-colors line-clamp-2">
                        {entry.title}
                      </h3>
                      <div className="flex items-center gap-1 ml-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(entry._id);
                          }}
                          className="p-1 rounded-full hover:bg-blue-100 transition-colors"
                        >
                          {favorites.has(entry._id) ? (
                            <IoHeart className="w-4 h-4 text-red-500" />
                          ) : (
                            <IoHeartOutline className="w-4 h-4 text-blue-400" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePin(entry._id);
                          }}
                          className="p-1 rounded-full hover:bg-blue-100 transition-colors"
                        >
                          {pinnedEntries.has(entry._id) ? (
                            <IoPin className="w-4 h-4 text-blue-600" />
                          ) : (
                            <IoPinOutline className="w-4 h-4 text-blue-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-blue-700 text-sm line-clamp-3 leading-relaxed mb-4">
                      {entry.content}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {entry.mood && (
                          <div className="flex items-center gap-1">
                            <span className="text-lg">
                              {getMoodEmoji(entry.mood)}
                            </span>
                            <span className="text-xs text-blue-500 capitalize">
                              {entry.mood}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-blue-400">
                          <IoCalendar className="w-3 h-3" />
                          <span className="text-xs">
                            {new Date(entry.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          <IoTag className="w-3 h-3 text-blue-400" />
                          <span className="text-xs text-blue-500">
                            {entry.tags.slice(0, 2).join(", ")}
                            {entry.tags.length > 2 &&
                              ` +${entry.tags.length - 2}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="mx-auto w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                <IoBook className="w-16 h-16 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-blue-900 mb-2">
                No entries found
              </h3>
              <p className="text-blue-600 mb-6">
                {searchTerm || filterType !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "Start writing your thoughts and memories"}
              </p>
              <button
                onClick={() => navigate("/diary/new")}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <IoAdd className="w-5 h-5" />
                Create Your First Entry
              </button>
            </div>
          )}
        </div>

        {/* Entry Detail Modal */}
        {selectedEntry && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-blue-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {isEditing ? (
                      <input
                        type="text"
                        value={selectedEntry.title}
                        onChange={(e) =>
                          setSelectedEntry({
                            ...selectedEntry,
                            title: e.target.value,
                          })
                        }
                        className="text-3xl font-bold text-blue-900 w-full bg-transparent border-b-2 border-blue-300 focus:outline-none focus:border-blue-500 pb-2"
                      />
                    ) : (
                      <h2 className="text-3xl font-bold text-blue-900 mb-2">
                        {selectedEntry.title}
                      </h2>
                    )}

                    <div className="flex items-center gap-6 text-blue-600">
                      <div className="flex items-center gap-2">
                        <IoCalendar className="w-4 h-4" />
                        <span>
                          {new Date(selectedEntry.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>

                      {selectedEntry.mood && (
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">
                            {getMoodEmoji(selectedEntry.mood)}
                          </span>
                          <span className="capitalize">
                            {selectedEntry.mood}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {isEditing ? (
                      <>
                        <button
                          onClick={updateEntry}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                        >
                          <IoDocument className="w-4 h-4" />
                          Save
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => toggleFavorite(selectedEntry._id)}
                          className="p-3 rounded-xl bg-white/50 hover:bg-white/80 transition-colors"
                        >
                          {favorites.has(selectedEntry._id) ? (
                            <IoHeart className="w-5 h-5 text-red-500" />
                          ) : (
                            <IoHeartOutline className="w-5 h-5 text-blue-400" />
                          )}
                        </button>

                        <button
                          onClick={() => setIsEditing(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                        >
                          <IoCreate className="w-4 h-4" />
                          Edit
                        </button>

                        <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors">
                          <IoShare className="w-4 h-4" />
                          Export
                        </button>

                        <button
                          onClick={() => deleteEntry(selectedEntry._id)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
                        >
                          <IoTrash className="w-4 h-4" />
                          Delete
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => setSelectedEntry(null)}
                      className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors ml-2"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)] relative">
                {/* Paper texture background */}
                <div
                  className="absolute inset-0 opacity-5"
                  style={{
                    backgroundImage: `repeating-linear-gradient(
                      0deg,
                      transparent,
                      transparent 31px,
                      #e2e8f0 31px,
                      #e2e8f0 32px
                    )`,
                  }}
                />

                <div className="relative z-10">
                  {isEditing ? (
                    <textarea
                      value={selectedEntry.content}
                      onChange={(e) =>
                        setSelectedEntry({
                          ...selectedEntry,
                          content: e.target.value,
                        })
                      }
                      className="w-full min-h-[400px] resize-none bg-transparent border-none p-4 focus:outline-none text-blue-900 text-lg leading-relaxed font-serif"
                      placeholder="Write your thoughts..."
                    />
                  ) : (
                    <div>
                      {/* Display uploaded images */}
                      {selectedEntry.media &&
                        selectedEntry.media.length > 0 && (
                          <div className="mb-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {selectedEntry.media.map((mediaItem) => (
                                <div
                                  key={mediaItem._id || mediaItem.url}
                                  className="rounded-xl overflow-hidden shadow-lg"
                                >
                                  <img
                                    src={mediaItem.url}
                                    alt="Entry media"
                                    className="w-full h-auto"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      <div className="prose prose-blue max-w-none">
                        <div className="text-blue-900 whitespace-pre-wrap leading-relaxed text-lg font-serif">
                          {selectedEntry.content}
                        </div>
                      </div>

                      {/* Tags and Metadata */}
                      <div className="mt-8 pt-6 border-t border-blue-100">
                        <div className="flex flex-wrap items-center gap-6">
                          {selectedEntry.tags &&
                            selectedEntry.tags.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-blue-600 mb-2">
                                  Tags
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {selectedEntry.tags.map((tag, index) => (
                                    <span
                                      key={index}
                                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                                    >
                                      <IoTag className="w-3 h-3" />
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                          <div>
                            <h4 className="text-sm font-medium text-blue-600 mb-2">
                              Word Count
                            </h4>
                            <div className="flex items-center gap-2 text-blue-700">
                              <IoDocument className="w-4 h-4" />
                              <span>
                                {selectedEntry.content.split(" ").length} words
                              </span>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-blue-600 mb-2">
                              Reading Time
                            </h4>
                            <div className="flex items-center gap-2 text-blue-700">
                              <IoTime className="w-4 h-4" />
                              <span>
                                {Math.ceil(
                                  selectedEntry.content.split(" ").length / 200
                                )}{" "}
                                min
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
