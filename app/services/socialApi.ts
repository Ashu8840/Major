import { api } from "./api";

// Social Overview API
export const fetchSocialOverview = async () => {
  const response = await api.get("/social/overview");
  return response.data;
};

// Search API
export const searchSocialUsers = async (query: string) => {
  if (!query || !query.trim()) {
    return { results: [] };
  }

  const response = await api.get("/social/search", {
    params: { q: query.trim() },
  });
  return response.data;
};

// Favorites API
export const updateFavoriteFriends = async (friendIds: string[]) => {
  const response = await api.post("/social/favorites", { friendIds });
  return response.data;
};

// Circles APIs
export const fetchCircles = async () => {
  const response = await api.get("/social/circles");
  return response.data;
};

export const fetchCircleDetails = async (circleId: string) => {
  const response = await api.get(`/social/circles/${circleId}`);
  return response.data;
};

export const createSocialCircle = async (payload: {
  name: string;
  description: string;
  visibility: "public" | "private";
  theme: string;
  joinKey?: string;
}) => {
  const response = await api.post("/social/circles", payload);
  return response.data;
};

export const joinSocialCircle = async (circleId: string, key?: string) => {
  const response = await api.post(
    `/social/circles/${circleId}/join`,
    key ? { key } : {}
  );
  return response.data;
};

export const leaveSocialCircle = async (circleId: string) => {
  const response = await api.post(`/social/circles/${circleId}/leave`);
  return response.data;
};

export const deleteSocialCircle = async (circleId: string) => {
  const response = await api.delete(`/social/circles/${circleId}`);
  return response.data;
};

export const togglePinCircle = async (circleId: string) => {
  const response = await api.post(`/social/circles/${circleId}/pin`);
  return response.data;
};

// User Follow APIs
export const followUser = async (userId: string) => {
  const response = await api.post(`/profile/follow/${userId}`);
  return response.data;
};

export const unfollowUser = async (userId: string) => {
  const response = await api.delete(`/profile/follow/${userId}`);
  return response.data;
};
