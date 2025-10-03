import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AuthContext } from "../context/AuthContext";
import PostCard from "../components/PostCard";
import api from "../utils/api";
import {
  IoAdd,
  IoSearch,
  IoFilter,
  IoImage,
  IoDocument,
  IoSend,
  IoClose,
  IoHeart,
  IoHeartOutline,
  IoChatbubbleOutline,
  IoShareOutline,
  IoBookmarkOutline,
  IoEllipsisHorizontal,
  IoFlame,
  IoTrendingUp,
  IoPeople,
  IoAnalytics,
  IoEye,
  IoThumbsUp,
  IoCheckmarkCircle,
  IoTime,
} from "react-icons/io5";

const Community = () => {
  const { user, userProfile } = useContext(AuthContext);
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [trendingHashtags, setTrendingHashtags] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("recent");
  const [filterBy, setFilterBy] = useState("all");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [showPostComposer, setShowPostComposer] = useState(false);
  const [newPost, setNewPost] = useState({ content: "", media: [] });
  const [followedUsers, setFollowedUsers] = useState(new Set());
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [communityInsights, setCommunityInsights] = useState({
    totalPosts: 0,
    totalUsers: 0,
    totalLikes: 0,
    newUsersToday: 0,
  });

  useEffect(() => {
    // Debounce API calls to prevent 429 errors
    const timeoutId = setTimeout(() => {
      loadCommunityData();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [sortBy]);

  const loadCommunityData = async () => {
    try {
      setLoading(true);
      setError(null);

      // First try to get basic stats to avoid 429 errors
      try {
        const basicStats = await api.get("/community/stats");
        setCommunityInsights((prev) => ({
          ...prev,
          totalUsers: basicStats.data.totalUsers || 3,
          totalPosts: basicStats.data.totalPosts || 0,
        }));
      } catch (statsError) {
        console.log("Basic stats failed, using fallback");
      }

      // Then get other data with individual error handling
      const [postsRes, hashtagsRes, usersRes] = await Promise.all([
        api
          .get(`/community/feed?sort=${sortBy}&limit=20`)
          .catch(() => ({ data: { posts: [] } })),
        api.get("/community/trending?limit=5").catch(() => ({ data: [] })),
        api
          .get("/community/suggested-users?limit=5")
          .catch(() => ({ data: [] })),
      ]);

      // Handle correct response structure from backend
      setPosts(postsRes.data.posts || []);
      setTrendingHashtags(hashtagsRes.data || []); // Backend returns array directly
      setSuggestedUsers(usersRes.data || []); // Backend returns array directly

      // Try to get detailed insights (optional)
      try {
        const insightsRes = await api.get("/community/insights");
        if (insightsRes.data) {
          setCommunityInsights(insightsRes.data);
        }
      } catch (insightsError) {
        console.log("Detailed insights failed, using basic stats");
        // Keep the basic stats we already set
        setCommunityInsights((prev) => ({
          ...prev,
          totalLikes:
            postsRes.data.posts?.reduce(
              (total, post) => total + (post.likes?.length || 0),
              0
            ) || 0,
          totalComments:
            postsRes.data.posts?.reduce(
              (total, post) => total + (post.comments?.length || 0),
              0
            ) || 0,
          activeUsersToday: usersRes.data?.length || 0,
          engagementRate: 0,
          newUsersToday: 0,
        }));
      }

      setRetryCount(0);
    } catch (error) {
      console.error("Error loading community data:", error);
      setError(
        `Failed to load community data: ${
          error.response?.status === 401 ? "Please log in again" : error.message
        }`
      );
      toast.error("Failed to load community data");
    } finally {
      setLoading(false);
    }
  };

  const retryLoadData = () => {
    setRetryCount((prev) => prev + 1);
    loadCommunityData();
  };

  const handleLikePost = async (postId) => {
    try {
      const response = await api.post(`/posts/${postId}/like`);
      setPosts(
        posts.map((post) =>
          post._id === postId
            ? { ...post, likes: response.data.likes, isLiked: !post.isLiked }
            : post
        )
      );
    } catch (error) {
      console.error("Error liking post:", error);
      toast.error(
        `Failed to like post: ${
          error.response?.status === 401
            ? "Please log in again"
            : "Try again later"
        }`
      );
    }
  };

  const handleFollowUser = async (userId) => {
    try {
      const response = await api.post(`/community/follow/${userId}`);
      setFollowedUsers((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(userId)) {
          newSet.delete(userId);
        } else {
          newSet.add(userId);
        }
        return newSet;
      });
      toast.success(response.data.message || "Follow status updated");
    } catch (error) {
      console.error("Error following user:", error);
      toast.error(
        `Failed to follow user: ${
          error.response?.status === 401
            ? "Please log in again"
            : "Try again later"
        }`
      );
    }
  };

  const handleDeletePost = (postId) => {
    // Remove the deleted post from the local state
    setPosts(posts.filter((post) => post._id !== postId));
    // Refresh community data to get updated stats
    loadCommunityData();
  };

  const handleCreatePost = async () => {
    if (!newPost.content.trim()) {
      toast.error("Please enter some content");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("content", newPost.content);
      if (newPost.media.length > 0) {
        formData.append("image", newPost.media[0]); // Backend expects 'image' field
      }

      const response = await api.post("/community/post", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setPosts([response.data.post, ...posts]);
      setNewPost({ content: "", media: [] });
      setShowPostComposer(false);
      toast.success("Post created successfully!");
      // Refresh community data to get updated stats
      loadCommunityData();
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error(
        `Failed to create post: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setNewPost((prev) => ({
      ...prev,
      media: [...prev.media, ...files],
    }));
  };

  const removeFile = (index) => {
    setNewPost((prev) => ({
      ...prev,
      media: prev.media.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Community
              </h1>
              {/* Connection Status Indicator */}
              <div
                className={`w-3 h-3 rounded-full ${
                  error
                    ? "bg-red-500"
                    : loading
                    ? "bg-yellow-500"
                    : "bg-green-500"
                } ${loading ? "animate-pulse" : ""}`}
                title={
                  error
                    ? "Connection Error"
                    : loading
                    ? "Loading..."
                    : "Connected"
                }
              ></div>
            </div>
            <p className="text-blue-600 text-lg">
              Connect, share, and discover amazing content
            </p>
          </div>

          {/* Filters and Search */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200 p-6 shadow-lg mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <IoSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search posts, hashtags, users..."
                  className="w-full pl-10 pr-4 py-3 bg-blue-50 border border-blue-200 rounded-xl focus:outline-none focus:border-blue-400 transition-colors"
                />
              </div>

              {/* Filter Controls */}
              <div className="flex gap-3">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl focus:outline-none focus:border-blue-400 transition-colors"
                >
                  <option value="recent">Most Recent</option>
                  <option value="popular">Most Popular</option>
                  <option value="trending">Trending</option>
                </select>

                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value)}
                  className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl focus:outline-none focus:border-blue-400 transition-colors"
                >
                  <option value="all">All Posts</option>
                  <option value="following">Following</option>
                  <option value="images">Images</option>
                  <option value="text">Text Only</option>
                </select>
              </div>
            </div>

            {/* Posts/Insights Tabs */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200 p-2 shadow-lg mt-6">
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveTab("posts")}
                  className={`flex-1 py-3 px-4 text-sm font-semibold rounded-xl transition-all duration-200 ${
                    activeTab === "posts"
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  📝 Posts
                </button>
                <button
                  onClick={() => setActiveTab("insights")}
                  className={`flex-1 py-3 px-4 text-sm font-semibold rounded-xl transition-all duration-200 ${
                    activeTab === "insights"
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  📊 Insights
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error State - Visible when there are API errors */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="text-red-500 text-xl">⚠️</div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-800 mb-1">
                  Connection Error
                </h3>
                <p className="text-red-600 text-sm mb-3">{error}</p>
                <div className="flex gap-2">
                  <button
                    onClick={retryLoadData}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    Retry (
                    {retryCount > 0 ? `Attempt ${retryCount + 1}` : "Try Again"}
                    )
                  </button>
                  <button
                    onClick={() => setError(null)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === "posts" && (
              <>
                {/* LinkedIn-Style Post Composer */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-sm overflow-hidden">
                        {userProfile?.profileImage ? (
                          <img
                            src={userProfile.profileImage}
                            alt={
                              userProfile.displayName ||
                              userProfile.username ||
                              user?.username
                            }
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          (
                            userProfile?.displayName ||
                            userProfile?.username ||
                            user?.username ||
                            "U"
                          )
                            .charAt(0)
                            .toUpperCase()
                        )}
                      </div>

                      <div className="flex-1">
                        <button
                          onClick={() => setShowPostComposer(true)}
                          className="w-full text-left px-4 py-3 text-gray-500 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors border border-gray-200"
                        >
                          Start a post...
                        </button>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center justify-around mt-4 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setShowPostComposer(true);
                          // Focus on image upload when modal opens
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                          <IoImage className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-medium text-sm">Photo</span>
                      </button>

                      <button className="flex items-center gap-2 px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors">
                        <div className="w-6 h-6 bg-orange-100 rounded flex items-center justify-center">
                          <IoDocument className="w-4 h-4 text-orange-600" />
                        </div>
                        <span className="font-medium text-sm">Article</span>
                      </button>

                      <button className="flex items-center gap-2 px-4 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                        <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">
                          <span className="text-green-600 text-xs font-bold">
                            📊
                          </span>
                        </div>
                        <span className="font-medium text-sm">Poll</span>
                      </button>

                      <button className="flex items-center gap-2 px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                        <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center">
                          <span className="text-purple-600 text-xs font-bold">
                            🎉
                          </span>
                        </div>
                        <span className="font-medium text-sm">Event</span>
                      </button>
                    </div>

                    {/* Enhanced Post Composer Modal */}
                    {showPostComposer && (
                      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                          {/* Modal Header */}
                          <div className="flex items-center justify-between p-4 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden">
                                {userProfile?.profileImage ? (
                                  <img
                                    src={userProfile.profileImage}
                                    alt={
                                      userProfile.displayName ||
                                      userProfile.username ||
                                      user?.username
                                    }
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  (
                                    userProfile?.displayName ||
                                    userProfile?.username ||
                                    user?.username ||
                                    "U"
                                  )
                                    .charAt(0)
                                    .toUpperCase()
                                )}
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">
                                  {userProfile?.displayName ||
                                    userProfile?.username ||
                                    user?.username ||
                                    "User"}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  Post to Community
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => setShowPostComposer(false)}
                              className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                            >
                              <IoClose className="w-6 h-6" />
                            </button>
                          </div>

                          {/* Modal Content */}
                          <div className="p-4 max-h-[60vh] overflow-y-auto">
                            <textarea
                              value={newPost.content}
                              onChange={(e) =>
                                setNewPost((prev) => ({
                                  ...prev,
                                  content: e.target.value,
                                }))
                              }
                              placeholder="What do you want to talk about?"
                              className="w-full p-0 border-none resize-none focus:outline-none text-lg placeholder-gray-400"
                              rows={6}
                              style={{ minHeight: "120px" }}
                            />

                            {/* Media Preview */}
                            {newPost.media.length > 0 && (
                              <div className="mt-4">
                                <div className="grid grid-cols-2 gap-3">
                                  {newPost.media.map((file, index) => (
                                    <div key={index} className="relative group">
                                      <img
                                        src={URL.createObjectURL(file)}
                                        alt={`Preview ${index}`}
                                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                                      />
                                      <button
                                        onClick={() => removeFile(index)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Modal Footer */}
                          <div className="border-t border-gray-200 p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <input
                                  type="file"
                                  accept="image/*,video/*"
                                  multiple
                                  onChange={handleFileSelect}
                                  className="hidden"
                                  id="media-upload-modal"
                                />
                                <label
                                  htmlFor="media-upload-modal"
                                  className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                                >
                                  <IoImage className="w-5 h-5" />
                                  <span className="text-sm font-medium">
                                    Media
                                  </span>
                                </label>

                                <button className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                  <span className="text-sm">🎭</span>
                                  <span className="text-sm font-medium">
                                    Feeling
                                  </span>
                                </button>

                                <button className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                  <span className="text-sm">📍</span>
                                  <span className="text-sm font-medium">
                                    Location
                                  </span>
                                </button>
                              </div>

                              <button
                                onClick={handleCreatePost}
                                disabled={
                                  !newPost.content.trim() &&
                                  newPost.media.length === 0
                                }
                                className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                              >
                                Post
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Posts Feed */}
                <div className="space-y-6">
                  {loading ? (
                    <div className="space-y-6">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm animate-pulse"
                        >
                          <div className="flex items-start gap-4 mb-4">
                            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                            <div className="flex-1">
                              <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                              <div className="h-3 bg-gray-200 rounded w-24"></div>
                            </div>
                          </div>
                          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                          <div className="h-48 bg-gray-200 rounded-xl"></div>
                        </div>
                      ))}
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                      <div className="text-6xl mb-4">📝</div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        No posts yet
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Be the first to share something with the community!
                      </p>
                      <button
                        onClick={() => setShowPostComposer(true)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors font-medium"
                      >
                        Create your first post
                      </button>
                    </div>
                  ) : (
                    posts.map((post) => (
                      <PostCard
                        key={post._id}
                        post={post}
                        onLike={() => handleLikePost(post._id)}
                        onComment={() => loadCommunityData()}
                        onShare={() => loadCommunityData()}
                        onDelete={handleDeletePost}
                      />
                    ))
                  )}
                </div>
              </>
            )}

            {activeTab === "insights" && (
              <div className="space-y-6">
                {/* Trending Topics */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200 p-6 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <IoFlame className="w-5 h-5 text-orange-500" />
                    <h3 className="font-semibold text-blue-900">
                      Trending Topics
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {loading ? (
                      <div className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className="animate-pulse p-3 rounded-lg bg-gray-100"
                          >
                            <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
                            <div className="h-3 bg-gray-200 rounded w-16"></div>
                          </div>
                        ))}
                      </div>
                    ) : trendingHashtags.length === 0 ? (
                      <div className="text-center py-6">
                        <div className="text-4xl mb-2">📈</div>
                        <p className="text-blue-600 text-sm">
                          No trending topics yet
                        </p>
                        <p className="text-blue-400 text-xs">
                          Be the first to start a trend!
                        </p>
                      </div>
                    ) : (
                      trendingHashtags.map((hashtag, index) => (
                        <div
                          key={hashtag.hashtag || index}
                          className="flex items-center justify-between p-3 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                        >
                          <div>
                            <div className="font-medium text-blue-900">
                              #{hashtag.hashtag}
                            </div>
                            <div className="text-sm text-blue-600">
                              {hashtag.count} post
                              {hashtag.count !== 1 ? "s" : ""}
                            </div>
                          </div>
                          <IoTrendingUp className="w-4 h-4 text-green-500" />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* People to Follow */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200 p-6 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <IoPeople className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold text-blue-900">
                      People to Follow
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {loading ? (
                      <div className="space-y-3">
                        {[...Array(4)].map((_, i) => (
                          <div
                            key={i}
                            className="animate-pulse flex items-start gap-3"
                          >
                            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                            <div className="flex-1">
                              <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                              <div className="h-3 bg-gray-200 rounded w-32 mb-1"></div>
                              <div className="h-3 bg-gray-200 rounded w-16"></div>
                            </div>
                            <div className="h-6 bg-gray-200 rounded w-16"></div>
                          </div>
                        ))}
                      </div>
                    ) : suggestedUsers.length === 0 ? (
                      <div className="text-center py-6">
                        <div className="text-4xl mb-2">👥</div>
                        <p className="text-blue-600 text-sm">
                          No users to follow yet
                        </p>
                        <p className="text-blue-400 text-xs">
                          Check back later for suggestions!
                        </p>
                      </div>
                    ) : (
                      suggestedUsers.map((user) => (
                        <div key={user._id} className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-lg">
                            {user.profileImage ? (
                              <img
                                src={user.profileImage}
                                alt={user.username}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              user.username.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-blue-900 truncate">
                              {user.displayName || user.username}
                            </div>
                            <div className="text-sm text-blue-600 line-clamp-2">
                              {user.bio || "New community member"}
                            </div>
                            <div className="text-xs text-blue-400">
                              {user.followersCount || 0} followers
                            </div>
                          </div>
                          <button
                            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                              followedUsers.has(user._id)
                                ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                            }`}
                            onClick={() => handleFollowUser(user._id)}
                          >
                            {followedUsers.has(user._id)
                              ? "Following"
                              : "Follow"}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Your Stats */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200 p-6 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <IoAnalytics className="w-5 h-5 text-purple-500" />
                    <h3 className="font-semibold text-blue-900">Your Stats</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-600">Posts</span>
                      <span className="font-semibold text-blue-900">
                        {posts.filter((p) => p.author?._id === user?.id).length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-600">Followers</span>
                      <span className="font-semibold text-blue-900">
                        {user?.followersCount || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-600">Following</span>
                      <span className="font-semibold text-blue-900">
                        {user?.followingCount || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-600">Total Likes</span>
                      <span className="font-semibold text-blue-900">
                        {posts
                          .filter((p) => p.author?._id === user?.id)
                          .reduce(
                            (total, post) => total + (post.likes?.length || 0),
                            0
                          )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Community Stats */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200 p-6 shadow-lg">
                  <div className="flex items-center gap-2 mb-6">
                    <IoAnalytics className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold text-blue-900">
                      Community Insights
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center p-4 bg-blue-50 rounded-xl">
                      <div className="text-2xl font-bold text-blue-600">
                        {communityInsights.totalPosts || posts.length}
                      </div>
                      <div className="text-sm text-blue-500">Total Posts</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-xl">
                      <div className="text-2xl font-bold text-green-600">
                        {communityInsights.totalUsers || 3}
                      </div>
                      <div className="text-sm text-green-500">Total Users</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-xl">
                      <div className="text-2xl font-bold text-orange-600">
                        {communityInsights.activeUsersToday || 0}
                      </div>
                      <div className="text-sm text-orange-500">
                        Active Today
                      </div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-xl">
                      <div className="text-2xl font-bold text-purple-600">
                        {communityInsights.totalLikes ||
                          posts.reduce(
                            (total, post) => total + (post.likes?.length || 0),
                            0
                          )}
                      </div>
                      <div className="text-sm text-purple-500">Total Likes</div>
                    </div>
                  </div>

                  {/* Additional metrics row */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-3 bg-indigo-50 rounded-xl">
                      <div className="text-lg font-bold text-indigo-600">
                        {communityInsights.totalComments ||
                          posts.reduce(
                            (total, post) =>
                              total + (post.comments?.length || 0),
                            0
                          )}
                      </div>
                      <div className="text-xs text-indigo-500">Comments</div>
                    </div>
                    <div className="text-center p-3 bg-pink-50 rounded-xl">
                      <div className="text-lg font-bold text-pink-600">
                        {communityInsights.engagementRate || 0}%
                      </div>
                      <div className="text-xs text-pink-500">Engagement</div>
                    </div>
                    <div className="text-center p-3 bg-teal-50 rounded-xl">
                      <div className="text-lg font-bold text-teal-600">
                        {communityInsights.newUsersToday || 0}
                      </div>
                      <div className="text-xs text-teal-500">New Today</div>
                    </div>
                  </div>
                </div>

                {/* Top Posts */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200 p-6 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <IoThumbsUp className="w-5 h-5 text-green-500" />
                    <h3 className="font-semibold text-blue-900">
                      Top Performing Posts
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {posts
                      .sort(
                        (a, b) =>
                          (b.likes?.length || 0) - (a.likes?.length || 0)
                      )
                      .slice(0, 5)
                      .map((post, index) => (
                        <div
                          key={post._id}
                          className="flex items-start gap-3 p-3 hover:bg-blue-50 rounded-lg"
                        >
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm text-blue-900 line-clamp-2">
                              {post.content}
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-blue-500">
                              <span className="flex items-center gap-1">
                                <IoHeart className="w-3 h-3" />
                                {post.likes?.length || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <IoChatbubbleOutline className="w-3 h-3" />
                                {post.comments?.length || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <IoEye className="w-3 h-3" />
                                {post.views || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Top Users */}
                {communityInsights.topUsers &&
                  communityInsights.topUsers.length > 0 && (
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200 p-6 shadow-lg">
                      <div className="flex items-center gap-2 mb-4">
                        <IoPeople className="w-5 h-5 text-indigo-500" />
                        <h3 className="font-semibold text-blue-900">
                          Top Community Members
                        </h3>
                      </div>

                      <div className="space-y-4">
                        {communityInsights.topUsers.map((user, index) => (
                          <div
                            key={user._id}
                            className="flex items-center gap-3 p-3 hover:bg-blue-50 rounded-lg"
                          >
                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-bold text-indigo-600">
                              {index + 1}
                            </div>
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              {user.profileImage ? (
                                <img
                                  src={user.profileImage}
                                  alt={user.username}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-lg font-medium text-blue-600">
                                  {(user.displayName || user.username)
                                    .charAt(0)
                                    .toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-blue-900">
                                {user.displayName || user.username}
                              </div>
                              <div className="text-sm text-blue-600">
                                {user.followersCount} followers
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Engagement Timeline */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200 p-6 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <IoTime className="w-5 h-5 text-purple-500" />
                    <h3 className="font-semibold text-blue-900">
                      Recent Activity
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {(communityInsights.recentActivity &&
                    communityInsights.recentActivity.length > 0
                      ? communityInsights.recentActivity
                      : posts
                          .sort(
                            (a, b) =>
                              new Date(b.createdAt) - new Date(a.createdAt)
                          )
                          .slice(0, 10)
                    ).map((activity) => (
                      <div
                        key={activity._id}
                        className="flex items-center gap-3 p-3 border-l-4 border-blue-200"
                      >
                        <IoCheckmarkCircle className="w-4 h-4 text-green-500" />
                        <div className="flex-1">
                          <div className="text-sm text-blue-900">
                            New post by{" "}
                            <span className="font-medium">
                              {activity.author?.displayName ||
                                activity.author?.username ||
                                "Unknown"}
                            </span>
                            {communityInsights.recentActivity && (
                              <span className="ml-2 text-xs text-gray-500">
                                {activity.likesCount || 0} likes,{" "}
                                {activity.commentsCount || 0} comments
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-blue-500">
                            {new Date(activity.createdAt).toLocaleDateString()}{" "}
                            at{" "}
                            {new Date(activity.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Empty for now */}
          <div className="lg:col-span-1">{/* Space for future widgets */}</div>
        </div>
      </div>
    </div>
  );
};

export default Community;
