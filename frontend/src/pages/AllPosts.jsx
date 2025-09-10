import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import PostCard from "../components/PostCard";
import {
  getPosts,
  searchPosts,
  likePost,
  sharePost,
  addComment,
  deletePost,
  bookmarkPost,
  unbookmarkPost,
} from "../utils/api";
import {
  IoSearch,
  IoArrowBack,
  IoRefresh,
} from "react-icons/io5";

export default function AllPosts() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = await getPosts();
      setPosts(response.posts || []);
    } catch (error) {
      console.error("Error loading posts:", error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadPosts();
      return;
    }

    try {
      setSearching(true);
      const response = await searchPosts(searchTerm.trim());
      setPosts(response.posts || []);
    } catch (error) {
      console.error("Error searching posts:", error);
      setPosts([]);
    } finally {
      setSearching(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setSearchTerm("");
    await loadPosts();
    setRefreshing(false);
  };

  const handlePostLike = async (postId) => {
    try {
      const result = await likePost(postId);
      setPosts(prev => prev.map(post => 
        post._id === postId 
          ? { ...post, likes: result.likes, isLiked: result.isLiked }
          : post
      ));
    } catch (error) {
      console.error("Like post error:", error);
    }
  };

  const handlePostShare = async (postId) => {
    try {
      const result = await sharePost(postId);
      setPosts(prev => prev.map(post => 
        post._id === postId 
          ? { ...post, shares: { length: result.shares } }
          : post
      ));
      alert("Post shared successfully!");
    } catch (error) {
      console.error("Share post error:", error);
      alert("Unable to share post. Please try again.");
    }
  };

  const handleAddComment = async (postId, text) => {
    try {
      const newComment = await addComment(postId, text);
      setPosts(prev => prev.map(post => 
        post._id === postId 
          ? { ...post, comments: [...(post.comments || []), newComment] }
          : post
      ));
    } catch (error) {
      console.error("Add comment error:", error);
      alert("Unable to add comment. Please try again.");
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await deletePost(postId);
      setPosts(prev => prev.filter(post => post._id !== postId));
      alert("Post deleted successfully!");
    } catch (error) {
      console.error("Delete post error:", error);
      alert("Unable to delete post. Please try again.");
    }
  };

  const handleBookmarkPost = async (postId) => {
    try {
      const result = await bookmarkPost(postId);
      setPosts(prev => prev.map(post => 
        post._id === postId 
          ? { ...post, isBookmarked: result.isBookmarked }
          : post
      ));
    } catch (error) {
      console.error("Bookmark post error:", error);
      alert("Unable to bookmark post. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)} 
              className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50"
            >
              <IoArrowBack className="w-6 h-6" />
            </button>
            <h1 className="text-3xl font-bold text-blue-900">All Posts</h1>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <IoRefresh className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <IoSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search posts by title, content, tags, or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Posts */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-blue-600 text-lg">
              {searchTerm ? 'No posts found matching your search.' : 'No posts available.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                onLike={handlePostLike}
                onShare={handlePostShare}
                onComment={handleAddComment}
                onDelete={handleDeletePost}
                onBookmark={handleBookmarkPost}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
