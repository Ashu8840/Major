import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  IoPeople,
  IoHeart,
  IoStar,
  IoChatbubble,
  IoSearch,
  IoAdd,
  IoLockClosed,
  IoPersonAddOutline,
  IoPersonRemoveOutline,
  IoTrash,
} from "react-icons/io5";
import { AuthContext } from "../context/AuthContext";
import {
  fetchSocialOverview,
  searchSocialUsers,
  updateFavoriteFriends,
  fetchCircles,
  createSocialCircle,
  joinSocialCircle,
  deleteSocialCircle,
  followUser,
  unfollowUser,
} from "../utils/api";
import UserAvatar from "../components/UserAvatar";
import {
  buildDisplayName,
  formatRelativeTime,
  normaliseId,
} from "../utils/socialHelpers";

const MAX_FAVORITE_FRIENDS = 4;

const EmptyState = ({ title, description }) => (
  <div className="py-12 text-center text-blue-500">
    <p className="font-medium text-blue-700">{title}</p>
    {description && <p className="text-sm text-blue-500 mt-1">{description}</p>}
  </div>
);

const TABS = [
  { id: "friends", label: "Friends", icon: IoPeople },
  { id: "circles", label: "Circles", icon: IoChatbubble },
  { id: "discover", label: "Discover", icon: IoSearch },
];

const themes = ["blue", "purple", "emerald", "amber", "rose"];

export default function Social() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const focusTab = location.state?.focusTab;

  const [activeTab, setActiveTab] = useState("friends");
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [circles, setCircles] = useState([]);
  const [circlesLoading, setCirclesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [savingFavorites, setSavingFavorites] = useState(false);
  const [creatingCircle, setCreatingCircle] = useState(false);
  const [circleSearchTerm, setCircleSearchTerm] = useState("");
  const [circleForm, setCircleForm] = useState({
    name: "",
    description: "",
    visibility: "public",
    joinKey: "",
    theme: themes[0],
  });
  const [joinDialog, setJoinDialog] = useState({ circle: null, key: "" });
  const [joiningCircleId, setJoiningCircleId] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [processingDelete, setProcessingDelete] = useState(false);

  const selfId = useMemo(
    () => normaliseId(user?._id || user?.id || user?.userId),
    [user]
  );

  const favoriteList = useMemo(() => {
    if (!overview) return [];
    return (overview.favoriteFriends || []).map((friend) => ({
      ...friend,
      isFavorite: favoriteIds.has(friend.id),
    }));
  }, [overview, favoriteIds]);

  const mutualFriends = useMemo(() => {
    if (!overview) return [];
    return (overview.mutualFriends || []).map((friend) => ({
      ...friend,
      isFavorite: favoriteIds.has(friend.id),
    }));
  }, [overview, favoriteIds]);

  const filteredCircles = useMemo(() => {
    const sorted = [...circles].sort((a, b) => {
      const aMember = Boolean(a.membership);
      const bMember = Boolean(b.membership);
      if (aMember !== bMember) {
        return aMember ? -1 : 1;
      }
      const getTimestamp = (value) => {
        if (!value) return 0;
        const time = new Date(value).getTime();
        return Number.isNaN(time) ? 0 : time;
      };
      return getTimestamp(b.lastActivityAt) - getTimestamp(a.lastActivityAt);
    });

    const term = circleSearchTerm.trim().toLowerCase();
    if (!term) return sorted;

    return sorted.filter((circle) => {
      const name = circle.name?.toLowerCase() || "";
      const description = circle.description?.toLowerCase() || "";
      return name.includes(term) || description.includes(term);
    });
  }, [circles, circleSearchTerm]);

  const loadOverview = useCallback(async () => {
    if (!selfId) return;
    setOverviewLoading(true);
    try {
      const data = await fetchSocialOverview();
      setOverview(data);
      const favourites = new Set(
        (data.favoriteFriends || [])
          .filter((friend) => friend.isFavorite)
          .map((friend) => friend.id)
      );
      setFavoriteIds(favourites);
    } catch (error) {
      console.error("Failed to load social overview", error);
      toast.error(error.response?.data?.message || "Failed to load friends");
    } finally {
      setOverviewLoading(false);
    }
  }, [selfId]);

  const loadCircles = useCallback(async () => {
    if (!selfId) return;
    setCirclesLoading(true);
    try {
      const data = await fetchCircles();
      setCircles(data?.circles || []);
    } catch (error) {
      console.error("Failed to load circles", error);
      toast.error(error.response?.data?.message || "Failed to load circles");
    } finally {
      setCirclesLoading(false);
    }
  }, [selfId]);

  const executeSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const data = await searchSocialUsers(query.trim());
      setSearchResults(data?.results || []);
    } catch (error) {
      console.error("User search failed", error);
      toast.error(error.response?.data?.message || "Failed to search users");
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!selfId) return;
    loadOverview();
    loadCircles();
  }, [selfId, loadOverview, loadCircles]);

  useEffect(() => {
    if (focusTab && focusTab !== activeTab) {
      setActiveTab(focusTab);
      navigate(location.pathname, { replace: true });
    }
  }, [activeTab, focusTab, location.pathname, navigate]);

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    await executeSearch(searchQuery);
  };

  const handleToggleFavorite = async (friendId) => {
    const current = new Set(favoriteIds);
    if (current.has(friendId)) {
      current.delete(friendId);
    } else {
      if (current.size >= MAX_FAVORITE_FRIENDS) {
        toast.error(`You can only pin ${MAX_FAVORITE_FRIENDS} favorites`);
        return;
      }
      current.add(friendId);
    }

    const payload = Array.from(current);
    setFavoriteIds(current);
    try {
      setSavingFavorites(true);
      await updateFavoriteFriends(payload);
      toast.success("Favorite friends updated");
      await loadOverview();
    } catch (error) {
      console.error("Failed to update favorites", error);
      toast.error(
        error.response?.data?.message || "Failed to update favorites"
      );
      await loadOverview();
    } finally {
      setSavingFavorites(false);
    }
  };

  const handleFollowToggle = useCallback(
    async (person) => {
      if (!person?.id) return;
      try {
        if (person.isFollowing) {
          await unfollowUser(person.id);
          toast.success(`Unfollowed ${buildDisplayName(person)}`);
        } else {
          await followUser(person.id);
          toast.success(`Now following ${buildDisplayName(person)}`);
        }
        await loadOverview();
        if (searchQuery.trim()) {
          await executeSearch(searchQuery);
        }
      } catch (error) {
        console.error("Follow toggle failed", error);
        toast.error(
          error.response?.data?.message || "Failed to update follow status"
        );
      }
    },
    [executeSearch, loadOverview, searchQuery]
  );

  const performJoinCircle = useCallback(
    async (circle, keyInput = "") => {
      if (!circle?.id) return;
      const trimmedKey = keyInput.trim();

      if (circle.requiresKey && trimmedKey.length !== 4) {
        toast.error("Join key must be 4 digits");
        return;
      }

      try {
        setJoiningCircleId(circle.id);
        const { circle: updated } = await joinSocialCircle(
          circle.id,
          trimmedKey
        );
        toast.success(`Joined ${updated.name}`);
        setCircles((prev) => [
          updated,
          ...prev.filter((item) => item.id !== updated.id),
        ]);
        setJoinDialog({ circle: null, key: "" });
        navigate(`/social/chat/${updated.id}`);
      } catch (error) {
        console.error("Failed to join circle", error);
        toast.error(error.response?.data?.message || "Failed to join circle");
      } finally {
        setJoiningCircleId(null);
      }
    },
    [navigate]
  );

  const handleJoinCircleClick = useCallback(
    (circle) => {
      if (!circle?.id) return;
      if (circle.requiresKey) {
        setJoinDialog({ circle, key: "" });
      } else {
        performJoinCircle(circle);
      }
    },
    [performJoinCircle]
  );

  const closeJoinDialog = () => setJoinDialog({ circle: null, key: "" });

  const handleJoinDialogSubmit = async (event) => {
    event.preventDefault();
    if (!joinDialog.circle) return;
    await performJoinCircle(joinDialog.circle, joinDialog.key);
  };

  const requestCircleDelete = useCallback((circle) => {
    if (!circle?.id) return;
    setDeleteDialog(circle);
  }, []);

  const handleDeleteCircle = useCallback(async () => {
    if (!deleteDialog?.id) return;
    try {
      setProcessingDelete(true);
      await deleteSocialCircle(deleteDialog.id);
      toast.success("Circle deleted");
      setDeleteDialog(null);
      await loadCircles();
    } catch (error) {
      console.error("Failed to delete circle", error);
      toast.error(error.response?.data?.message || "Failed to delete circle");
    } finally {
      setProcessingDelete(false);
    }
  }, [deleteDialog, loadCircles]);

  const handleSelectCircle = useCallback(
    (circleId) => {
      if (!circleId) return;
      navigate(`/social/chat/${circleId}`);
    },
    [navigate]
  );

  const handleCircleSearchChange = (event) => {
    setCircleSearchTerm(event.target.value);
  };

  const handleCreateCircle = async (event) => {
    event.preventDefault();
    if (!circleForm.name.trim()) {
      toast.error("Please provide a circle name");
      return;
    }
    if (
      circleForm.visibility === "private" &&
      circleForm.joinKey.trim().length !== 4
    ) {
      toast.error("Private circles require a 4-digit key");
      return;
    }

    const payload = {
      name: circleForm.name.trim(),
      description: circleForm.description.trim(),
      visibility: circleForm.visibility,
      theme: circleForm.theme,
    };

    if (circleForm.visibility === "private") {
      payload.joinKey = circleForm.joinKey.trim();
    }

    try {
      setCreatingCircle(true);
      const { circle } = await createSocialCircle(payload);
      toast.success("Circle created");
      setCircleForm({
        name: "",
        description: "",
        visibility: "public",
        joinKey: "",
        theme: circleForm.theme,
      });
      setCircles((prev) => [
        circle,
        ...prev.filter((item) => item.id !== circle.id),
      ]);
      navigate(`/social/chat/${circle.id}`);
    } catch (error) {
      console.error("Failed to create circle", error);
      toast.error(error.response?.data?.message || "Failed to create circle");
    } finally {
      setCreatingCircle(false);
    }
  };

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
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <IoHeart className="w-8 h-8 text-red-500" />
            <h1 className="text-3xl font-bold text-blue-900">Social Hub</h1>
          </div>
          <p className="text-blue-600">
            Connect with the writers you care about and join circles that match
            your vibe.
          </p>
        </header>

        <nav className="bg-white rounded-xl p-2 shadow-sm">
          <div className="flex overflow-x-auto gap-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white shadow"
                      : "text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {activeTab === "friends" && (
          <section className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <IoPeople className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-blue-500">Followers</p>
                  <p className="text-2xl font-semibold text-blue-900">
                    {overviewLoading ? "--" : overview?.stats?.followers ?? 0}
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center">
                  <IoHeart className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-blue-500">Following</p>
                  <p className="text-2xl font-semibold text-blue-900">
                    {overviewLoading ? "--" : overview?.stats?.following ?? 0}
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-yellow-100 text-yellow-500 flex items-center justify-center">
                  <IoStar className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-blue-500">Mutual Friends</p>
                  <p className="text-2xl font-semibold text-blue-900">
                    {overviewLoading ? "--" : overview?.stats?.mutual ?? 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm">
              <div className="flex items-center justify-between p-4 border-b border-blue-100">
                <div>
                  <h2 className="text-lg font-semibold text-blue-900">
                    Favorite friends
                  </h2>
                  <p className="text-sm text-blue-500">
                    Pin up to {MAX_FAVORITE_FRIENDS} friends you chat with the
                    most.
                  </p>
                </div>
                <span className="text-sm text-blue-500">
                  {favoriteIds.size}/{MAX_FAVORITE_FRIENDS}
                </span>
              </div>
              <div className="divide-y divide-blue-50">
                {overviewLoading ? (
                  <EmptyState title="Loading favorites..." />
                ) : favoriteList.length === 0 ? (
                  <EmptyState
                    title="No favorites yet"
                    description="Add mutual friends to favorites to see them here."
                  />
                ) : (
                  favoriteList.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between gap-3 p-4 hover:bg-blue-50/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar user={friend} size="md" />
                        <div>
                          <p className="text-blue-900 font-medium">
                            {buildDisplayName(friend)}
                          </p>
                          <p className="text-sm text-blue-500">
                            @{friend.username} • Mutual
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            navigate("/chat", {
                              state: { targetUserId: friend.id },
                            })
                          }
                          className="px-3 py-1.5 text-sm rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200"
                        >
                          Open chat
                        </button>
                        <button
                          onClick={() => handleToggleFavorite(friend.id)}
                          disabled={savingFavorites}
                          className={`p-2 rounded-full border transition-colors ${
                            friend.isFavorite
                              ? "bg-yellow-100 border-yellow-300 text-yellow-500"
                              : "bg-white border-blue-200 text-blue-400 hover:text-blue-600"
                          }`}
                        >
                          <IoStar className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b border-blue-100">
                <h2 className="text-lg font-semibold text-blue-900">
                  Mutual friends
                </h2>
              </div>
              <div className="divide-y divide-blue-50">
                {overviewLoading ? (
                  <EmptyState title="Loading mutual friends..." />
                ) : mutualFriends.length === 0 ? (
                  <EmptyState
                    title="No mutual friends yet"
                    description="Follow back people who already follow you to build mutual connections."
                  />
                ) : (
                  mutualFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between gap-3 p-4 hover:bg-blue-50/40"
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar user={friend} size="md" />
                        <div>
                          <p className="font-medium text-blue-900">
                            {buildDisplayName(friend)}
                          </p>
                          <p className="text-sm text-blue-500">
                            @{friend.username} •{" "}
                            {friend.isFavorite ? "Favorite" : "Mutual"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleFavorite(friend.id)}
                          disabled={savingFavorites}
                          className={`p-2 rounded-full border transition-colors ${
                            friend.isFavorite
                              ? "bg-yellow-100 border-yellow-300 text-yellow-500"
                              : "bg-white border-blue-200 text-blue-400 hover:text-blue-600"
                          }`}
                        >
                          <IoStar className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() =>
                            navigate("/chat", {
                              state: { targetUserId: friend.id },
                            })
                          }
                          className="px-3 py-1.5 text-sm rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200"
                        >
                          Message
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm">
                <div className="p-4 border-b border-blue-100">
                  <h2 className="text-lg font-semibold text-blue-900">
                    Followers
                  </h2>
                </div>
                <div className="divide-y divide-blue-50">
                  {overviewLoading ? (
                    <EmptyState title="Loading followers..." />
                  ) : (overview?.followers || []).length === 0 ? (
                    <EmptyState
                      title="No followers yet"
                      description="Share your profile to grow your audience."
                    />
                  ) : (
                    (overview?.followers || []).map((person) => (
                      <div
                        key={person.id}
                        className="flex items-center justify-between gap-3 p-4 hover:bg-blue-50/40"
                      >
                        <div className="flex items-center gap-3">
                          <UserAvatar user={person} size="md" />
                          <div>
                            <p className="text-blue-900 font-medium">
                              {buildDisplayName(person)}
                            </p>
                            <p className="text-sm text-blue-500">
                              @{person.username} •{" "}
                              {person.isMutual ? "Mutual" : "Follows you"}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleFollowToggle(person)}
                          className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border ${
                            person.isFollowing
                              ? "border-red-200 text-red-500 hover:bg-red-50"
                              : "border-blue-200 text-blue-600 hover:bg-blue-100"
                          }`}
                        >
                          {person.isFollowing ? (
                            <>
                              <IoPersonRemoveOutline className="w-4 h-4" />
                              <span>Unfollow</span>
                            </>
                          ) : (
                            <>
                              <IoPersonAddOutline className="w-4 h-4" />
                              <span>Follow back</span>
                            </>
                          )}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm">
                <div className="p-4 border-b border-blue-100">
                  <h2 className="text-lg font-semibold text-blue-900">
                    Following
                  </h2>
                </div>
                <div className="divide-y divide-blue-50">
                  {overviewLoading ? (
                    <EmptyState title="Loading following..." />
                  ) : (overview?.following || []).length === 0 ? (
                    <EmptyState
                      title="You're not following anyone yet"
                      description="Explore the discover tab to find people."
                    />
                  ) : (
                    (overview?.following || []).map((person) => (
                      <div
                        key={person.id}
                        className="flex items-center justify-between gap-3 p-4 hover:bg-blue-50/40"
                      >
                        <div className="flex items-center gap-3">
                          <UserAvatar user={person} size="md" />
                          <div>
                            <p className="text-blue-900 font-medium">
                              {buildDisplayName(person)}
                            </p>
                            <p className="text-sm text-blue-500">
                              @{person.username} •{" "}
                              {person.isMutual ? "Mutual" : "You follow"}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            handleFollowToggle({ ...person, isFollowing: true })
                          }
                          className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                        >
                          <IoPersonRemoveOutline className="w-4 h-4" />
                          <span>Unfollow</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === "discover" && (
          <section className="space-y-6">
            <form
              onSubmit={handleSearchSubmit}
              className="bg-white rounded-xl shadow-sm p-4"
            >
              <div className="relative">
                <IoSearch className="w-5 h-5 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search writers by name or username"
                  className="w-full pl-10 pr-32 py-2.5 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                  disabled={searching}
                >
                  {searching ? "Searching..." : "Search"}
                </button>
              </div>
            </form>

            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b border-blue-100">
                <h2 className="text-lg font-semibold text-blue-900">
                  Search results
                </h2>
              </div>
              <div className="divide-y divide-blue-50">
                {searching ? (
                  <EmptyState title="Searching users..." />
                ) : searchResults.length === 0 ? (
                  <EmptyState
                    title="No users yet"
                    description="Try a different search term to discover more writers."
                  />
                ) : (
                  searchResults.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center justify-between gap-3 p-4 hover:bg-blue-50/40"
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar user={person} size="md" />
                        <div>
                          <p className="font-medium text-blue-900">
                            {buildDisplayName(person)}
                          </p>
                          <p className="text-sm text-blue-500">
                            @{person.username}
                            {person.isMutual && (
                              <span className="ml-2 text-green-500">
                                Mutual
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleFollowToggle(person)}
                        className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border ${
                          person.isFollowing
                            ? "border-red-200 text-red-500 hover:bg-red-50"
                            : "border-blue-200 text-blue-600 hover:bg-blue-100"
                        }`}
                      >
                        {person.isFollowing ? (
                          <>
                            <IoPersonRemoveOutline className="w-4 h-4" />
                            <span>Unfollow</span>
                          </>
                        ) : (
                          <>
                            <IoPersonAddOutline className="w-4 h-4" />
                            <span>Follow</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === "circles" && (
          <section className="space-y-6">
            <form
              onSubmit={handleCreateCircle}
              className="bg-white rounded-xl shadow-sm p-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-blue-900">
                  Create a circle
                </h2>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                  disabled={creatingCircle}
                >
                  <IoAdd className="w-5 h-5" />
                  {creatingCircle ? "Creating..." : "Create"}
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-blue-700">
                    Circle name
                  </label>
                  <input
                    type="text"
                    value={circleForm.name}
                    onChange={(event) =>
                      setCircleForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    className="mt-1 w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Writers midnight club"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-blue-700">
                    Description
                  </label>
                  <textarea
                    value={circleForm.description}
                    onChange={(event) =>
                      setCircleForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    className="mt-1 w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Let others know what this circle is about"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-blue-700">
                      Visibility
                    </label>
                    <select
                      value={circleForm.visibility}
                      onChange={(event) =>
                        setCircleForm((prev) => ({
                          ...prev,
                          visibility: event.target.value,
                        }))
                      }
                      className="mt-1 w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="public">Public</option>
                      <option value="private">Private (key required)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-blue-700">
                      Theme
                    </label>
                    <select
                      value={circleForm.theme}
                      onChange={(event) =>
                        setCircleForm((prev) => ({
                          ...prev,
                          theme: event.target.value,
                        }))
                      }
                      className="mt-1 w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {themes.map((theme) => (
                        <option key={theme} value={theme}>
                          {theme.charAt(0).toUpperCase() + theme.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {circleForm.visibility === "private" && (
                  <div>
                    <label className="text-sm font-medium text-blue-700">
                      Join key
                    </label>
                    <input
                      type="text"
                      value={circleForm.joinKey}
                      maxLength={4}
                      onChange={(event) =>
                        setCircleForm((prev) => ({
                          ...prev,
                          joinKey: event.target.value,
                        }))
                      }
                      className="mt-1 w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="4-digit key"
                    />
                  </div>
                )}
              </div>
            </form>

            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b border-blue-100 space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-blue-900">
                      Your circles
                    </h2>
                    <p className="text-sm text-blue-500">
                      Public and private circles live together here—join or open
                      any of them.
                    </p>
                  </div>
                  <div className="relative w-full sm:w-auto sm:min-w-[220px]">
                    <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 w-4 h-4" />
                    <input
                      type="text"
                      value={circleSearchTerm}
                      onChange={handleCircleSearchChange}
                      placeholder="Search circles"
                      className="w-full pl-9 pr-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              <div className="divide-y divide-blue-50">
                {circlesLoading ? (
                  <EmptyState title="Loading circles..." />
                ) : circles.length === 0 ? (
                  <EmptyState
                    title="No circles yet"
                    description="Create a circle or join a public one to get started."
                  />
                ) : filteredCircles.length === 0 ? (
                  <EmptyState
                    title="No matches"
                    description="Try a different name or description."
                  />
                ) : (
                  filteredCircles.map((circle) => {
                    const ownerId = normaliseId(
                      circle.owner?.id || circle.owner?._id || circle.owner
                    );
                    const isOwner = ownerId && ownerId === selfId;
                    const canDelete =
                      isOwner && circle.membership?.role === "owner";

                    return (
                      <div
                        key={circle.id}
                        className="p-4 space-y-3 transition-colors hover:bg-blue-50/40"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-blue-900">
                                {circle.name}
                              </p>
                              {circle.membership?.role && (
                                <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">
                                  {circle.membership.role}
                                </span>
                              )}
                              {circle.visibility === "private" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-600">
                                  <IoLockClosed className="w-3.5 h-3.5" />
                                  Private
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-blue-500">
                              {circle.memberCount} members •{" "}
                              {circle.lastActivityAt
                                ? `Active ${formatRelativeTime(
                                    circle.lastActivityAt
                                  )}`
                                : "New circle"}
                            </p>
                            {circle.description && (
                              <p className="text-sm text-blue-600">
                                {circle.description}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2 items-stretch sm:items-end">
                            <div className="flex flex-wrap gap-2 justify-end">
                              {circle.membership ? (
                                <>
                                  <button
                                    onClick={() =>
                                      handleSelectCircle(circle.id)
                                    }
                                    className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                  >
                                    Open chat
                                  </button>
                                  {canDelete && (
                                    <button
                                      onClick={() =>
                                        requestCircleDelete(circle)
                                      }
                                      disabled={
                                        processingDelete &&
                                        deleteDialog?.id === circle.id
                                      }
                                      className={`inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                                        processingDelete &&
                                        deleteDialog?.id === circle.id
                                          ? "border-red-200 text-red-400 bg-red-50 cursor-not-allowed"
                                          : "border-red-200 text-red-500 hover:bg-red-50"
                                      }`}
                                    >
                                      <IoTrash className="w-4 h-4" />
                                      Delete
                                    </button>
                                  )}
                                </>
                              ) : (
                                <button
                                  onClick={() => handleJoinCircleClick(circle)}
                                  disabled={joiningCircleId === circle.id}
                                  className={`inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                                    joiningCircleId === circle.id
                                      ? "border-blue-200 text-blue-400 bg-blue-50 cursor-not-allowed"
                                      : "border-blue-200 text-blue-600 hover:bg-blue-100"
                                  }`}
                                >
                                  <IoPersonAddOutline className="w-4 h-4" />
                                  {joiningCircleId === circle.id
                                    ? "Joining..."
                                    : circle.requiresKey
                                    ? "Join with key"
                                    : "Join"}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        {circle.membersPreview?.length > 0 && (
                          <div className="flex items-center gap-3">
                            <div className="flex -space-x-2">
                              {circle.membersPreview
                                .slice(0, 5)
                                .map((member) => (
                                  <UserAvatar
                                    key={member.id}
                                    user={member.user}
                                    size="sm"
                                    className="border-2 border-white shadow-sm"
                                  />
                                ))}
                            </div>
                            {circle.memberCount >
                              circle.membersPreview.length && (
                              <span className="text-xs text-blue-500">
                                +
                                {circle.memberCount -
                                  circle.membersPreview.length}{" "}
                                more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      {joinDialog.circle && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-blue-900/40 px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-blue-100 p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-blue-900">
                Join circle
              </h3>
              <p className="text-sm text-blue-500">
                Enter the 4-digit key to join "{joinDialog.circle.name}".
              </p>
            </div>
            <form onSubmit={handleJoinDialogSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-blue-700">
                  Join key
                </label>
                <input
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={joinDialog.key}
                  onChange={(event) => {
                    const nextValue = event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 4);
                    setJoinDialog((prev) => ({ ...prev, key: nextValue }));
                  }}
                  className="mt-1 w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent tracking-[.5em] text-center text-lg font-semibold text-blue-900"
                  placeholder="••••"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeJoinDialog}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50"
                  disabled={joiningCircleId === joinDialog.circle.id}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    joiningCircleId === joinDialog.circle.id ||
                    joinDialog.key.trim().length !== 4
                  }
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                    joiningCircleId === joinDialog.circle.id ||
                    joinDialog.key.trim().length !== 4
                      ? "bg-blue-200 text-white cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {joiningCircleId === joinDialog.circle.id
                    ? "Joining..."
                    : "Join circle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteDialog && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-blue-900/40 px-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-blue-100 p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-blue-900">
                Delete circle
              </h3>
              <p className="text-sm text-blue-500">
                Deleting "{deleteDialog.name}" removes all members and messages.
                This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={processingDelete}
                onClick={() => setDeleteDialog(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCircle}
                disabled={processingDelete}
                className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                  processingDelete
                    ? "border-red-200 bg-red-100 text-red-400 cursor-not-allowed"
                    : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                }`}
              >
                {processingDelete ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
