import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useCurrentUser } from "../hooks/useAuth";
import PostCard from "../components/PostCard";
import api from "../utils/api";
import { resolveAvatarUrl } from "../utils/socialHelpers";
import { useNotifications } from "../context/NotificationContext";
import { useLocation } from "react-router-dom";
import {
  IoAdd,
  IoSearch,
  IoFilter,
  IoImage,
  IoDocument,
  IoSend,
  IoClose,
  IoHeart,
  IoHeartOutline,
  IoChatbubbleOutline,
  IoShareOutline,
  IoBookmarkOutline,
  IoEllipsisHorizontal,
  IoFlame,
  IoTrendingUp,
  IoPeople,
  IoAnalytics,
  IoEye,
  IoThumbsUp,
  IoCheckmarkCircle,
  IoTime,
} from "react-icons/io5";

const createComposerState = (overrides = {}) => ({
  type: "text",
  content: "",
  media: [],
  pollQuestion: "",
  pollOptions: ["", ""],
  pollAllowMultiple: false,
  pollExpiresAt: "",
  articleTitle: "",
  articleSummary: "",
  articleBody: "",
  articleCover: null,
  eventTitle: "",
  eventLocation: "",
  eventStart: "",
  eventEnd: "",
  eventDescription: "",
  eventCapacity: "",
  eventIsVirtual: false,
  ...overrides,
});

const getComposerValidationError = (composer) => {
  if (!composer) return "Share something with the community";
  const type = composer.type || "text";
  const trimmedContent = (composer.content || "").trim();
  const pollOptions = (composer.pollOptions || [])
    .map((option) => option.trim())
    .filter(Boolean);

  switch (type) {
    case "text":
      return trimmedContent.length === 0
        ? "Share something with the community"
        : null;
    case "image":
      return composer.media?.length === 0 && trimmedContent.length === 0
        ? "Add an image or a caption to continue"
        : null;
    case "poll":
      if (!composer.pollQuestion?.trim()) {
        return "Ask a question for your poll";
      }
      if (pollOptions.length < 2) {
        return "Provide at least two poll options";
      }
      return null;
    case "article":
      if (!composer.articleTitle?.trim()) {
        return "Add a headline for your article";
      }
      if (!composer.articleBody?.trim()) {
        return "Write the article content";
      }
      return null;
    case "event":
      if (!composer.eventTitle?.trim()) {
        return "Give your event a title";
      }
      if (!composer.eventStart || !composer.eventEnd) {
        return "Provide the start and end time";
      }
      if (new Date(composer.eventEnd) < new Date(composer.eventStart)) {
        return "Event end time must be after the start time";
      }
      return null;
    default:
      return trimmedContent.length === 0
        ? "Share something with the community"
        : null;
  }
};

const Community = () => {
  const {
    currentUser,
    user: authUser,
    userProfile,
    refreshProfile,
  } = useCurrentUser();
  const location = useLocation();
  const { addNotification } = useNotifications();
  const user = authUser;
  const [posts, setPosts] = useState([]);
  const [trendingHashtags, setTrendingHashtags] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("recent");
  const [filterBy, setFilterBy] = useState("all");
  const [activeTab, setActiveTab] = useState("posts");
  const [showPostComposer, setShowPostComposer] = useState(false);
  const [composer, setComposer] = useState(() => createComposerState());
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [composerSubmitting, setComposerSubmitting] = useState(false);
  const [followedUsers, setFollowedUsers] = useState(new Set());
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [communityInsights, setCommunityInsights] = useState({
    totalPosts: 0,
    totalUsers: 0,
    totalLikes: 0,
    newUsersToday: 0,
  });
  const [savedPosts, setSavedPosts] = useState([]);
  const [highlightedPostId, setHighlightedPostId] = useState(null);
  const highlightTimeoutRef = useRef(null);
  const seenPostIdsRef = useRef(new Set());
  const postsInitializedRef = useRef(false);
  const composerTypeOptions = useMemo(
    () => [
      { id: "text", label: "Update", badge: "📝" },
      { id: "image", label: "Photo", badge: "🖼️" },
      { id: "poll", label: "Poll", badge: "📊" },
      { id: "article", label: "Article", badge: "✍️" },
      { id: "event", label: "Event", badge: "🎉" },
    ],
    []
  );
  const composerValidationError = useMemo(
    () => getComposerValidationError(composer),
    [composer]
  );
  const savedPostIds = useMemo(
    () => new Set(savedPosts.map((post) => post._id)),
    [savedPosts]
  );
  const sortedSavedPosts = useMemo(() => {
    return [...savedPosts].sort((a, b) => {
      const aTime = new Date(a.savedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.savedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    });
  }, [savedPosts]);
  const composerProfile = currentUser?.rawProfile || userProfile || user || {};
  const composerDisplayName =
    currentUser?.displayName ||
    composerProfile.displayName ||
    composerProfile.username ||
    currentUser?.username ||
    user?.username ||
    "User";
  const composerAvatarUrl =
    currentUser?.profileImageUrl ||
    resolveAvatarUrl(composerProfile.profileImage) ||
    resolveAvatarUrl(composerProfile.avatar) ||
    composerProfile.profileImageUrl ||
    null;
  const composerInitial = composerDisplayName
    ? composerDisplayName.charAt(0).toUpperCase()
    : "U";
  const seenStorageKey = useMemo(() => {
    if (!currentUser?.id) return null;
    return `community_seen_posts:${currentUser.id}`;
  }, [currentUser?.id]);

  const updateSeenPostStorage = useCallback(() => {
    if (typeof window === "undefined" || !seenStorageKey) return;
    try {
      const serialised = JSON.stringify(
        Array.from(seenPostIdsRef.current || [])
      );
      localStorage.setItem(seenStorageKey, serialised);
    } catch (storageError) {
      console.warn("Failed to persist seen community posts", storageError);
    }
  }, [seenStorageKey]);

  const isPostFromFollowedAuthor = useCallback(
    (post) => {
      if (!post?.author) return false;
      const author = post.author;
      const authorId = author._id || author.id || author.userId || null;
      if (authorId && typeof followedUsers?.has === "function") {
        if (followedUsers.has(authorId)) return true;
      }
      if (typeof author.isFollowed === "boolean" && author.isFollowed) {
        return true;
      }
      if (
        typeof author.isFollowedByCurrentUser === "boolean" &&
        author.isFollowedByCurrentUser
      ) {
        return true;
      }
      if (typeof author.isFollowing === "boolean" && author.isFollowing) {
        return true;
      }
      if (Array.isArray(author.followers)) {
        const viewerId = currentUser?.id || currentUser?._id || null;
        if (viewerId && author.followers.includes(viewerId)) {
          return true;
        }
      }
      return false;
    },
    [followedUsers, currentUser?.id, currentUser?._id]
  );

  const processFeedForNotifications = useCallback(
    (postList) => {
      if (!Array.isArray(postList) || postList.length === 0) return;
      const seenSet = seenPostIdsRef.current;
      const followedUpdates = [];

      postList.forEach((post) => {
        const postId = post?._id;
        if (!postId) return;
        if (!seenSet.has(postId)) {
          seenSet.add(postId);
          if (postsInitializedRef.current && isPostFromFollowedAuthor(post)) {
            followedUpdates.push(post);
          }
        }
      });

      if (postsInitializedRef.current && followedUpdates.length > 0) {
        followedUpdates.forEach((post) => {
          const authorName =
            post.author?.displayName ||
            post.author?.username ||
            post.author?.name ||
            "Someone you follow";
          const content = (post.content || "").trim();
          const message = content
            ? `${content.slice(0, 120)}${content.length > 120 ? "…" : ""}`
            : "Tap to read the latest update.";

          addNotification({
            type: "new_post",
            title: `${authorName} shared a new post`,
            message,
            link: `/community?highlight=${post._id}`,
            meta: {
              postId: post._id,
              authorId: post.author?._id || post.author?.id || null,
            },
            externalId: `community-post-${post._id}`,
          });
        });
      }

      if (!postsInitializedRef.current) {
        postsInitializedRef.current = true;
      }

      updateSeenPostStorage();
    },
    [addNotification, isPostFromFollowedAuthor, updateSeenPostStorage]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!seenStorageKey) {
      seenPostIdsRef.current = new Set();
      postsInitializedRef.current = false;
      return;
    }

    try {
      const stored = localStorage.getItem(seenStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          seenPostIdsRef.current = new Set(parsed);
        } else {
          seenPostIdsRef.current = new Set();
        }
      } else {
        seenPostIdsRef.current = new Set();
      }
    } catch (error) {
      console.warn("Failed to restore seen community posts", error);
      seenPostIdsRef.current = new Set();
    }

    postsInitializedRef.current = false;
  }, [seenStorageKey]);

  useEffect(() => {
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }

    const params = new URLSearchParams(location.search);
    const highlightId = params.get("highlight");
    setHighlightedPostId(highlightId);

    if (highlightId) {
      highlightTimeoutRef.current = setTimeout(
        () => setHighlightedPostId(null),
        8000
      );
    }

    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }
    };
  }, [location.search]);

  useEffect(() => {
    if (!highlightedPostId) return;

    const frame = requestAnimationFrame(() => {
      const element = document.querySelector(
        `[data-post-id="${highlightedPostId}"]`
      );
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [highlightedPostId, posts]);

  useEffect(() => {
    // Debounce API calls to prevent 429 errors
    const timeoutId = setTimeout(() => {
      loadCommunityData();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [sortBy]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("communitySavedPosts");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSavedPosts(parsed);
        }
      }
    } catch (storageError) {
      console.warn("Failed to restore saved posts", storageError);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("communitySavedPosts", JSON.stringify(savedPosts));
    } catch (storageError) {
      console.warn("Failed to persist saved posts", storageError);
    }
  }, [savedPosts]);

  // Cleanup blob URLs when component unmounts or media changes
  useEffect(() => {
    return () => {
      // Cleanup all blob URLs when component unmounts
      mediaPreviews.forEach((url) => {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [mediaPreviews]);

  const loadCommunityData = async () => {
    try {
      setLoading(true);
      setError(null);

      // First try to get basic stats to avoid 429 errors
      try {
        const basicStats = await api.get("/community/stats");
        setCommunityInsights((prev) => ({
          ...prev,
          totalUsers: basicStats.data.totalUsers || 3,
          totalPosts: basicStats.data.totalPosts || 0,
        }));
      } catch (statsError) {
        console.warn("Basic stats failed, using fallback", statsError);
      }

      // Then get other data with individual error handling
      const [postsRes, hashtagsRes, usersRes] = await Promise.all([
        api
          .get(`/community/feed?sort=${sortBy}&limit=20`)
          .catch(() => ({ data: { posts: [] } })),
        api.get("/community/trending?limit=5").catch(() => ({ data: [] })),
        api
          .get("/community/suggested-users?limit=5")
          .catch(() => ({ data: [] })),
      ]);

      const fetchedPosts = Array.isArray(postsRes.data.posts)
        ? [...postsRes.data.posts]
        : [];

      fetchedPosts.sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      });

      // Handle correct response structure from backend
      setPosts(fetchedPosts);
      processFeedForNotifications(fetchedPosts);
      setTrendingHashtags(hashtagsRes.data || []); // Backend returns array directly
      setSuggestedUsers(usersRes.data || []); // Backend returns array directly

      setSavedPosts((prev) =>
        prev.map((saved) => {
          const latest = fetchedPosts.find((post) => post._id === saved._id);
          if (!latest) return saved;
          return { ...latest, savedAt: saved.savedAt };
        })
      );

      // Try to get detailed insights (optional)
      try {
        const insightsRes = await api.get("/community/insights");
        if (insightsRes.data) {
          setCommunityInsights(insightsRes.data);
        }
      } catch (insightsError) {
        console.warn(
          "Detailed insights failed, using basic stats",
          insightsError
        );
        // Keep the basic stats we already set
        setCommunityInsights((prev) => ({
          ...prev,
          totalLikes:
            fetchedPosts.reduce(
              (total, post) => total + (post.likes?.length || 0),
              0
            ) || 0,
          totalComments:
            fetchedPosts.reduce(
              (total, post) => total + (post.comments?.length || 0),
              0
            ) || 0,
          activeUsersToday: usersRes.data?.length || 0,
          engagementRate: 0,
          newUsersToday: 0,
        }));
      }

      setRetryCount(0);
    } catch (error) {
      console.error("Error loading community data:", error);
      setError(
        `Failed to load community data: ${
          error.response?.status === 401 ? "Please log in again" : error.message
        }`
      );
      toast.error("Failed to load community data");
    } finally {
      setLoading(false);
    }
  };

  const retryLoadData = () => {
    setRetryCount((prev) => prev + 1);
    loadCommunityData();
  };

  const handleLikePost = async (postId, payload) => {
    try {
      let likeData = payload;
      if (!likeData) {
        const response = await api.post(`/community/post/${postId}/like`);
        likeData = response.data;
      }

      const nextLikesArray = Array.isArray(likeData.likes)
        ? likeData.likes
        : null;
      const nextLikesCount =
        typeof likeData.likesCount === "number"
          ? likeData.likesCount
          : nextLikesArray
          ? nextLikesArray.length
          : undefined;
      const nextIsLiked =
        typeof likeData.isLiked === "boolean" ? likeData.isLiked : undefined;

      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post._id === postId
            ? {
                ...post,
                likes: nextLikesArray ?? post.likes,
                likesCount:
                  nextLikesCount ??
                  (Array.isArray(post.likes)
                    ? post.likes.length
                    : typeof post.likesCount === "number"
                    ? post.likesCount
                    : 0),
                isLikedByUser: nextIsLiked ?? post.isLikedByUser,
              }
            : post
        )
      );

      setSavedPosts((prevSaved) =>
        prevSaved.map((saved) =>
          saved._id === postId
            ? {
                ...saved,
                likes: nextLikesArray ?? saved.likes,
                likesCount:
                  nextLikesCount ??
                  (Array.isArray(saved.likes)
                    ? saved.likes.length
                    : typeof saved.likesCount === "number"
                    ? saved.likesCount
                    : 0),
                isLikedByUser: nextIsLiked ?? saved.isLikedByUser,
              }
            : saved
        )
      );
    } catch (error) {
      console.error("Error liking post:", error);
      toast.error(
        `Failed to like post: ${
          error.response?.status === 401
            ? "Please log in again"
            : "Try again later"
        }`
      );
    }
  };

  const handleFollowUser = async (userId) => {
    try {
      const response = await api.post(`/community/follow/${userId}`);
      setFollowedUsers((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(userId)) {
          newSet.delete(userId);
        } else {
          newSet.add(userId);
        }
        return newSet;
      });
      toast.success(response.data.message || "Follow status updated");
      if (typeof refreshProfile === "function") {
        await refreshProfile({ silent: true });
      }
    } catch (error) {
      console.error("Error following user:", error);
      toast.error(
        `Failed to follow user: ${
          error.response?.status === 401
            ? "Please log in again"
            : "Try again later"
        }`
      );
    }
  };

  const handleSavePost = (postData, shouldSave) => {
    setSavedPosts((prev) => {
      if (shouldSave) {
        const existing = prev.find((item) => item._id === postData._id);
        const timestamp = existing?.savedAt || new Date().toISOString();
        const sourcePost =
          posts.find((item) => item._id === postData._id) || postData;
        const nextEntry = { ...sourcePost, savedAt: timestamp };

        if (existing) {
          return prev.map((item) =>
            item._id === postData._id ? nextEntry : item
          );
        }

        return [nextEntry, ...prev];
      }

      return prev.filter((item) => item._id !== postData._id);
    });
  };

  const handleDeletePost = (postId) => {
    // Remove the deleted post from the local state
    setPosts((prev) => prev.filter((post) => post._id !== postId));
    setSavedPosts((prev) => prev.filter((post) => post._id !== postId));
    // Refresh community data to get updated stats
    loadCommunityData();
  };

  const changeComposerType = (type) => {
    setComposer((prev) => {
      if (prev.type === type) return prev;
      const next = {
        ...createComposerState({ type }),
        content: prev.content,
        media: prev.media,
      };

      if (type === "poll") {
        next.pollQuestion = prev.pollQuestion;
        next.pollOptions = prev.pollOptions?.length
          ? [...prev.pollOptions]
          : ["", ""];
        next.pollAllowMultiple = prev.pollAllowMultiple;
        next.pollExpiresAt = prev.pollExpiresAt;
      }

      if (type === "article") {
        next.articleTitle = prev.articleTitle;
        next.articleSummary = prev.articleSummary;
        next.articleBody = prev.articleBody;
        next.articleCover = prev.articleCover;
      }

      if (type === "event") {
        next.eventTitle = prev.eventTitle;
        next.eventLocation = prev.eventLocation;
        next.eventStart = prev.eventStart;
        next.eventEnd = prev.eventEnd;
        next.eventDescription = prev.eventDescription;
        next.eventCapacity = prev.eventCapacity;
        next.eventIsVirtual = prev.eventIsVirtual;
      }

      return next;
    });
  };

  const updatePollOption = (index, value) => {
    setComposer((prev) => {
      const options = [...prev.pollOptions];
      options[index] = value;
      return { ...prev, pollOptions: options };
    });
  };

  const addPollOption = () => {
    setComposer((prev) => {
      if (prev.pollOptions.length >= 4) return prev;
      return { ...prev, pollOptions: [...prev.pollOptions, ""] };
    });
  };

  const removePollOption = (index) => {
    setComposer((prev) => {
      if (prev.pollOptions.length <= 2) return prev;
      return {
        ...prev,
        pollOptions: prev.pollOptions.filter((_, i) => i !== index),
      };
    });
  };

  const resetComposer = () => {
    setComposer(createComposerState());
    setMediaPreviews((prev) => {
      prev.forEach((url) => {
        if (url?.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
      return [];
    });
  };

  const openComposer = (type = "text") => {
    setComposer(createComposerState({ type }));
    setMediaPreviews([]);
    setShowPostComposer(true);
  };

  const closeComposer = () => {
    resetComposer();
    setShowPostComposer(false);
  };

  const handleCreatePost = async () => {
    if (composerSubmitting) return;

    const type = composer.type || "text";
    const trimmedContent = composer.content.trim();
    const pollOptions = (composer.pollOptions || [])
      .map((option) => option.trim())
      .filter(Boolean);

    const validationError = getComposerValidationError({
      ...composer,
      content: trimmedContent,
      pollOptions,
    });

    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setComposerSubmitting(true);
      const formData = new FormData();
      formData.append("postType", type);
      if (trimmedContent) {
        formData.append("content", trimmedContent);
      }
      formData.append("visibility", "public");

      if (composer.media.length > 0) {
        formData.append(
          type === "article" ? "articleCover" : "image",
          composer.media[0]
        );
      }

      if (type === "poll") {
        formData.append("pollQuestion", composer.pollQuestion.trim());
        formData.append("pollOptions", JSON.stringify(pollOptions));
        formData.append(
          "pollAllowMultiple",
          composer.pollAllowMultiple ? "true" : "false"
        );
        if (composer.pollExpiresAt) {
          formData.append("pollExpiresAt", composer.pollExpiresAt);
        }
      }

      if (type === "article") {
        formData.append("articleTitle", composer.articleTitle.trim());
        if (composer.articleSummary.trim()) {
          formData.append("articleSummary", composer.articleSummary.trim());
        }
        formData.append("articleBody", composer.articleBody.trim());
      }

      if (type === "event") {
        formData.append("eventTitle", composer.eventTitle.trim());
        if (composer.eventLocation.trim()) {
          formData.append("eventLocation", composer.eventLocation.trim());
        }
        formData.append("eventStart", composer.eventStart);
        formData.append("eventEnd", composer.eventEnd);
        if (composer.eventDescription.trim()) {
          formData.append("eventDescription", composer.eventDescription.trim());
        }
        if (composer.eventCapacity) {
          formData.append("eventCapacity", composer.eventCapacity);
        }
        formData.append(
          "eventIsVirtual",
          composer.eventIsVirtual ? "true" : "false"
        );
      }

      const response = await api.post("/community/post", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const createdPost = response.data?.post || response.data;
      setPosts((prev) => [createdPost, ...prev]);
      if (createdPost?._id) {
        seenPostIdsRef.current.add(createdPost._id);
        updateSeenPostStorage();
      }
      closeComposer();
      toast.success("Post shared with the community!");
      await loadCommunityData();
      if (typeof refreshProfile === "function") {
        refreshProfile({ silent: true });
      }
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error(
        error.response?.data?.message || "Failed to create post. Try again."
      );
    } finally {
      setComposerSubmitting(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);

    // Create blob URLs for new files
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setMediaPreviews((prev) => [...prev, ...newPreviews]);

    setComposer((prev) => {
      const updatedMedia = [...prev.media, ...files];
      const nextState = {
        ...prev,
        media: updatedMedia,
      };

      if (prev.type === "text" && files.length > 0) {
        nextState.type = "image";
      }

      if (prev.type === "article" && !prev.articleCover && files[0]) {
        nextState.articleCover = files[0];
      }

      return nextState;
    });
  };

  const removeFile = (index) => {
    // Cleanup the specific blob URL
    const urlToRevoke = mediaPreviews[index];
    if (urlToRevoke && urlToRevoke.startsWith("blob:")) {
      URL.revokeObjectURL(urlToRevoke);
    }

    // Update media and previews
    setComposer((prev) => {
      const updatedMedia = prev.media.filter((_, i) => i !== index);
      const nextState = {
        ...prev,
        media: updatedMedia,
      };

      if (prev.type === "article") {
        nextState.articleCover = updatedMedia[0] || null;
      }

      return nextState;
    });
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Community
              </h1>
              {/* Connection Status Indicator */}
              <div
                className={`w-3 h-3 rounded-full ${
                  error
                    ? "bg-red-500"
                    : loading
                    ? "bg-yellow-500"
                    : "bg-green-500"
                } ${loading ? "animate-pulse" : ""}`}
                title={
                  error
                    ? "Connection Error"
                    : loading
                    ? "Loading..."
                    : "Connected"
                }
              ></div>
            </div>
            <p className="text-blue-600 text-lg">
              Connect, share, and discover amazing content
            </p>
          </div>

          {/* Filters and Search */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200 p-6 shadow-lg mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <IoSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search posts, hashtags, users..."
                  className="w-full pl-10 pr-4 py-3 bg-blue-50 border border-blue-200 rounded-xl focus:outline-none focus:border-blue-400 transition-colors"
                />
              </div>

              {/* Filter Controls */}
              <div className="flex gap-3">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl focus:outline-none focus:border-blue-400 transition-colors"
                >
                  <option value="recent">Most Recent</option>
                  <option value="popular">Most Popular</option>
                  <option value="trending">Trending</option>
                </select>

                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value)}
                  className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl focus:outline-none focus:border-blue-400 transition-colors"
                >
                  <option value="all">All Posts</option>
                  <option value="following">Following</option>
                  <option value="images">Images</option>
                  <option value="text">Text Only</option>
                </select>
              </div>
            </div>

            {/* Posts/Insights Tabs */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200 p-2 shadow-lg mt-6">
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveTab("posts")}
                  className={`flex-1 py-3 px-4 text-sm font-semibold rounded-xl transition-all duration-200 ${
                    activeTab === "posts"
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  📝 Posts
                </button>
                <button
                  onClick={() => setActiveTab("saved")}
                  className={`flex-1 py-3 px-4 text-sm font-semibold rounded-xl transition-all duration-200 ${
                    activeTab === "saved"
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  🔖 Saved
                </button>
                <button
                  onClick={() => setActiveTab("insights")}
                  className={`flex-1 py-3 px-4 text-sm font-semibold rounded-xl transition-all duration-200 ${
                    activeTab === "insights"
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  📊 Insights
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error State - Visible when there are API errors */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="text-red-500 text-xl">⚠️</div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-800 mb-1">
                  Connection Error
                </h3>
                <p className="text-red-600 text-sm mb-3">{error}</p>
                <div className="flex gap-2">
                  <button
                    onClick={retryLoadData}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    Retry (
                    {retryCount > 0 ? `Attempt ${retryCount + 1}` : "Try Again"}
                    )
                  </button>
                  <button
                    onClick={() => setError(null)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === "posts" && (
              <>
                {/* LinkedIn-Style Post Composer */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-sm overflow-hidden">
                        {composerAvatarUrl ? (
                          <img
                            src={composerAvatarUrl}
                            alt={composerDisplayName}
                            className="w-full h-full rounded-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          composerInitial
                        )}
                      </div>

                      <div className="flex-1">
                        <button
                          onClick={() => openComposer()}
                          className="w-full text-left px-4 py-3 text-gray-500 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors border border-gray-200"
                        >
                          Start a post...
                        </button>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center justify-around mt-4 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => {
                          openComposer("image");
                          // Focus on image upload when modal opens
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                          <IoImage className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-medium text-sm">Photo</span>
                      </button>

                      <button
                        onClick={() => openComposer("article")}
                        className="flex items-center gap-2 px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                      >
                        <div className="w-6 h-6 bg-orange-100 rounded flex items-center justify-center">
                          <IoDocument className="w-4 h-4 text-orange-600" />
                        </div>
                        <span className="font-medium text-sm">Article</span>
                      </button>

                      <button
                        onClick={() => openComposer("poll")}
                        className="flex items-center gap-2 px-4 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">
                          <span className="text-green-600 text-xs font-bold">
                            📊
                          </span>
                        </div>
                        <span className="font-medium text-sm">Poll</span>
                      </button>

                      <button
                        onClick={() => openComposer("event")}
                        className="flex items-center gap-2 px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      >
                        <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center">
                          <span className="text-purple-600 text-xs font-bold">
                            🎉
                          </span>
                        </div>
                        <span className="font-medium text-sm">Event</span>
                      </button>
                    </div>

                    {/* Enhanced Post Composer Modal */}
                    {showPostComposer && (
                      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                          {/* Modal Header */}
                          <div className="flex items-center justify-between p-4 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden">
                                {composerAvatarUrl ? (
                                  <img
                                    src={composerAvatarUrl}
                                    alt={composerDisplayName}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  composerInitial
                                )}
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">
                                  {composerDisplayName}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  Post to Community
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={closeComposer}
                              className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                            >
                              <IoClose className="w-6 h-6" />
                            </button>
                          </div>

                          {/* Modal Content */}
                          <div className="p-4 max-h-[60vh] overflow-y-auto space-y-6">
                            <div className="flex flex-wrap gap-2">
                              {composerTypeOptions.map((option) => (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() => changeComposerType(option.id)}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                                    composer.type === option.id
                                      ? "bg-blue-600 text-white shadow"
                                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                  }`}
                                >
                                  <span>{option.badge}</span>
                                  <span>{option.label}</span>
                                </button>
                              ))}
                            </div>

                            {composer.type !== "article" && (
                              <div>
                                <textarea
                                  value={composer.content}
                                  onChange={(e) =>
                                    setComposer((prev) => ({
                                      ...prev,
                                      content: e.target.value,
                                    }))
                                  }
                                  placeholder="What do you want to share with the community?"
                                  className="w-full border border-transparent focus:border-blue-300 focus:ring-0 resize-none text-lg text-gray-900 placeholder-gray-400"
                                  rows={composer.type === "text" ? 6 : 4}
                                  style={{
                                    minHeight:
                                      composer.type === "text"
                                        ? "140px"
                                        : "100px",
                                  }}
                                />
                                {composer.type === "poll" && (
                                  <p className="mt-1 text-xs text-gray-500">
                                    Add optional context or background for your
                                    poll.
                                  </p>
                                )}
                              </div>
                            )}

                            {composer.type === "poll" && (
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Poll question
                                  </label>
                                  <input
                                    type="text"
                                    value={composer.pollQuestion}
                                    onChange={(e) =>
                                      setComposer((prev) => ({
                                        ...prev,
                                        pollQuestion: e.target.value,
                                      }))
                                    }
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    placeholder="What would you like to ask?"
                                  />
                                </div>
                                <div className="space-y-2">
                                  {composer.pollOptions.map((option, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center gap-2"
                                    >
                                      <span className="text-sm text-gray-500 w-5 text-right">
                                        {index + 1}.
                                      </span>
                                      <input
                                        type="text"
                                        value={option}
                                        onChange={(e) =>
                                          updatePollOption(
                                            index,
                                            e.target.value
                                          )
                                        }
                                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        placeholder={`Option ${index + 1}`}
                                      />
                                      {composer.pollOptions.length > 2 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            removePollOption(index)
                                          }
                                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                        >
                                          <IoClose className="w-5 h-5" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <button
                                    type="button"
                                    onClick={addPollOption}
                                    className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={composer.pollOptions.length >= 4}
                                  >
                                    + Add option
                                  </button>
                                  <label className="flex items-center gap-2 text-gray-600">
                                    <input
                                      type="checkbox"
                                      checked={composer.pollAllowMultiple}
                                      onChange={(e) =>
                                        setComposer((prev) => ({
                                          ...prev,
                                          pollAllowMultiple: e.target.checked,
                                        }))
                                      }
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    Allow multiple choices
                                  </label>
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Poll closes (optional)
                                  </label>
                                  <input
                                    type="datetime-local"
                                    value={composer.pollExpiresAt}
                                    onChange={(e) =>
                                      setComposer((prev) => ({
                                        ...prev,
                                        pollExpiresAt: e.target.value,
                                      }))
                                    }
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                  />
                                </div>
                              </div>
                            )}

                            {composer.type === "article" && (
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Headline
                                  </label>
                                  <input
                                    type="text"
                                    value={composer.articleTitle}
                                    onChange={(e) =>
                                      setComposer((prev) => ({
                                        ...prev,
                                        articleTitle: e.target.value,
                                      }))
                                    }
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    placeholder="Catch readers' attention"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Summary (optional)
                                  </label>
                                  <textarea
                                    value={composer.articleSummary}
                                    onChange={(e) =>
                                      setComposer((prev) => ({
                                        ...prev,
                                        articleSummary: e.target.value,
                                      }))
                                    }
                                    rows={3}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                                    placeholder="Give readers a quick overview"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Article body
                                  </label>
                                  <textarea
                                    value={composer.articleBody}
                                    onChange={(e) =>
                                      setComposer((prev) => ({
                                        ...prev,
                                        articleBody: e.target.value,
                                      }))
                                    }
                                    rows={8}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    placeholder="Share your full story here..."
                                  />
                                </div>
                              </div>
                            )}

                            {composer.type === "event" && (
                              <div className="space-y-3">
                                <div className="grid sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                      Event title
                                    </label>
                                    <input
                                      type="text"
                                      value={composer.eventTitle}
                                      onChange={(e) =>
                                        setComposer((prev) => ({
                                          ...prev,
                                          eventTitle: e.target.value,
                                        }))
                                      }
                                      className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                      placeholder="Give your event a name"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                      Location (optional)
                                    </label>
                                    <input
                                      type="text"
                                      value={composer.eventLocation}
                                      onChange={(e) =>
                                        setComposer((prev) => ({
                                          ...prev,
                                          eventLocation: e.target.value,
                                        }))
                                      }
                                      className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                      placeholder="Online or physical venue"
                                    />
                                  </div>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                      Starts at
                                    </label>
                                    <input
                                      type="datetime-local"
                                      value={composer.eventStart}
                                      onChange={(e) =>
                                        setComposer((prev) => ({
                                          ...prev,
                                          eventStart: e.target.value,
                                        }))
                                      }
                                      className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                      Ends at
                                    </label>
                                    <input
                                      type="datetime-local"
                                      value={composer.eventEnd}
                                      onChange={(e) =>
                                        setComposer((prev) => ({
                                          ...prev,
                                          eventEnd: e.target.value,
                                        }))
                                      }
                                      className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    />
                                  </div>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-3 items-center">
                                  <label className="flex items-center gap-2 text-sm text-gray-600">
                                    <input
                                      type="checkbox"
                                      checked={composer.eventIsVirtual}
                                      onChange={(e) =>
                                        setComposer((prev) => ({
                                          ...prev,
                                          eventIsVirtual: e.target.checked,
                                        }))
                                      }
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    Virtual event
                                  </label>
                                  <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                      Capacity (optional)
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={composer.eventCapacity}
                                      onChange={(e) =>
                                        setComposer((prev) => ({
                                          ...prev,
                                          eventCapacity: e.target.value,
                                        }))
                                      }
                                      className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                      placeholder="Maximum attendees"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Description (optional)
                                  </label>
                                  <textarea
                                    value={composer.eventDescription}
                                    onChange={(e) =>
                                      setComposer((prev) => ({
                                        ...prev,
                                        eventDescription: e.target.value,
                                      }))
                                    }
                                    rows={4}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                    placeholder="What should attendees know?"
                                  />
                                </div>
                              </div>
                            )}

                            {composer.media.length > 0 && (
                              <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-gray-700">
                                  Attached media
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                  {composer.media.map((file, index) => {
                                    const previewUrl =
                                      mediaPreviews[index] ||
                                      (typeof file === "string" ? file : null);

                                    return (
                                      <div
                                        key={index}
                                        className="relative group"
                                      >
                                        {previewUrl ? (
                                          <img
                                            src={previewUrl}
                                            alt={`Preview ${index + 1}`}
                                            className="w-full h-32 object-cover rounded-lg border border-gray-200"
                                          />
                                        ) : (
                                          <div className="w-full h-32 bg-gray-100 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-sm text-gray-500">
                                            Preview unavailable
                                          </div>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => removeFile(index)}
                                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Modal Footer */}
                          <div className="border-t border-gray-200 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-2">
                                <input
                                  type="file"
                                  accept="image/*,video/*"
                                  multiple
                                  onChange={handleFileSelect}
                                  className="hidden"
                                  id="composer-media-upload"
                                />
                                <label
                                  htmlFor="composer-media-upload"
                                  className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                                >
                                  <IoImage className="w-5 h-5" />
                                  <span className="text-sm font-medium">
                                    {composer.type === "article"
                                      ? "Cover"
                                      : composer.type === "event"
                                      ? "Banner"
                                      : "Media"}
                                  </span>
                                </label>

                                <button
                                  type="button"
                                  className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  <span className="text-sm">🎭</span>
                                  <span className="text-sm font-medium">
                                    Feeling
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  <span className="text-sm">📍</span>
                                  <span className="text-sm font-medium">
                                    Location
                                  </span>
                                </button>
                              </div>

                              <button
                                onClick={handleCreatePost}
                                disabled={
                                  composerSubmitting ||
                                  Boolean(composerValidationError)
                                }
                                className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                              >
                                {composerSubmitting ? "Posting..." : "Post"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Posts Feed */}
                <div className="space-y-6">
                  {loading ? (
                    <div className="space-y-6">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm animate-pulse"
                        >
                          <div className="flex items-start gap-4 mb-4">
                            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                            <div className="flex-1">
                              <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                              <div className="h-3 bg-gray-200 rounded w-24"></div>
                            </div>
                          </div>
                          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                          <div className="h-48 bg-gray-200 rounded-xl"></div>
                        </div>
                      ))}
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                      <div className="text-6xl mb-4">📝</div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        No posts yet
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Be the first to share something with the community!
                      </p>
                      <button
                        onClick={() => openComposer()}
                        className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors font-medium"
                      >
                        Create your first post
                      </button>
                    </div>
                  ) : (
                    posts.map((post) => (
                      <PostCard
                        key={post._id}
                        post={post}
                        onLike={handleLikePost}
                        onComment={() => loadCommunityData()}
                        onDelete={handleDeletePost}
                        onSave={handleSavePost}
                        isSaved={savedPostIds.has(post._id)}
                        isHighlighted={highlightedPostId === post._id}
                      />
                    ))
                  )}
                </div>
              </>
            )}

            {activeTab === "saved" && (
              <div className="space-y-6">
                {sortedSavedPosts.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                    <div className="text-6xl mb-4">🔖</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No saved posts yet
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Tap the save icon on any community post to keep it here.
                    </p>
                    <button
                      onClick={() => setActiveTab("posts")}
                      className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors font-medium"
                    >
                      Explore posts
                    </button>
                  </div>
                ) : (
                  sortedSavedPosts.map((post) => (
                    <PostCard
                      key={post._id}
                      post={post}
                      onLike={handleLikePost}
                      onComment={() => loadCommunityData()}
                      onDelete={handleDeletePost}
                      onSave={handleSavePost}
                      isSaved
                      isHighlighted={highlightedPostId === post._id}
                    />
                  ))
                )}
              </div>
            )}

            {activeTab === "insights" && (
              <div className="space-y-6">
                {/* Trending Topics */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200 p-6 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <IoFlame className="w-5 h-5 text-orange-500" />
                    <h3 className="font-semibold text-blue-900">
                      Trending Topics
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {loading ? (
                      <div className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className="animate-pulse p-3 rounded-lg bg-gray-100"
                          >
                            <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
                            <div className="h-3 bg-gray-200 rounded w-16"></div>
                          </div>
                        ))}
                      </div>
                    ) : trendingHashtags.length === 0 ? (
                      <div className="text-center py-6">
                        <div className="text-4xl mb-2">📈</div>
                        <p className="text-blue-600 text-sm">
                          No trending topics yet
                        </p>
                        <p className="text-blue-400 text-xs">
                          Be the first to start a trend!
                        </p>
                      </div>
                    ) : (
                      trendingHashtags.map((hashtag, index) => (
                        <div
                          key={hashtag.hashtag || index}
                          className="flex items-center justify-between p-3 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                        >
                          <div>
                            <div className="font-medium text-blue-900">
                              #{hashtag.hashtag}
                            </div>
                            <div className="text-sm text-blue-600">
                              {hashtag.count} post
                              {hashtag.count !== 1 ? "s" : ""}
                            </div>
                          </div>
                          <IoTrendingUp className="w-4 h-4 text-green-500" />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* People to Follow */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200 p-6 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <IoPeople className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold text-blue-900">
                      People to Follow
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {loading ? (
                      <div className="space-y-3">
                        {[...Array(4)].map((_, i) => (
                          <div
                            key={i}
                            className="animate-pulse flex items-start gap-3"
                          >
                            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                            <div className="flex-1">
                              <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                              <div className="h-3 bg-gray-200 rounded w-32 mb-1"></div>
                              <div className="h-3 bg-gray-200 rounded w-16"></div>
                            </div>
                            <div className="h-6 bg-gray-200 rounded w-16"></div>
                          </div>
                        ))}
                      </div>
                    ) : suggestedUsers.length === 0 ? (
                      <div className="text-center py-6">
                        <div className="text-4xl mb-2">👥</div>
                        <p className="text-blue-600 text-sm">
                          No users to follow yet
                        </p>
                        <p className="text-blue-400 text-xs">
                          Check back later for suggestions!
                        </p>
                      </div>
                    ) : (
                      suggestedUsers.map((user) => {
                        const avatarUrl =
                          resolveAvatarUrl(user.profileImage) ||
                          resolveAvatarUrl(user.avatar) ||
                          user.profileImageUrl ||
                          null;
                        const displayName =
                          user.displayName || user.username || "Creator";

                        return (
                          <div
                            key={user._id}
                            className="flex items-start gap-3"
                          >
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-lg overflow-hidden">
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
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-blue-900 truncate">
                                {displayName}
                              </div>
                              <div className="text-sm text-blue-600 line-clamp-2">
                                {user.bio || "New community member"}
                              </div>
                              <div className="text-xs text-blue-400">
                                {user.followersCount || 0} followers
                              </div>
                            </div>
                            <button
                              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                                followedUsers.has(user._id)
                                  ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                                  : "bg-blue-600 hover:bg-blue-700 text-white"
                              }`}
                              onClick={() => handleFollowUser(user._id)}
                            >
                              {followedUsers.has(user._id)
                                ? "Following"
                                : "Follow"}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Your Stats */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200 p-6 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <IoAnalytics className="w-5 h-5 text-purple-500" />
                    <h3 className="font-semibold text-blue-900">Your Stats</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-600">Posts</span>
                      <span className="font-semibold text-blue-900">
                        {userProfile?.stats?.totalPosts ??
                          posts.filter((p) => p.author?._id === user?.id)
                            .length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-600">Followers</span>
                      <span className="font-semibold text-blue-900">
                        {userProfile?.followerCount ??
                          userProfile?.followers?.length ??
                          0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-600">Following</span>
                      <span className="font-semibold text-blue-900">
                        {userProfile?.followingCount ??
                          userProfile?.following?.length ??
                          0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-600">Total Likes</span>
                      <span className="font-semibold text-blue-900">
                        {userProfile?.stats?.totalLikes ??
                          posts
                            .filter((p) => p.author?._id === user?.id)
                            .reduce(
                              (total, post) =>
                                total + (post.likes?.length || 0),
                              0
                            )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Community Stats */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200 p-6 shadow-lg">
                  <div className="flex items-center gap-2 mb-6">
                    <IoAnalytics className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold text-blue-900">
                      Community Insights
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center p-4 bg-blue-50 rounded-xl">
                      <div className="text-2xl font-bold text-blue-600">
                        {communityInsights.totalPosts || posts.length}
                      </div>
                      <div className="text-sm text-blue-500">Total Posts</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-xl">
                      <div className="text-2xl font-bold text-green-600">
                        {communityInsights.totalUsers || 3}
                      </div>
                      <div className="text-sm text-green-500">Total Users</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-xl">
                      <div className="text-2xl font-bold text-orange-600">
                        {communityInsights.activeUsersToday || 0}
                      </div>
                      <div className="text-sm text-orange-500">
                        Active Today
                      </div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-xl">
                      <div className="text-2xl font-bold text-purple-600">
                        {communityInsights.totalLikes ||
                          posts.reduce(
                            (total, post) => total + (post.likes?.length || 0),
                            0
                          )}
                      </div>
                      <div className="text-sm text-purple-500">Total Likes</div>
                    </div>
                  </div>

                  {/* Additional metrics row */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-3 bg-indigo-50 rounded-xl">
                      <div className="text-lg font-bold text-indigo-600">
                        {communityInsights.totalComments ||
                          posts.reduce(
                            (total, post) =>
                              total + (post.comments?.length || 0),
                            0
                          )}
                      </div>
                      <div className="text-xs text-indigo-500">Comments</div>
                    </div>
                    <div className="text-center p-3 bg-pink-50 rounded-xl">
                      <div className="text-lg font-bold text-pink-600">
                        {communityInsights.engagementRate || 0}%
                      </div>
                      <div className="text-xs text-pink-500">Engagement</div>
                    </div>
                    <div className="text-center p-3 bg-teal-50 rounded-xl">
                      <div className="text-lg font-bold text-teal-600">
                        {communityInsights.newUsersToday || 0}
                      </div>
                      <div className="text-xs text-teal-500">New Today</div>
                    </div>
                  </div>
                </div>

                {/* Top Posts */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200 p-6 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <IoThumbsUp className="w-5 h-5 text-green-500" />
                    <h3 className="font-semibold text-blue-900">
                      Top Performing Posts
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {posts
                      .slice()
                      .sort(
                        (a, b) =>
                          (b.likes?.length || 0) - (a.likes?.length || 0)
                      )
                      .slice(0, 5)
                      .map((post, index) => (
                        <div
                          key={post._id}
                          className="flex items-start gap-3 p-3 hover:bg-blue-50 rounded-lg"
                        >
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm text-blue-900 line-clamp-2">
                              {post.content}
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-blue-500">
                              <span className="flex items-center gap-1">
                                <IoHeart className="w-3 h-3" />
                                {post.likes?.length || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <IoChatbubbleOutline className="w-3 h-3" />
                                {post.comments?.length || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <IoEye className="w-3 h-3" />
                                {post.views || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Top Users */}
                {Array.isArray(communityInsights.topUsers) &&
                  communityInsights.topUsers.length > 0 && (
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200 p-6 shadow-lg">
                      <div className="flex items-center gap-2 mb-4">
                        <IoPeople className="w-5 h-5 text-indigo-500" />
                        <h3 className="font-semibold text-blue-900">
                          Top Community Members
                        </h3>
                      </div>

                      <div className="space-y-4">
                        {communityInsights.topUsers.map((member, index) => {
                          const avatarUrl =
                            resolveAvatarUrl(member.profileImage) ||
                            resolveAvatarUrl(member.avatar) ||
                            member.profileImageUrl ||
                            null;
                          const displayName =
                            member.displayName || member.username || "Member";

                          return (
                            <div
                              key={member._id || index}
                              className="flex items-center gap-3 p-3 hover:bg-blue-50 rounded-lg"
                            >
                              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-bold text-indigo-600">
                                {index + 1}
                              </div>
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                                {avatarUrl ? (
                                  <img
                                    src={avatarUrl}
                                    alt={displayName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-lg font-medium text-blue-600">
                                    {displayName.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-blue-900">
                                  {displayName}
                                </div>
                                <div className="text-sm text-blue-600">
                                  {member.followersCount || 0} followers
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* Engagement Timeline */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-blue-200 p-6 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <IoTime className="w-5 h-5 text-purple-500" />
                    <h3 className="font-semibold text-blue-900">
                      Recent Activity
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {(communityInsights.recentActivity &&
                    communityInsights.recentActivity.length > 0
                      ? communityInsights.recentActivity
                      : posts
                          .slice()
                          .sort(
                            (a, b) =>
                              new Date(b.createdAt) - new Date(a.createdAt)
                          )
                          .slice(0, 10)
                    ).map((activity) => (
                      <div
                        key={activity._id}
                        className="flex items-center gap-3 p-3 border-l-4 border-blue-200"
                      >
                        <IoCheckmarkCircle className="w-4 h-4 text-green-500" />
                        <div className="flex-1">
                          <div className="text-sm text-blue-900">
                            New post by{" "}
                            <span className="font-medium">
                              {activity.author?.displayName ||
                                activity.author?.username ||
                                "Unknown"}
                            </span>
                            {communityInsights.recentActivity && (
                              <span className="ml-2 text-xs text-gray-500">
                                {activity.likesCount || 0} likes,{" "}
                                {activity.commentsCount || 0} comments
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-blue-500">
                            {new Date(activity.createdAt).toLocaleDateString()}{" "}
                            at{" "}
                            {new Date(activity.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Empty for now */}
          <div className="lg:col-span-1">{/* Space for future widgets */}</div>
        </div>
      </div>
    </div>
  );
};

export default Community;
