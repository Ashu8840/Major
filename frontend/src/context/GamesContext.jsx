import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getGamesList,
  getDailyPuzzles,
  getGameStats,
  getGameLeaderboard,
  getPuzzle,
  updateGameSession,
  completeGame,
  getGameHint,
} from "../utils/api";

const GamesContext = createContext(null);

export const GAME_TYPES = {
  tango: {
    name: "Tango",
    description: "Fill the grid with suns and moons following the rules",
    icon: "🌙",
    color: "from-orange-400 to-yellow-500",
    bgColor: "bg-gradient-to-br from-orange-400 to-yellow-500",
  },
  sudoku: {
    name: "Mini Sudoku",
    description: "Complete the 4x4 Sudoku puzzle",
    icon: "🔢",
    color: "from-blue-400 to-cyan-500",
    bgColor: "bg-gradient-to-br from-blue-400 to-cyan-500",
  },
  queens: {
    name: "Queens",
    description: "Place queens so no two can attack each other",
    icon: "👑",
    color: "from-purple-400 to-pink-500",
    bgColor: "bg-gradient-to-br from-purple-400 to-pink-500",
  },
  pinpoint: {
    name: "Pinpoint",
    description: "Find the hidden categories",
    icon: "📍",
    color: "from-green-400 to-emerald-500",
    bgColor: "bg-gradient-to-br from-green-400 to-emerald-500",
  },
  crossclimb: {
    name: "Crossclimb",
    description: "Solve the crossword ladder",
    icon: "🧗",
    color: "from-sky-400 to-blue-500",
    bgColor: "bg-gradient-to-br from-sky-400 to-blue-500",
  },
};

export function GamesProvider({ children }) {
  const [dailyPuzzles, setDailyPuzzles] = useState([]);
  const [gameStats, setGameStats] = useState(null);
  const [currentGame, setCurrentGame] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDailyPopup, setShowDailyPopup] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);

  // Fetch daily puzzles
  const fetchDailyPuzzles = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getDailyPuzzles();
      if (response.success) {
        setDailyPuzzles(response.puzzles);
      }
    } catch (error) {
      console.error("Failed to fetch daily puzzles:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch game stats
  const fetchGameStats = useCallback(async () => {
    try {
      const response = await getGameStats();
      if (response.success) {
        setGameStats(response.stats);
      }
    } catch (error) {
      console.error("Failed to fetch game stats:", error);
    }
  }, []);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(
    async (gameType = "overall", period = "weekly") => {
      try {
        const response = await getGameLeaderboard(gameType, period);
        if (response.success) {
          setLeaderboard(response.leaderboard);
          return response;
        }
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
      }
      return null;
    },
    [],
  );

  // Start a game
  const startGame = useCallback(async (gameType) => {
    try {
      setIsLoading(true);
      const response = await getPuzzle(gameType);
      if (response.success) {
        setCurrentGame({
          ...response.puzzle,
          config: GAME_TYPES[gameType],
        });
        setCurrentSession(response.session);
        return response;
      }
    } catch (error) {
      console.error("Failed to start game:", error);
    } finally {
      setIsLoading(false);
    }
    return null;
  }, []);

  // Save game progress
  const saveProgress = useCallback(
    async (gameState, timeSpent, hintsUsed, mistakes) => {
      if (!currentSession?.sessionId) return;
      try {
        await updateGameSession(currentSession.sessionId, {
          gameState,
          timeSpent,
          hintsUsed,
          mistakes,
        });
      } catch (error) {
        console.error("Failed to save progress:", error);
      }
    },
    [currentSession],
  );

  // Complete a game
  const finishGame = useCallback(
    async (solution, timeSpent, hintsUsed, mistakes) => {
      if (!currentSession?.sessionId) return null;
      try {
        const response = await completeGame(currentSession.sessionId, {
          solution,
          timeSpent,
          hintsUsed,
          mistakes,
        });
        if (response.success && response.correct) {
          setGameResult(response);
          // Refresh stats
          fetchGameStats();
          fetchDailyPuzzles();
        }
        return response;
      } catch (error) {
        console.error("Failed to complete game:", error);
      }
      return null;
    },
    [currentSession, fetchGameStats, fetchDailyPuzzles],
  );

  // Get a hint
  const requestHint = useCallback(async () => {
    if (!currentSession?.sessionId) return null;
    try {
      const response = await getGameHint(currentSession.sessionId);
      if (response.success) {
        setCurrentSession((prev) => ({
          ...prev,
          hintsUsed: response.hintsUsed,
        }));
        return response.hint;
      }
    } catch (error) {
      console.error("Failed to get hint:", error);
    }
    return null;
  }, [currentSession]);

  // Close current game
  const closeGame = useCallback(() => {
    setCurrentGame(null);
    setCurrentSession(null);
    setGameResult(null);
  }, []);

  // Initial data fetch on mount - run once only when authenticated
  useEffect(() => {
    // Check if user is authenticated before making API calls
    const token = localStorage.getItem("token");
    if (!token) return;

    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const [puzzlesRes, statsRes] = await Promise.allSettled([
          getDailyPuzzles(),
          getGameStats(),
        ]);

        if (!isMounted) return;

        if (puzzlesRes.status === "fulfilled" && puzzlesRes.value?.success) {
          setDailyPuzzles(puzzlesRes.value.puzzles || []);
        }
        if (statsRes.status === "fulfilled" && statsRes.value?.success) {
          setGameStats(statsRes.value.stats);
        }
      } catch (error) {
        console.error("Failed to load initial game data:", error);
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency - run only once

  // Check if should show daily popup - only show if we have puzzles
  useEffect(() => {
    // Wait for puzzles to be fetched before deciding to show popup
    if (dailyPuzzles.length === 0) return;

    const lastShown = localStorage.getItem("dailyGamePopupShown");
    const today = new Date().toISOString().split("T")[0];

    if (lastShown !== today) {
      // Show popup after a delay
      const timer = setTimeout(() => {
        setShowDailyPopup(true);
        localStorage.setItem("dailyGamePopupShown", today);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [dailyPuzzles]);

  // Calculate today's incomplete games
  const incompleteGames = useMemo(() => {
    return dailyPuzzles.filter((p) => !p.completed);
  }, [dailyPuzzles]);

  // Calculate XP available today
  const xpAvailableToday = useMemo(() => {
    return incompleteGames.length * 50; // Base XP per game
  }, [incompleteGames]);

  const value = useMemo(
    () => ({
      // State
      dailyPuzzles,
      gameStats,
      currentGame,
      currentSession,
      isLoading,
      showDailyPopup,
      gameResult,
      leaderboard,
      incompleteGames,
      xpAvailableToday,

      // Actions
      fetchDailyPuzzles,
      fetchGameStats,
      fetchLeaderboard,
      startGame,
      saveProgress,
      finishGame,
      requestHint,
      closeGame,
      setShowDailyPopup,
      setGameResult,
    }),
    [
      dailyPuzzles,
      gameStats,
      currentGame,
      currentSession,
      isLoading,
      showDailyPopup,
      gameResult,
      leaderboard,
      incompleteGames,
      xpAvailableToday,
      fetchDailyPuzzles,
      fetchGameStats,
      fetchLeaderboard,
      startGame,
      saveProgress,
      finishGame,
      requestHint,
      closeGame,
    ],
  );

  return (
    <GamesContext.Provider value={value}>{children}</GamesContext.Provider>
  );
}

export function useGames() {
  const context = useContext(GamesContext);
  // Return empty defaults if context is not available instead of throwing
  if (!context) {
    return {
      dailyPuzzles: [],
      gameStats: null,
      currentGame: null,
      currentSession: null,
      isLoading: false,
      showDailyPopup: false,
      gameResult: null,
      leaderboard: [],
      incompleteGames: [],
      xpAvailableToday: 0,
      fetchDailyPuzzles: () => {},
      fetchGameStats: () => {},
      fetchLeaderboard: () => {},
      startGame: () => {},
      saveProgress: () => {},
      finishGame: () => {},
      requestHint: () => {},
      closeGame: () => {},
      setShowDailyPopup: () => {},
      setGameResult: () => {},
    };
  }
  return context;
}
