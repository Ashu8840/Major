import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import {
  IoCamera,
  IoCreate,
  IoHeart,
  IoStar,
  IoTrophy,
  IoFlame,
  IoBook,
  IoAnalytics,
  IoBookmark,
  IoAdd,
  IoTime,
  IoEye,
  IoChatbubble,
  IoPerson,
  IoShare,
  IoGrid,
  IoList,
  IoCheckmarkCircle,
  IoSparkles,
  IoTrendingUp,
  IoDocument,
  IoImage,
  IoChevronForward,
} from "react-icons/io5";

export default function Profile() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("posts");
  const [viewMode, setViewMode] = useState("grid");
  const [isFollowing, setIsFollowing] = useState(false);

  // Mock user data - replace with actual API calls
  const profileUser = {
    uid: "DA-2025-AYU001",
    username: "ayush_writer",
    displayName: "Ayush Tripathi",
    bio: "Passionate storyteller and digital diary enthusiast. Love exploring human emotions through words and creating immersive narratives. 📚✨",
    profilePicture: "/api/placeholder/150/150",
    coverBanner: "/api/placeholder/800/300",
    location: "Mumbai, India",
    joinDate: "January 2025",
    verified: true,
    stats: {
      entries: 247,
      stories: 12,
      followers: 1284,
      following: 456,
      moodStreak: 15,
      totalReads: 45600,
    },
    badges: [
      { id: 1, name: "7-Day Streak", icon: IoFlame, color: "text-orange-500" },
      { id: 2, name: "Top Author", icon: IoTrophy, color: "text-yellow-500" },
      { id: 3, name: "100+ Reads", icon: IoEye, color: "text-blue-500" },
      {
        id: 4,
        name: "Verified Writer",
        icon: IoCheckmarkCircle,
        color: "text-green-500",
      },
    ],
  };

  const mockPosts = [
    {
      id: 1,
      type: "entry",
      title: "Morning Reflections",
      content:
        "Today I realized that happiness isn't about having everything perfect...",
      mood: "😊",
      date: "2025-01-08",
      likes: 24,
      comments: 5,
      isPublic: true,
    },
    {
      id: 2,
      type: "story",
      title: "The Digital Dawn",
      content: "A sci-fi story about AI consciousness...",
      coverImage: "/api/placeholder/300/200",
      date: "2025-01-07",
      likes: 156,
      comments: 23,
      reads: 1204,
    },
  ];

  const mockBooks = [
    {
      id: 1,
      title: "Digital Dreams",
      genre: "Sci-Fi",
      coverImage: "/api/placeholder/200/300",
      price: 299,
      sales: 45,
      rating: 4.8,
      status: "published",
    },
    {
      id: 2,
      title: "Midnight Thoughts",
      genre: "Poetry",
      coverImage: "/api/placeholder/200/300",
      price: 199,
      sales: 23,
      rating: 4.6,
      status: "draft",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Cover Banner - Full Width */}
      <div className="relative h-64 md:h-80 bg-gradient-to-r from-blue-600 to-purple-700 overflow-hidden mb-4">
        <img
          src={profileUser.coverBanner}
          alt="Cover"
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        <button className="absolute top-4 right-4 p-2 bg-black/30 hover:bg-black/50 rounded-full text-white transition-colors">
          <IoCamera className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6">

        {/* Profile Header */}
        <div className="relative px-4 md:px-8 pb-6">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6 -mt-20">
            {/* Profile Picture */}
            <div className="relative">
              <img
                src={profileUser.profilePicture}
                alt={profileUser.displayName}
                className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-xl object-cover"
              />
              <button className="absolute bottom-2 right-2 p-2 bg-blue-600 hover:bg-blue-700 rounded-full text-white shadow-lg transition-colors">
                <IoCamera className="w-4 h-4" />
              </button>
              {profileUser.verified && (
                <div className="absolute -top-2 -right-2 p-1 bg-blue-600 rounded-full">
                  <IoCheckmarkCircle className="w-6 h-6 text-white" />
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 space-y-2">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {profileUser.displayName}
                </h1>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium">
                    {profileUser.uid}
                  </span>
                  <span className="text-gray-500">@{profileUser.username}</span>
                </div>
              </div>
              <p className="text-gray-600 max-w-2xl">{profileUser.bio}</p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>📍 {profileUser.location}</span>
                <span>📅 Joined {profileUser.joinDate}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setIsFollowing(!isFollowing)}
                className={`px-6 py-2 rounded-full font-medium transition-colors ${
                  isFollowing
                    ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                <IoPerson className="w-4 h-4 inline mr-2" />
                {isFollowing ? "Following" : "Follow"}
              </button>
              <button className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full font-medium transition-colors">
                <IoChatbubble className="w-4 h-4 inline mr-2" />
                Message
              </button>
              <button className="p-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full transition-colors">
                <IoShare className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center p-4 bg-white rounded-xl shadow-sm border">
              <div className="text-2xl font-bold text-blue-600">
                {profileUser.stats.entries}
              </div>
              <div className="text-sm text-gray-500">Entries</div>
            </div>
            <div className="text-center p-4 bg-white rounded-xl shadow-sm border">
              <div className="text-2xl font-bold text-purple-600">
                {profileUser.stats.stories}
              </div>
              <div className="text-sm text-gray-500">Stories</div>
            </div>
            <div className="text-center p-4 bg-white rounded-xl shadow-sm border">
              <div className="text-2xl font-bold text-green-600">
                {profileUser.stats.followers}
              </div>
              <div className="text-sm text-gray-500">Followers</div>
            </div>
            <div className="text-center p-4 bg-white rounded-xl shadow-sm border">
              <div className="text-2xl font-bold text-yellow-600">
                {profileUser.stats.following}
              </div>
              <div className="text-sm text-gray-500">Following</div>
            </div>
            <div className="text-center p-4 bg-white rounded-xl shadow-sm border">
              <div className="text-2xl font-bold text-orange-600">
                {profileUser.stats.moodStreak}
              </div>
              <div className="text-sm text-gray-500">Day Streak</div>
            </div>
            <div className="text-center p-4 bg-white rounded-xl shadow-sm border">
              <div className="text-2xl font-bold text-red-600">
                {profileUser.stats.totalReads}
              </div>
              <div className="text-sm text-gray-500">Total Reads</div>
            </div>
          </div>

          {/* Badges */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Achievements
            </h3>
            <div className="flex flex-wrap gap-3">
              {profileUser.badges.map((badge) => {
                const IconComponent = badge.icon;
                return (
                  <div
                    key={badge.id}
                    className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border hover:shadow-md transition-shadow"
                  >
                    <IconComponent className={`w-5 h-5 ${badge.color}`} />
                    <span className="text-sm font-medium text-gray-700">
                      {badge.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="px-4 md:px-8">
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
              {[
                { id: "posts", label: "Posts & Entries", icon: IoDocument },
                { id: "books", label: "Books", icon: IoBook },
                { id: "analytics", label: "Analytics", icon: IoAnalytics },
                { id: "favorites", label: "Favorites", icon: IoBookmark },
              ].map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-1 py-4 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="mb-8">
            {activeTab === "posts" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Posts & Entries
                  </h2>
                  <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`p-2 rounded ${
                          viewMode === "grid" ? "bg-white shadow-sm" : ""
                        }`}
                      >
                        <IoGrid className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={`p-2 rounded ${
                          viewMode === "list" ? "bg-white shadow-sm" : ""
                        }`}
                      >
                        <IoList className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                      : "space-y-4"
                  }
                >
                  {mockPosts.map((post) => (
                    <div
                      key={post.id}
                      className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow overflow-hidden"
                    >
                      {post.coverImage && (
                        <img
                          src={post.coverImage}
                          alt={post.title}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{post.mood}</span>
                          <span className="text-sm text-gray-500">
                            {post.date}
                          </span>
                          {post.isPublic && (
                            <span className="ml-auto px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              Public
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">
                          {post.title}
                        </h3>
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {post.content}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <IoHeart className="w-4 h-4" />
                            {post.likes}
                          </span>
                          <span className="flex items-center gap-1">
                            <IoChatbubble className="w-4 h-4" />
                            {post.comments}
                          </span>
                          {post.reads && (
                            <span className="flex items-center gap-1">
                              <IoEye className="w-4 h-4" />
                              {post.reads}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "books" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Published Books
                  </h2>
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <IoAdd className="w-4 h-4" />
                    Upload Book
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {mockBooks.map((book) => (
                    <div
                      key={book.id}
                      className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow overflow-hidden"
                    >
                      <div className="relative">
                        <img
                          src={book.coverImage}
                          alt={book.title}
                          className="w-full h-64 object-cover"
                        />
                        <span
                          className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
                            book.status === "published"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {book.status}
                        </span>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {book.title}
                        </h3>
                        <p className="text-sm text-gray-500 mb-2">
                          {book.genre}
                        </p>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center gap-1">
                            <IoStar className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm font-medium">
                              {book.rating}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            • {book.sales} sold
                          </span>
                        </div>
                        <div className="text-lg font-bold text-blue-600">
                          ₹{book.price}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "analytics" && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Analytics Overview
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <IoTrendingUp className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Profile Views
                        </h3>
                        <p className="text-2xl font-bold text-blue-600">
                          2,847
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-green-600">
                      +12% from last week
                    </p>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <IoFlame className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Writing Streak
                        </h3>
                        <p className="text-2xl font-bold text-purple-600">
                          {profileUser.stats.moodStreak} days
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-green-600">Keep it up! 🔥</p>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <IoEye className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Total Reads
                        </h3>
                        <p className="text-2xl font-bold text-green-600">
                          {profileUser.stats.totalReads}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-green-600">
                      +8% from last month
                    </p>
                  </div>
                </div>

                {/* Top Followers */}
                <div className="mt-8 bg-white rounded-xl shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Top Followers
                  </h3>
                  <div className="space-y-3">
                    {Array.from({ length: 5 }, (_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={`/api/placeholder/40/40`}
                            alt="Follower"
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-medium text-gray-900">
                              User {i + 1}
                            </p>
                            <p className="text-sm text-gray-500">
                              @user{i + 1}
                            </p>
                          </div>
                        </div>
                        <IoChevronForward className="w-4 h-4 text-gray-400" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "favorites" && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Saved Favorites
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow overflow-hidden"
                    >
                      <img
                        src={`/api/placeholder/300/200`}
                        alt="Favorite"
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">
                          Favorite Entry {i + 1}
                        </h3>
                        <p className="text-gray-600 text-sm mb-3">
                          A beautiful story that touched my heart...
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>By @author{i + 1}</span>
                          <span>•</span>
                          <span>Jan {i + 1}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
