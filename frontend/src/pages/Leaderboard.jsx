import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import {
  IoTrophy,
  IoFlame,
  IoPencil,
  IoHeart,
  IoChatbubble,
  IoStar,
  IoTime,
  IoRocket,
  IoLeaf,
  IoFlash,
  IoRose,
  IoPlanet,
  IoInfinite,
  IoMedal,
  IoGift,
} from "react-icons/io5";

export default function Leaderboard() {
  const { user } = useContext(AuthContext);
  const [selectedCategory, setSelectedCategory] = useState("global");
  const [selectedPeriod, setSelectedPeriod] = useState("all-time");

  // Mock data for leaderboards
  const globalLeaders = [
    {
      rank: 1,
      name: "Luna_Writes",
      avatar: "🌙",
      level: 47,
      xp: 23450,
      entries: 245,
      streak: 89,
      engagement: 1250,
      badge: "🏆 Legend",
    },
    {
      rank: 2,
      name: "Diary_Master",
      avatar: "📚",
      level: 43,
      xp: 21200,
      entries: 198,
      streak: 67,
      engagement: 980,
      badge: "👑 Elite",
    },
    {
      rank: 3,
      name: "Mood_Tracker",
      avatar: "😊",
      level: 41,
      xp: 19800,
      entries: 167,
      streak: 45,
      engagement: 856,
      badge: "⭐ Pro",
    },
    {
      rank: 4,
      name: "Dream_Catcher",
      avatar: "✨",
      level: 38,
      xp: 18500,
      entries: 145,
      streak: 34,
      engagement: 723,
      badge: "💎 Expert",
    },
    {
      rank: 5,
      name: "Story_Teller",
      avatar: "📖",
      level: 36,
      xp: 17200,
      entries: 134,
      streak: 28,
      engagement: 645,
      badge: "🔥 Rising",
    },
    {
      rank: 6,
      name: "Night_Writer",
      avatar: "🌃",
      level: 34,
      xp: 16100,
      entries: 123,
      streak: 22,
      engagement: 567,
      badge: "🌟 Active",
    },
    {
      rank: 7,
      name: "Soul_Searcher",
      avatar: "🔮",
      level: 32,
      xp: 15000,
      entries: 112,
      streak: 19,
      engagement: 489,
      badge: "💫 Dedicated",
    },
    {
      rank: 8,
      name: "Heart_Writer",
      avatar: "💝",
      level: 30,
      xp: 14200,
      entries: 98,
      streak: 15,
      engagement: 412,
      badge: "🎯 Focused",
    },
  ];

  const themeLeaders = {
    jungle: [
      {
        rank: 1,
        name: "Forest_Explorer",
        avatar: "🌿",
        entries: 89,
        specialty: "Nature Chronicles",
        xp: 8900,
      },
      {
        rank: 2,
        name: "Wild_Heart",
        avatar: "🦋",
        entries: 76,
        specialty: "Adventure Tales",
        xp: 7600,
      },
      {
        rank: 3,
        name: "Tree_Whisperer",
        avatar: "🌳",
        entries: 64,
        specialty: "Eco Warrior",
        xp: 6400,
      },
    ],
    cyberpunk: [
      {
        rank: 1,
        name: "Neon_Dreams",
        avatar: "⚡",
        entries: 67,
        specialty: "Future Visions",
        xp: 6700,
      },
      {
        rank: 2,
        name: "Digital_Soul",
        avatar: "🤖",
        entries: 54,
        specialty: "Tech Philosophy",
        xp: 5400,
      },
      {
        rank: 3,
        name: "Cyber_Poet",
        avatar: "💻",
        entries: 43,
        specialty: "Code & Heart",
        xp: 4300,
      },
    ],
    barbie: [
      {
        rank: 1,
        name: "Pink_Positivity",
        avatar: "💕",
        entries: 92,
        specialty: "Motivation Master",
        xp: 9200,
      },
      {
        rank: 2,
        name: "Dream_Big",
        avatar: "✨",
        entries: 78,
        specialty: "Self-Love Guru",
        xp: 7800,
      },
      {
        rank: 3,
        name: "Sparkle_Queen",
        avatar: "👑",
        entries: 65,
        specialty: "Confidence Boost",
        xp: 6500,
      },
    ],
    mars: [
      {
        rank: 1,
        name: "Red_Planet",
        avatar: "🔴",
        entries: 71,
        specialty: "Space Explorer",
        xp: 7100,
      },
      {
        rank: 2,
        name: "Martian_Mind",
        avatar: "👽",
        entries: 58,
        specialty: "Innovation Hub",
        xp: 5800,
      },
      {
        rank: 3,
        name: "Cosmic_Thinker",
        avatar: "🚀",
        entries: 47,
        specialty: "Future Builder",
        xp: 4700,
      },
    ],
    space: [
      {
        rank: 1,
        name: "Starlight",
        avatar: "⭐",
        entries: 83,
        specialty: "Philosophy Deep",
        xp: 8300,
      },
      {
        rank: 2,
        name: "Galaxy_Mind",
        avatar: "🌌",
        entries: 69,
        specialty: "Cosmic Thoughts",
        xp: 6900,
      },
      {
        rank: 3,
        name: "Universe_Soul",
        avatar: "🌠",
        entries: 56,
        specialty: "Existential",
        xp: 5600,
      },
    ],
  };

  const seasonalContest = {
    title: "September Motivation Masters 🍂",
    description: "Most inspiring entries this month",
    timeLeft: "12 days left",
    prize: "Golden Quill Badge + Featured Post",
    participants: 1247,
    leaders: [
      {
        rank: 1,
        name: "Hope_Bringer",
        avatar: "🌅",
        score: 892,
        entry: "Turn Your Autumn Into Art",
      },
      {
        rank: 2,
        name: "Courage_Writer",
        avatar: "🦁",
        score: 756,
        entry: "September Strength Stories",
      },
      {
        rank: 3,
        name: "Joy_Creator",
        avatar: "🌈",
        score: 634,
        entry: "Finding Light in Dark Days",
      },
    ],
  };

  const categories = [
    {
      id: "global",
      name: "Global Rankings",
      icon: <IoTrophy className="w-5 h-5" />,
    },
    {
      id: "themes",
      name: "Theme Masters",
      icon: <IoStar className="w-5 h-5" />,
    },
    {
      id: "seasonal",
      name: "Seasonal Contest",
      icon: <IoGift className="w-5 h-5" />,
    },
    {
      id: "collaboration",
      name: "Collaboration",
      icon: <IoHeart className="w-5 h-5" />,
    },
  ];

  const themeCategories = [
    {
      id: "jungle",
      name: "Jungle Writers",
      icon: <IoLeaf className="w-5 h-5 text-green-500" />,
      emoji: "🌳",
    },
    {
      id: "cyberpunk",
      name: "Cyberpunk",
      icon: <IoFlash className="w-5 h-5 text-purple-500" />,
      emoji: "⚡",
    },
    {
      id: "barbie",
      name: "Barbie",
      icon: <IoRose className="w-5 h-5 text-pink-500" />,
      emoji: "💕",
    },
    {
      id: "mars",
      name: "Mars",
      icon: <IoRocket className="w-5 h-5 text-red-500" />,
      emoji: "🔥",
    },
    {
      id: "space",
      name: "Space",
      icon: <IoPlanet className="w-5 h-5 text-indigo-500" />,
      emoji: "🌌",
    },
  ];

  const [selectedTheme, setSelectedTheme] = useState("jungle");

  const getRankColor = (rank) => {
    switch (rank) {
      case 1:
        return "text-yellow-500";
      case 2:
        return "text-gray-400";
      case 3:
        return "text-amber-600";
      default:
        return "text-blue-600";
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <IoTrophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <IoMedal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <IoMedal className="w-6 h-6 text-amber-600" />;
      default:
        return (
          <span className="w-6 h-6 flex items-center justify-center text-blue-600 font-bold">
            #{rank}
          </span>
        );
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-blue-600">Please log in to view the leaderboard.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-blue-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <IoTrophy className="w-8 h-8 text-yellow-500" />
            <h1 className="text-3xl font-bold text-blue-900">Leaderboard</h1>
          </div>
          <p className="text-blue-600">
            Compete with writers worldwide and climb the ranks!
          </p>

          {/* Your Current Rank */}
          <div className="mt-4 p-4 bg-white rounded-xl border-2 border-blue-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">👤</div>
                <div>
                  <p className="font-semibold text-blue-900">
                    Your Current Rank
                  </p>
                  <p className="text-blue-600">#47 • Level 23 • 12,450 XP</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-600">Next Level</p>
                <div className="w-32 bg-blue-100 rounded-full h-2 mt-1">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: "67%" }}
                  ></div>
                </div>
                <p className="text-xs text-blue-500 mt-1">670/1000 XP</p>
              </div>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mb-6 bg-white rounded-xl p-2 shadow-sm">
          <div className="flex space-x-1 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-blue-600 hover:bg-blue-50"
                }`}
              >
                {category.icon}
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Global Rankings */}
        {selectedCategory === "global" && (
          <div className="space-y-6">
            {/* Period Selector */}
            <div className="flex space-x-2">
              {["all-time", "this-month", "this-week"].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedPeriod === period
                      ? "bg-blue-600 text-white"
                      : "bg-white text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  {period
                    .replace("-", " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </button>
              ))}
            </div>

            {/* Top 3 Podium */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-blue-900 mb-6 text-center">
                🏆 Hall of Fame
              </h2>
              <div className="flex items-end justify-center space-x-4 mb-6">
                {/* 2nd Place */}
                <div className="text-center">
                  <div className="bg-gray-100 rounded-xl p-4 mb-2 relative">
                    <div className="text-4xl mb-2">
                      {globalLeaders[1].avatar}
                    </div>
                    <IoMedal className="w-8 h-8 text-gray-400 mx-auto absolute -top-2 -right-2" />
                  </div>
                  <p className="font-semibold text-blue-900">
                    {globalLeaders[1].name}
                  </p>
                  <p className="text-sm text-blue-600">
                    Level {globalLeaders[1].level}
                  </p>
                  <p className="text-xs text-blue-500">
                    {globalLeaders[1].xp.toLocaleString()} XP
                  </p>
                </div>

                {/* 1st Place */}
                <div className="text-center">
                  <div className="bg-yellow-50 rounded-xl p-6 mb-2 relative border-2 border-yellow-300">
                    <div className="text-5xl mb-2">
                      {globalLeaders[0].avatar}
                    </div>
                    <IoTrophy className="w-10 h-10 text-yellow-500 mx-auto absolute -top-3 -right-3" />
                  </div>
                  <p className="font-bold text-blue-900 text-lg">
                    {globalLeaders[0].name}
                  </p>
                  <p className="text-blue-600">
                    Level {globalLeaders[0].level}
                  </p>
                  <p className="text-sm text-blue-500">
                    {globalLeaders[0].xp.toLocaleString()} XP
                  </p>
                  <div className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs mt-2">
                    👑 Champion
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="text-center">
                  <div className="bg-amber-50 rounded-xl p-4 mb-2 relative">
                    <div className="text-4xl mb-2">
                      {globalLeaders[2].avatar}
                    </div>
                    <IoMedal className="w-8 h-8 text-amber-600 mx-auto absolute -top-2 -right-2" />
                  </div>
                  <p className="font-semibold text-blue-900">
                    {globalLeaders[2].name}
                  </p>
                  <p className="text-sm text-blue-600">
                    Level {globalLeaders[2].level}
                  </p>
                  <p className="text-xs text-blue-500">
                    {globalLeaders[2].xp.toLocaleString()} XP
                  </p>
                </div>
              </div>
            </div>

            {/* Full Rankings */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="p-4 bg-blue-600 text-white">
                <h3 className="text-lg font-semibold">
                  Global Writer Rankings
                </h3>
              </div>
              <div className="divide-y divide-blue-100">
                {globalLeaders.map((leader, index) => (
                  <div
                    key={index}
                    className="p-4 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {getRankIcon(leader.rank)}
                        </div>
                        <div className="text-3xl">{leader.avatar}</div>
                        <div>
                          <p className="font-semibold text-blue-900">
                            {leader.name}
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-blue-600">
                            <span>Level {leader.level}</span>
                            <span className="flex items-center space-x-1">
                              <IoPencil className="w-4 h-4" />
                              <span>{leader.entries}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <IoFlame className="w-4 h-4" />
                              <span>{leader.streak}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-900">
                          {leader.xp.toLocaleString()} XP
                        </p>
                        <p className="text-xs text-blue-500">{leader.badge}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Theme Masters */}
        {selectedCategory === "themes" && (
          <div className="space-y-6">
            {/* Theme Selector */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {themeCategories.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setSelectedTheme(theme.id)}
                  className={`p-4 rounded-xl font-medium transition-all hover:scale-105 ${
                    selectedTheme === theme.id
                      ? "bg-blue-600 text-white shadow-lg"
                      : "bg-white text-blue-600 hover:bg-blue-50 border border-blue-100"
                  }`}
                >
                  <div className="text-2xl mb-1">{theme.emoji}</div>
                  <p className="text-sm">{theme.name}</p>
                </button>
              ))}
            </div>

            {/* Theme Leaderboard */}
            <div className="bg-white rounded-2xl shadow-lg">
              <div className="p-6 border-b border-blue-100">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">
                    {themeCategories.find((t) => t.id === selectedTheme)?.emoji}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-blue-900">
                      {
                        themeCategories.find((t) => t.id === selectedTheme)
                          ?.name
                      }{" "}
                      Champions
                    </h3>
                    <p className="text-blue-600">Masters of themed writing</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {themeLeaders[selectedTheme]?.map((leader, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        {getRankIcon(leader.rank)}
                        <div className="text-2xl">{leader.avatar}</div>
                        <div>
                          <p className="font-semibold text-blue-900">
                            {leader.name}
                          </p>
                          <p className="text-sm text-blue-600">
                            {leader.specialty}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-900">
                          {leader.entries} entries
                        </p>
                        <p className="text-sm text-blue-600">
                          {leader.xp.toLocaleString()} XP
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Seasonal Contest */}
        {selectedCategory === "seasonal" && (
          <div className="space-y-6">
            {/* Contest Info */}
            <div className="bg-gradient-to-r from-orange-400 to-pink-500 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold">
                    {seasonalContest.title}
                  </h3>
                  <p className="opacity-90">{seasonalContest.description}</p>
                </div>
                <div className="text-right">
                  <div className="bg-white bg-opacity-20 rounded-lg p-3">
                    <IoTime className="w-6 h-6 mx-auto mb-1" />
                    <p className="text-sm font-semibold">
                      {seasonalContest.timeLeft}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-lg">🏆 Prize: {seasonalContest.prize}</p>
                <p className="text-sm">
                  👥 {seasonalContest.participants.toLocaleString()}{" "}
                  participants
                </p>
              </div>
            </div>

            {/* Contest Leaderboard */}
            <div className="bg-white rounded-2xl shadow-lg">
              <div className="p-6 border-b border-blue-100">
                <h3 className="text-xl font-semibold text-blue-900">
                  Current Rankings
                </h3>
                <p className="text-blue-600">
                  Based on community votes and engagement
                </p>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {seasonalContest.leaders.map((leader, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-xl border border-blue-100 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        {getRankIcon(leader.rank)}
                        <div className="text-2xl">{leader.avatar}</div>
                        <div>
                          <p className="font-semibold text-blue-900">
                            {leader.name}
                          </p>
                          <p className="text-blue-600">"{leader.entry}"</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-900">
                          {leader.score} votes
                        </p>
                        <button className="text-sm text-blue-500 hover:text-blue-700">
                          View Entry →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 text-center">
                  <button className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
                    Submit Your Entry
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* XP System Info */}
        <div className="mt-8 bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-semibold text-blue-900 mb-4">
            💫 How to Earn XP
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <IoPencil className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-blue-900">Write Entry</p>
              <p className="text-xs text-blue-600">+50 XP</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <IoHeart className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-blue-900">Get Liked</p>
              <p className="text-xs text-blue-600">+10 XP</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <IoChatbubble className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-blue-900">Comment</p>
              <p className="text-xs text-blue-600">+15 XP</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <IoFlame className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-blue-900">Daily Streak</p>
              <p className="text-xs text-blue-600">+25 XP</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
