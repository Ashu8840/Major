import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Post APIs
export const createPost = async (content, files = [], audience = "public", tags = []) => {
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
  const response = await api.get(`/posts/search?q=${encodeURIComponent(query)}&page=${page}`);
  return response.data;
};

export const getTrendingPosts = async (page = 1, timeFilter = 'today') => {
  const response = await api.get(`/posts/trending?page=${page}&timeFilter=${timeFilter}`);
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

// User APIs
export const followUser = async (userId) => {
  const response = await api.post(`/users/${userId}/follow`);
  return response.data;
};

export const unfollowUser = async (userId) => {
  const response = await api.delete(`/users/${userId}/follow`);
  return response.data;
};

export const getDiscoverUsers = async () => {
  const response = await api.get("/users/discover");
  return response.data;
};

export const searchUsers = async (query) => {
  const response = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
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
  return { improvedText: text, error: true, message: "AI service not available" };
};

export const correctGrammar = async (text) => {
  // Placeholder for AI functionality
  return { correctedText: text, error: true, message: "AI service not available" };
};

export const translateText = async (text, targetLanguage) => {
  // Placeholder for AI functionality
  return { translatedText: text, error: true, message: "AI service not available" };
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

export default api;
