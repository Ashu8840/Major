import axios, {
  AxiosHeaders,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import { NativeModules, Platform } from "react-native";
import Constants from "expo-constants";

const API_PORT = process.env.EXPO_PUBLIC_API_PORT ?? "5000";
const DEFAULT_PROTOCOL = process.env.EXPO_PUBLIC_API_PROTOCOL ?? "http";

const trimTrailingSlash = (value?: string | null) =>
  value ? value.replace(/\/+$/, "") : value || "";

const parseHostname = (candidate?: string | null) => {
  if (!candidate) return undefined;
  try {
    const normalized = candidate.includes("://")
      ? candidate
      : `${DEFAULT_PROTOCOL}://${candidate}`;
    const url = new URL(normalized);
    return url.hostname || undefined;
  } catch (error) {
    if (__DEV__) {
      console.warn(
        "Failed to parse host candidate for API detection",
        candidate,
        error
      );
    }
    return undefined;
  }
};

const resolveAndroidLoopback = (hostname: string) => {
  if (Platform.OS !== "android") return hostname;
  return hostname === "localhost" || hostname === "127.0.0.1"
    ? "10.0.2.2"
    : hostname;
};

const detectNativeHost = () => {
  if (Platform.OS === "web") return undefined;

  const scriptURL = NativeModules?.SourceCode?.scriptURL as string | undefined;
  const expoConfigHost = Constants.expoConfig?.hostUri;
  const manifest = Constants.manifest as any;
  const manifest2 = (Constants as any)?.manifest2;

  const candidates: Array<string | null | undefined> = [
    scriptURL,
    expoConfigHost,
    manifest && typeof manifest.hostUri === "string"
      ? manifest.hostUri
      : undefined,
    manifest && typeof manifest.debuggerHost === "string"
      ? manifest.debuggerHost
      : undefined,
    manifest2 && typeof manifest2 === "object"
      ? (manifest2 as any)?.extra?.expoGo?.developer?.host ??
        (manifest2 as any)?.debuggerHost ??
        (manifest2 as any)?.hostUri
      : undefined,
  ];

  for (const candidate of candidates) {
    const hostname = parseHostname(candidate);
    if (hostname) {
      return resolveAndroidLoopback(hostname);
    }
  }

  return undefined;
};

const detectDefaultHost = () => {
  if (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    window.location
  ) {
    const { protocol, hostname } = window.location;
    if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//localhost:${API_PORT}`;
    }
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return `${protocol}//${hostname}:${API_PORT}`;
    }
    return `${protocol}//${hostname}`;
  }

  const nativeHost = detectNativeHost();
  if (nativeHost) {
    return `${DEFAULT_PROTOCOL}://${nativeHost}:${API_PORT}`;
  }

  return `${DEFAULT_PROTOCOL}://localhost:${API_PORT}`;
};

const ENV_API_URL = trimTrailingSlash(
  process.env.EXPO_PUBLIC_API_URL ?? process.env.API_URL ?? undefined
);
const DEFAULT_HOST = detectDefaultHost();
const DEFAULT_API = `${DEFAULT_HOST}/api`;

const resolvedApiUrl = ENV_API_URL
  ? ENV_API_URL.endsWith("/api")
    ? ENV_API_URL
    : `${ENV_API_URL}/api`
  : DEFAULT_API;

// Socket.IO base URL (without /api suffix)
export const SOCKET_BASE_URL = ENV_API_URL
  ? ENV_API_URL.replace(/\/api$/, "")
  : DEFAULT_HOST;

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const api = axios.create({
  baseURL: resolvedApiUrl,
  withCredentials: false,
  timeout: 20000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (authToken) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set("Authorization", `Bearer ${authToken}`);
    config.headers = headers;
  }
  if (__DEV__) {
    console.log(
      `[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`
    );
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(
        `[API] Response ${response.status} from ${response.config.url}`
      );
    }
    return response;
  },
  (error) => {
    if (__DEV__) {
      console.error(
        `[API] Error ${error.response?.status || "Network"} from ${
          error.config?.url
        }`,
        error.response?.data || error.message
      );
    }
    return Promise.reject(error);
  }
);

export const isUnauthorizedError = (error: unknown) => {
  if (!axios.isAxiosError(error)) return false;
  return error.response?.status === 401;
};

export const loginRequest = async (email: string, password: string) => {
  const response = await api.post("/users/login", { email, password });
  return response.data as { token: string };
};

export const registerRequest = async (payload: {
  username: string;
  email: string;
  password: string;
}) => {
  const response = await api.post("/users/register", payload);
  return response.data as { token: string };
};

export const checkUsernameAvailability = async (username: string) => {
  const response = await api.get(
    `/users/check-username/${encodeURIComponent(username)}`
  );
  return response.data as { available: boolean };
};

export const getProfile = async (userId?: string) => {
  const endpoint = userId ? `/users/profile/${userId}` : "/users/profile";
  const response = await api.get(endpoint);
  return response.data;
};

export const getAnalyticsOverview = async (
  period: "week" | "month" | "quarter" | "year" = "month"
) => {
  const response = await api.get("/analytics/overview", { params: { period } });
  return response.data;
};

export const getDailyPrompt = async () => {
  const response = await api.get("/ai/prompts");
  return response.data;
};

export const getRecentEntries = async (limit = 6) => {
  const response = await api.get("/entries/mine", { params: { limit } });
  return response.data;
};

export const getDiaryEntries = async (page = 1, limit = 10) => {
  const response = await api.get("/entries/mine", { params: { page, limit } });
  return response.data;
};

type DiaryEntryPayload = {
  title?: string;
  content?: string;
  tags?: string[];
  mood?: string;
  visibility?: "private" | "public";
  isDraft?: boolean;
  imageUri?: string | null;
};

const buildEntryFormData = (payload: DiaryEntryPayload) => {
  const formData = new FormData();

  if (typeof payload.title === "string")
    formData.append("title", payload.title);
  if (typeof payload.content === "string")
    formData.append("content", payload.content);
  if (payload.tags && payload.tags.length)
    formData.append("tags", payload.tags.join(","));
  if (typeof payload.mood === "string" && payload.mood.length)
    formData.append("mood", payload.mood);
  if (payload.visibility) formData.append("visibility", payload.visibility);
  if (typeof payload.isDraft === "boolean")
    formData.append("isDraft", payload.isDraft ? "true" : "false");

  if (payload.imageUri) {
    const uri = payload.imageUri;
    const name = uri.split("/").pop() || `entry-${Date.now()}.jpg`;
    const extension = name.split(".").pop()?.toLowerCase();
    let type = "image/jpeg";
    if (extension === "png") type = "image/png";
    if (extension === "webp") type = "image/webp";
    if (extension === "gif") type = "image/gif";

    if (__DEV__) {
      console.log("[buildEntryFormData] Adding image to FormData:", {
        uri,
        name,
        type,
      });
    }

    formData.append("image", {
      uri,
      name,
      type,
    } as any);
  }

  return formData;
};

export const createDiaryEntry = async (payload: DiaryEntryPayload) => {
  const formData = buildEntryFormData(payload);

  if (__DEV__) {
    console.log(
      "[createDiaryEntry] Sending FormData with image:",
      !!payload.imageUri
    );
  }

  const response = await api.post("/entries", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const updateDiaryEntry = async (
  entryId: string,
  payload: DiaryEntryPayload
) => {
  const formData = buildEntryFormData(payload);
  const response = await api.patch(`/entries/${entryId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const publishDiaryEntry = async (entryId: string) => {
  const response = await api.patch(`/entries/${entryId}/publish`);
  return response.data;
};

export const deleteDiaryEntry = async (entryId: string) => {
  const response = await api.delete(`/entries/${entryId}`);
  return response.data;
};

export const getTrendingPosts = async (page = 1, timeFilter = "today") => {
  const response = await api.get("/posts/trending", {
    params: { page, timeFilter },
  });
  return response.data;
};

export const likePost = async (postId: string) => {
  const response = await api.post(`/posts/${postId}/like`);
  return response.data;
};

export const getLeaderboard = async (period = "month") => {
  const response = await api.get("/leaderboard", { params: { period } });
  return response.data;
};

export const getSeasonalLeaderboard = async () => {
  const response = await api.get("/leaderboard/seasonal");
  return response.data;
};

export const getMarketplaceBooks = async (
  params: Record<string, unknown> = {}
) => {
  const response = await api.get("/marketplace/books", { params });
  return response.data;
};

export const getReaderBooks = async (params: Record<string, unknown> = {}) => {
  const response = await api.get("/marketplace/reader/books", { params });
  return response.data;
};

export const createSupportTicket = async (payload: {
  subject: string;
  message: string;
}) => {
  const response = await api.post("/support", payload);
  return response.data;
};

export type ApiError = AxiosError & { message?: string };

export const buildAssetUrl = (path?: string | null) => {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const host = resolvedApiUrl.replace(/\/api$/, "");
  return `${host}${path.startsWith("/") ? path : `/${path}`}`;
};

export const stripHtml = (value: string) =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
