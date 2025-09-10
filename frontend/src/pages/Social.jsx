import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import {
  IoHeart,
  IoPeople,
  IoChatbubble,
  IoVideocam,
  IoTime,
  IoSearch,
  IoAdd,
  IoPerson,
  IoNotificationsOutline as IoNotifications,
  IoSend,
  IoMic,
  IoCall,
  IoSettings,
  IoStar,
  IoTrendingUp,
  IoHappy,
  IoSad,
  IoSunny,
  IoMoon,
  IoRainy,
  IoSnow,
} from "react-icons/io5";

export default function Social() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("friends");
  const [selectedMoodGroup, setSelectedMoodGroup] = useState("happy");
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data
  const friendsData = {
    followers: 234,
    following: 89,
    mutualFriends: 45,
    friendRequests: 12,
  };

  const friends = [
    {
      id: 1,
      name: "Luna_Writes",
      avatar: "🌙",
      status: "online",
      mood: "happy",
      lastSeen: "now",
      mutual: 12,
    },
    {
      id: 2,
      name: "Dream_Catcher",
      avatar: "✨",
      status: "online",
      mood: "creative",
      lastSeen: "2m ago",
      mutual: 8,
    },
    {
      id: 3,
      name: "Night_Writer",
      avatar: "🌃",
      status: "away",
      mood: "chill",
      lastSeen: "15m ago",
      mutual: 5,
    },
    {
      id: 4,
      name: "Story_Teller",
      avatar: "📖",
      status: "offline",
      mood: "neutral",
      lastSeen: "2h ago",
      mutual: 15,
    },
  ];

  const suggestedFriends = [
    {
      id: 5,
      name: "Mood_Tracker",
      avatar: "😊",
      commonInterests: ["Self-care", "Motivation"],
      mutualFriends: 7,
    },
    {
      id: 6,
      name: "Soul_Searcher",
      avatar: "🔮",
      commonInterests: ["Philosophy", "Deep thoughts"],
      mutualFriends: 3,
    },
    {
      id: 7,
      name: "Heart_Writer",
      avatar: "💝",
      commonInterests: ["Love", "Relationships"],
      mutualFriends: 9,
    },
  ];

  const activeChats = [
    {
      id: 1,
      name: "Writers Circle",
      type: "group",
      participants: 12,
      lastMessage: "Let's start tonight's session!",
      time: "5m ago",
      unread: 3,
    },
    {
      id: 2,
      name: "Luna_Writes",
      type: "private",
      lastMessage: "How was your writing today?",
      time: "10m ago",
      unread: 1,
    },
    {
      id: 3,
      name: "Motivation Squad",
      type: "group",
      participants: 8,
      lastMessage: "You got this! 💪",
      time: "1h ago",
      unread: 0,
    },
  ];

  const liveEvents = [
    {
      id: 1,
      title: "Evening Writing Session",
      host: "Dream_Catcher",
      participants: 24,
      time: "8:00 PM",
      type: "writing",
    },
    {
      id: 2,
      title: "Story Sharing Circle",
      host: "Story_Teller",
      participants: 15,
      time: "9:30 PM",
      type: "sharing",
    },
    {
      id: 3,
      title: "Meditation & Mindfulness",
      host: "Soul_Searcher",
      participants: 31,
      time: "10:00 PM",
      type: "wellness",
    },
  ];

  const moodGroups = [
    {
      id: "happy",
      name: "Happy Zone",
      emoji: "😀",
      color: "bg-yellow-400",
      members: 156,
      description: "Celebrating life's joys",
    },
    {
      id: "chill",
      name: "Chill Zone",
      emoji: "😌",
      color: "bg-blue-400",
      members: 98,
      description: "Relaxed and peaceful vibes",
    },
    {
      id: "creative",
      name: "Creative Flow",
      emoji: "🎨",
      color: "bg-purple-400",
      members: 134,
      description: "Artistic inspiration hub",
    },
    {
      id: "vent",
      name: "Vent Space",
      emoji: "😔",
      color: "bg-gray-400",
      members: 67,
      description: "Safe space to share struggles",
    },
    {
      id: "motivated",
      name: "Motivation Station",
      emoji: "🔥",
      color: "bg-red-400",
      members: 189,
      description: "Goal crushers unite",
    },
    {
      id: "thoughtful",
      name: "Deep Thinkers",
      emoji: "🤔",
      color: "bg-indigo-400",
      members: 78,
      description: "Philosophy & reflection",
    },
  ];

  const weeklySpotlight = {
    writer: {
      name: "Luna_Writes",
      avatar: "🌙",
      badge: "Writer of the Week",
      achievement: "50-day streak!",
    },
    milestone: {
      name: "Dream_Catcher",
      avatar: "✨",
      badge: "Milestone Master",
      achievement: "1000th entry!",
    },
    helper: {
      name: "Heart_Writer",
      avatar: "💝",
      badge: "Community Helper",
      achievement: "500 helpful comments",
    },
  };

  const tabs = [
    { id: "friends", name: "Friends", icon: <IoPeople className="w-5 h-5" /> },
    { id: "chat", name: "Chat", icon: <IoChatbubble className="w-5 h-5" /> },
    { id: "events", name: "Events", icon: <IoTime className="w-5 h-5" /> },
    {
      id: "groups",
      name: "Mood Groups",
      icon: <IoHeart className="w-5 h-5" />,
    },
    {
      id: "spotlight",
      name: "Spotlight",
      icon: <IoStar className="w-5 h-5" />,
    },
  ];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-blue-600">
          Please log in to access social features.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-blue-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <IoHeart className="w-8 h-8 text-red-500" />
            <h1 className="text-3xl font-bold text-blue-900">Social Hub</h1>
          </div>
          <p className="text-blue-600">
            Connect, share, and grow together with fellow writers
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

        {/* Friends Tab */}
        {activeTab === "friends" && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                <IoPeople className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-900">
                  {friendsData.followers}
                </div>
                <div className="text-sm text-blue-600">Followers</div>
              </div>
              <div className="bg-white rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                <IoHeart className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-900">
                  {friendsData.following}
                </div>
                <div className="text-sm text-blue-600">Following</div>
              </div>
              <div className="bg-white rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                <IoStar className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-900">
                  {friendsData.mutualFriends}
                </div>
                <div className="text-sm text-blue-600">Mutual Friends</div>
              </div>
              <div className="bg-white rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                <IoNotifications className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-900">
                  {friendsData.friendRequests}
                </div>
                <div className="text-sm text-blue-600">Friend Requests</div>
              </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="relative">
                <IoSearch className="w-5 h-5 text-blue-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search friends by name or interests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Friends List */}
              <div className="bg-white rounded-xl shadow-sm">
                <div className="p-4 border-b border-blue-100 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-blue-900">
                    Your Friends
                  </h3>
                  <button className="text-blue-600 hover:text-blue-700">
                    <IoAdd className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  {friends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="text-2xl">{friend.avatar}</div>
                          <div
                            className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                              friend.status === "online"
                                ? "bg-green-500"
                                : friend.status === "away"
                                ? "bg-yellow-500"
                                : "bg-gray-400"
                            }`}
                          ></div>
                        </div>
                        <div>
                          <p className="font-medium text-blue-900">
                            {friend.name}
                          </p>
                          <p className="text-xs text-blue-600">
                            {friend.mutual} mutual friends • {friend.lastSeen}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg">
                          <IoChatbubble className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg">
                          <IoCall className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested Friends */}
              <div className="bg-white rounded-xl shadow-sm">
                <div className="p-4 border-b border-blue-100">
                  <h3 className="text-lg font-semibold text-blue-900">
                    Suggested Friends
                  </h3>
                  <p className="text-sm text-blue-600">
                    Based on your interests and connections
                  </p>
                </div>
                <div className="p-4 space-y-3">
                  {suggestedFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className="p-3 border border-blue-100 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">{friend.avatar}</div>
                          <div>
                            <p className="font-medium text-blue-900">
                              {friend.name}
                            </p>
                            <p className="text-xs text-blue-600">
                              {friend.mutualFriends} mutual friends
                            </p>
                          </div>
                        </div>
                        <button className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-colors">
                          Follow
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {friend.commonInterests.map((interest, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === "chat" && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Chat List */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b border-blue-100">
                <h3 className="text-lg font-semibold text-blue-900">
                  Messages
                </h3>
              </div>
              <div className="p-2">
                {activeChats.map((chat) => (
                  <div
                    key={chat.id}
                    className="p-3 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <div className="text-lg">
                          {chat.type === "group" ? "👥" : "💬"}
                        </div>
                        <p className="font-medium text-blue-900">{chat.name}</p>
                      </div>
                      {chat.unread > 0 && (
                        <div className="bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                          {chat.unread}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-blue-600 truncate">
                      {chat.lastMessage}
                    </p>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-blue-400">{chat.time}</p>
                      {chat.type === "group" && (
                        <p className="text-xs text-blue-400">
                          {chat.participants} members
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Window */}
            <div
              className="lg:col-span-2 bg-white rounded-xl shadow-sm flex flex-col"
              style={{ height: "500px" }}
            >
              <div className="p-4 border-b border-blue-100 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-xl">💬</div>
                  <div>
                    <p className="font-semibold text-blue-900">Luna_Writes</p>
                    <p className="text-sm text-green-500">● Online</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg">
                    <IoCall className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg">
                    <IoVideocam className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg">
                    <IoSettings className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 p-4 overflow-y-auto bg-blue-25">
                <div className="space-y-4">
                  <div className="flex items-start space-x-2">
                    <div className="text-lg">🌙</div>
                    <div className="bg-blue-100 rounded-lg p-3 max-w-xs">
                      <p className="text-blue-900">
                        Hey! How was your writing session today?
                      </p>
                      <p className="text-xs text-blue-500 mt-1">2:30 PM</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2 justify-end">
                    <div className="bg-blue-600 text-white rounded-lg p-3 max-w-xs">
                      <p>
                        It was amazing! Wrote 800 words about my morning walk.
                        The inspiration just flowed! ✨
                      </p>
                      <p className="text-xs text-blue-200 mt-1">2:32 PM</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <div className="text-lg">🌙</div>
                    <div className="bg-blue-100 rounded-lg p-3 max-w-xs">
                      <p className="text-blue-900">
                        That's wonderful! I love how nature can spark
                        creativity. Want to join tonight's writing circle?
                      </p>
                      <p className="text-xs text-blue-500 mt-1">2:35 PM</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-blue-100">
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg">
                    <IoMic className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors">
                    <IoSend className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === "events" && (
          <div className="space-y-6">
            {/* Live Events */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b border-blue-100">
                <h3 className="text-lg font-semibold text-blue-900">
                  🔴 Live Events
                </h3>
                <p className="text-sm text-blue-600">Join ongoing sessions</p>
              </div>
              <div className="p-4 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {liveEvents.map((event) => (
                  <div
                    key={event.id}
                    className="border border-blue-100 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-red-600">
                          LIVE
                        </span>
                      </div>
                      <span className="text-sm text-blue-600">
                        {event.participants} joined
                      </span>
                    </div>
                    <h4 className="font-semibold text-blue-900 mb-1">
                      {event.title}
                    </h4>
                    <p className="text-sm text-blue-600 mb-3">
                      Hosted by {event.host}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-500">
                        {event.time}
                      </span>
                      <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
                        Join Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Events */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b border-blue-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">
                    📅 Upcoming Events
                  </h3>
                  <p className="text-sm text-blue-600">
                    Schedule and upcoming sessions
                  </p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
                  Create Event
                </button>
              </div>
              <div className="p-4">
                <div className="text-center py-8 text-blue-500">
                  <IoTime className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No upcoming events scheduled</p>
                  <p className="text-sm">Be the first to create one!</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mood Groups Tab */}
        {activeTab === "groups" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-blue-900 mb-2">
                Join Mood-Based Communities
              </h3>
              <p className="text-blue-600 mb-6">
                Connect with writers who share your current vibe
              </p>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {moodGroups.map((group) => (
                  <div
                    key={group.id}
                    className="border border-blue-100 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-12 h-12 ${group.color} rounded-full flex items-center justify-center text-xl`}
                        >
                          {group.emoji}
                        </div>
                        <div>
                          <h4 className="font-semibold text-blue-900">
                            {group.name}
                          </h4>
                          <p className="text-sm text-blue-600">
                            {group.members} members
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-blue-700 mb-4">
                      {group.description}
                    </p>
                    <button className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
                      Join Group
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Spotlight Tab */}
        {activeTab === "spotlight" && (
          <div className="space-y-6">
            {/* Weekly Spotlight */}
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-6 text-white shadow-lg">
              <h3 className="text-2xl font-bold mb-2">
                ✨ Weekly Community Spotlight
              </h3>
              <p className="opacity-90">
                Celebrating our amazing writers and their achievements
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Writer of the Week */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="bg-blue-600 p-4 text-white text-center">
                  <IoStar className="w-8 h-8 mx-auto mb-2" />
                  <h4 className="font-semibold">Writer of the Week</h4>
                </div>
                <div className="p-6 text-center">
                  <div className="text-4xl mb-3">
                    {weeklySpotlight.writer.avatar}
                  </div>
                  <h5 className="font-semibold text-blue-900 mb-1">
                    {weeklySpotlight.writer.name}
                  </h5>
                  <p className="text-blue-600 mb-3">
                    {weeklySpotlight.writer.achievement}
                  </p>
                  <button className="text-blue-500 text-sm hover:text-blue-700">
                    View Profile →
                  </button>
                </div>
              </div>

              {/* Milestone Master */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="bg-green-600 p-4 text-white text-center">
                  <IoTrendingUp className="w-8 h-8 mx-auto mb-2" />
                  <h4 className="font-semibold">Milestone Master</h4>
                </div>
                <div className="p-6 text-center">
                  <div className="text-4xl mb-3">
                    {weeklySpotlight.milestone.avatar}
                  </div>
                  <h5 className="font-semibold text-blue-900 mb-1">
                    {weeklySpotlight.milestone.name}
                  </h5>
                  <p className="text-blue-600 mb-3">
                    {weeklySpotlight.milestone.achievement}
                  </p>
                  <button className="text-blue-500 text-sm hover:text-blue-700">
                    View Profile →
                  </button>
                </div>
              </div>

              {/* Community Helper */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="bg-red-600 p-4 text-white text-center">
                  <IoHeart className="w-8 h-8 mx-auto mb-2" />
                  <h4 className="font-semibold">Community Helper</h4>
                </div>
                <div className="p-6 text-center">
                  <div className="text-4xl mb-3">
                    {weeklySpotlight.helper.avatar}
                  </div>
                  <h5 className="font-semibold text-blue-900 mb-1">
                    {weeklySpotlight.helper.name}
                  </h5>
                  <p className="text-blue-600 mb-3">
                    {weeklySpotlight.helper.achievement}
                  </p>
                  <button className="text-blue-500 text-sm hover:text-blue-700">
                    View Profile →
                  </button>
                </div>
              </div>
            </div>

            {/* Nomination Section */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">
                🗳️ Nominate Someone
              </h3>
              <p className="text-blue-600 mb-4">
                Know someone who deserves recognition? Nominate them for next
                week's spotlight!
              </p>
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                Submit Nomination
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
