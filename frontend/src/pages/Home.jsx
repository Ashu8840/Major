import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import api from "../utils/api";
import {
  IoSparkles,
  IoBook,
  IoChatbubbles,
  IoStar,
  IoSearch,
  IoCreate,
  IoPeople,
  IoTrendingUp,
  IoStorefront,
  IoRocketOutline,
  IoFlame,
  IoHeart,
  IoTime,
  IoBulb,
  IoTrophyOutline,
  IoCalendarOutline,
  IoEyeOutline,
  IoArrowForwardOutline,
  IoCheckmarkCircleOutline,
  IoInfiniteOutline,
  IoStarOutline,
  IoLinkOutline,
  IoStatsChart,
  IoCloudOutline,
} from "react-icons/io5";

export default function Home() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [recentEntries, setRecentEntries] = useState([]);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dailyQuote, setDailyQuote] = useState("");
  const [streakData, setStreakData] = useState({ days: 7, mood: "positive" });
  const [userTier, setUserTier] = useState("free"); // free, pro

  useEffect(() => {
    async function loadDashboardData() {
      try {
        if (user) {
          const entriesRes = await api.get("/entries/mine?limit=3");
          setRecentEntries(entriesRes.data.slice(0, 3));
        }

        const postsRes = await api.get("/posts?limit=3");
        setCommunityPosts((postsRes.data.posts || postsRes.data).slice(0, 3));
        
        // Mock data for enhanced dashboard
        setDailyQuote("Write about a place that brings you peace 🌿");
        setStreakData({ days: 7, mood: "positive" });
        setUserTier(user?.tier || "free");
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user]);

  const userName = user?.username || user?.name || "Friend";
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";

  // Mock data for demonstration
  const mockRecentEntries = [
    { id: 1, title: "Morning Reflections", mood: "😊", date: "2025-01-08", preview: "Today I realized that happiness isn't about having everything perfect..." },
    { id: 2, title: "Weekend Adventures", mood: "🎉", date: "2025-01-07", preview: "Explored the city center and discovered a beautiful coffee shop..." },
    { id: 3, title: "Quiet Moments", mood: "😌", date: "2025-01-06", preview: "Sometimes the best therapy is a quiet moment with a good book..." }
  ];

  const mockTrendingPosts = [
    { id: 1, title: "The Art of Mindful Journaling", author: "Sarah M.", likes: 234, image: "📖" },
    { id: 2, title: "Finding Peace in Chaos", author: "Alex K.", likes: 189, image: "🌸" },
    { id: 3, title: "Digital Detox Journey", author: "Maya L.", likes: 156, image: "🌱" }
  ];

  const quickAccessItems = [
    { 
      icon: IoCreate, 
      title: "Write New Entry", 
      subtitle: "Capture today's thoughts",
      color: "from-blue-500 to-blue-600",
      path: "/diary/new"
    },
    { 
      icon: IoPeople, 
      title: "Community", 
      subtitle: "Explore shared stories",
      color: "from-purple-500 to-purple-600",
      path: "/community"
    },
    { 
      icon: IoTrendingUp, 
      title: "Analytics", 
      subtitle: "Track your progress",
      color: "from-green-500 to-green-600",
      path: "/analytics"
    },
    { 
      icon: IoStorefront, 
      title: "Marketplace", 
      subtitle: "Publish & explore books",
      color: "from-orange-500 to-orange-600",
      path: "/marketplace"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 space-y-8">
        
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative z-10 flex flex-col items-center text-center lg:flex-row lg:text-left">
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-center lg:justify-start space-x-2">
                <span className="text-4xl">🎉</span>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
                  {greeting}, {userName}!
                </h1>
              </div>
              <p className="text-xl text-blue-100 max-w-2xl">
                Your thoughts, your space — let's start writing today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  onClick={() => navigate("/diary/new")}
                  className="group flex items-center justify-center space-x-2 bg-white text-blue-700 px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105"
                >
                  <IoCreate className="w-5 h-5" />
                  <span>Start a New Entry</span>
                  <IoArrowForwardOutline className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => navigate("/diary")}
                  className="flex items-center justify-center space-x-2 border-2 border-white/30 text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition-all duration-300"
                >
                  <IoBook className="w-5 h-5" />
                  <span>View All Entries</span>
                </button>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="text-8xl opacity-30">📝</div>
            </div>
          </div>
          <div className="absolute top-4 right-4 flex items-center space-x-2 text-sm bg-white/20 rounded-full px-4 py-2">
            <IoFlame className="w-4 h-4 text-orange-300" />
            <span>{streakData.days} Day Streak!</span>
          </div>
        </div>

        {/* Quick Access Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickAccessItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                onClick={() => navigate(item.path)}
                className="group relative cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                <div className="relative bg-white/70 backdrop-blur-lg rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 group-hover:scale-105 border border-white/40">
                  <div className={`inline-flex p-4 rounded-xl bg-gradient-to-r ${item.color} text-white mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.subtitle}</p>
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <IoArrowForwardOutline className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column - Recent Activity, AI & Weekly Chart */}
          <div className="space-y-6">
            {/* Recent Activity Feed */}
            <div className="bg-white/70 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/40">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                  <IoTime className="w-6 h-6 text-blue-600" />
                  <span>Recent Activity</span>
                </h2>
                <button
                  onClick={() => navigate("/diary")}
                  className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
                >
                  <span>View All</span>
                  <IoArrowForwardOutline className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-4">
                {(recentEntries.length > 0 ? recentEntries : mockRecentEntries).map((entry, index) => (
                  <div key={entry._id || entry.id || `entry-${index}`} className="group p-4 rounded-xl bg-gradient-to-r from-blue-50/50 to-purple-50/50 hover:from-blue-50 hover:to-purple-50 transition-all duration-300 cursor-pointer">
                    <div className="flex items-start space-x-4">
                      <div className="text-2xl">{entry.mood}</div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                            {entry.title}
                          </h3>
                          <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-1">
                            {entry.date}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm line-clamp-2">
                          {entry.preview}
                        </p>
                      </div>
                      <IoArrowForwardOutline className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Assistant Card */}
            <div className="bg-white/70 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100/30 to-blue-100/30 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl">
                    <IoSparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">AI Assistant</h3>
                    <p className="text-sm text-gray-600">Ready to help</p>
                  </div>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-700">Writing Tips</span>
                    </div>
                    <span className="text-xs text-gray-500">Available</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">Story Ideas</span>
                    </div>
                    <span className="text-xs text-gray-500">Active</span>
                  </div>
                </div>
                
                <button
                  onClick={() => navigate("/diary/new")}
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2"
                >
                  <IoSparkles className="w-4 h-4" />
                  <span>Get AI Help</span>
                </button>
              </div>
            </div>

            {/* Writing Activity Chart */}
            <div className="bg-white/70 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-100/30 to-blue-100/30 rounded-full -translate-y-12 translate-x-12"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <IoTrendingUp className="w-5 h-5 text-green-500" />
                    <h3 className="text-xl font-bold text-gray-900">Weekly Activity</h3>
                  </div>
                  <span className="text-xs text-gray-500 bg-green-100 rounded-full px-2 py-1">Last 7 Days</span>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-end justify-between h-20 space-x-2">
                    <div className="flex flex-col items-center space-y-1">
                      <div className="w-6 bg-gradient-to-t from-blue-500 to-blue-300 rounded-t" style={{height: '60%'}}></div>
                      <span className="text-xs text-gray-500">Mon</span>
                    </div>
                    <div className="flex flex-col items-center space-y-1">
                      <div className="w-6 bg-gradient-to-t from-green-500 to-green-300 rounded-t" style={{height: '80%'}}></div>
                      <span className="text-xs text-gray-500">Tue</span>
                    </div>
                    <div className="flex flex-col items-center space-y-1">
                      <div className="w-6 bg-gradient-to-t from-purple-500 to-purple-300 rounded-t" style={{height: '45%'}}></div>
                      <span className="text-xs text-gray-500">Wed</span>
                    </div>
                    <div className="flex flex-col items-center space-y-1">
                      <div className="w-6 bg-gradient-to-t from-blue-500 to-blue-300 rounded-t" style={{height: '70%'}}></div>
                      <span className="text-xs text-gray-500">Thu</span>
                    </div>
                    <div className="flex flex-col items-center space-y-1">
                      <div className="w-6 bg-gradient-to-t from-green-500 to-green-300 rounded-t" style={{height: '90%'}}></div>
                      <span className="text-xs text-gray-500">Fri</span>
                    </div>
                    <div className="flex flex-col items-center space-y-1">
                      <div className="w-6 bg-gradient-to-t from-yellow-500 to-yellow-300 rounded-t" style={{height: '55%'}}></div>
                      <span className="text-xs text-gray-500">Sat</span>
                    </div>
                    <div className="flex flex-col items-center space-y-1">
                      <div className="w-6 bg-gradient-to-t from-purple-500 to-purple-300 rounded-t" style={{height: '85%'}}></div>
                      <span className="text-xs text-gray-500">Sun</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 text-center">
                    <div className="font-bold text-lg text-blue-600">156</div>
                    <div className="text-xs text-gray-600">Avg Words</div>
                  </div>
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-3 text-center">
                    <div className="font-bold text-lg text-green-600">5.2</div>
                    <div className="text-xs text-gray-600">Avg Min</div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-3 border border-yellow-200">
                  <div className="flex items-center space-x-2">
                    <div className="text-lg">📈</div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">Peak Day: Friday</div>
                      <div className="text-xs text-gray-600">Most productive writing day</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Progress & Upgrade */}
          <div className="space-y-6">
            {/* Your Progress Widget */}
            <div className="bg-white/70 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/40">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <IoTrophyOutline className="w-5 h-5 text-yellow-500" />
                <span>Your Progress</span>
              </h3>
              
              <div className="space-y-4">
                {/* Writing Streak */}
                <div className="text-center p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl">
                  <div className="text-3xl mb-2">🔥</div>
                  <div className="font-bold text-2xl text-gray-900">{streakData.days} Days</div>
                  <div className="text-sm text-gray-600">Writing Streak</div>
                </div>
                
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="font-bold text-lg text-blue-600">12</div>
                    <div className="text-xs text-gray-600">This Week</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="font-bold text-lg text-purple-600">2.1k</div>
                    <div className="text-xs text-gray-600">Words</div>
                  </div>
                </div>
                
                {/* Mood Grid */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm">Recent Moods</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                      <div className="text-lg">😊</div>
                      <div className="text-xs text-gray-600 mt-1">Happy</div>
                    </div>
                    <div className="text-center p-2 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors cursor-pointer">
                      <div className="text-lg">😐</div>
                      <div className="text-xs text-gray-600 mt-1">Neutral</div>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
                      <div className="text-lg">😢</div>
                      <div className="text-xs text-gray-600 mt-1">Sad</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Upgrade CTA */}
            <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 rounded-2xl p-8 shadow-lg text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative z-10">
                {userTier === "free" ? (
                  <>
                    <div className="flex items-center space-x-2 mb-4">
                      <IoRocketOutline className="w-6 h-6" />
                      <h3 className="text-xl font-bold">Upgrade to Pro</h3>
                    </div>
                    <p className="text-yellow-100 text-sm mb-5">
                      Unlock AI Assistant, unlimited entries, and premium features!
                    </p>
                    <div className="space-y-3 text-sm mb-5">
                      <div className="flex items-center space-x-2">
                        <IoCheckmarkCircleOutline className="w-4 h-4" />
                        <span>AI Writing Assistant</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <IoInfiniteOutline className="w-4 h-4" />
                        <span>Unlimited Entries</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <IoStarOutline className="w-4 h-4" />
                        <span>Premium Templates</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <IoCloudOutline className="w-4 h-4" />
                        <span>Cloud Sync</span>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate("/upgrade")}
                      className="w-full bg-white text-yellow-600 py-4 rounded-xl font-bold hover:shadow-lg transition-all duration-300 hover:scale-105"
                    >
                      Upgrade Now
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center space-x-2 mb-4">
                      <IoCheckmarkCircleOutline className="w-6 h-6" />
                      <h3 className="text-xl font-bold">Pro Member ✨</h3>
                    </div>
                    <p className="text-yellow-100 text-sm mb-5">
                      Thanks for being a Pro member!
                    </p>
                    <div className="bg-white/20 rounded-full p-2 mb-4">
                      <div className="bg-white rounded-full h-2 w-3/4"></div>
                    </div>
                    <p className="text-sm mb-3">23 days remaining</p>
                    <div className="text-xs text-yellow-100">
                      Enjoying all premium features
                    </div>
                  </>
                )}
              </div>
              <div className="absolute -top-4 -right-4 text-6xl opacity-20">🚀</div>
            </div>
          </div>
        </div>

        {/* Community Highlights */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/40">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <IoTrendingUp className="w-6 h-6 text-purple-600" />
              <span>Trending in Community</span>
            </h2>
            <button
              onClick={() => navigate("/community")}
              className="text-purple-600 hover:text-purple-700 font-medium flex items-center space-x-1"
            >
              <span>Explore More</span>
              <IoArrowForwardOutline className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {mockTrendingPosts.map((post, index) => (
              <div key={post.id} className="group cursor-pointer">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                  <div className="text-4xl mb-4 text-center">{post.image}</div>
                  <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-purple-700 transition-colors">
                    {post.title}
                  </h3>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>by {post.author}</span>
                    <div className="flex items-center space-x-1">
                      <IoHeart className="w-4 h-4 text-red-400" />
                      <span>{post.likes}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Inspiration */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 rounded-2xl p-8 shadow-2xl text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10 text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <IoBulb className="w-8 h-8 text-yellow-300" />
              <h2 className="text-2xl font-bold">Daily Inspiration</h2>
            </div>
            <p className="text-xl text-blue-100 mb-6 max-w-2xl mx-auto">
              "{dailyQuote}"
            </p>
            <button
              onClick={() => navigate("/diary/new")}
              className="bg-white text-blue-700 px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105 inline-flex items-center space-x-2"
            >
              <IoCreate className="w-5 h-5" />
              <span>Start Writing</span>
            </button>
          </div>
          <div className="absolute top-4 right-4 text-6xl opacity-20">✨</div>
        </div>

        {/* Footer */}
        <div className="text-center py-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row items-center justify-between max-w-4xl mx-auto space-y-4 md:space-y-0">
            <div className="flex space-x-6 text-sm text-gray-600">
              <a href="#" className="hover:text-blue-600 transition-colors">About</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Terms</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Privacy</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Contact</a>
            </div>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors">
                <IoLinkOutline className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors">
                <IoChatbubbles className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors">
                <IoHeart className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
