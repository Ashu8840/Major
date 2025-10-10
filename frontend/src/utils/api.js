import axios from "axios";

const trimTrailingSlash = (value) =>
  typeof value === "string" ? value.replace(/\/+$/, "") : value;

const detectDefaultBackendHost = () => {
  if (typeof window !== "undefined" && window?.location) {
    const { protocol, hostname } = window.location;

    if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//localhost:5000`;
    }

    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return `${protocol}//${hostname}:5000`;
    }

    return `${protocol}//${hostname}`;
  }

  return "http://localhost:5000";
};

const DEFAULT_BACKEND_HOST = detectDefaultBackendHost();
const ENV_API_URL = trimTrailingSlash(import.meta.env.VITE_API_URL);
const ENV_BACKEND_HOST = trimTrailingSlash(import.meta.env.VITE_BACKEND_HOST);
const ENV_SOCKET_URL = trimTrailingSlash(import.meta.env.VITE_SOCKET_URL);

export const API_HOST =
  ENV_BACKEND_HOST ||
  ENV_API_URL?.replace(/\/api$/, "") ||
  DEFAULT_BACKEND_HOST;
export const API_BASE_URL = ENV_API_URL || `${API_HOST}/api`;
export const SOCKET_BASE_URL = ENV_SOCKET_URL || API_HOST;

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Analytics APIs
export const getAnalyticsOverview = async (period = "month") => {
  const response = await api.get("/analytics/overview", {
    params: { period },
  });
  return response.data;
};

// Leaderboard APIs
export const getLeaderboard = async (period = "all-time") => {
  const response = await api.get("/leaderboard", {
    params: { period },
  });
  return response.data;
};

export const getSeasonalLeaderboard = async () => {
  const response = await api.get("/leaderboard/seasonal");
  return response.data;
};

// Creator Studio APIs
export const getCreatorProjects = async () => {
  const response = await api.get("/creator/projects");
  return response.data;
};

export const createCreatorProject = async (payload) => {
  const response = await api.post("/creator/projects", payload);
  return response.data;
};

export const updateCreatorProject = async (projectId, payload) => {
  const response = await api.put(`/creator/projects/${projectId}`, payload);
  return response.data;
};

export const publishCreatorProject = async (projectId, payload) => {
  const response = await api.post(
    `/creator/projects/${projectId}/publish`,
    payload
  );
  return response.data;
};

export const deleteCreatorProject = async (projectId) => {
  const response = await api.delete(`/creator/projects/${projectId}`);
  return response.data;
};

export const generateCreatorPrompt = async (projectId, prompt) => {
  const response = await api.post(`/creator/projects/${projectId}/prompt`, {
    prompt,
  });
  return response.data;
};

export const markCreatorProjectExported = async (projectId) => {
  const response = await api.post(`/creator/projects/${projectId}/export`);
  return response.data;
};

export const fixGrammar = async (text) => {
  const response = await api.post("/ai/fix-grammar", { text });
  return response.data;
};

export const translateUserText = async (text, targetLanguage) => {
  const response = await api.post("/ai/translate", { text, targetLanguage });
  return response.data;
};

export const improveUserText = async (text) => {
  const response = await api.post("/ai/improve", { text });
  return response.data;
};

export const getDailyPrompt = async () => {
  const response = await api.get("/ai/prompts");
  return response.data;
};

// Post APIs
export const createPost = async (
  content,
  files = [],
  audience = "public",
  tags = []
) => {
  const formData = new FormData();
  formData.append("content", content);
  formData.append("visibility", audience);
  formData.append("tags", JSON.stringify(tags));

  if (files.length > 0) {
    formData.append("image", files[0]);
  }

  const response = await api.post("/posts", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const getPosts = async (page = 1) => {
  const response = await api.get(`/posts?page=${page}`);
  return response.data;
};

export const searchPosts = async (query, page = 1) => {
  const response = await api.get(
    `/posts/search?q=${encodeURIComponent(query)}&page=${page}`
  );
  return response.data;
};

export const getTrendingPosts = async (page = 1, timeFilter = "today") => {
  const response = await api.get(
    `/posts/trending?page=${page}&timeFilter=${timeFilter}`
  );
  return response.data;
};

export const likePost = async (postId) => {
  const response = await api.post(`/posts/${postId}/like`);
  return response.data;
};

export const sharePost = async (postId) => {
  const response = await api.post(`/posts/${postId}/share`);
  return response.data;
};

export const deletePost = async (postId) => {
  const response = await api.delete(`/posts/${postId}`);
  return response.data;
};

export const bookmarkPost = async (postId) => {
  const response = await api.post(`/posts/${postId}/bookmark`);
  return response.data;
};

export const unbookmarkPost = async (postId) => {
  const response = await api.delete(`/posts/${postId}/bookmark`);
  return response.data;
};

// Marketplace APIs
export const getMarketplaceBooks = async (params = {}, options = {}) => {
  const response = await api.get("/marketplace/books", {
    params,
    signal: options.signal,
  });
  return response.data;
};

export const getMarketplaceSellerStatus = async () => {
  const response = await api.get("/marketplace/seller/status");
  return response.data;
};

export const registerMarketplaceSeller = async (payload) => {
  const response = await api.post("/marketplace/seller/register", payload);
  return response.data;
};

export const getMarketplaceSellerBooks = async (options = {}) => {
  const response = await api.get("/marketplace/seller/books", {
    signal: options.signal,
  });
  return response.data;
};

export const getMarketplaceBookAccess = async (bookId) => {
  const response = await api.get(`/marketplace/books/${bookId}/access`);
  return response.data;
};

export const createMarketplaceBook = async (formData) => {
  const response = await api.post("/marketplace/books", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const getMarketplaceSellerAnalytics = async () => {
  const response = await api.get("/marketplace/seller/analytics");
  return response.data;
};

export const deleteMarketplaceBook = async (bookId) => {
  const response = await api.delete(`/marketplace/seller/books/${bookId}`);
  return response.data;
};

export const recordMarketplaceBookView = async (bookId) => {
  const response = await api.post(`/marketplace/books/${bookId}/view`);
  return response.data;
};

export const recordMarketplaceBookDownload = async (bookId) => {
  const response = await api.post(`/marketplace/books/${bookId}/download`);
  return response.data;
};

export const recordMarketplaceBookPurchase = async (bookId) => {
  const response = await api.post(`/marketplace/books/${bookId}/purchase`);
  return response.data;
};

export const rentMarketplaceBook = async (bookId, payload = {}) => {
  const response = await api.post(`/marketplace/books/${bookId}/rent`, payload);
  return response.data;
};

export const tipMarketplaceBook = async (bookId, payload = {}) => {
  const response = await api.post(`/marketplace/books/${bookId}/tip`, payload);
  return response.data;
};

export const getMarketplaceBookReviews = async (bookId, params = {}) => {
  const response = await api.get(`/marketplace/books/${bookId}/reviews`, {
    params,
  });
  return response.data;
};

export const submitMarketplaceBookReview = async (bookId, payload) => {
  const response = await api.post(
    `/marketplace/books/${bookId}/reviews`,
    payload
  );
  return response.data;
};

export const getReaderBooks = async (params = {}, options = {}) => {
  const response = await api.get("/marketplace/reader/books", {
    params,
    signal: options.signal,
  });
  return response.data;
};

export const updateReaderBook = async (bookId, payload) => {
  const response = await api.patch(
    `/marketplace/reader/books/${bookId}`,
    payload
  );
  return response.data;
};

export const removeReaderBook = async (bookId) => {
  const response = await api.delete(`/marketplace/reader/books/${bookId}`);
  return response.data;
};

export const addMarketplaceWishlist = async (bookId) => {
  const response = await api.post(`/marketplace/books/${bookId}/wishlist`);
  return response.data;
};

export const removeMarketplaceWishlist = async (bookId) => {
  const response = await api.delete(`/marketplace/books/${bookId}/wishlist`);
  return response.data;
};

export const getReaderBookStatuses = async (bookIds = [], options = {}) => {
  const response = await api.post(
    "/marketplace/reader/status",
    { bookIds },
    {
      signal: options.signal,
    }
  );
  return response.data;
};

// Support APIs
export const createSupportTicket = async (payload) => {
  const response = await api.post("/support", payload);
  return response.data;
};

export const getUserSupportTickets = async () => {
  const response = await api.get("/support/mine");
  return response.data;
};

// Comment APIs
export const addComment = async (postId, text, parentCommentId = null) => {
  const response = await api.post(`/posts/${postId}/comment`, {
    text,
    parentCommentId,
  });
  return response.data;
};

export const getComments = async (postId) => {
  const response = await api.get(`/posts/${postId}/comments`);
  return response.data;
};

export const likeComment = async (commentId) => {
  const response = await api.post(`/posts/comment/${commentId}/like`);
  return response.data;
};

// Community Comment APIs
export const addCommunityComment = async (
  postId,
  text,
  parentCommentId = null
) => {
  const response = await api.post(`/community/post/${postId}/comments`, {
    text,
    parentCommentId,
  });
  return response.data;
};

export const getCommunityComments = async (postId, page = 1, limit = 20) => {
  const response = await api.get(`/community/post/${postId}/comments`, {
    params: { page, limit },
  });
  return response.data;
};

export const toggleCommunityCommentLike = async (commentId) => {
  const response = await api.post(`/community/comment/${commentId}/like`);
  return response.data;
};

// Profile APIs
export const getProfile = async (userId = null) => {
  const endpoint = userId ? `/profile/${userId}` : "/profile";
  const response = await api.get(endpoint);
  return response.data;
};

export const updateProfile = async (profileData) => {
  const response = await api.put("/profile", profileData);
  return response.data;
};

export const uploadProfileImage = async (imageFile) => {
  const formData = new FormData();
  formData.append("profileImage", imageFile);

  const response = await api.post("/profile/upload/profile-image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const uploadCoverPhoto = async (imageFile) => {
  const formData = new FormData();
  formData.append("coverPhoto", imageFile);

  const response = await api.post("/profile/upload/cover-photo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const getProfileAnalytics = async (userId = null) => {
  const endpoint = userId
    ? `/profile/${userId}/analytics`
    : "/profile/analytics";
  const response = await api.get(endpoint);
  return response.data;
};

export const getProfileStats = async (userId = null) => {
  const endpoint = userId ? `/profile/${userId}/stats` : "/profile/stats";
  const response = await api.get(endpoint);
  return response.data;
};

export const getUserContent = async (
  userId = null,
  type = "all",
  page = 1,
  limit = 10
) => {
  const endpoint = userId ? `/profile/${userId}/content` : "/profile/content";
  const params = new URLSearchParams({ type, page, limit });
  const response = await api.get(`${endpoint}?${params.toString()}`);
  return response.data;
};

export const getUserFavorites = async (type = "all", page = 1) => {
  const response = await api.get(
    `/profile/favorites?type=${type}&page=${page}`
  );
  return response.data;
};

export const addToFavorites = async (contentId, contentType) => {
  const response = await api.post("/profile/favorites", {
    contentId,
    contentType,
  });
  return response.data;
};

export const removeFromFavorites = async (contentId, contentType) => {
  const response = await api.delete("/profile/favorites", {
    data: { contentId, contentType },
  });
  return response.data;
};

export const getUserBooks = async (userId = null, page = 1, limit = 10) => {
  return getUserContent(userId, "books", page, limit);
};

// Chat APIs
export const getChatList = async () => {
  const response = await api.get("/chats");
  return response.data;
};

export const getChatMessages = async (targetUserId, page = 1, limit = 50) => {
  const response = await api.get(
    `/chats/${targetUserId}/messages?page=${page}&limit=${limit}`
  );
  return response.data;
};

export const sendChatMessage = async (
  targetUserId,
  { text, attachment } = {}
) => {
  const formData = new FormData();
  if (text) {
    formData.append("text", text);
  }
  if (attachment) {
    formData.append("attachment", attachment);
  }

  const response = await api.post(`/chats/${targetUserId}/messages`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const clearChat = async (targetUserId) => {
  const response = await api.delete(`/chats/${targetUserId}/messages`);
  return response.data;
};

export const blockChatUser = async (targetUserId) => {
  const response = await api.post(`/chats/${targetUserId}/block`);
  return response.data;
};

export const unblockChatUser = async (targetUserId) => {
  const response = await api.delete(`/chats/${targetUserId}/block`);
  return response.data;
};

export const deleteChatForUser = async (targetUserId) => {
  const response = await api.delete(`/chats/${targetUserId}`);
  return response.data;
};

// Social APIs
export const fetchSocialOverview = async () => {
  const response = await api.get("/social/overview");
  return response.data;
};

export const searchSocialUsers = async (query) => {
  if (!query || !query.trim()) {
    return { results: [] };
  }

  const response = await api.get("/social/search", {
    params: { q: query.trim() },
  });
  return response.data;
};

export const updateFavoriteFriends = async (friendIds) => {
  const response = await api.post("/social/favorites", { friendIds });
  return response.data;
};

export const fetchCircles = async () => {
  const response = await api.get("/social/circles");
  return response.data;
};

export const fetchCircleDetails = async (circleId) => {
  const response = await api.get(`/social/circles/${circleId}`);
  return response.data;
};

export const createSocialCircle = async (payload) => {
  const response = await api.post("/social/circles", payload);
  return response.data;
};

export const joinSocialCircle = async (circleId, key) => {
  const response = await api.post(
    `/social/circles/${circleId}/join`,
    key ? { key } : {}
  );
  return response.data;
};

export const leaveSocialCircle = async (circleId) => {
  const response = await api.post(`/social/circles/${circleId}/leave`);
  return response.data;
};

export const transferSocialCircleOwnership = async (circleId, memberId) => {
  const response = await api.post(`/social/circles/${circleId}/transfer`, {
    memberId,
  });
  return response.data;
};

export const removeSocialCircleMember = async (circleId, memberId) => {
  const response = await api.delete(
    `/social/circles/${circleId}/members/${memberId}`
  );
  return response.data;
};

export const deleteSocialCircle = async (circleId) => {
  const response = await api.delete(`/social/circles/${circleId}`);
  return response.data;
};

export const fetchCircleMessages = async (circleId, page = 1, limit = 30) => {
  const response = await api.get(`/social/circles/${circleId}/messages`, {
    params: { page, limit },
  });
  return response.data;
};

export const sendCircleMessage = async (circleId, payload) => {
  const response = await api.post(
    `/social/circles/${circleId}/messages`,
    payload
  );
  return response.data;
};

// User APIs
export const followUser = async (userId) => {
  const response = await api.post(`/profile/follow/${userId}`);
  return response.data;
};

export const unfollowUser = async (userId) => {
  const response = await api.delete(`/profile/follow/${userId}`);
  return response.data;
};

export const getDiscoverUsers = async () => {
  const response = await api.get("/users/discover");
  return response.data;
};

export const searchUsers = async (query) => {
  const response = await api.get(
    `/users/search?q=${encodeURIComponent(query)}`
  );
  return response.data;
};

// Community APIs (placeholders for existing functionality)
export const getFeedPosts = async () => {
  // For now, return all posts - can be enhanced later
  return getPosts();
};

export const getDiscoverPosts = async () => {
  // For now, return all posts - can be enhanced later
  return getPosts();
};

// AI APIs (placeholders)
export const improveWriting = async (text) => {
  // Placeholder for AI functionality
  return {
    improvedText: text,
    error: true,
    message: "AI service not available",
  };
};

export const correctGrammar = async (text) => {
  // Placeholder for AI functionality
  return {
    correctedText: text,
    error: true,
    message: "AI service not available",
  };
};

export const translateText = async (text, targetLanguage) => {
  // Placeholder for AI functionality
  return {
    translatedText: text,
    error: true,
    message: "AI service not available",
  };
};

// Community Insights APIs (placeholders)
export const getCommunityInsights = async () => {
  return {
    totalPosts: 0,
    totalUsers: 0,
    activeUsers: 0,
    popularTags: [],
  };
};

export const getDailyChallenge = async () => {
  return null;
};

export const getUpcomingEvents = async () => {
  return { events: [] };
};

export const joinDailyChallenge = async (challengeId) => {
  return { success: true };
};

// Settings APIs
export const getUserSettings = async () => {
  const response = await api.get("/users/settings");
  return response.data;
};

export const updateUserSettings = async (settingsData) => {
  const response = await api.put("/users/settings", settingsData);
  return response.data;
};

export const updatePrivacySettings = async (privacyData) => {
  const response = await api.put("/users/settings/privacy", {
    privacy: privacyData,
  });
  return response.data;
};

export const updateNotificationSettings = async (notificationData) => {
  const response = await api.put("/users/settings/notifications", {
    notifications: notificationData,
  });
  return response.data;
};

export const updateThemePreference = async (theme) => {
  const response = await api.put("/users/settings/theme", { theme });
  return response.data;
};

export const checkUsernameAvailability = async (username) => {
  const response = await api.get(
    `/users/check-username/${encodeURIComponent(username)}`
  );
  return response.data;
};

export const uploadProfileAvatar = async (file) => {
  const formData = new FormData();
  formData.append("profileImage", file);

  const response = await api.post("/profile/upload/profile-image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
};

export default api;
