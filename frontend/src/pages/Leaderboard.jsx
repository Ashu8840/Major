import { useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  IoTrophy,
  IoSparkles,
  IoStatsChart,
  IoPencil,
  IoFlame,
  IoHeart,
  IoChatbubble,
  IoRocket,
  IoTime,
  IoMedal,
} from "react-icons/io5";
import { AuthContext } from "../context/AuthContext";
import { getLeaderboard, getSeasonalLeaderboard } from "../utils/api";

const CATEGORIES = [
  {
    id: "global",
    name: "Global Rankings",
    icon: <IoTrophy className="w-5 h-5" />,
  },
  {
    id: "seasonal",
    name: "Seasonal Contest",
    icon: <IoSparkles className="w-5 h-5" />,
  },
];

const PERIOD_OPTIONS = [
  { id: "all-time", label: "All Time" },
  { id: "this-month", label: "This Month" },
  { id: "this-week", label: "This Week" },
];

const SEASONAL_TABS = [
  { id: "monthly", label: "Monthly Sprint" },
  { id: "weekly", label: "Weekly Blitz" },
  { id: "yearly", label: "Yearly Legends" },
];

const XP_RULES = {
  diary: 50,
  communityPost: 50,
  like: 10,
  comment: 14,
  streak: 25,
};

const formatNumber = (value) =>
  typeof value === "number" ? value.toLocaleString() : "0";

const Avatar = ({ profileImage, initials }) => {
  if (profileImage) {
    return (
      <img
        src={profileImage}
        alt="avatar"
        className="h-12 w-12 rounded-full object-cover border border-blue-100"
      />
    );
  }
  return (
    <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
      {initials || "?"}
    </div>
  );
};

const RankIcon = ({ rank }) => {
  if (rank === 1) {
    return <IoTrophy className="w-6 h-6 text-yellow-500" />;
  }
  if (rank === 2) {
    return <IoMedal className="w-6 h-6 text-gray-400" />;
  }
  if (rank === 3) {
    return <IoMedal className="w-6 h-6 text-amber-600" />;
  }
  return (
    <span className="w-6 h-6 flex items-center justify-center text-blue-600 font-semibold">
      #{rank}
    </span>
  );
};

const BonusBadge = ({ value }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 px-2 py-1 text-xs font-semibold">
    <IoRocket className="w-3 h-3" />+{formatNumber(value)} XP bonus
  </span>
);

export default function Leaderboard() {
  const { user } = useContext(AuthContext);
  const [selectedCategory, setSelectedCategory] = useState("global");
  const [selectedPeriod, setSelectedPeriod] = useState("all-time");
  const [seasonalTab, setSeasonalTab] = useState("monthly");

  const [globalData, setGlobalData] = useState(null);
  const [seasonalData, setSeasonalData] = useState(null);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [loadingSeasonal, setLoadingSeasonal] = useState(false);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const fetchGlobal = async () => {
      setLoadingGlobal(true);
      try {
        const data = await getLeaderboard(selectedPeriod);
        if (!mounted) return;
        setGlobalData(data);
      } catch (error) {
        if (!mounted) return;
        console.error("Global leaderboard error", error);
        toast.error(
          error?.response?.data?.message || "Unable to load leaderboard"
        );
        setGlobalData(null);
      } finally {
        if (mounted) setLoadingGlobal(false);
      }
    };

    fetchGlobal();

    return () => {
      mounted = false;
    };
  }, [selectedPeriod, user]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const fetchSeasonal = async () => {
      setLoadingSeasonal(true);
      try {
        const data = await getSeasonalLeaderboard();
        if (!mounted) return;
        setSeasonalData(data);
      } catch (error) {
        if (!mounted) return;
        console.error("Seasonal leaderboard error", error);
        toast.error(
          error?.response?.data?.message || "Unable to load seasonal contest"
        );
        setSeasonalData(null);
      } finally {
        if (mounted) setLoadingSeasonal(false);
      }
    };

    fetchSeasonal();

    return () => {
      mounted = false;
    };
  }, [user]);

  const podium = useMemo(
    () => (globalData?.rankings || []).slice(0, 3),
    [globalData]
  );
  const rankings = useMemo(
    () => (globalData?.rankings || []).slice(3),
    [globalData]
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <p className="text-blue-600">Please log in to view the leaderboard.</p>
      </div>
    );
  }

  const currentUser = globalData?.currentUser;
  const periodLabel = globalData?.label || "This period";
  const periodLabelLower = periodLabel.toLowerCase();
  const seasonalList = seasonalData?.leaderboards?.[seasonalTab] || [];

  return (
    <div className="min-h-screen bg-blue-50 py-6 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3">
              <IoTrophy className="w-10 h-10 text-yellow-500" />
              <div>
                <h1 className="text-3xl font-bold text-blue-900">
                  Leaderboard
                </h1>
                <p className="text-blue-600">
                  Track your creative journey and see how you stack up across
                  the community.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl">
                    {user?.displayName?.[0]?.toUpperCase() ||
                      user?.username?.[0]?.toUpperCase() ||
                      "👤"}
                  </div>
                  <div>
                    <p className="text-sm text-blue-500">Current Rank</p>
                    <p className="text-lg font-semibold text-blue-900">
                      {currentUser ? `#${currentUser.rank}` : "—"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-500">Level</p>
                  <p className="text-xl font-semibold text-blue-900">
                    {currentUser?.level || 1}
                  </p>
                  <p className="text-xs text-blue-500">
                    {currentUser
                      ? `${formatNumber(currentUser.xp)} XP`
                      : "Start earning XP"}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-blue-500">
                  <span>Progress to next level</span>
                  <span>
                    {currentUser
                      ? `${formatNumber(currentUser.xpToNextLevel)} XP left`
                      : "—"}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-blue-100">
                  <div
                    className="h-2 rounded-full bg-blue-500 transition-all"
                    style={{
                      width: `${currentUser?.progressToNextLevel || 0}%`,
                    }}
                  />
                </div>
                {currentUser && (
                  <p className="mt-2 text-xs text-blue-500">
                    Top {currentUser.percentile || 100}% of all writers this{" "}
                    {periodLabelLower}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <IoStatsChart className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-sm text-blue-500">Writers Ranked</p>
                    <p className="text-lg font-semibold text-blue-900">
                      {formatNumber(globalData?.totals?.totalUsers)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-500">Average XP</p>
                  <p className="text-lg font-semibold text-blue-900">
                    {formatNumber(globalData?.totals?.averageXp)}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-blue-600">
                <div className="rounded-xl bg-blue-50 px-3 py-2">
                  <p className="font-medium">Diary entries</p>
                  <p>+{XP_RULES.diary} XP each</p>
                </div>
                <div className="rounded-xl bg-blue-50 px-3 py-2">
                  <p className="font-medium">Community posts</p>
                  <p>+{XP_RULES.communityPost} XP each</p>
                </div>
                <div className="rounded-xl bg-blue-50 px-3 py-2">
                  <p className="font-medium">Each like received</p>
                  <p>+{XP_RULES.like} XP</p>
                </div>
                <div className="rounded-xl bg-blue-50 px-3 py-2">
                  <p className="font-medium">Comments on your work</p>
                  <p>+{XP_RULES.comment} XP</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-blue-500">Daily streak boost</p>
              <p className="mt-2 text-2xl font-semibold text-blue-900">
                +{XP_RULES.streak} XP per day
              </p>
              <p className="mt-3 text-xs text-blue-600">
                Keep your journaling streak alive to maintain bonus XP every
                day.
              </p>
              <div className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-600">
                <p>
                  Streak XP is automatically added to your leaderboard score.
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="rounded-2xl bg-white p-2 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => {
              const isActive = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "bg-blue-600 text-white shadow"
                      : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                  }`}
                >
                  {category.icon}
                  {category.name}
                </button>
              );
            })}
          </div>
        </section>

        {selectedCategory === "global" && (
          <section className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedPeriod(option.id)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                    selectedPeriod === option.id
                      ? "bg-blue-600 text-white"
                      : "bg-white text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-md">
              <div className="mb-6 text-center">
                <h2 className="text-xl font-semibold text-blue-900">
                  Hall of Fame
                </h2>
                <p className="text-sm text-blue-500">
                  Top creators for {periodLabelLower}
                </p>
              </div>
              {loadingGlobal ? (
                <div className="flex items-center justify-center py-12 text-blue-500">
                  Loading leaderboard…
                </div>
              ) : podium.length > 0 ? (
                <div className="flex flex-col items-center gap-4 md:flex-row md:items-end md:justify-center">
                  {podium.map((entry, index) => {
                    const cardStyles =
                      index === 0
                        ? "md:order-2"
                        : index === 1
                        ? "md:order-1"
                        : "md:order-3";
                    return (
                      <div
                        key={entry.userId}
                        className={`w-full max-w-[220px] rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-center shadow-sm ${cardStyles}`}
                      >
                        <div className="flex justify-center">
                          <Avatar
                            profileImage={entry.profileImage}
                            initials={entry.initials}
                          />
                        </div>
                        <p className="mt-3 text-sm font-semibold text-blue-900">
                          {entry.displayName}
                        </p>
                        <p className="text-xs text-blue-500">
                          Level {entry.level}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-blue-600">
                          {formatNumber(entry.xp)} XP
                        </p>
                        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-blue-500">
                          <RankIcon rank={entry.rank} />
                          <span>#{entry.rank}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-sm text-blue-500">
                  No activity yet. Start writing to appear on the board!
                </p>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl bg-white shadow-md">
              <div className="bg-blue-600 px-4 py-3 text-white">
                <h3 className="text-lg font-semibold">Global Rankings</h3>
                <p className="text-xs opacity-80">
                  Updated{" "}
                  {globalData?.generatedAt
                    ? new Date(globalData.generatedAt).toLocaleString()
                    : "just now"}
                </p>
              </div>
              {loadingGlobal ? (
                <div className="flex items-center justify-center py-12 text-blue-500">
                  Loading leaderboard…
                </div>
              ) : (
                <ul className="divide-y divide-blue-100">
                  {rankings.length === 0 && podium.length === 0 && (
                    <li className="py-8 text-center text-sm text-blue-500">
                      No rankings yet. Create entries or posts to earn XP.
                    </li>
                  )}
                  {[...podium.slice(0, 0), ...rankings].map((entry) => (
                    <li
                      key={entry.userId}
                      className="flex flex-col gap-4 px-4 py-5 transition hover:bg-blue-50/60 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex items-start gap-3 md:items-center">
                        <RankIcon rank={entry.rank} />
                        <Avatar
                          profileImage={entry.profileImage}
                          initials={entry.initials}
                        />
                        <div>
                          <p className="font-semibold text-blue-900">
                            {entry.displayName}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-3 text-xs text-blue-500">
                            <span className="flex items-center gap-1">
                              <IoPencil className="h-4 w-4" />
                              {formatNumber(entry.breakdown.diaryEntries)} diary
                              entries
                            </span>
                            <span className="flex items-center gap-1">
                              <IoSparkles className="h-4 w-4" />
                              {formatNumber(
                                entry.breakdown.communityPosts
                              )}{" "}
                              community posts
                            </span>
                            <span className="flex items-center gap-1">
                              <IoHeart className="h-4 w-4" />
                              {formatNumber(entry.breakdown.likesReceived)}{" "}
                              likes received
                            </span>
                            <span className="flex items-center gap-1">
                              <IoChatbubble className="h-4 w-4" />
                              {formatNumber(
                                entry.breakdown.commentsReceived
                              )}{" "}
                              comments received
                            </span>
                            <span className="flex items-center gap-1">
                              <IoFlame className="h-4 w-4" />
                              Streak {formatNumber(entry.breakdown.streak)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-blue-900">
                          {formatNumber(entry.xp)} XP
                        </p>
                        <p className="text-xs text-blue-500">
                          Level {entry.level}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {selectedCategory === "seasonal" && (
          <section className="space-y-6">
            <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white shadow-md">
              <div className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-wide text-white/70">
                    Seasonal Challenge
                  </p>
                  <h2 className="text-2xl font-bold">
                    {seasonalData?.contest?.title || "Seasonal Contest"}
                  </h2>
                  <p className="mt-1 text-sm text-white/80">
                    {seasonalData?.contest?.description ||
                      "Earn bonus XP by keeping your creativity flowing."}
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="rounded-xl bg-white/15 px-4 py-3 text-center">
                    <IoTime className="mx-auto h-5 w-5" />
                    <p className="mt-1 text-xs uppercase tracking-wide text-white/80">
                      Time left
                    </p>
                    <p className="text-sm font-semibold">
                      {seasonalData?.contest?.timeLeft || "—"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/15 px-4 py-3 text-center">
                    <IoRocket className="mx-auto h-5 w-5" />
                    <p className="mt-1 text-xs uppercase tracking-wide text-white/80">
                      Prize
                    </p>
                    <p className="text-sm font-semibold">
                      {seasonalData?.contest?.prize || "Exclusive rewards"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {SEASONAL_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSeasonalTab(tab.id)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                    seasonalTab === tab.id
                      ? "bg-blue-600 text-white shadow"
                      : "bg-white text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="overflow-hidden rounded-2xl bg-white shadow-md">
              <div className="border-b border-blue-100 px-4 py-4">
                <h3 className="text-lg font-semibold text-blue-900">
                  {SEASONAL_TABS.find((tab) => tab.id === seasonalTab)?.label ||
                    "Seasonal Rankings"}
                </h3>
                <p className="text-xs text-blue-500">
                  Seasonal bonus XP is added to your total contest XP.
                </p>
              </div>
              {loadingSeasonal ? (
                <div className="flex items-center justify-center py-12 text-blue-500">
                  Loading seasonal standings…
                </div>
              ) : seasonalList.length === 0 ? (
                <div className="py-10 text-center text-sm text-blue-500">
                  No contest submissions yet. Share your best work to climb the
                  seasonal ranks.
                </div>
              ) : (
                <ul className="divide-y divide-blue-100">
                  {seasonalList.map((entry) => (
                    <li
                      key={entry.userId}
                      className="flex flex-col gap-4 px-4 py-5 transition hover:bg-blue-50/60 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex items-start gap-3 md:items-center">
                        <RankIcon rank={entry.rank} />
                        <Avatar
                          profileImage={entry.profileImage}
                          initials={entry.initials}
                        />
                        <div>
                          <p className="font-semibold text-blue-900">
                            {entry.displayName}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-blue-500">
                            <span>{formatNumber(entry.xp)} base XP</span>
                            <BonusBadge value={entry.bonusXp} />
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-blue-900">
                          {formatNumber(entry.totalContestXp)} XP
                        </p>
                        <p className="text-xs text-blue-500">
                          Level {entry.level}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        <section className="rounded-2xl bg-white p-6 shadow-md">
          <h3 className="text-xl font-semibold text-blue-900">
            Earn XP faster
          </h3>
          <p className="mt-1 text-sm text-blue-500">
            Mix diary reflections, community posts, and engagement to move up
            the leaderboard.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-blue-50 p-4 text-center">
              <IoPencil className="mx-auto h-8 w-8 text-blue-600" />
              <p className="mt-3 text-sm font-semibold text-blue-900">
                Publish diary entries
              </p>
              <p className="text-xs text-blue-600">+{XP_RULES.diary} XP each</p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-4 text-center">
              <IoSparkles className="mx-auto h-8 w-8 text-blue-600" />
              <p className="mt-3 text-sm font-semibold text-blue-900">
                Share community posts
              </p>
              <p className="text-xs text-blue-600">
                +{XP_RULES.communityPost} XP each
              </p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-4 text-center">
              <IoHeart className="mx-auto h-8 w-8 text-blue-600" />
              <p className="mt-3 text-sm font-semibold text-blue-900">
                Collect reactions
              </p>
              <p className="text-xs text-blue-600">
                +{XP_RULES.like} XP per like
              </p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-4 text-center">
              <IoFlame className="mx-auto h-8 w-8 text-blue-600" />
              <p className="mt-3 text-sm font-semibold text-blue-900">
                Maintain streaks
              </p>
              <p className="text-xs text-blue-600">
                +{XP_RULES.streak} XP daily
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
