import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useCurrentUser } from "../hooks/useAuth";
import { api, followUser, unfollowUser } from "../utils/api";
import {
  buildDisplayName,
  resolveAvatarUrl,
  formatRelativeTime,
} from "../utils/socialHelpers";
import {
  IoArrowBack,
  IoLocationOutline,
  IoPeopleOutline,
  IoCalendarOutline,
  IoMailOutline,
  IoLink,
  IoPersonAddOutline,
  IoShieldCheckmark,
  IoPersonCircleOutline,
  IoChatbubbleOutline,
  IoBookOutline,
  IoDocumentTextOutline,
  IoHeartOutline,
  IoPricetagOutline,
  IoHappyOutline,
  IoGlobeOutline,
} from "react-icons/io5";

const LIMITED_SOCIAL_KEYS = [
  { key: "website", label: "Website", icon: IoLink },
  { key: "email", label: "Email", icon: IoMailOutline },
];

const FALLBACK_PROFILE = {
  displayName: "Community Member",
  username: "creator",
  bio: "This creator keeps things mysterious for now.",
  followerCount: 0,
  followingCount: 0,
  joinedDate: null,
  location: null,
  achievements: [],
  socialLinks: {},
};

const formatStat = (value) => {
  if (typeof value !== "number") return "0";
  if (value < 1000) return `${value}`;
  if (value < 1000000) return `${(value / 1000).toFixed(1)}k`;
  return `${(value / 1000000).toFixed(1)}m`;
};

export default function ProfilePreview() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useCurrentUser();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [actionPending, setActionPending] = useState(false);

  const profileId = useMemo(() => {
    if (!profile) return null;
    return profile._id || profile.id || profile.userId || null;
  }, [profile]);

  const fetchProfile = useCallback(async () => {
    if (!slug) {
      setError("Missing profile reference");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await api.get(`/community/user/${slug}/preview`, {
        params: { full: true },
      });
      const data = response.data || {};
      setProfile({ ...FALLBACK_PROFILE, ...data });
      setIsFollowing(Boolean(data.isFollowing));
    } catch (requestError) {
      console.error("Failed to load profile preview", requestError);
      setError(
        requestError.response?.data?.message ||
          "We couldn't load this profile right now."
      );
      setProfile(FALLBACK_PROFILE);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const avatarUrl = resolveAvatarUrl(profile?.profileImage);
  const displayName = buildDisplayName(profile) || FALLBACK_PROFILE.displayName;
  const username = profile?.username;
  const locationLabel = profile?.location || profile?.address?.city;
  const joinedLabel = profile?.joinedDate
    ? formatRelativeTime(profile.joinedDate)
    : null;
  const followersList = Array.isArray(profile?.followers)
    ? profile.followers
    : [];
  const followingList = Array.isArray(profile?.following)
    ? profile.following
    : [];
  const recentPosts = Array.isArray(profile?.recentPosts)
    ? profile.recentPosts
    : [];
  const recentEntries = Array.isArray(profile?.recentEntries)
    ? profile.recentEntries
    : [];

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/community");
    }
  };

  const viewerId = useMemo(
    () => currentUser?.id || currentUser?._id || null,
    [currentUser?.id, currentUser?._id]
  );

  const handleStartMessage = useCallback(() => {
    if (!profileId) {
      toast.error("Profile information is unavailable.");
      return;
    }

    if (viewerId && profileId.toString() === viewerId.toString()) {
      toast("This is your own profile.");
      return;
    }

    navigate(`/chat?open=${encodeURIComponent(profileId)}`);
  }, [navigate, profileId, viewerId]);

  const handleFollowToggle = async () => {
    if (!profileId || actionPending || profileId === viewerId) return;

    try {
      setActionPending(true);
      if (isFollowing) {
        await unfollowUser(profileId);
        setIsFollowing(false);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                followerCount: Math.max((prev.followerCount || 1) - 1, 0),
              }
            : prev
        );
        toast.success("Unfollowed");
      } else {
        await followUser(profileId);
        setIsFollowing(true);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                followerCount: (prev.followerCount || 0) + 1,
              }
            : prev
        );
        toast.success("You're now following");
      }
    } catch (requestError) {
      console.error("Follow toggle failed", requestError);
      toast.error(
        requestError.response?.data?.message || "Unable to update follow status"
      );
    } finally {
      setActionPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-6"
        >
          <IoArrowBack className="w-5 h-5" />
          Back
        </button>

        <div className="bg-white/80 backdrop-blur-md border border-blue-100 rounded-3xl shadow-xl overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
          <div className="px-6 sm:px-10 pb-10 -mt-16">
            <div className="flex flex-col sm:flex-row sm:items-end gap-6">
              <div className="w-28 h-28 rounded-3xl border-4 border-white shadow-lg overflow-hidden bg-blue-100 flex items-center justify-center text-white text-3xl font-semibold">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                      {displayName}
                    </h1>
                    {username && (
                      <p className="text-sm text-gray-500">@{username}</p>
                    )}
                  </div>
                  {profile?.isVerified && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-semibold text-xs">
                      <IoShieldCheckmark className="w-4 h-4" />
                      Verified
                    </span>
                  )}
                </div>
                <p className="mt-3 text-gray-600 leading-relaxed">
                  {loading
                    ? "Loading bio..."
                    : profile?.bio || FALLBACK_PROFILE.bio}
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-4 text-sm text-gray-500">
                  {locationLabel && (
                    <span className="inline-flex items-center gap-2">
                      <IoLocationOutline className="w-4 h-4" />
                      {locationLabel}
                    </span>
                  )}
                  {joinedLabel && (
                    <span className="inline-flex items-center gap-2">
                      <IoCalendarOutline className="w-4 h-4" />
                      Joined {joinedLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-center">
                <div className="text-2xl font-semibold text-blue-600">
                  {formatStat(profile?.followerCount)}
                </div>
                <div className="text-xs uppercase tracking-wide text-blue-500">
                  Followers
                </div>
              </div>
              <div className="rounded-2xl border border-purple-100 bg-purple-50/70 p-4 text-center">
                <div className="text-2xl font-semibold text-purple-600">
                  {formatStat(profile?.followingCount)}
                </div>
                <div className="text-xs uppercase tracking-wide text-purple-500">
                  Following
                </div>
              </div>
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-center">
                <div className="text-2xl font-semibold text-indigo-600">
                  {formatStat(
                    profile?.mutualConnections || profile?.mutualCount || 0
                  )}
                </div>
                <div className="text-xs uppercase tracking-wide text-indigo-500">
                  Mutuals
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleFollowToggle}
                disabled={actionPending || profileId === viewerId}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full font-semibold transition-colors ${
                  actionPending || profileId === viewerId
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : isFollowing
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                <IoPersonAddOutline className="w-4 h-4" />
                {isFollowing ? "Following" : "Follow"}
              </button>
              <button
                type="button"
                onClick={handleStartMessage}
                disabled={!profileId || profileId === viewerId}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full font-semibold border ${
                  !profileId || profileId === viewerId
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <IoPeopleOutline className="w-4 h-4" />
                Message
              </button>
            </div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {LIMITED_SOCIAL_KEYS.filter(
                ({ key }) => profile?.socialLinks?.[key]
              ).map(({ key, label, icon: Icon }) => (
                <a
                  key={key}
                  href={
                    key === "email"
                      ? `mailto:${profile.socialLinks[key]}`
                      : profile.socialLinks[key]
                  }
                  target={key === "email" ? "_self" : "_blank"}
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700"
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{label}</span>
                </a>
              ))}

              {LIMITED_SOCIAL_KEYS.every(
                ({ key }) => !profile?.socialLinks?.[key]
              ) && (
                <div className="px-4 py-3 rounded-2xl bg-gray-100 text-gray-500 text-sm">
                  No contact links shared yet.
                </div>
              )}
            </div>

            {profile?.achievements?.length > 0 && (
              <div className="mt-10">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                  Highlights
                </h2>
                <div className="flex flex-wrap gap-2">
                  {profile.achievements
                    .slice(0, 6)
                    .map((achievement, index) => (
                      <span
                        key={achievement._id || achievement.id || index}
                        className="px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold"
                      >
                        {achievement.title || achievement.name || achievement}
                      </span>
                    ))}
                </div>
              </div>
            )}

            <div className="mt-10 grid grid-cols-1 gap-6">
              <section className="rounded-3xl border border-blue-100 bg-blue-50/70 p-5">
                <header className="flex items-center gap-2 mb-3">
                  <IoPersonCircleOutline className="w-5 h-5 text-blue-500" />
                  <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wide">
                    About
                  </h3>
                </header>
                <p className="text-sm text-blue-900 leading-relaxed">
                  {profile?.about ||
                    profile?.bio ||
                    "This user prefers to keep the details light. Follow them to see more updates in your community feed."}
                </p>
                {profile?.address && (
                  <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-blue-800">
                    {profile.address.city && (
                      <div className="flex items-center gap-2">
                        <IoLocationOutline className="w-4 h-4" />
                        <span>{profile.address.city}</span>
                      </div>
                    )}
                    {profile.address.country && (
                      <div className="flex items-center gap-2">
                        <IoGlobeOutline className="w-4 h-4" />
                        <span>{profile.address.country}</span>
                      </div>
                    )}
                  </dl>
                )}
              </section>

              <section className="rounded-3xl border border-purple-100 bg-white p-5 shadow-sm">
                <header className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <IoPeopleOutline className="w-5 h-5 text-purple-500" />
                    <h3 className="text-sm font-semibold text-purple-700 uppercase tracking-wide">
                      Community
                    </h3>
                  </div>
                  <span className="text-xs text-purple-500">
                    Followers & Following
                  </span>
                </header>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-semibold text-purple-500 uppercase tracking-wide mb-2">
                      Followers ({followersList.length})
                    </h4>
                    {followersList.length === 0 ? (
                      <p className="text-sm text-purple-400">
                        No followers to show yet.
                      </p>
                    ) : (
                      <ul className="space-y-2 max-h-48 overflow-auto pr-2">
                        {followersList.map((follower) => (
                          <li
                            key={follower._id}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-purple-50/70"
                          >
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600 overflow-hidden">
                              {follower.avatar ? (
                                <img
                                  src={follower.avatar}
                                  alt={follower.displayName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                follower.displayName.charAt(0).toUpperCase()
                              )}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-purple-900">
                                {follower.displayName}
                              </p>
                              {follower.bio && (
                                <p className="text-xs text-purple-500 line-clamp-1">
                                  {follower.bio}
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-purple-500 uppercase tracking-wide mb-2">
                      Following ({followingList.length})
                    </h4>
                    {followingList.length === 0 ? (
                      <p className="text-sm text-purple-400">
                        Not following anyone yet.
                      </p>
                    ) : (
                      <ul className="space-y-2 max-h-48 overflow-auto pr-2">
                        {followingList.map((follow) => (
                          <li
                            key={follow._id}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-purple-50/70"
                          >
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600 overflow-hidden">
                              {follow.avatar ? (
                                <img
                                  src={follow.avatar}
                                  alt={follow.displayName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                follow.displayName.charAt(0).toUpperCase()
                              )}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-purple-900">
                                {follow.displayName}
                              </p>
                              {follow.bio && (
                                <p className="text-xs text-purple-500 line-clamp-1">
                                  {follow.bio}
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-sm">
                <header className="flex items-center justify-between mb-4 text-indigo-600">
                  <div className="flex items-center gap-2">
                    <IoChatbubbleOutline className="w-5 h-5" />
                    <h3 className="text-sm font-semibold uppercase tracking-wide">
                      Recent Community Posts
                    </h3>
                  </div>
                  <span className="text-xs text-indigo-400">
                    Last {recentPosts.length} posts
                  </span>
                </header>
                {recentPosts.length === 0 ? (
                  <p className="text-sm text-indigo-400">
                    No public posts to show yet.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {recentPosts.map((post) => (
                      <li
                        key={post._id}
                        className="rounded-2xl bg-indigo-50/60 border border-indigo-100 px-4 py-3"
                      >
                        <div className="flex items-center justify-between text-xs text-indigo-500 mb-2">
                          <span className="inline-flex items-center gap-1">
                            <IoDocumentTextOutline className="w-3.5 h-3.5" />
                            {post.postType}
                          </span>
                          <time dateTime={post.createdAt}>
                            {formatRelativeTime(post.createdAt)}
                          </time>
                        </div>
                        <p className="text-sm text-indigo-900 line-clamp-3">
                          {post.content || "Shared an update."}
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-xs text-indigo-500">
                          <span className="inline-flex items-center gap-1">
                            <IoHeartOutline className="w-3.5 h-3.5" />
                            {post.likesCount}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <IoChatbubbleOutline className="w-3.5 h-3.5" />
                            {post.commentsCount}
                          </span>
                          {Array.isArray(post.hashtags) &&
                            post.hashtags.length > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <IoPricetagOutline className="w-3.5 h-3.5" />
                                {post.hashtags.slice(0, 2).join(", ")}
                              </span>
                            )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-3xl border border-amber-100 bg-white p-5 shadow-sm">
                <header className="flex items-center justify-between mb-4 text-amber-600">
                  <div className="flex items-center gap-2">
                    <IoBookOutline className="w-5 h-5" />
                    <h3 className="text-sm font-semibold uppercase tracking-wide">
                      Latest Journal Entries
                    </h3>
                  </div>
                  <span className="text-xs text-amber-400">
                    Recent {recentEntries.length} entries
                  </span>
                </header>
                {recentEntries.length === 0 ? (
                  <p className="text-sm text-amber-400">
                    No entries shared yet.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {recentEntries.map((entry) => (
                      <li
                        key={entry._id}
                        className="rounded-2xl bg-amber-50/60 border border-amber-100 px-4 py-3"
                      >
                        <div className="flex items-center justify-between text-xs text-amber-500 mb-2">
                          <span className="inline-flex items-center gap-1">
                            <IoDocumentTextOutline className="w-3.5 h-3.5" />
                            {entry.visibility === "public"
                              ? "Public"
                              : "Private"}
                          </span>
                          <time dateTime={entry.createdAt}>
                            {formatRelativeTime(entry.createdAt)}
                          </time>
                        </div>
                        <h4 className="text-sm font-semibold text-amber-800 line-clamp-1">
                          {entry.title}
                        </h4>
                        <p className="text-sm text-amber-900 line-clamp-3">
                          {entry.aiSummary ||
                            entry.content ||
                            "Entry details hidden."}
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-xs text-amber-500">
                          {entry.mood && (
                            <span className="inline-flex items-center gap-1">
                              <IoHappyOutline className="w-3.5 h-3.5" />
                              {entry.mood}
                            </span>
                          )}
                          {Array.isArray(entry.tags) &&
                            entry.tags.length > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <IoPricetagOutline className="w-3.5 h-3.5" />
                                {entry.tags.slice(0, 2).join(", ")}
                              </span>
                            )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
