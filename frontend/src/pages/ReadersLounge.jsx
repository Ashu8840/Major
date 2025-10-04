import { useState, useContext } from "react";
import toast from "react-hot-toast";
import { AuthContext } from "../context/AuthContext";
import {
  IoLibrary,
  IoBook,
  IoBookmark,
  IoHeart,
  IoStar,
  IoSearch,
  IoFunnel as IoFilter,
  IoTrendingUp,
  IoTime,
  IoEye,
  IoDownload,
  IoSunny,
  IoMoon,
  IoDocumentText as IoText,
  IoResize,
  IoVolumeMedium,
  IoPlay,
  IoPause,
  IoArrowForward,
  IoArrowBack,
  IoGift,
  IoShare,
  IoFlag,
  IoCheckmarkCircle,
  IoCash,
  IoCloseOutline as IoClose,
} from "react-icons/io5";

export default function ReadersLounge() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("discover");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [sortBy, setSortBy] = useState("trending");
  const [readingMode, setReadingMode] = useState("light");
  const [fontSize, setFontSize] = useState(16);
  const [showReader, setShowReader] = useState(false);
  const [currentBook, setCurrentBook] = useState(null);
  const [readingProgress, setReadingProgress] = useState(0);

  // Mock data
  const [library] = useState([
    {
      id: 1,
      title: "The Last Journey",
      author: "Luna_Writes",
      cover: "🚀",
      progress: 45,
      rating: 4.9,
      purchased: true,
      lastRead: "2 days ago",
      bookmarked: true,
    },
    {
      id: 2,
      title: "Love in Binary",
      author: "Code_Poet",
      cover: "💝",
      progress: 78,
      rating: 4.7,
      purchased: true,
      lastRead: "Yesterday",
      bookmarked: false,
    },
    {
      id: 3,
      title: "Forest of Secrets",
      author: "Nature_Writer",
      cover: "🌲",
      progress: 12,
      rating: 0,
      purchased: true,
      lastRead: "1 week ago",
      bookmarked: true,
    },
  ]);

  const [discoverBooks] = useState([
    {
      id: 1,
      title: "Quantum Dreams",
      author: "Sci_Visionary",
      cover: "⚛️",
      price: 6.99,
      rating: 4.6,
      reviews: 134,
      genre: "sci-fi",
      pages: 267,
      preview: true,
      trending: true,
      description:
        "Reality bends in this quantum thriller that challenges everything you know about existence.",
    },
    {
      id: 2,
      title: "Inner Peace",
      author: "Mindful_Soul",
      cover: "🧘",
      price: 2.99,
      rating: 4.9,
      reviews: 523,
      genre: "self-help",
      pages: 145,
      preview: true,
      bestseller: true,
      description:
        "A transformative guide to finding peace within yourself and the world around you.",
    },
    {
      id: 3,
      title: "Magic Academy",
      author: "Fantasy_King",
      cover: "🔮",
      price: 4.99,
      rating: 4.8,
      reviews: 734,
      genre: "fantasy",
      pages: 456,
      preview: true,
      description:
        "Young wizards discover their destiny in this enchanting tale of magic and friendship.",
    },
    {
      id: 4,
      title: "Ocean's Call",
      author: "Wave_Writer",
      cover: "🌊",
      price: 0,
      rating: 4.5,
      reviews: 298,
      genre: "adventure",
      pages: 234,
      preview: true,
      description:
        "An epic maritime adventure that will sweep you away to distant shores.",
    },
  ]);

  const genres = [
    { value: "all", name: "All Genres" },
    { value: "romance", name: "Romance" },
    { value: "fantasy", name: "Fantasy" },
    { value: "sci-fi", name: "Sci-Fi" },
    { value: "mystery", name: "Mystery" },
    { value: "adventure", name: "Adventure" },
    { value: "self-help", name: "Self-Help" },
  ];

  const tabs = [
    {
      id: "discover",
      name: "Discover",
      icon: <IoSearch className="w-5 h-5" />,
    },
    {
      id: "library",
      name: "My Library",
      icon: <IoLibrary className="w-5 h-5" />,
    },
    {
      id: "reading",
      name: "Currently Reading",
      icon: <IoBook className="w-5 h-5" />,
    },
    { id: "wishlist", name: "Wishlist", icon: <IoHeart className="w-5 h-5" /> },
  ];

  const openReader = (book) => {
    setCurrentBook(book);
    setShowReader(true);
  };

  const closeReader = () => {
    setShowReader(false);
    setCurrentBook(null);
  };

  const toggleBookmark = (bookId) => {
    // Mock bookmark functionality
    console.log(`Toggled bookmark for book ${bookId}`);
  };

  const tipAuthor = (author) => {
    // Mock tip functionality
    toast.success(`Tip sent to ${author}!`);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-blue-600">
          Please log in to access Reader's Lounge.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <IoLibrary className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-blue-900">
              Reader's Lounge
            </h1>
          </div>
          <p className="text-blue-600">
            Discover, read, and enjoy amazing stories from talented writers
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 bg-white rounded-xl p-2 shadow-sm">
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-blue-600 hover:bg-blue-50"
                }`}
              >
                {tab.icon}
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Discover Tab */}
        {activeTab === "discover" && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    Search
                  </label>
                  <div className="relative">
                    <IoSearch className="w-5 h-5 text-blue-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search books, authors, genres..."
                      className="w-full pl-10 pr-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    Genre
                  </label>
                  <select
                    value={selectedGenre}
                    onChange={(e) => setSelectedGenre(e.target.value)}
                    className="w-full p-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {genres.map((genre) => (
                      <option key={genre.value} value={genre.value}>
                        {genre.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full p-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="trending">Trending</option>
                    <option value="rating">Highest Rated</option>
                    <option value="newest">Newest</option>
                    <option value="popular">Most Popular</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Featured Books */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {discoverBooks.map((book) => (
                <div
                  key={book.id}
                  className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="text-4xl">{book.cover}</div>
                      <div className="flex flex-col items-end">
                        {book.bestseller && (
                          <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full mb-1">
                            Bestseller
                          </span>
                        )}
                        {book.trending && (
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full mb-1">
                            Trending
                          </span>
                        )}
                        <div className="flex items-center space-x-1">
                          <IoStar className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm text-blue-700">
                            {book.rating}
                          </span>
                          <span className="text-xs text-blue-500">
                            ({book.reviews})
                          </span>
                        </div>
                      </div>
                    </div>

                    <h4 className="font-semibold text-blue-900 mb-1">
                      {book.title}
                    </h4>
                    <p className="text-sm text-blue-600 mb-2">
                      by {book.author}
                    </p>
                    <p className="text-xs text-blue-500 mb-4 line-clamp-2">
                      {book.description}
                    </p>

                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm text-blue-500">
                        {book.pages} pages • {book.genre}
                      </div>
                      <div className="text-lg font-bold text-blue-900">
                        {book.price === 0 ? "Free" : `$${book.price}`}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {book.preview && (
                        <button
                          onClick={() => openReader(book)}
                          className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          <IoEye className="w-4 h-4 inline mr-1" />
                          Preview
                        </button>
                      )}
                      <button className="bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 transition-colors text-sm">
                        {book.price === 0 ? "Read" : "Buy"}
                      </button>
                      <button
                        onClick={() => toggleBookmark(book.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <IoHeart className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Library Tab */}
        {activeTab === "library" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-blue-900">
                  📚 My Library
                </h3>
                <div className="text-sm text-blue-600">
                  {library.length} books
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {library.map((book) => (
                  <div
                    key={book.id}
                    className="border border-blue-100 rounded-xl p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="text-3xl">{book.cover}</div>
                      <button
                        onClick={() => toggleBookmark(book.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          book.bookmarked
                            ? "text-red-500 bg-red-50"
                            : "text-blue-600 hover:bg-blue-50"
                        }`}
                      >
                        <IoBookmark className="w-4 h-4" />
                      </button>
                    </div>

                    <h4 className="font-semibold text-blue-900 mb-1">
                      {book.title}
                    </h4>
                    <p className="text-sm text-blue-600 mb-3">
                      by {book.author}
                    </p>

                    {/* Reading Progress */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-blue-600 mb-1">
                        <span>Progress</span>
                        <span>{book.progress}%</span>
                      </div>
                      <div className="w-full bg-blue-100 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${book.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-blue-500 mb-4">
                      <span>Last read: {book.lastRead}</span>
                      {book.rating > 0 && (
                        <div className="flex items-center space-x-1">
                          <IoStar className="w-3 h-3 text-yellow-500" />
                          <span>{book.rating}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => openReader(book)}
                        className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        {book.progress > 0 ? "Continue" : "Start Reading"}
                      </button>
                      <button
                        onClick={() => tipAuthor(book.author)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      >
                        <IoGift className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Currently Reading Tab */}
        {activeTab === "reading" && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-blue-900 mb-6">
              📖 Currently Reading
            </h3>

            {library.filter((book) => book.progress > 0 && book.progress < 100)
              .length > 0 ? (
              <div className="space-y-6">
                {library
                  .filter((book) => book.progress > 0 && book.progress < 100)
                  .map((book) => (
                    <div
                      key={book.id}
                      className="flex items-center space-x-6 p-4 bg-blue-50 rounded-xl"
                    >
                      <div className="text-4xl">{book.cover}</div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-900 mb-1">
                          {book.title}
                        </h4>
                        <p className="text-sm text-blue-600 mb-2">
                          by {book.author}
                        </p>
                        <div className="flex items-center space-x-4">
                          <div className="flex-1">
                            <div className="flex justify-between text-xs text-blue-600 mb-1">
                              <span>Progress</span>
                              <span>{book.progress}%</span>
                            </div>
                            <div className="w-full bg-blue-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${book.progress}%` }}
                              ></div>
                            </div>
                          </div>
                          <button
                            onClick={() => openReader(book)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            Continue Reading
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <IoBook className="w-16 h-16 text-blue-300 mx-auto mb-4" />
                <p className="text-blue-500">No books currently being read</p>
                <button
                  onClick={() => setActiveTab("discover")}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Discover Books
                </button>
              </div>
            )}
          </div>
        )}

        {/* In-App Reader Modal */}
        {showReader && currentBook && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div
              className={`w-full max-w-4xl h-full max-h-[90vh] rounded-xl shadow-2xl ${
                readingMode === "dark"
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-900"
              }`}
            >
              {/* Reader Header */}
              <div
                className={`flex items-center justify-between p-4 border-b ${
                  readingMode === "dark" ? "border-gray-700" : "border-blue-100"
                }`}
              >
                <div>
                  <h3 className="font-semibold">{currentBook.title}</h3>
                  <p
                    className={`text-sm ${
                      readingMode === "dark" ? "text-gray-400" : "text-blue-600"
                    }`}
                  >
                    by {currentBook.author}
                  </p>
                </div>

                {/* Reader Controls */}
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() =>
                      setReadingMode(readingMode === "light" ? "dark" : "light")
                    }
                    className={`p-2 rounded-lg transition-colors ${
                      readingMode === "dark"
                        ? "text-yellow-400 hover:bg-gray-800"
                        : "text-blue-600 hover:bg-blue-50"
                    }`}
                  >
                    {readingMode === "light" ? (
                      <IoMoon className="w-5 h-5" />
                    ) : (
                      <IoSunny className="w-5 h-5" />
                    )}
                  </button>

                  <div className="flex items-center space-x-2">
                    <IoText className="w-4 h-4" />
                    <input
                      type="range"
                      min="12"
                      max="24"
                      value={fontSize}
                      onChange={(e) => setFontSize(e.target.value)}
                      className="w-20"
                    />
                    <span className="text-sm">{fontSize}px</span>
                  </div>

                  <button
                    onClick={closeReader}
                    className={`p-2 rounded-lg transition-colors ${
                      readingMode === "dark"
                        ? "text-gray-400 hover:bg-gray-800"
                        : "text-blue-600 hover:bg-blue-50"
                    }`}
                  >
                    <IoClose className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Reading Content */}
              <div className="h-full overflow-y-auto p-8">
                <div
                  className="max-w-3xl mx-auto leading-relaxed"
                  style={{ fontSize: `${fontSize}px` }}
                >
                  <h1 className="text-2xl font-bold mb-8 text-center">
                    {currentBook.title}
                  </h1>

                  <div className="space-y-6">
                    <p>
                      This is a preview of "{currentBook.title}" by{" "}
                      {currentBook.author}. In a real implementation, this would
                      display the actual book content with proper pagination,
                      bookmarking, and reading progress tracking.
                    </p>

                    <p>
                      {currentBook.description} The story continues with rich
                      characters, engaging plot developments, and immersive
                      world-building that will keep readers captivated from
                      beginning to end.
                    </p>

                    <p>
                      Advanced features would include: • Adjustable reading
                      settings (font size, line spacing, margins) • Bookmarking
                      and note-taking capabilities • Progress synchronization
                      across devices • Offline reading support • Text-to-speech
                      functionality • Social sharing and discussion features
                    </p>

                    <div
                      className={`p-6 rounded-lg mt-8 ${
                        readingMode === "dark" ? "bg-gray-800" : "bg-blue-50"
                      }`}
                    >
                      <h4 className="font-semibold mb-4">Support the Author</h4>
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => tipAuthor(currentBook.author)}
                          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          <IoGift className="w-4 h-4" />
                          <span>Send Tip</span>
                        </button>
                        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                          <IoShare className="w-4 h-4" />
                          <span>Share</span>
                        </button>
                        <button className="flex items-center space-x-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors">
                          <IoStar className="w-4 h-4" />
                          <span>Rate & Review</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reading Progress */}
              <div
                className={`p-4 border-t ${
                  readingMode === "dark" ? "border-gray-700" : "border-blue-100"
                }`}
              >
                <div className="flex justify-between text-sm mb-2">
                  <span>Reading Progress</span>
                  <span>{readingProgress}%</span>
                </div>
                <div
                  className={`w-full rounded-full h-2 ${
                    readingMode === "dark" ? "bg-gray-700" : "bg-blue-100"
                  }`}
                >
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${readingProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
