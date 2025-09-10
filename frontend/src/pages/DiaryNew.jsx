import { useContext, useEffect, useState } from "react";
import api from "../utils/api";
import { AuthContext } from "../context/AuthContext";
import { IoSearch, IoBook } from "react-icons/io5";

export default function Diary() {
  const { user } = useContext(AuthContext);
  const [entries, setEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const { data } = await api.get("/entries/mine");
        if (!ignore) {
          setEntries(data);
          if (data.length > 0) {
            setSelectedEntry(data[0]);
          }
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

  const filteredEntries = entries.filter(
    (entry) =>
      entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addEntry = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/entries", {
        title: newTitle,
        content: newContent,
      });
      setEntries([data, ...entries]);
      setSelectedEntry(data);
      setNewTitle("");
      setNewContent("");
      setShowNewEntryModal(false);
    } catch (error) {
      console.error("Failed to add entry:", error);
    }
  };

  const deleteEntry = async (entryId) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;

    try {
      await api.delete(`/entries/${entryId}`);
      const updatedEntries = entries.filter((e) => e._id !== entryId);
      setEntries(updatedEntries);

      if (selectedEntry?._id === entryId) {
        setSelectedEntry(updatedEntries.length > 0 ? updatedEntries[0] : null);
      }
    } catch (error) {
      console.error("Failed to delete entry:", error);
    }
  };

  const updateEntry = async (e) => {
    e.preventDefault();
    if (!selectedEntry) return;

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
      console.error("Failed to update entry:", error);
    }
  };

  if (!user) return <div className="p-4">Please log in.</div>;

  return (
    <div className="flex h-screen bg-blue-50">
      {/* Left Sidebar - Entry List */}
      <div className="w-1/3 bg-white border-r border-blue-100 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-blue-900">Diary</h1>
            <button
              onClick={() => setShowNewEntryModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              New Entry
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-blue-50 border border-blue-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white"
            />
            <IoSearch className="w-4 h-4 text-blue-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          </div>
        </div>

        {/* Entry List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="animate-pulse p-4 border-b border-blue-50"
                >
                  <div className="h-4 bg-blue-100 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-blue-50 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : filteredEntries.length > 0 ? (
            <div>
              {filteredEntries.map((entry) => (
                <div
                  key={entry._id}
                  onClick={() => setSelectedEntry(entry)}
                  className={`p-4 border-b border-blue-50 cursor-pointer hover:bg-blue-50 transition-colors ${
                    selectedEntry?._id === entry._id
                      ? "bg-blue-50 border-l-4 border-l-blue-600"
                      : ""
                  }`}
                >
                  <h3 className="font-semibold text-blue-900 mb-1">
                    {entry.title}
                  </h3>
                  <p className="text-sm text-blue-600 mb-2">
                    {new Date(entry.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-blue-700/70">
              <p>No entries found</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Entry Detail */}
      <div className="flex-1 flex flex-col">
        {selectedEntry ? (
          <>
            {/* Entry Header */}
            <div className="p-6 bg-white border-b border-blue-100">
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
                      className="text-2xl font-bold text-blue-900 w-full border border-blue-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  ) : (
                    <h2 className="text-2xl font-bold text-blue-900">
                      {selectedEntry.title}
                    </h2>
                  )}
                  <p className="text-blue-600 mt-1">
                    {new Date(selectedEntry.createdAt).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </p>
                </div>

                <div className="flex gap-2 ml-4">
                  {isEditing ? (
                    <>
                      <button
                        onClick={updateEntry}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-blue-600 hover:text-blue-800 px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteEntry(selectedEntry._id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Entry Content */}
            <div className="flex-1 p-6 bg-white">
              {isEditing ? (
                <textarea
                  value={selectedEntry.content}
                  onChange={(e) =>
                    setSelectedEntry({
                      ...selectedEntry,
                      content: e.target.value,
                    })
                  }
                  className="w-full h-full resize-none border border-blue-200 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-blue-400 text-blue-900"
                />
              ) : (
                <div className="prose max-w-none">
                  <p className="text-blue-900 leading-relaxed whitespace-pre-wrap">
                    {selectedEntry.content}
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-center text-blue-700/70">
              <IoBook className="w-16 h-16 mx-auto mb-4 text-blue-300" />
              <p className="text-lg">Select an entry to view details</p>
              <p className="text-sm mt-1">Or create your first entry</p>
            </div>
          </div>
        )}
      </div>

      {/* New Entry Modal */}
      {showNewEntryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-blue-900 mb-4">New Entry</h2>
            <form onSubmit={addEntry} className="space-y-4">
              <input
                type="text"
                placeholder="Entry title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="w-full border border-blue-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <textarea
                placeholder="What's on your mind?"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                required
                rows={10}
                className="w-full border border-blue-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewEntryModal(false);
                    setNewTitle("");
                    setNewContent("");
                  }}
                  className="px-4 py-2 text-blue-600 hover:text-blue-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
