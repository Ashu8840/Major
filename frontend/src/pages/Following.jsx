import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import PostCard from "../components/PostCard";
import NewEntryForm from "../components/NewEntryForm";
import {
  getFollowingPosts,
  likePost,
  sharePost,
  bookmarkPost,
  deletePost,
  getFollowingUsers,
} from "../utils/api";
import { FiRefreshCw, FiPlus, FiUsers } from "react-icons/fi";

const Following = () => {
  const { user } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [followingUsers, setFollowingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [postsResponse, followingResponse] = await Promise.all([
        getFollowingPosts(1),
        getFollowingUsers(),
      ]);

      setPosts(postsResponse.posts);
      setFollowingUsers(followingResponse.users || []);
      setHasMore(1 < postsResponse.pages);
      setPage(1);
    } catch (error) {
      console.error("Error loading following data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMorePosts = async (pageNum) => {
    try {
      const response = await getFollowingPosts(pageNum);
      setPosts((prev) => [...prev, ...response.posts]);
      setHasMore(pageNum < response.pages);
      setPage(pageNum);
    } catch (error) {
      console.error("Error loading more posts:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      loadMorePosts(page + 1);
    }
  };

  const handleLike = async (postId) => {
    try {
      await likePost(postId);
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId
            ? {
                ...post,
                likes: post.likes.includes(user._id)
                  ? post.likes.filter((id) => id !== user._id)
                  : [...post.likes, user._id],
              }
            : post
        )
      );
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  const handleShare = async (postId) => {
    try {
      await sharePost(postId);
    } catch (error) {
      console.error("Error sharing post:", error);
    }
  };

  const handleBookmark = async (postId) => {
    try {
      await bookmarkPost(postId);
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId
            ? {
                ...post,
                bookmarks: post.bookmarks?.includes(user._id)
                  ? post.bookmarks.filter((id) => id !== user._id)
                  : [...(post.bookmarks || []), user._id],
              }
            : post
        )
      );
    } catch (error) {
      console.error("Error bookmarking post:", error);
    }
  };

  const handleDelete = async (postId) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        await deletePost(postId);
        setPosts((prevPosts) =>
          prevPosts.filter((post) => post._id !== postId)
        );
      } catch (error) {
        console.error("Error deleting post:", error);
      }
    }
  };

  const handleNewPost = () => {
    setShowNewPost(true);
  };

  const handlePostCreated = () => {
    setShowNewPost(false);
    loadData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-blue-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
              Following
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Posts from people you follow ({followingUsers.length} users)
            </p>
          </div>

          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <FiRefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleNewPost}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              <FiPlus className="w-4 h-4" />
              <span>New Post</span>
            </button>
          </div>
        </div>

        {/* Following Users Preview */}
        {followingUsers.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-8 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
                <FiUsers className="w-5 h-5 mr-2" />
                People You Follow
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {followingUsers.slice(0, 10).map((followingUser) => (
                <div
                  key={followingUser._id}
                  className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 rounded-full px-3 py-2"
                >
                  <img
                    src={
                      followingUser.profileImage ||
                      followingUser.avatar ||
                      "https://via.placeholder.com/32"
                    }
                    alt={followingUser.displayName || followingUser.username}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {followingUser.displayName || followingUser.username}
                  </span>
                </div>
              ))}
              {followingUsers.length > 10 && (
                <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-600 rounded-full px-3 py-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    +{followingUsers.length - 10} more
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* New Post Modal */}
        {showNewPost && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                  Create New Post
                </h2>
                <button
                  onClick={() => setShowNewPost(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              <NewEntryForm
                onSubmit={handlePostCreated}
                onCancel={() => setShowNewPost(false)}
                type="post"
              />
            </div>
          </div>
        )}

        {/* Posts */}
        <div className="space-y-6">
          {loading && posts.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 dark:text-gray-400 text-lg mb-4">
                {followingUsers.length === 0
                  ? "You're not following anyone yet."
                  : "No posts from people you follow."}
              </div>
              <p className="text-gray-400 dark:text-gray-500 mb-6">
                {followingUsers.length === 0
                  ? "Start following people to see their posts here."
                  : "The people you follow haven't posted anything yet."}
              </p>
              <div className="space-x-4">
                <button
                  onClick={handleNewPost}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all"
                >
                  Create a post
                </button>
                <button
                  onClick={() => (window.location.href = "/community/discover")}
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Discover people
                </button>
              </div>
            </div>
          ) : (
            <>
              {posts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  onLike={handleLike}
                  onShare={handleShare}
                  onBookmark={handleBookmark}
                  onDelete={post.author._id === user?._id ? handleDelete : null}
                />
              ))}

              {hasMore && (
                <div className="flex justify-center py-8">
                  <button
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Loading..." : "Load More"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Following;
