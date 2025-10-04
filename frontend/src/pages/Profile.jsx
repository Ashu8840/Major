import { useState, useContext, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import { AuthContext } from "../context/AuthContext";
import {
  IoCamera,
  IoCreate,
  IoHeart,
  IoStar,
  IoTrophy,
  IoFlame,
  IoBook,
  IoAnalytics,
  IoBookmark,
  IoAdd,
  IoTime,
  IoEye,
  IoChatbubble,
  IoPerson,
  IoShare,
  IoGrid,
  IoList,
  IoCheckmarkCircle,
  IoSparkles,
  IoTrendingUp,
  IoDocument,
  IoImage,
  IoChevronForward,
  IoCalendar,
  IoLocation,
  IoGlobe,
  IoLogoTwitter,
  IoLogoInstagram,
  IoLogoLinkedin,
  IoClose,
  IoCloudUpload,
} from "react-icons/io5";
import {
  uploadProfileImage,
  uploadCoverPhoto,
  getProfile,
  getUserContent,
  getUserFavorites,
  getUserBooks,
  followUser,
  unfollowUser,
} from "../utils/api";

export default function Profile() {
  const { user, userProfile, fetchUserProfile } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("posts");
  const [viewMode, setViewMode] = useState("grid");
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageType, setImageType] = useState(""); // "profile" or "cover"

  // Profile data state
  const [profileData, setProfileData] = useState(null);
  const [profileStats, setProfileStats] = useState(null);
  const [profileAnalytics, setProfileAnalytics] = useState(null);
  const [userContent, setUserContent] = useState({
    entries: [],
    posts: [],
    stories: [],
    books: [],
  });
  const [userFavorites, setUserFavorites] = useState([]);
  const [userBooks, setUserBooks] = useState([]);

  // File input refs
  const profileImageRef = useRef(null);
  const coverImageRef = useRef(null);

  const calculateProfileCompletion = useCallback((userData) => {
    let completion = 0;
    const profileImageUrl =
      typeof userData.profileImage === "string"
        ? userData.profileImage
        : userData.profileImage?.url || userData.profilePicture;
    const fields = [
      userData.displayName || userData.username,
      userData.bio,
      profileImageUrl,
      userData.address?.city,
      userData.socialLinks?.website ||
        userData.socialLinks?.twitter ||
        userData.socialLinks?.instagram,
    ];

    fields.forEach((field) => {
      if (typeof field === "string") {
        if (field.trim() !== "") completion += 20;
      } else if (field) {
        completion += 20;
      }
    });

    return completion;
  }, []);

  const mapUserToProfileData = useCallback(
    (userData) => {
      const resolvedProfileImage = (() => {
        if (!userData) return { url: "/api/placeholder/150/150" };
        if (typeof userData.profileImage === "string") {
          return { url: userData.profileImage };
        }
        if (userData.profileImage?.url) {
          return userData.profileImage;
        }
        if (userData.profilePicture) {
          return { url: userData.profilePicture };
        }
        return { url: "/api/placeholder/150/150" };
      })();

      const resolvedCoverPhoto = (() => {
        if (!userData) return { url: "/api/placeholder/800/300" };
        if (typeof userData.coverPhoto === "string") {
          return { url: userData.coverPhoto };
        }
        if (userData.coverPhoto?.url) {
          return userData.coverPhoto;
        }
        return { url: "/api/placeholder/800/300" };
      })();

      const contentPreview = userData?.contentPreview || {};

      return {
        _id: userData._id || userData.id,
        username: userData.username,
        displayName: userData.displayName || userData.username,
        bio: userData.bio || "",
        userId: userData.userId || "DA-2025-USER001",
        email: userData.email,
        profileImage: resolvedProfileImage,
        coverPhoto: resolvedCoverPhoto,
        isVerified: userData.isVerified || false,
        joinedDate:
          userData.joinedDate || userData.createdAt || new Date().toISOString(),
        address: userData.address || {
          city: "",
          country: "",
        },
        socialLinks: userData.socialLinks || {},
        stats: userData.stats || {
          totalEntries:
            userData.contentCounts?.entries ?? userData.entries?.length ?? 0,
          totalStories:
            userData.contentCounts?.stories ?? userData.stories?.length ?? 0,
          totalPosts:
            userData.contentCounts?.posts ?? userData.posts?.length ?? 0,
          totalReads: userData.stats?.totalReads || userData.totalReads || 0,
          dayStreak: userData.stats?.dayStreak ||
            userData.dayStreak || {
              current: 0,
              longest: 0,
            },
        },
        followerCount:
          userData.followerCount || userData.followers?.length || 0,
        followingCount:
          userData.followingCount || userData.following?.length || 0,
        achievements: userData.achievements || [],
        analytics: userData.analytics || {
          engagementRate: 0,
          avgWordsPerEntry: 0,
        },
        profileCompletionPercentage:
          userData.profileCompletionPercentage ||
          calculateProfileCompletion(userData),
        entries: userData.entries || contentPreview.entries || [],
        posts: userData.posts || contentPreview.posts || [],
        stories: userData.stories || contentPreview.stories || [],
        books: userData.books || contentPreview.books || [],
        favorites: userData.favorites || {
          entries: [],
          posts: [],
          stories: [],
        },
      };
    },
    [calculateProfileCompletion]
  );

  const generateStatsFromUser = useCallback((userData) => {
    const stats = userData?.stats || {};
    return {
      totalEntries:
        stats.totalEntries ??
        userData?.contentCounts?.entries ??
        userData?.entries?.length ??
        0,
      totalStories:
        stats.totalStories ??
        userData?.contentCounts?.stories ??
        userData?.stories?.length ??
        0,
      totalPosts:
        stats.totalPosts ??
        userData?.contentCounts?.posts ??
        userData?.posts?.length ??
        0,
      totalReads: stats.totalReads ?? userData?.totalReads ?? 0,
      profileViews: userData?.profileViews || 0,
      engagementRate:
        stats.engagementRate ?? userData?.analytics?.engagementRate ?? 0,
    };
  }, []);

  const generateAnalyticsFromUser = useCallback((userData) => {
    return {
      profileViews: userData?.profileViews || 0,
      profileViewsGrowth: "+0",
      readsGrowth: "+0",
      engagementRate:
        userData?.stats?.engagementRate ??
        userData?.analytics?.engagementRate ??
        0,
    };
  }, []);

  const getFallbackProfileData = useCallback(() => {
    // Use real user data if available, otherwise demo data
    const baseUser = userProfile || user;

    if (baseUser) {
      return mapUserToProfileData(baseUser);
    }

    return {
      _id: "demo-user",
      username: "demo_user",
      displayName: "Demo User",
      bio: "Welcome to my digital diary! 📚✨",
      userId: "DA-2025-DEMO001",
      email: "demo@example.com",
      profileImage: { url: "/api/placeholder/150/150" },
      coverPhoto: { url: "/api/placeholder/800/300" },
      isVerified: false,
      joinedDate: new Date().toISOString(),
      address: {
        city: "Demo City",
        country: "Demo Country",
      },
      socialLinks: {},
      stats: {
        totalEntries: 12,
        totalStories: 3,
        totalPosts: 8,
        totalReads: 156,
        dayStreak: {
          current: 5,
          longest: 12,
        },
      },
      followerCount: 42,
      followingCount: 38,
      achievements: [
        {
          id: "welcome",
          name: "Welcome!",
          description: "Welcome to the platform",
          category: "milestone",
        },
      ],
      analytics: {
        engagementRate: 12.5,
        avgWordsPerEntry: 245,
      },
      profileCompletionPercentage: 60,
    };
  }, [userProfile, user, mapUserToProfileData]);

  const getFallbackStats = useCallback(() => {
    return {
      totalEntries: 12,
      totalStories: 3,
      totalPosts: 8,
      totalReads: 156,
      profileViews: 89,
      engagementRate: 12.5,
    };
  }, []);

  const getFallbackAnalytics = useCallback(() => {
    return {
      profileViews: 89,
      profileViewsGrowth: "+8",
      readsGrowth: "+15",
      engagementRate: 12.5,
    };
  }, []);

  const loadProfileData = useCallback(async () => {
    setLoading(true);

    try {
      const [profileResult, contentResult, favoritesResult, booksResult] =
        await Promise.allSettled([
          getProfile(),
          getUserContent(null, "all", 1, 12),
          getUserFavorites("all", 1),
          getUserBooks(null, 1, 12),
        ]);

      const fallbackSource = userProfile || user;
      const resolvedProfile =
        (profileResult.status === "fulfilled" && profileResult.value) ||
        fallbackSource;

      if (resolvedProfile) {
        setProfileData(mapUserToProfileData(resolvedProfile));
        setProfileStats(generateStatsFromUser(resolvedProfile));
        setProfileAnalytics(generateAnalyticsFromUser(resolvedProfile));
        setIsFollowing(Boolean(resolvedProfile.isFollowing));
      } else {
        const fallbackProfile = getFallbackProfileData();
        setProfileData(fallbackProfile);
        setProfileStats(getFallbackStats());
        setProfileAnalytics(getFallbackAnalytics());
        setIsFollowing(false);
      }

      if (contentResult.status === "fulfilled" && contentResult.value) {
        const payload = contentResult.value.content || {
          entries: [],
          posts: [],
          stories: [],
          books: [],
        };
        setUserContent({
          entries: payload.entries || [],
          posts: payload.posts || [],
          stories: payload.stories || [],
          books: payload.books || [],
        });
      } else if (resolvedProfile) {
        const preview = resolvedProfile.contentPreview || {};
        setUserContent({
          entries: preview.entries || resolvedProfile.entries || [],
          posts: preview.posts || resolvedProfile.posts || [],
          stories: preview.stories || resolvedProfile.stories || [],
          books: preview.books || resolvedProfile.books || [],
        });
      } else {
        setUserContent({ entries: [], posts: [], stories: [], books: [] });
      }

      if (favoritesResult.status === "fulfilled" && favoritesResult.value) {
        setUserFavorites(favoritesResult.value.favorites || []);
      } else {
        setUserFavorites([]);
      }

      if (booksResult.status === "fulfilled" && booksResult.value) {
        setUserBooks(booksResult.value.books || []);
      } else if (resolvedProfile?.books) {
        setUserBooks(resolvedProfile.books);
      } else {
        setUserBooks([]);
      }
    } catch (error) {
      console.error("Error loading profile data:", error);
      const fallbackProfile = getFallbackProfileData();
      setProfileData(fallbackProfile);
      setProfileStats(getFallbackStats());
      setProfileAnalytics(getFallbackAnalytics());
      setUserContent({ entries: [], posts: [], stories: [], books: [] });
      setUserFavorites([]);
      setUserBooks([]);
      setIsFollowing(false);
    } finally {
      setLoading(false);
    }
  }, [
    userProfile,
    user,
    mapUserToProfileData,
    generateStatsFromUser,
    generateAnalyticsFromUser,
    getFallbackProfileData,
    getFallbackStats,
    getFallbackAnalytics,
  ]);

  useEffect(() => {
    if (userProfile || user) {
      loadProfileData();
    } else {
      // Set fallback data if no user
      setProfileData(getFallbackProfileData());
      setLoading(false);
    }
  }, [userProfile, user, loadProfileData, getFallbackProfileData]);

  const handleImageUpload = async (file, type) => {
    if (!user) {
      toast.error("Please log in to upload images");
      return;
    }

    if (!["profile", "cover"].includes(type)) {
      toast.error(
        "Couldn't determine where to apply this image. Please try again."
      );
      return;
    }

    try {
      if (type === "profile") {
        setUploadingProfile(true);
      } else if (type === "cover") {
        setUploadingCover(true);
      }

      const uploadFn =
        type === "profile" ? uploadProfileImage : uploadCoverPhoto;
      const result = await uploadFn(file);

      if (type === "profile" && result?.profileImage?.url) {
        setProfileData((prev) => ({
          ...prev,
          profileImage: result.profileImage,
        }));
        toast.success("Profile photo updated");
      } else if (type === "cover" && result?.coverPhoto?.url) {
        setProfileData((prev) => ({ ...prev, coverPhoto: result.coverPhoto }));
        toast.success("Cover photo updated");
      } else {
        throw new Error("Unexpected response from server");
      }

      if (typeof fetchUserProfile === "function") {
        await fetchUserProfile();
      }

      setShowImageModal(false);
      setImageType("");
    } catch (error) {
      console.error(`Error uploading ${type} image:`, error);
      toast.error(
        error.response?.data?.message ||
          `Failed to upload ${
            type === "profile" ? "profile" : "cover"
          } image. Please try again.`
      );
    } finally {
      if (type === "profile") {
        setUploadingProfile(false);
      }
      if (type === "cover") {
        setUploadingCover(false);
      }
    }
  };

  const openImageModal = (type) => {
    setImageType(type);
    setShowImageModal(true);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        toast.error("File size must be less than 5MB");
        event.target.value = "";
        return;
      }
      handleImageUpload(file, imageType);
      event.target.value = "";
    }
  };

  const handleFollow = async () => {
    try {
      if (!user) {
        toast.error("Please log in to follow users");
        return;
      }

      const targetId = currentProfileData?._id;
      if (!targetId) {
        toast.error("Unable to identify the profile to follow.");
        return;
      }

      if (isFollowing) {
        const response = await unfollowUser(targetId);
        setIsFollowing(false);
        setProfileData((prev) =>
          prev
            ? {
                ...prev,
                followerCount: Math.max(0, (prev.followerCount || 1) - 1),
              }
            : prev
        );
        toast.success(response?.message || "Unfollowed successfully");
      } else {
        const response = await followUser(targetId);
        setIsFollowing(true);
        setProfileData((prev) =>
          prev
            ? {
                ...prev,
                followerCount: (prev.followerCount || 0) + 1,
              }
            : prev
        );
        toast.success(response?.message || "Followed successfully");
      }

      if (typeof fetchUserProfile === "function") {
        await fetchUserProfile();
      }
    } catch (error) {
      console.error("Error following/unfollowing user:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to update follow status. Please try again."
      );
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num?.toString() || "0";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Always show profile data (either real or fallback)
  const currentProfileData = profileData || getFallbackProfileData();
  const resolvedStats = profileStats || currentProfileData.stats || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Cover Banner */}
      <div className="relative h-64 md:h-80 bg-gradient-to-r from-blue-600 to-purple-700 overflow-hidden mb-4">
        {currentProfileData.coverPhoto?.url ? (
          <img
            src={currentProfileData.coverPhoto.url}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-600 to-purple-700"></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>

        {user && user.id === currentProfileData._id && (
          <button
            onClick={() => openImageModal("cover")}
            disabled={uploadingCover}
            className="absolute top-4 right-4 p-3 bg-black/30 hover:bg-black/50 rounded-full text-white transition-colors disabled:opacity-50"
          >
            {uploadingCover ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <IoCamera className="w-5 h-5" />
            )}
          </button>
        )}
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Profile Header */}
        <div className="relative px-4 md:px-8 pb-6">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6 -mt-20">
            {/* Profile Picture */}
            <div className="relative">
              <img
                src={
                  currentProfileData.profileImage?.url ||
                  "/api/placeholder/150/150"
                }
                alt={
                  currentProfileData.displayName || currentProfileData.username
                }
                className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-xl object-cover"
              />

              {user && user.id === currentProfileData._id && (
                <button
                  onClick={() => openImageModal("profile")}
                  disabled={uploadingProfile}
                  className="absolute bottom-2 right-2 p-2 bg-blue-600 hover:bg-blue-700 rounded-full text-white shadow-lg transition-colors disabled:opacity-50"
                >
                  {uploadingProfile ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <IoCamera className="w-4 h-4" />
                  )}
                </button>
              )}

              {currentProfileData.isVerified && (
                <div className="absolute -top-2 -right-2 p-1 bg-blue-600 rounded-full">
                  <IoCheckmarkCircle className="w-6 h-6 text-white" />
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {currentProfileData.displayName ||
                    currentProfileData.username}
                </h1>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium">
                    {currentProfileData.userId}
                  </span>
                  <span className="text-gray-500">
                    @{currentProfileData.username}
                  </span>
                </div>
              </div>

              {currentProfileData.bio && (
                <p className="text-gray-600 max-w-2xl">
                  {currentProfileData.bio}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                {currentProfileData.address?.city && (
                  <span className="flex items-center gap-1">
                    <IoLocation className="w-4 h-4" />
                    {currentProfileData.address.city}
                    {currentProfileData.address.country &&
                      `, ${currentProfileData.address.country}`}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <IoCalendar className="w-4 h-4" />
                  Joined {formatDate(currentProfileData.joinedDate)}
                </span>
              </div>

              {/* Social Links */}
              {currentProfileData.socialLinks && (
                <div className="flex items-center gap-3">
                  {currentProfileData.socialLinks.website && (
                    <a
                      href={currentProfileData.socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <IoGlobe className="w-5 h-5" />
                    </a>
                  )}
                  {currentProfileData.socialLinks.twitter && (
                    <a
                      href={`https://twitter.com/${currentProfileData.socialLinks.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <IoLogoTwitter className="w-5 h-5" />
                    </a>
                  )}
                  {currentProfileData.socialLinks.instagram && (
                    <a
                      href={`https://instagram.com/${currentProfileData.socialLinks.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-600 hover:text-pink-700"
                    >
                      <IoLogoInstagram className="w-5 h-5" />
                    </a>
                  )}
                  {currentProfileData.socialLinks.linkedin && (
                    <a
                      href={currentProfileData.socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 hover:text-blue-800"
                    >
                      <IoLogoLinkedin className="w-5 h-5" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {user && user.id !== currentProfileData._id && (
                <>
                  <button
                    onClick={handleFollow}
                    className={`px-6 py-2 rounded-full font-medium transition-colors ${
                      isFollowing
                        ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    <IoPerson className="w-4 h-4 inline mr-2" />
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                  <button className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full font-medium transition-colors">
                    <IoChatbubble className="w-4 h-4 inline mr-2" />
                    Message
                  </button>
                </>
              )}
              <button className="p-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full transition-colors">
                <IoShare className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center p-4 bg-white rounded-xl shadow-sm border">
              <div className="text-2xl font-bold text-blue-600">
                {formatNumber(resolvedStats.totalEntries || 0)}
              </div>
              <div className="text-sm text-gray-500">Entries</div>
            </div>
            <div className="text-center p-4 bg-white rounded-xl shadow-sm border">
              <div className="text-2xl font-bold text-purple-600">
                {formatNumber(resolvedStats.totalStories || 0)}
              </div>
              <div className="text-sm text-gray-500">Stories</div>
            </div>
            <div className="text-center p-4 bg-white rounded-xl shadow-sm border">
              <div className="text-2xl font-bold text-green-600">
                {formatNumber(currentProfileData.followerCount || 0)}
              </div>
              <div className="text-sm text-gray-500">Followers</div>
            </div>
            <div className="text-center p-4 bg-white rounded-xl shadow-sm border">
              <div className="text-2xl font-bold text-yellow-600">
                {formatNumber(currentProfileData.followingCount || 0)}
              </div>
              <div className="text-sm text-gray-500">Following</div>
            </div>
            <div className="text-center p-4 bg-white rounded-xl shadow-sm border">
              <div className="text-2xl font-bold text-orange-600">
                {resolvedStats.dayStreak?.current || 0}
              </div>
              <div className="text-sm text-gray-500">Day Streak</div>
            </div>
            <div className="text-center p-4 bg-white rounded-xl shadow-sm border">
              <div className="text-2xl font-bold text-red-600">
                {formatNumber(resolvedStats.totalReads || 0)}
              </div>
              <div className="text-sm text-gray-500">Total Reads</div>
            </div>
          </div>

          {/* Achievements */}
          {((user?.achievements && user.achievements.length > 0) ||
            (currentProfileData.achievements &&
              currentProfileData.achievements.length > 0)) && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Achievements (
                {user?.achievements?.length ||
                  currentProfileData.achievements?.length ||
                  0}
                )
              </h3>
              <div className="flex flex-wrap gap-3">
                {(
                  user?.achievements ||
                  currentProfileData.achievements ||
                  []
                ).map((achievement, index) => (
                  <div
                    key={achievement.id || achievement._id || index}
                    className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border hover:shadow-md transition-shadow"
                    title={achievement.description}
                  >
                    <IoTrophy className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm font-medium text-gray-700">
                      {achievement.name || achievement.title}
                    </span>
                    {achievement.category && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full ml-1">
                        {achievement.category}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content Tabs */}
        <div className="px-4 md:px-8">
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
              {[
                { id: "posts", label: "Posts & Entries", icon: IoDocument },
                { id: "books", label: "Books", icon: IoBook },
                { id: "analytics", label: "Analytics", icon: IoAnalytics },
                { id: "favorites", label: "Favorites", icon: IoBookmark },
              ].map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-1 py-4 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="mb-8">
            {activeTab === "posts" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Posts & Entries
                  </h2>
                  <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`p-2 rounded ${
                          viewMode === "grid" ? "bg-white shadow-sm" : ""
                        }`}
                      >
                        <IoGrid className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={`p-2 rounded ${
                          viewMode === "list" ? "bg-white shadow-sm" : ""
                        }`}
                      >
                        <IoList className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                      : "space-y-4"
                  }
                >
                  {/* Display real user entries and stories */}
                  {(() => {
                    const allContent = [];

                    const entriesSource =
                      (userContent.entries?.length
                        ? userContent.entries
                        : currentProfileData.entries) || [];
                    entriesSource.forEach((entry) => {
                      allContent.push({
                        ...entry,
                        type: "entry",
                        _id:
                          entry._id ||
                          entry.id ||
                          `entry-${Date.now()}-${Math.random()}`,
                        title: entry.title || "Untitled Entry",
                        content:
                          entry.content ||
                          entry.description ||
                          "No content available",
                        createdAt:
                          entry.createdAt ||
                          entry.date ||
                          new Date().toISOString(),
                        mood: entry.mood,
                        tags: entry.tags,
                        visibility: entry.visibility || "private",
                        likes: entry.likes || entry.stats?.likes || [],
                        comments: entry.comments || [],
                        views: entry.views || entry.stats?.views || 0,
                        media: entry.media || [],
                      });
                    });

                    const storiesSource =
                      (userContent.stories?.length
                        ? userContent.stories
                        : currentProfileData.stories) || [];
                    storiesSource.forEach((story) => {
                      allContent.push({
                        ...story,
                        type: "story",
                        _id:
                          story._id ||
                          story.id ||
                          `story-${Date.now()}-${Math.random()}`,
                        title: story.title || "Untitled Story",
                        content:
                          story.content ||
                          story.description ||
                          "No content available",
                        createdAt:
                          story.publishedAt ||
                          story.createdAt ||
                          new Date().toISOString(),
                        status: story.status || "draft",
                        genre: story.genre,
                        visibility: story.visibility || "public",
                        likes: story.likes || story.stats?.likes || [],
                        comments: story.comments || [],
                        views: story.views || story.stats?.views || 0,
                      });
                    });

                    const postsSource =
                      (userContent.posts?.length
                        ? userContent.posts
                        : currentProfileData.posts) || [];
                    postsSource.forEach((post) => {
                      allContent.push({
                        ...post,
                        type: "post",
                        _id:
                          post._id ||
                          post.id ||
                          `post-${Date.now()}-${Math.random()}`,
                        title: post.title || "Untitled Post",
                        content:
                          post.content || post.text || "No content available",
                        createdAt: post.createdAt || new Date().toISOString(),
                        visibility: post.visibility || "public",
                        likes: post.likes || [],
                        comments: post.comments || [],
                        views: post.views || 0,
                        media: post.media || [],
                      });
                    });

                    const booksSource =
                      (userContent.books?.length
                        ? userContent.books
                        : userBooks?.length
                        ? userBooks
                        : currentProfileData.books) || [];
                    booksSource.forEach((book) => {
                      allContent.push({
                        ...book,
                        type: "book",
                        _id:
                          book._id ||
                          book.id ||
                          `book-${Date.now()}-${Math.random()}`,
                        title: book.title || "Untitled Book",
                        content:
                          book.description || "No description available yet.",
                        createdAt:
                          book.updatedAt ||
                          book.createdAt ||
                          new Date().toISOString(),
                        visibility: book.visibility || "private",
                        likes: book.stats?.likes || [],
                        comments: book.comments || [],
                        views: book.stats?.views || 0,
                        coverImage: book.coverImage,
                      });
                    });

                    // Sort by creation date (newest first)
                    allContent.sort(
                      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
                    );

                    return allContent.length > 0 ? (
                      allContent.map((content) => (
                        <div
                          key={content._id}
                          className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow overflow-hidden"
                        >
                          {content.media && content.media.length > 0 && (
                            <img
                              src={content.media[0].url}
                              alt={content.title}
                              className="w-full h-48 object-cover"
                            />
                          )}
                          {!content.media?.length &&
                            content.type === "book" &&
                            content.coverImage?.url && (
                              <img
                                src={content.coverImage.url}
                                alt={content.title}
                                className="w-full h-48 object-cover"
                              />
                            )}
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">
                                  {formatDate(content.createdAt)}
                                </span>
                                <span
                                  className={`px-2 py-1 text-xs rounded-full ${
                                    content.type === "entry"
                                      ? "bg-blue-100 text-blue-800"
                                      : content.type === "story"
                                      ? "bg-purple-100 text-purple-800"
                                      : content.type === "book"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-green-100 text-green-800"
                                  }`}
                                >
                                  {content.type}
                                </span>
                              </div>
                              {content.visibility === "public" && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                  Public
                                </span>
                              )}
                            </div>

                            <h3 className="font-semibold text-gray-900 mb-2">
                              {content.title}
                            </h3>

                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                              {content.content}
                            </p>

                            {/* Show mood for entries */}
                            {content.type === "entry" && content.mood && (
                              <div className="mb-2">
                                <span className="text-sm text-gray-500">
                                  Mood:{" "}
                                </span>
                                <span className="text-sm font-medium text-blue-600">
                                  {content.mood}
                                </span>
                              </div>
                            )}

                            {/* Show genre for stories */}
                            {content.type === "story" && content.genre && (
                              <div className="mb-2">
                                <span className="text-sm text-gray-500">
                                  Genre:{" "}
                                </span>
                                <span className="text-sm font-medium text-purple-600">
                                  {content.genre}
                                </span>
                              </div>
                            )}

                            {/* Show status for books */}
                            {content.type === "book" && content.status && (
                              <div className="mb-2">
                                <span className="text-sm text-gray-500">
                                  Status:{" "}
                                </span>
                                <span className="text-sm font-medium text-amber-600">
                                  {content.status}
                                </span>
                              </div>
                            )}

                            {/* Show tags */}
                            {content.tags && content.tags.length > 0 && (
                              <div className="mb-3">
                                <div className="flex flex-wrap gap-1">
                                  {content.tags
                                    .slice(0, 3)
                                    .map((tag, index) => (
                                      <span
                                        key={index}
                                        className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                                      >
                                        #{tag}
                                      </span>
                                    ))}
                                  {content.tags.length > 3 && (
                                    <span className="text-xs text-gray-500">
                                      +{content.tags.length - 3} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <IoHeart className="w-4 h-4" />
                                {Array.isArray(content.likes)
                                  ? content.likes.length
                                  : content.likes?.total || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <IoChatbubble className="w-4 h-4" />
                                {content.comments?.length || 0}
                              </span>
                              {content.views && (
                                <span className="flex items-center gap-1">
                                  <IoEye className="w-4 h-4" />
                                  {content.views}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full text-center py-12">
                        <IoDocument className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-2">No content yet</p>
                        <p className="text-sm text-gray-400">
                          {user && user.id === currentProfileData._id
                            ? "Start by creating your first entry or story!"
                            : "This user hasn't shared any content yet."}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {activeTab === "books" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Published Books
                  </h2>
                  {user && user.id === currentProfileData._id && (
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      <IoAdd className="w-4 h-4" />
                      Add Book
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {user?.stories && user.stories.length > 0 ? (
                    user.stories.map((story, index) => (
                      <div
                        key={story._id || story.id || index}
                        className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow overflow-hidden"
                      >
                        <div className="relative">
                          <img
                            src={
                              story.coverImage?.url ||
                              story.image?.url ||
                              "/api/placeholder/200/300"
                            }
                            alt={story.title || `Story ${index + 1}`}
                            className="w-full h-64 object-cover"
                          />
                          <span
                            className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
                              story.status === "published" ||
                              story.status === "public"
                                ? "bg-green-100 text-green-800"
                                : story.status === "draft"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {story.status || "draft"}
                          </span>
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                            {story.title || `Story ${index + 1}`}
                          </h3>
                          <p className="text-sm text-gray-500 mb-2">
                            {story.genre || "General"}
                          </p>
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                            {story.description ||
                              story.content?.substring(0, 100) + "..." ||
                              "No description available"}
                          </p>
                          {story.averageRating && story.averageRating > 0 ? (
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex items-center gap-1">
                                <IoStar className="w-4 h-4 text-yellow-400" />
                                <span className="text-sm font-medium">
                                  {story.averageRating.toFixed(1)}
                                </span>
                              </div>
                              <span className="text-sm text-gray-500">
                                • {story.stats?.reads || story.views || 0} reads
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm text-gray-500">
                                {story.stats?.reads || story.views || 0} reads
                              </span>
                            </div>
                          )}
                          {story.publishedAt && (
                            <div className="text-xs text-gray-500">
                              Published:{" "}
                              {new Date(story.publishedAt).toLocaleDateString()}
                            </div>
                          )}
                          {story.wordCount && (
                            <div className="text-xs text-gray-500 mt-1">
                              {story.wordCount.toLocaleString()} words
                            </div>
                          )}
                          {story.tags && story.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {story.tags.slice(0, 2).map((tag, tagIndex) => (
                                <span
                                  key={tagIndex}
                                  className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                              {story.tags.length > 2 && (
                                <span className="text-xs text-gray-500">
                                  +{story.tags.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12">
                      <IoBook className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 mb-2">
                        No stories published yet
                      </p>
                      <p className="text-sm text-gray-400">
                        {user && user.id === currentProfileData._id
                          ? "Start writing your first story!"
                          : "This user hasn't published any stories yet."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "analytics" && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Analytics Overview
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <IoTrendingUp className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Profile Views
                        </h3>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatNumber(profileAnalytics?.profileViews || 0)}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-green-600">
                      {profileAnalytics?.profileViewsGrowth || "+0"}% from last
                      week
                    </p>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <IoFlame className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Writing Streak
                        </h3>
                        <p className="text-2xl font-bold text-purple-600">
                          {currentProfileData.stats?.dayStreak?.current || 0}{" "}
                          days
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Longest:{" "}
                      {currentProfileData.stats?.dayStreak?.longest || 0} days
                    </p>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <IoEye className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Total Reads
                        </h3>
                        <p className="text-2xl font-bold text-green-600">
                          {formatNumber(
                            currentProfileData.stats?.totalReads || 0
                          )}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-green-600">
                      {profileAnalytics?.readsGrowth || "+0"}% from last month
                    </p>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-yellow-100 rounded-lg">
                        <IoSparkles className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Engagement Rate
                        </h3>
                        <p className="text-2xl font-bold text-yellow-600">
                          {(
                            currentProfileData.analytics?.engagementRate || 0
                          ).toFixed(1)}
                          %
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">Average engagement</p>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-red-100 rounded-lg">
                        <IoDocument className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Avg Words/Entry
                        </h3>
                        <p className="text-2xl font-bold text-red-600">
                          {Math.round(
                            currentProfileData.analytics?.avgWordsPerEntry || 0
                          )}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">Per entry average</p>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-indigo-100 rounded-lg">
                        <IoCheckmarkCircle className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Profile Completion
                        </h3>
                        <p className="text-2xl font-bold text-indigo-600">
                          {currentProfileData.profileCompletionPercentage || 0}%
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Profile completeness
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "favorites" && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Saved Favorites
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {user?.bookmarks && user.bookmarks.length > 0 ? (
                    user.bookmarks.map((bookmark, index) => (
                      <div
                        key={bookmark._id || bookmark.id || index}
                        className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow overflow-hidden"
                      >
                        {bookmark.media && bookmark.media.length > 0 ? (
                          <img
                            src={bookmark.media[0].url}
                            alt={bookmark.title || "Bookmarked Content"}
                            className="w-full h-48 object-cover"
                          />
                        ) : bookmark.image?.url ? (
                          <img
                            src={bookmark.image.url}
                            alt={bookmark.title || "Bookmarked Content"}
                            className="w-full h-48 object-cover"
                          />
                        ) : (
                          <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                            <IoBookmark className="w-12 h-12 text-blue-500" />
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                bookmark.type === "entry"
                                  ? "bg-blue-100 text-blue-800"
                                  : bookmark.type === "story"
                                  ? "bg-purple-100 text-purple-800"
                                  : bookmark.type === "post"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {bookmark.type || "bookmark"}
                            </span>
                            <span className="text-xs text-gray-500">
                              {bookmark.bookmarkedAt
                                ? new Date(
                                    bookmark.bookmarkedAt
                                  ).toLocaleDateString()
                                : bookmark.createdAt
                                ? formatDate(bookmark.createdAt)
                                : "Recently saved"}
                            </span>
                          </div>

                          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                            {bookmark.title || "Untitled"}
                          </h3>

                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {bookmark.content ||
                              bookmark.description ||
                              bookmark.text ||
                              "No description available"}
                          </p>

                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            {bookmark.author?.username && (
                              <>
                                <span>By @{bookmark.author.username}</span>
                                <span>•</span>
                              </>
                            )}
                            {bookmark.category && (
                              <span className="text-blue-600">
                                {bookmark.category}
                              </span>
                            )}
                          </div>

                          {bookmark.tags && bookmark.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {bookmark.tags
                                .slice(0, 3)
                                .map((tag, tagIndex) => (
                                  <span
                                    key={tagIndex}
                                    className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              {bookmark.tags.length > 3 && (
                                <span className="text-xs text-gray-500">
                                  +{bookmark.tags.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : user?.favorites && user.favorites.length > 0 ? (
                    user.favorites.map((favorite, index) => (
                      <div
                        key={favorite._id || favorite.id || index}
                        className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow overflow-hidden"
                      >
                        <img
                          src={
                            favorite.media?.[0]?.url ||
                            favorite.image?.url ||
                            "/api/placeholder/300/200"
                          }
                          alt={favorite.title || "Favorite"}
                          className="w-full h-48 object-cover"
                        />
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900 mb-2">
                            {favorite.title || "Untitled"}
                          </h3>
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {favorite.content ||
                              favorite.text ||
                              "No description available"}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>
                              By @{favorite.author?.username || "unknown"}
                            </span>
                            <span>•</span>
                            <span>{formatDate(favorite.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12">
                      <IoBookmark className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 mb-2">
                        No favorites saved yet
                      </p>
                      <p className="text-sm text-gray-400">
                        {user && user.id === currentProfileData._id
                          ? "Start bookmarking content you love!"
                          : "This user hasn't saved any favorites yet."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Upload Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Upload{" "}
                {imageType === "profile" ? "Profile Picture" : "Cover Photo"}
              </h3>
              <button
                onClick={() => {
                  setShowImageModal(false);
                  setImageType("");
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <IoClose className="w-5 h-5" />
              </button>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <IoCloudUpload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                Click to select or drag and drop your image
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                ref={imageType === "profile" ? profileImageRef : coverImageRef}
              />
              <button
                onClick={() => {
                  if (imageType === "profile") {
                    profileImageRef.current?.click();
                  } else {
                    coverImageRef.current?.click();
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Choose File
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Max file size: 5MB. Supported formats: JPG, PNG, WebP
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
