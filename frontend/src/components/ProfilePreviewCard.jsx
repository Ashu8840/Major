import PropTypes from "prop-types";
import {
  IoClose,
  IoPersonAddOutline,
  IoMailOutline,
  IoLink,
  IoLogoInstagram,
  IoLogoTwitter,
  IoLogoLinkedin,
  IoCalendarOutline,
  IoCheckmarkCircleOutline,
} from "react-icons/io5";
import {
  buildDisplayName,
  resolveAvatarUrl,
  formatRelativeTime,
} from "../utils/socialHelpers";

const socialItems = [
  { key: "website", label: "Website", icon: IoLink },
  { key: "instagram", label: "Instagram", icon: IoLogoInstagram },
  { key: "twitter", label: "X", icon: IoLogoTwitter },
  { key: "linkedin", label: "LinkedIn", icon: IoLogoLinkedin },
];

const ProfilePreviewCard = ({
  profile,
  loading,
  error,
  onClose,
  onFollowToggle,
  onMessage,
  onViewProfile,
}) => {
  const displayName = buildDisplayName(profile);
  const avatarUrl = resolveAvatarUrl(profile?.profileImage);
  const followerCount = profile?.followerCount ?? 0;
  const followingCount = profile?.followingCount ?? 0;
  const totalPosts = profile?.stats?.totalPosts ?? 0;
  const joinedLabel = profile?.joinedDate
    ? formatRelativeTime(profile.joinedDate)
    : null;
  const infoPlaceholder = loading || !profile;

  const handleFollow = () => {
    if (profile?._id && onFollowToggle) {
      onFollowToggle(profile._id);
    }
  };

  const handleMessage = () => {
    if (profile?._id && onMessage) {
      onMessage(profile);
    }
  };

  const handleViewProfile = () => {
    if (profile && onViewProfile) {
      onViewProfile(profile);
    }
  };

  return (
    <div className="relative bg-white rounded-3xl shadow-2xl border border-blue-100 max-w-md w-full overflow-hidden">
      <div className="absolute top-3 right-3">
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/80 backdrop-blur text-gray-600 hover:bg-blue-50 flex items-center justify-center transition-colors"
        >
          <IoClose className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 h-28" />
      <div className="px-6 pb-6 -mt-14">
        <div className="flex items-end gap-4">
          <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-blue-100 flex items-center justify-center text-white text-2xl font-semibold">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              {displayName}
              {profile?.isVerified && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs">
                  ✓
                </span>
              )}
            </h3>
            {profile?.username && (
              <p className="text-sm text-gray-500">@{profile.username}</p>
            )}
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-700 leading-relaxed">
          {infoPlaceholder
            ? "Loading profile details..."
            : profile?.bio
            ? profile.bio
            : "This creator hasn’t added a bio yet."}
        </div>

        {joinedLabel && (
          <div className="mt-3 inline-flex items-center gap-2 text-xs text-gray-500 bg-gray-100/70 px-3 py-1 rounded-full">
            <IoCalendarOutline className="w-3.5 h-3.5" />
            Joined {joinedLabel}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <div className="text-lg font-semibold text-blue-600">
              {totalPosts}
            </div>
            <div className="text-xs text-blue-500 uppercase tracking-wide">
              Posts
            </div>
          </div>
          <div className="bg-indigo-50 rounded-xl p-3 text-center">
            <div className="text-lg font-semibold text-indigo-600">
              {followerCount}
            </div>
            <div className="text-xs text-indigo-500 uppercase tracking-wide">
              Followers
            </div>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <div className="text-lg font-semibold text-purple-600">
              {followingCount}
            </div>
            <div className="text-xs text-purple-500 uppercase tracking-wide">
              Following
            </div>
          </div>
        </div>

        {Array.isArray(profile?.achievements) &&
        profile.achievements.length > 0 ? (
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <IoCheckmarkCircleOutline className="w-4 h-4 text-emerald-500" />
              Achievements
            </h4>
            <div className="flex flex-wrap gap-2">
              {profile.achievements.map((achievement, index) => (
                <span
                  key={index}
                  className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium"
                >
                  {achievement.title || achievement.name || achievement}
                </span>
              ))}
            </div>
          </div>
        ) : infoPlaceholder ? (
          <div className="mt-6 text-xs text-gray-400">Loading highlights…</div>
        ) : null}

        <div className="mt-6 space-y-2 text-sm">
          {socialItems
            .filter(({ key }) => profile?.socialLinks?.[key])
            .map(({ key, label, icon: Icon }) => (
              <a
                key={key}
                href={profile.socialLinks[key]}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700"
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{label}</span>
              </a>
            ))}
          {profile?.socialLinks &&
            !socialItems.some(({ key }) => profile.socialLinks[key]) && (
              <p className="text-xs text-gray-500">
                No social links shared yet.
              </p>
            )}
          {!profile && !loading && (
            <p className="text-xs text-gray-400">Profile info unavailable.</p>
          )}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleFollow}
            disabled={!profile || loading}
            className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full font-semibold transition-colors ${
              profile?.isFollowing
                ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                : "bg-blue-600 text-white hover:bg-blue-700"
            } ${loading || !profile ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <IoPersonAddOutline className="w-4 h-4" />
            {profile?.isFollowing ? "Following" : "Follow"}
          </button>
          <button
            type="button"
            onClick={handleMessage}
            disabled={!profile || loading}
            className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full font-semibold transition-colors ${
              loading || !profile
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <IoMailOutline className="w-4 h-4" />
            Message
          </button>
        </div>

        <button
          type="button"
          onClick={handleViewProfile}
          disabled={!profile}
          className={`mt-4 w-full text-sm font-semibold transition-colors ${
            profile ? "text-blue-600 hover:text-blue-700" : "text-gray-400"
          }`}
        >
          View full profile
        </button>
      </div>

      {loading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}
      {error && !loading && (
        <div className="absolute inset-x-6 bottom-6 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}
    </div>
  );
};

ProfilePreviewCard.propTypes = {
  profile: PropTypes.object,
  loading: PropTypes.bool,
  error: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onFollowToggle: PropTypes.func,
  onMessage: PropTypes.func,
  onViewProfile: PropTypes.func,
};

ProfilePreviewCard.defaultProps = {
  profile: null,
  loading: false,
  error: "",
  onFollowToggle: undefined,
  onMessage: undefined,
  onViewProfile: undefined,
};

export default ProfilePreviewCard;
