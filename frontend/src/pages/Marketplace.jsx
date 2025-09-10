import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import {
  IoStorefront,
  IoAdd,
  IoCloudUpload,
  IoWallet,
  IoStar,
  IoEye,
  IoDownload,
  IoHeart,
  IoSearch,
  IoFunnel as IoFilter,
  IoTrendingUp,
  IoTime,
  IoPricetag,
  IoGift,
  IoAnalytics,
  IoCheckmarkCircle,
  IoCash,
  IoDocument,
  IoImage,
} from "react-icons/io5";

export default function Marketplace() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("trending");

  // Mock data
  const [userBooks] = useState([
    {
      id: 1,
      title: "Midnight Dreams",
      cover: "🌙",
      price: 4.99,
      sales: 234,
      earnings: 1169.66,
      rating: 4.8,
      reviews: 56,
      status: "published",
    },
    {
      id: 2,
      title: "Ocean Whispers",
      cover: "🌊",
      price: 0,
      sales: 1847,
      earnings: 0,
      rating: 4.6,
      reviews: 203,
      status: "published",
    },
    {
      id: 3,
      title: "Digital Hearts",
      cover: "💻",
      price: 7.99,
      sales: 89,
      earnings: 711.11,
      rating: 4.9,
      reviews: 34,
      status: "draft",
    },
  ]);

  const [marketplaceBooks] = useState([
    {
      id: 1,
      title: "The Last Journey",
      author: "Luna_Writes",
      cover: "🚀",
      price: 5.99,
      originalPrice: 8.99,
      rating: 4.9,
      reviews: 187,
      genre: "adventure",
      pages: 234,
      language: "English",
      bestseller: true,
      description: "An epic adventure through space and time...",
    },
    {
      id: 2,
      title: "Love in Binary",
      author: "Code_Poet",
      cover: "💝",
      price: 0,
      rating: 4.7,
      reviews: 456,
      genre: "romance",
      pages: 178,
      language: "English",
      trending: true,
      description: "A modern love story in the digital age...",
    },
    {
      id: 3,
      title: "Forest of Secrets",
      author: "Nature_Writer",
      cover: "🌲",
      price: 3.99,
      rating: 4.8,
      reviews: 298,
      genre: "mystery",
      pages: 312,
      language: "English",
      description: "Mystery unfolds in the ancient forest...",
    },
    {
      id: 4,
      title: "Quantum Dreams",
      author: "Sci_Visionary",
      cover: "⚛️",
      price: 6.99,
      rating: 4.6,
      reviews: 134,
      genre: "sci-fi",
      pages: 267,
      language: "English",
      description: "Reality bends in this quantum thriller...",
    },
    {
      id: 5,
      title: "Inner Peace",
      author: "Mindful_Soul",
      cover: "🧘",
      price: 2.99,
      rating: 4.9,
      reviews: 523,
      genre: "self-help",
      pages: 145,
      language: "English",
      description: "A guide to finding peace within...",
    },
    {
      id: 6,
      title: "Magic Academy",
      author: "Fantasy_King",
      cover: "🔮",
      price: 4.99,
      rating: 4.8,
      reviews: 734,
      genre: "fantasy",
      pages: 456,
      language: "English",
      bestseller: true,
      description: "Young wizards discover their destiny...",
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
    { value: "poetry", name: "Poetry" },
  ];

  const tabs = [
    {
      id: "browse",
      name: "Browse Books",
      icon: <IoSearch className="w-5 h-5" />,
    },
    {
      id: "my-books",
      name: "My Books",
      icon: <IoDocument className="w-5 h-5" />,
    },
    { id: "upload", name: "Upload Book", icon: <IoAdd className="w-5 h-5" /> },
    {
      id: "analytics",
      name: "Analytics",
      icon: <IoAnalytics className="w-5 h-5" />,
    },
  ];

  const filteredBooks = marketplaceBooks.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre =
      selectedGenre === "all" || book.genre === selectedGenre;
    const matchesPrice =
      priceFilter === "all" ||
      (priceFilter === "free" && book.price === 0) ||
      (priceFilter === "paid" && book.price > 0);
    return matchesSearch && matchesGenre && matchesPrice;
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-blue-600">
          Please log in to access the Marketplace.
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
            <IoStorefront className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-blue-900">Marketplace</h1>
          </div>
          <p className="text-blue-600">
            Discover amazing stories and publish your own books
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

        {/* Browse Books Tab */}
        {activeTab === "browse" && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="grid md:grid-cols-4 gap-4">
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
                      placeholder="Search books or authors..."
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
                    Price
                  </label>
                  <select
                    value={priceFilter}
                    onChange={(e) => setPriceFilter(e.target.value)}
                    className="w-full p-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Prices</option>
                    <option value="free">Free</option>
                    <option value="paid">Paid</option>
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
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Featured Books */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-blue-900">
                  🔥 Featured Books
                </h3>
                <button className="text-blue-600 hover:text-blue-800">
                  View all →
                </button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBooks.slice(0, 6).map((book) => (
                  <div key={book.id} className="group cursor-pointer">
                    <div className="bg-blue-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
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
                          </div>
                        </div>
                      </div>

                      <h4 className="font-semibold text-blue-900 mb-1 group-hover:text-blue-700">
                        {book.title}
                      </h4>
                      <p className="text-sm text-blue-600 mb-2">
                        by {book.author}
                      </p>
                      <p className="text-xs text-blue-500 mb-3 line-clamp-2">
                        {book.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <div>
                          {book.price === 0 ? (
                            <span className="text-lg font-bold text-green-600">
                              Free
                            </span>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span className="text-lg font-bold text-blue-900">
                                ${book.price}
                              </span>
                              {book.originalPrice && (
                                <span className="text-sm text-gray-400 line-through">
                                  ${book.originalPrice}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                            <IoHeart className="w-4 h-4" />
                          </button>
                          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            {book.price === 0 ? "Read" : "Buy"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* My Books Tab */}
        {activeTab === "my-books" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-blue-900">
                  📚 My Published Books
                </h3>
                <button
                  onClick={() => setActiveTab("upload")}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <IoAdd className="w-4 h-4" />
                  <span>Add New Book</span>
                </button>
              </div>

              <div className="space-y-4">
                {userBooks.map((book) => (
                  <div
                    key={book.id}
                    className="border border-blue-100 rounded-xl p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-3xl">{book.cover}</div>
                        <div>
                          <h4 className="font-semibold text-blue-900">
                            {book.title}
                          </h4>
                          <div className="flex items-center space-x-4 text-sm text-blue-600">
                            <span>
                              ${book.price === 0 ? "Free" : book.price}
                            </span>
                            <span>
                              ⭐ {book.rating} ({book.reviews} reviews)
                            </span>
                            <span>{book.sales} sales</span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                book.status === "published"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {book.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-green-600">
                          ${book.earnings.toFixed(2)}
                        </div>
                        <div className="text-sm text-blue-600">
                          Total Earnings
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Upload Book Tab */}
        {activeTab === "upload" && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-blue-900 mb-6">
              📤 Upload Your Book
            </h3>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Book Details */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    Book Title *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your book title"
                    className="w-full p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    Description *
                  </label>
                  <textarea
                    placeholder="Write a compelling description of your book"
                    className="w-full h-32 p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-2">
                      Genre
                    </label>
                    <select className="w-full p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                      {genres
                        .filter((g) => g.value !== "all")
                        .map((genre) => (
                          <option key={genre.value} value={genre.value}>
                            {genre.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-2">
                      Language
                    </label>
                    <select className="w-full p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    Price (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-xs text-blue-500 mt-1">
                    Set to 0 for free books
                  </p>
                </div>
              </div>

              {/* File Uploads */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    Book Cover *
                  </label>
                  <div className="border-2 border-dashed border-blue-200 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
                    <IoImage className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                    <p className="text-blue-600 font-medium">
                      Click to upload cover image
                    </p>
                    <p className="text-sm text-blue-500">PNG, JPG up to 5MB</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    Book File *
                  </label>
                  <div className="border-2 border-dashed border-blue-200 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
                    <IoDocument className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                    <p className="text-blue-600 font-medium">
                      Click to upload book file
                    </p>
                    <p className="text-sm text-blue-500">
                      PDF, EPUB up to 50MB
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">
                    💰 Revenue Sharing
                  </h4>
                  <p className="text-sm text-blue-700">
                    You keep 85% of sales revenue. We take 15% to maintain the
                    platform.
                  </p>
                </div>

                <button className="w-full flex items-center justify-center space-x-2 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <IoCloudUpload className="w-5 h-5" />
                  <span>Publish Book</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* Revenue Overview */}
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <IoWallet className="w-8 h-8 text-green-500" />
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    +12%
                  </span>
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  $1,880.77
                </div>
                <div className="text-sm text-blue-600">Total Earnings</div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <IoDownload className="w-8 h-8 text-blue-500" />
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    +8%
                  </span>
                </div>
                <div className="text-2xl font-bold text-blue-900">2,170</div>
                <div className="text-sm text-blue-600">Total Sales</div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <IoEye className="w-8 h-8 text-purple-500" />
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                    +15%
                  </span>
                </div>
                <div className="text-2xl font-bold text-blue-900">12,456</div>
                <div className="text-sm text-blue-600">Page Views</div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <IoStar className="w-8 h-8 text-yellow-500" />
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                    4.8
                  </span>
                </div>
                <div className="text-2xl font-bold text-blue-900">293</div>
                <div className="text-sm text-blue-600">Total Reviews</div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-blue-900 mb-6">
                Recent Activity
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <IoCheckmarkCircle className="w-6 h-6 text-green-500" />
                    <div>
                      <p className="font-medium text-blue-900">
                        "Midnight Dreams" sold
                      </p>
                      <p className="text-sm text-blue-600">2 hours ago</p>
                    </div>
                  </div>
                  <div className="text-green-600 font-semibold">+$4.24</div>
                </div>

                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <IoStar className="w-6 h-6 text-yellow-500" />
                    <div>
                      <p className="font-medium text-blue-900">
                        New 5-star review received
                      </p>
                      <p className="text-sm text-blue-600">5 hours ago</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <IoGift className="w-6 h-6 text-purple-500" />
                    <div>
                      <p className="font-medium text-blue-900">
                        Tip received from reader
                      </p>
                      <p className="text-sm text-blue-600">1 day ago</p>
                    </div>
                  </div>
                  <div className="text-purple-600 font-semibold">+$2.00</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
