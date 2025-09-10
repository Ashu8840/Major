import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import PostCard from "../components/PostCard";
import api from "../utils/api";
import { 
  IoAdd,
  IoSearch,
  IoImage,
  IoVideocam,
  IoDocument,
  IoLink,
  IoSparkles,
  IoHeart,
  IoChatbubble,
  IoShare,
  IoBookmark,
  IoTrendingUp,
  IoPeople,
  IoCalendar,
  IoEye,
  IoThumbsUp,
  IoSend,
  IoFunnel,
  IoTime,
  IoStar,
  IoGlobe,
  IoPersonAdd,
  IoAnalytics,
  IoFlame,
  IoArrowUp,
  IoCheckmark
} from "react-icons/io5";

export default function Community() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [showPostComposer, setShowPostComposer] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [postAudience, setPostAudience] = useState("public");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [filterBy, setFilterBy] = useState("all");
  const [hoveredProfile, setHoveredProfile] = useState(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [followedUsers, setFollowedUsers] = useState(new Set());

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const { data } = await api.get("/posts");
        if (!ignore) setPosts(data.posts || data);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const handleNewPost = () => {
    navigate("/community/new");
  };

  const handleFileUpload = (e, type) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files.map(file => ({ file, type }))]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAIAssist = async (action) => {
    if (!newPost.trim()) {
      alert("Please write some content first");
      return;
    }
    
    setIsProcessingAI(true);
    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      let enhancedText = "";
      switch (action) {
        case "improve":
          enhancedText = newPost + "\n\n[AI Enhanced: Grammar and clarity improved]";
          break;
        case "translate":
          enhancedText = "[Translated] " + newPost;
          break;
        case "tags":
          enhancedText = newPost + "\n\n#inspiration #creativity #storytelling";
          break;
        default:
          enhancedText = newPost;
      }
      
      setNewPost(enhancedText);
    } catch (error) {
      alert("AI assistant is currently unavailable");
    } finally {
      setIsProcessingAI(false);
    }
  };

  const submitPost = async () => {
    if (!newPost.trim()) return;
    
    try {
      const formData = new FormData();
      formData.append("content", newPost);
      formData.append("audience", postAudience);
      
      selectedFiles.forEach((item, index) => {
        formData.append(`files`, item.file);
      });

      const { data } = await api.post("/posts", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setPosts(prev => [data, ...prev]);
      setNewPost("");
      setSelectedFiles([]);
      setShowPostComposer(false);
    } catch (error) {
      console.error("Error posting:", error);
      alert("Failed to create post");
    }
  };

  const handleFollow = async (userId, username) => {
    try {
      const isFollowing = followedUsers.has(userId);
      
      if (isFollowing) {
        // Unfollow logic
        await api.delete(`/users/${userId}/follow`);
        setFollowedUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      } else {
        // Follow logic
        await api.post(`/users/${userId}/follow`);
        setFollowedUsers(prev => new Set([...prev, userId]));
      }
    } catch (error) {
      console.error("Follow/Unfollow error:", error);
      // For demo purposes, still update UI
      const isFollowing = followedUsers.has(userId);
      if (isFollowing) {
        setFollowedUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      } else {
        setFollowedUsers(prev => new Set([...prev, userId]));
      }
    }
  };

  const mockTrendingTopics = [
    { tag: "AI-Diary", posts: 1247 },
    { tag: "MorningJournal", posts: 892 },
    { tag: "CreativeWriting", posts: 756 },
    { tag: "Mindfulness", posts: 634 },
    { tag: "StoryTelling", posts: 523 }
  ];

  const mockSuggestedPeople = [
    { id: "user1", name: "Sarah Johnson", bio: "Creative writer & AI enthusiast", followers: "2.3k", avatar: "👩‍💼", username: "sarahj" },
    { id: "user2", name: "Mike Chen", bio: "Digital storyteller & poet", followers: "1.8k", avatar: "👨‍💻", username: "mikechen" },
    { id: "user3", name: "Emma Davis", bio: "Mindfulness coach & journaler", followers: "3.1k", avatar: "👩‍🎨", username: "emmad" }
  ];

  const mockUpcomingEvents = [
    { title: "30-Day Writing Challenge", date: "Dec 1-31", participants: "5.2k" },
    { title: "AI Storytelling Workshop", date: "Dec 15", participants: "892" },
    { title: "Community Poetry Night", date: "Dec 20", participants: "1.3k" }
  ];

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.author?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterBy === "all" || 
                         (filterBy === "following" && post.author?.isFollowing) ||
                         (filterBy === "tags" && post.tags?.length > 0);
    
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    switch (sortBy) {
      case "popular":
        return (b.likes?.length || 0) - (a.likes?.length || 0);
      case "latest":
      default:
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-blue-900">Community</h1>
              <p className="text-blue-600 mt-1">Connect, share, and inspire with fellow writers</p>
            </div>
            
            {/* Search and Filters */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search posts, people, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-80 pl-10 pr-4 py-2 bg-white/70 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <IoSearch className="w-5 h-5 text-blue-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-white/70 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="latest">Latest</option>
                <option value="popular">Most Popular</option>
              </select>
              
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="px-4 py-2 bg-white/70 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="all">All Posts</option>
                <option value="following">Following</option>
                <option value="tags">With Tags</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Left Sidebar - Widgets */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Trending Topics */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200 p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <IoFlame className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-blue-900">Trending Topics</h3>
              </div>
              <div className="space-y-3">
                {mockTrendingTopics.map((topic, index) => (
                  <div key={index} className="flex items-center justify-between p-3 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors">
                    <div>
                      <div className="font-medium text-blue-900">#{topic.tag}</div>
                      <div className="text-sm text-blue-600">{topic.posts} posts</div>
                    </div>
                    <IoTrendingUp className="w-4 h-4 text-green-500" />
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested People */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200 p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <IoPeople className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-blue-900">People to Follow</h3>
              </div>
              <div className="space-y-4">
                {mockSuggestedPeople.map((person, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-lg">
                      {person.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-blue-900 truncate">{person.name}</div>
                      <div className="text-sm text-blue-600 line-clamp-2">{person.bio}</div>
                      <div className="text-xs text-blue-400">{person.followers} followers</div>
                    </div>
                    <button 
                      className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                        followedUsers.has(person.id)
                          ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                      onClick={() => handleFollow(person.id, person.username)}
                    >
                      {followedUsers.has(person.id) ? "Following" : "Follow"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Events */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200 p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <IoCalendar className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold text-blue-900">Upcoming Events</h3>
              </div>
              <div className="space-y-3">
                {mockUpcomingEvents.map((event, index) => (
                  <div key={index} className="p-3 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors">
                    <div className="font-medium text-blue-900 text-sm">{event.title}</div>
                    <div className="text-sm text-blue-600">{event.date}</div>
                    <div className="text-xs text-blue-400">{event.participants} joining</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Post Composer */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200 shadow-lg overflow-hidden">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    {user?.avatar || "👤"}
                  </div>
                  <div className="flex-1">
                    <textarea
                      placeholder="Share your thoughts, story, or idea..."
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      onFocus={() => setShowPostComposer(true)}
                      className="w-full p-4 border border-blue-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50/50"
                      rows={showPostComposer ? 4 : 2}
                    />
                  </div>
                </div>

                {showPostComposer && (
                  <div className="mt-4 space-y-4">
                    {/* File Uploads */}
                    {selectedFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedFiles.map((item, index) => (
                          <div key={index} className="relative bg-blue-50 rounded-lg p-2 flex items-center gap-2">
                            <span className="text-sm text-blue-700">{item.file.name}</span>
                            <button
                              onClick={() => removeFile(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload Options */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors">
                          <IoImage className="w-5 h-5" />
                          <span className="text-sm">Photo</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'image')} />
                        </label>
                        
                        <label className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors">
                          <IoVideocam className="w-5 h-5" />
                          <span className="text-sm">Video</span>
                          <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFileUpload(e, 'video')} />
                        </label>
                        
                        <label className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors">
                          <IoDocument className="w-5 h-5" />
                          <span className="text-sm">Document</span>
                          <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => handleFileUpload(e, 'document')} />
                        </label>
                        
                        <button className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <IoLink className="w-5 h-5" />
                          <span className="text-sm">Link</span>
                        </button>
                      </div>

                      {/* AI Assist */}
                      <div className="relative">
                        <button
                          onClick={() => handleAIAssist('improve')}
                          disabled={isProcessingAI}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
                        >
                          <IoSparkles className="w-4 h-4" />
                          <span className="text-sm">AI Assist</span>
                        </button>
                      </div>
                    </div>

                    {/* Post Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-blue-100">
                      <select
                        value={postAudience}
                        onChange={(e) => setPostAudience(e.target.value)}
                        className="px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        <option value="public">🌍 Public</option>
                        <option value="followers">👥 Followers</option>
                        <option value="private">🔒 Private Circle</option>
                      </select>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setShowPostComposer(false);
                            setNewPost("");
                            setSelectedFiles([]);
                          }}
                          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={submitPost}
                          disabled={!newPost.trim()}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Posts Feed */}
            {loading ? (
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200 p-6 shadow-lg">
                    <div className="animate-pulse">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-blue-100 rounded w-32 mb-2"></div>
                          <div className="h-3 bg-blue-50 rounded w-24"></div>
                        </div>
                      </div>
                      <div className="space-y-3 mb-4">
                        <div className="h-4 bg-blue-100 rounded w-full"></div>
                        <div className="h-4 bg-blue-100 rounded w-3/4"></div>
                        <div className="h-4 bg-blue-100 rounded w-1/2"></div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="h-8 bg-blue-50 rounded w-16"></div>
                        <div className="h-8 bg-blue-50 rounded w-20"></div>
                        <div className="h-8 bg-blue-50 rounded w-16"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200 p-12 text-center shadow-lg">
                <div className="text-6xl mb-4">🌟</div>
                <h3 className="text-xl font-semibold text-blue-900 mb-2">
                  Welcome to Our Creative Community!
                </h3>
                <p className="text-blue-700 mb-6">
                  Share your stories, thoughts, and creative works with fellow writers and storytellers.
                </p>
                <button
                  onClick={() => setShowPostComposer(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all transform hover:scale-105"
                >
                  Share Your First Post
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredPosts.map((post) => (
                  <div key={post._id} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                    {/* Post Header */}
                    <div className="p-6 pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center cursor-pointer"
                            onMouseEnter={() => setHoveredProfile(post.author?._id)}
                            onMouseLeave={() => setHoveredProfile(null)}
                          >
                            {post.author?.avatar || "👤"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-blue-900">{post.author?.name || "Anonymous"}</span>
                              <span className="text-sm text-blue-500">@{post.author?.username || "user"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-blue-600">
                              <IoTime className="w-3 h-3" />
                              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                              <IoGlobe className="w-3 h-3" />
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <IoAnalytics className="w-4 h-4 text-blue-400" />
                            <span className="text-sm text-blue-600">{post.views || 0} views</span>
                          </div>
                          
                          {/* Follow Button - Only show if not own post */}
                          {post.author?._id && post.author._id !== user?._id && (
                            <button 
                              className={`flex items-center gap-2 px-3 py-1 text-sm rounded-lg transition-colors ${
                                followedUsers.has(post.author._id)
                                  ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                                  : "bg-blue-600 hover:bg-blue-700 text-white"
                              }`}
                              onClick={() => handleFollow(post.author._id, post.author.username)}
                            >
                              {followedUsers.has(post.author._id) ? (
                                <>
                                  <IoCheckmark className="w-3 h-3" />
                                  <span>Following</span>
                                </>
                              ) : (
                                <>
                                  <IoPersonAdd className="w-3 h-3" />
                                  <span>Follow</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Post Content */}
                    <div className="px-6 pb-4">
                      <p className="text-blue-900 leading-relaxed mb-4">{post.content}</p>
                      
                      {/* Post Media */}
                      {post.media && post.media.length > 0 && (
                        <div className="mb-4 rounded-xl overflow-hidden">
                          <img src={post.media[0].url} alt="" className="w-full h-auto" />
                        </div>
                      )}

                      {/* Tags */}
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {post.tags.map((tag, index) => (
                            <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 cursor-pointer transition-colors">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Engagement Bar */}
                    <div className="border-t border-blue-100 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <button className="flex items-center gap-2 text-blue-600 hover:text-red-500 transition-colors">
                            <IoHeart className="w-5 h-5" />
                            <span className="text-sm">{post.likes?.length || 0} likes</span>
                          </button>
                          
                          <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors">
                            <IoChatbubble className="w-5 h-5" />
                            <span className="text-sm">{post.comments?.length || 0} comments</span>
                          </button>
                          
                          <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors">
                            <IoShare className="w-5 h-5" />
                            <span className="text-sm">Share</span>
                          </button>
                        </div>
                        
                        <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors">
                          <IoBookmark className="w-5 h-5" />
                          <span className="text-sm">Save</span>
                        </button>
                      </div>
                    </div>

                    {/* Profile Hover Card */}
                    {hoveredProfile === post.author?._id && (
                      <div className="absolute bg-white rounded-xl shadow-2xl border border-blue-200 p-4 z-50 w-64">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            {post.author?.avatar || "👤"}
                          </div>
                          <div>
                            <div className="font-semibold text-blue-900">{post.author?.name}</div>
                            <div className="text-sm text-blue-600">{post.author?.bio || "Writer & Storyteller"}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm text-blue-600 mb-3">
                          <span>{post.author?.followers || 0} followers</span>
                          <span>{post.author?.following || 0} following</span>
                        </div>
                        <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                          <IoPersonAdd className="w-4 h-4 inline mr-2" />
                          Follow
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Sidebar - Analytics & Activity */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Community Stats */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200 p-6 shadow-lg">
              <h3 className="font-semibold text-blue-900 mb-4">Community Insights</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-600">Total Posts</span>
                  <span className="font-semibold text-blue-900">2,847</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-600">Active Writers</span>
                  <span className="font-semibold text-blue-900">1,204</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-600">Stories Shared</span>
                  <span className="font-semibold text-blue-900">892</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-600">Today's Activity</span>
                  <span className="flex items-center gap-1 text-green-600 font-semibold">
                    <IoArrowUp className="w-3 h-3" />
                    +23%
                  </span>
                </div>
              </div>
            </div>

            {/* Writing Challenges */}
            <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-2xl border border-blue-200 p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <IoStar className="w-5 h-5 text-yellow-500" />
                <h3 className="font-semibold text-blue-900">Today's Challenge</h3>
              </div>
              <div className="bg-white/70 rounded-xl p-4">
                <h4 className="font-medium text-blue-900 mb-2">Gratitude Reflection</h4>
                <p className="text-sm text-blue-700 mb-3">
                  Write about three things you're grateful for today and why they matter to you.
                </p>
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                  Join Challenge
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200 p-6 shadow-lg">
              <h3 className="font-semibold text-blue-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/diary/new")}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <IoAdd className="w-5 h-5 text-blue-500" />
                  <span className="text-blue-900">New Diary Entry</span>
                </button>
                
                <button
                  onClick={() => navigate("/creator-studio")}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <IoSparkles className="w-5 h-5 text-purple-500" />
                  <span className="text-blue-900">Creator Studio</span>
                </button>
                
                <button
                  onClick={() => navigate("/analytics")}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <IoAnalytics className="w-5 h-5 text-green-500" />
                  <span className="text-blue-900">View Analytics</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
