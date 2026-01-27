import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  IoGameController,
  IoFlame,
  IoTrophy,
  IoTime,
  IoSparkles,
  IoCheckmarkCircle,
  IoPlayCircle,
  IoStatsChart,
  IoMedal,
  IoChevronForward,
  IoRefresh,
  IoSnow,
  IoCalendar,
} from "react-icons/io5";
import { GamesProvider, useGames, GAME_TYPES } from "../context/GamesContext";
import DailyGamePopup from "../components/games/DailyGamePopup";
import GameResultModal from "../components/games/GameResultModal";
import GameModal from "../components/games/GameModal";

const formatTime = (seconds) => {
  if (!seconds && seconds !== 0) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const PERIOD_OPTIONS = [
  { id: "daily", label: "Today" },
  { id: "weekly", label: "This Week" },
  { id: "monthly", label: "This Month" },
  { id: "all-time", label: "All Time" },
];

function GamesContent() {
  const navigate = useNavigate();
  const {
    dailyPuzzles,
    gameStats,
    isLoading,
    leaderboard,
    fetchDailyPuzzles,
    fetchGameStats,
    fetchLeaderboard,
    startGame,
  } = useGames();

  const [selectedPeriod, setSelectedPeriod] = useState("weekly");
  const [selectedGameType, setSelectedGameType] = useState("overall");
  const [activeTab, setActiveTab] = useState("puzzles");

  // Fetch data on mount
  useEffect(() => {
    fetchDailyPuzzles();
    fetchGameStats();
    fetchLeaderboard("overall", "weekly");
  }, [fetchDailyPuzzles, fetchGameStats, fetchLeaderboard]);

  // Handle period change
  useEffect(() => {
    fetchLeaderboard(selectedGameType, selectedPeriod);
  }, [selectedPeriod, selectedGameType, fetchLeaderboard]);

  const handleStartGame = useCallback(
    async (gameType) => {
      const result = await startGame(gameType);
      if (!result) {
        toast.error("Failed to start game");
      }
    },
    [startGame],
  );

  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];
  const today = new Date().getDay();

  const completedToday = useMemo(() => {
    return dailyPuzzles.filter((p) => p.completed).length;
  }, [dailyPuzzles]);

  const totalGamesToday = dailyPuzzles.length;

  return (
    <div className="min-h-screen bg-theme theme-transition">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-theme-surface border-b border-theme px-4 py-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <IoGameController className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-theme-primary">
                  Daily Games
                </h1>
                <p className="text-sm text-theme-secondary">
                  Challenge your mind & earn XP
                </p>
              </div>
            </div>

            {/* Stats Summary */}
            <div className="flex items-center gap-3 sm:gap-6">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-100 dark:bg-orange-900/30">
                <IoFlame className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                  {gameStats?.currentStreak || 0} day streak
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                <IoSparkles className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                  {gameStats?.totalXp?.toLocaleString() || 0} XP
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-2">
            {[
              { id: "puzzles", label: "Daily Puzzles", icon: IoCalendar },
              { id: "stats", label: "My Stats", icon: IoStatsChart },
              { id: "leaderboard", label: "Leaderboard", icon: IoTrophy },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-theme-accent text-white shadow-lg"
                    : "bg-theme-primary-soft text-theme-secondary hover:bg-theme-primary-soft/80"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {activeTab === "puzzles" && (
          <div className="space-y-6">
            {/* Weekly Progress */}
            <div className="bg-theme-surface rounded-2xl border border-theme p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-theme-primary">
                  Weekly Progress
                </h2>
                <div className="flex items-center gap-2">
                  <IoSnow className="w-5 h-5 text-cyan-500" />
                  <span className="text-sm text-theme-secondary">
                    {gameStats?.streakFreezes || 0} freezes available
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                {weekDays.map((day, index) => {
                  const isToday = index === today;
                  const isCompleted =
                    gameStats?.weeklyProgress?.[
                      ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][index]
                    ];
                  const isPast = index < today;

                  return (
                    <div
                      key={index}
                      className={`flex flex-col items-center gap-2 ${isToday ? "scale-110" : ""}`}
                    >
                      <span
                        className={`text-xs font-medium ${
                          isToday ? "text-theme-accent" : "text-theme-secondary"
                        }`}
                      >
                        {day}
                      </span>
                      <div
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
                          isCompleted
                            ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                            : isToday
                              ? "bg-theme-accent text-white shadow-lg shadow-theme-accent/30 animate-pulse"
                              : isPast
                                ? "bg-gray-200 dark:bg-gray-700 text-gray-400"
                                : "bg-theme-primary-soft text-theme-secondary"
                        }`}
                      >
                        {isCompleted ? (
                          <IoCheckmarkCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                        ) : (
                          <span className="text-sm font-bold">{index + 1}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Progress Bar */}
              <div className="mt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-theme-secondary">Today's Progress</span>
                  <span className="font-bold text-theme-primary">
                    {completedToday}/{totalGamesToday} completed
                  </span>
                </div>
                <div className="h-3 bg-theme-primary-soft rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${(completedToday / totalGamesToday) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Daily Puzzles Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dailyPuzzles.map((puzzle) => {
                const config = GAME_TYPES[puzzle.type];

                return (
                  <div
                    key={puzzle.type}
                    className={`relative bg-theme-surface rounded-2xl border border-theme overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group ${
                      puzzle.completed ? "opacity-75" : ""
                    }`}
                  >
                    {/* Gradient Header */}
                    <div
                      className={`h-24 sm:h-28 ${config?.bgColor || "bg-gradient-to-br from-gray-400 to-gray-500"} relative overflow-hidden`}
                    >
                      <div className="absolute inset-0 bg-black/10" />
                      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
                      <div className="absolute top-4 left-4">
                        <span className="text-4xl">{config?.icon}</span>
                      </div>
                      <div className="absolute top-4 right-4">
                        <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-medium">
                          #{puzzle.puzzleNumber}
                        </span>
                      </div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-xl font-bold text-white">
                          {config?.name}
                        </h3>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <p className="text-sm text-theme-secondary mb-4 line-clamp-2">
                        {config?.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {puzzle.completed ? (
                            <>
                              <IoCheckmarkCircle className="w-5 h-5 text-green-500" />
                              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                Completed in {formatTime(puzzle.timeSpent)}
                              </span>
                            </>
                          ) : (
                            <>
                              <IoSparkles className="w-5 h-5 text-yellow-500" />
                              <span className="text-sm font-medium text-theme-secondary">
                                +50 XP available
                              </span>
                            </>
                          )}
                        </div>

                        {puzzle.completed ? (
                          <div className="flex items-center gap-1 text-purple-500">
                            <IoSparkles className="w-4 h-4" />
                            <span className="text-sm font-bold">
                              +{puzzle.xpEarned} XP
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartGame(puzzle.type)}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-theme-accent text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg hover:shadow-xl group-hover:scale-105"
                          >
                            <IoPlayCircle className="w-5 h-5" />
                            Play
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Streak Milestones */}
            <div className="bg-theme-surface rounded-2xl border border-theme p-6 shadow-lg">
              <h2 className="text-lg font-bold text-theme-primary mb-4">
                Streak Milestones
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { days: 3, name: "Star", icon: "⭐", xp: 25 },
                  { days: 5, name: "Superstar", icon: "🌟", xp: 50 },
                  { days: 7, name: "Champion", icon: "🏆", xp: 100 },
                  { days: 31, name: "Icon", icon: "👑", xp: 500 },
                ].map((milestone) => {
                  const achieved =
                    (gameStats?.longestStreak || 0) >= milestone.days;
                  const progress = Math.min(
                    100,
                    ((gameStats?.currentStreak || 0) / milestone.days) * 100,
                  );

                  return (
                    <div
                      key={milestone.days}
                      className={`relative p-4 rounded-xl border transition-all ${
                        achieved
                          ? "bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800"
                          : "bg-theme-primary-soft border-theme"
                      }`}
                    >
                      <div className="text-center">
                        <span
                          className={`text-3xl ${achieved ? "" : "grayscale opacity-50"}`}
                        >
                          {milestone.icon}
                        </span>
                        <h4 className="mt-2 font-bold text-theme-primary">
                          {milestone.name}
                        </h4>
                        <p className="text-xs text-theme-secondary">
                          {milestone.days} days
                        </p>
                        <p className="mt-1 text-xs font-medium text-purple-500">
                          +{milestone.xp} XP
                        </p>
                      </div>
                      {!achieved && (
                        <div className="mt-3">
                          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === "stats" && (
          <div className="space-y-6">
            {/* Overall Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  label: "Games Played",
                  value: gameStats?.totalGamesPlayed || 0,
                  icon: IoGameController,
                  color: "text-blue-500",
                  bg: "bg-blue-100 dark:bg-blue-900/30",
                },
                {
                  label: "Win Rate",
                  value: `${gameStats?.totalGamesPlayed > 0 ? Math.round((gameStats?.totalGamesWon / gameStats?.totalGamesPlayed) * 100) : 0}%`,
                  icon: IoCheckmarkCircle,
                  color: "text-green-500",
                  bg: "bg-green-100 dark:bg-green-900/30",
                },
                {
                  label: "Current Streak",
                  value: gameStats?.currentStreak || 0,
                  icon: IoFlame,
                  color: "text-orange-500",
                  bg: "bg-orange-100 dark:bg-orange-900/30",
                },
                {
                  label: "Total XP",
                  value: gameStats?.totalXp?.toLocaleString() || 0,
                  icon: IoSparkles,
                  color: "text-purple-500",
                  bg: "bg-purple-100 dark:bg-purple-900/30",
                },
              ].map((stat, index) => (
                <div
                  key={index}
                  className="bg-theme-surface rounded-2xl border border-theme p-4 sm:p-6 shadow-lg"
                >
                  <div
                    className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}
                  >
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-theme-primary">
                    {stat.value}
                  </p>
                  <p className="text-sm text-theme-secondary">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Game-specific Stats */}
            <div className="bg-theme-surface rounded-2xl border border-theme p-6 shadow-lg">
              <h2 className="text-lg font-bold text-theme-primary mb-4">
                Game Statistics
              </h2>
              <div className="space-y-4">
                {Object.entries(GAME_TYPES).map(([type, config]) => {
                  const stats = gameStats?.gameStats?.[type] || {};

                  return (
                    <div
                      key={type}
                      className="flex items-center gap-4 p-4 rounded-xl bg-theme-primary-soft hover:bg-theme-primary-soft/80 transition-all"
                    >
                      <div
                        className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center`}
                      >
                        <span className="text-2xl">{config.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-theme-primary">
                          {config.name}
                        </h4>
                        <p className="text-sm text-theme-secondary">
                          {stats.played || 0} played • {stats.won || 0} won
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-theme-primary">
                          Best: {formatTime(stats.bestTime)}
                        </p>
                        <p className="text-xs text-theme-secondary">
                          Avg: {formatTime(stats.avgTime)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-theme-surface rounded-2xl border border-theme p-6 shadow-lg">
              <h2 className="text-lg font-bold text-theme-primary mb-4">
                Achievements
              </h2>
              {gameStats?.achievements?.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {gameStats.achievements.map((achievement, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-xl bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 text-center"
                    >
                      <span className="text-3xl">{achievement.icon}</span>
                      <h4 className="mt-2 font-bold text-theme-primary">
                        {achievement.name}
                      </h4>
                      <p className="text-xs text-theme-secondary">
                        {achievement.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-theme-secondary">
                  <IoMedal className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Complete puzzles to earn achievements!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "leaderboard" && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {[
                  { id: "overall", name: "Overall" },
                  ...Object.entries(GAME_TYPES).map(([id, config]) => ({
                    id,
                    name: config.name,
                  })),
                ].map((game) => (
                  <button
                    key={game.id}
                    onClick={() => setSelectedGameType(game.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                      selectedGameType === game.id
                        ? "bg-theme-accent text-white shadow-lg"
                        : "bg-theme-primary-soft text-theme-secondary hover:bg-theme-primary-soft/80"
                    }`}
                  >
                    {game.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 ml-auto">
                {PERIOD_OPTIONS.map((period) => (
                  <button
                    key={period.id}
                    onClick={() => setSelectedPeriod(period.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedPeriod === period.id
                        ? "bg-purple-500 text-white"
                        : "bg-theme-primary-soft text-theme-secondary hover:bg-theme-primary-soft/80"
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Leaderboard Table */}
            <div className="bg-theme-surface rounded-2xl border border-theme overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-theme-primary-soft">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-theme-secondary uppercase">
                        Rank
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-theme-secondary uppercase">
                        Player
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-theme-secondary uppercase">
                        Games Won
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-theme-secondary uppercase">
                        Best Time
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-theme-secondary uppercase">
                        XP
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme">
                    {leaderboard.map((entry, index) => (
                      <tr
                        key={entry.userId}
                        className="hover:bg-theme-primary-soft/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          {entry.rank <= 3 ? (
                            <span
                              className={`text-xl ${
                                entry.rank === 1
                                  ? "text-yellow-500"
                                  : entry.rank === 2
                                    ? "text-gray-400"
                                    : "text-amber-600"
                              }`}
                            >
                              {entry.rank === 1
                                ? "🥇"
                                : entry.rank === 2
                                  ? "🥈"
                                  : "🥉"}
                            </span>
                          ) : (
                            <span className="text-sm font-bold text-theme-secondary">
                              #{entry.rank}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {entry.profileImage ? (
                              <img
                                src={entry.profileImage}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover border border-theme"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-theme-accent flex items-center justify-center text-white text-sm font-bold">
                                {entry.displayName?.charAt(0) ||
                                  entry.username?.charAt(0) ||
                                  "?"}
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-semibold text-theme-primary">
                                {entry.displayName || entry.username}
                              </p>
                              {entry.displayName && (
                                <p className="text-xs text-theme-secondary">
                                  @{entry.username}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-theme-primary">
                          {entry.gamesWon}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-theme-secondary">
                          {formatTime(entry.bestTime)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg text-sm font-bold">
                            <IoSparkles className="w-3 h-3" />
                            {entry.totalXp?.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {leaderboard.length === 0 && (
                <div className="text-center py-12 text-theme-secondary">
                  <IoTrophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No leaderboard data yet. Start playing to rank up!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Game modals */}
      <DailyGamePopup />
      <GameResultModal />
      <GameModal />
    </div>
  );
}

// Wrapper component with GamesProvider
export default function GamesPage() {
  return (
    <GamesProvider>
      <GamesContent />
    </GamesProvider>
  );
}
