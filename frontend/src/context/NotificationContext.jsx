import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import { useCurrentUser } from "../hooks/useAuth";
import { SOCKET_BASE_URL } from "../utils/api";

const NotificationContext = createContext(null);

const generateId = () =>
  `ntf-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

const normaliseId = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (
    typeof value === "object" &&
    value !== null &&
    typeof value.toString === "function"
  ) {
    return value.toString();
  }
  return `${value}`;
};

const buildMessagePreview = (message) => {
  if (!message) return "Start the conversation";
  if (message.callType) {
    const typeLabel = message.callType === "video" ? "Video" : "Voice";
    const status = message.callStatus === "missed" ? "Missed" : "Completed";
    return `${status} ${typeLabel.toLowerCase()} call`;
  }

  if (Array.isArray(message.media) && message.media.length > 0) {
    const media = message.media[0];
    if (media.type === "image") return "📷 Photo";
    if (media.type === "video") return "🎬 Video";
    if (media.type === "audio") return "🎙️ Voice note";
    return "📎 Attachment";
  }

  if (message.mediaType) {
    if (message.mediaType === "image") return "📷 Photo";
    if (message.mediaType === "video") return "🎬 Video";
    if (message.mediaType === "audio") return "🎙️ Voice note";
    return "📎 Attachment";
  }

  const text = message.text || "";
  return text.trim() || "New message";
};

const normaliseMessage = (message) => {
  if (!message) return null;
  const senderId = normaliseId(message.senderId ?? message.sender);
  const receiverId = normaliseId(message.receiverId ?? message.receiver);

  return {
    id:
      normaliseId(message.id) ||
      normaliseId(message._id) ||
      `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    chatId: normaliseId(message.chatId),
    senderId,
    receiverId,
    text: message.text || "",
    media: Array.isArray(message.media) ? message.media : [],
    status: message.status || "sent",
    callType: message.callType || null,
    callStatus: message.callStatus || null,
    callDuration: message.callDuration || 0,
    createdAt: message.createdAt || new Date().toISOString(),
    updatedAt:
      message.updatedAt || message.createdAt || new Date().toISOString(),
  };
};

const getInitialStatsSnapshot = (profile = {}) => {
  if (!profile) return { streak: null, points: null };
  const stats = profile.stats || {};
  const raw = profile.rawProfile?.stats || {};
  const source = { ...stats, ...raw };
  const streak =
    source.dailyStreak ?? source.currentStreak ?? source.streak ?? null;
  const points =
    source.totalPoints ?? source.points ?? source.score ?? source.xp ?? null;

  return { streak, points };
};

export const NotificationProvider = ({ children }) => {
  const { currentUser, token } = useCurrentUser();
  const [notifications, setNotifications] = useState([]);
  const storageKey = currentUser?.id ? `notifications:${currentUser.id}` : null;
  const statsSnapshotRef = useRef({ streak: null, points: null, ready: false });
  const socketRef = useRef(null);
  const location = useLocation();
  const locationRef = useRef(location);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    if (!storageKey) {
      setNotifications([]);
      return;
    }

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setNotifications([]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setNotifications(parsed);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.warn("Failed to parse stored notifications", error);
      setNotifications([]);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(notifications));
    } catch (error) {
      console.warn("Failed to persist notifications", error);
    }
  }, [storageKey, notifications]);

  const addNotification = useCallback((notification) => {
    if (!notification) return null;

    setNotifications((prev) => {
      const id = notification.id || generateId();
      const timestamp = notification.timestamp || new Date().toISOString();
      const externalId = notification.externalId || null;

      if (
        externalId &&
        prev.some((item) => item.externalId && item.externalId === externalId)
      ) {
        return prev;
      }

      const entry = {
        id,
        type: notification.type || "general",
        title: notification.title || "Notification",
        message: notification.message || "",
        timestamp,
        isRead: Boolean(notification.isRead),
        readAt: notification.isRead
          ? notification.readAt || new Date().toISOString()
          : null,
        link: notification.link || null,
        meta: notification.meta || {},
        externalId,
        priority: notification.priority || "normal",
        icon: notification.icon || null,
      };

      return [entry, ...prev].slice(0, 100);
    });
  }, []);

  useEffect(() => {
    const userId = normaliseId(currentUser?.id);

    if (!userId) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return () => {};
    }

    const socket = io(SOCKET_BASE_URL, {
      transports: ["polling"],
      upgrade: false,
      auth: token ? { token } : undefined,
    });

    socketRef.current = socket;

    const handleIncomingMessage = (payload) => {
      const message = normaliseMessage(payload);
      if (!message) return;

      if (message.senderId === userId) return;

      const currentPath = locationRef.current?.pathname || "";
      if (currentPath.startsWith("/chat")) {
        return;
      }

      const partnerId = message.senderId;
      const senderName =
        payload?.sender?.displayName ||
        payload?.sender?.username ||
        payload?.senderName ||
        payload?.sender ||
        "New message";

      addNotification({
        type: "message",
        title: `New message from ${senderName}`,
        message: buildMessagePreview(message),
        link: `/chat?open=${partnerId}`,
        meta: {
          partnerId,
          messageId: message.id,
          chatId: message.chatId || null,
        },
        externalId: message.id ? `chat-message-${message.id}` : undefined,
      });
    };

    const handleSignal = ({ from, callType, signal, sender }) => {
      const callerId = normaliseId(from);
      if (!signal || signal.type !== "offer" || callerId === userId) return;

      const currentPath = locationRef.current?.pathname || "";
      if (currentPath.startsWith("/chat")) {
        return;
      }

      const callerName =
        sender?.displayName || sender?.username || sender?.name || "Someone";

      const callKind = callType === "video" ? "video_call" : "voice_call";

      addNotification({
        type: callKind,
        title: `${callerName} is calling`,
        message: `Incoming ${callType || "voice"} call`,
        link: `/chat?open=${callerId}`,
        meta: {
          partnerId: callerId,
          callType: callType || "voice",
        },
        externalId: `call-offer-${callerId}-${callType || "voice"}`,
      });
    };

    socket.on("receiveMessage", handleIncomingMessage);
    socket.on("webrtc-signal", handleSignal);
    socket.emit("user:register", userId);

    return () => {
      socket.off("receiveMessage", handleIncomingMessage);
      socket.off("webrtc-signal", handleSignal);
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [currentUser?.id, token, addNotification]);

  const markAsRead = useCallback((notificationId) => {
    if (!notificationId) return;
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === notificationId
          ? {
              ...notification,
              isRead: true,
              readAt: new Date().toISOString(),
            }
          : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.isRead
          ? notification
          : {
              ...notification,
              isRead: true,
              readAt: new Date().toISOString(),
            }
      )
    );
  }, []);

  const removeNotification = useCallback((notificationId) => {
    if (!notificationId) return;
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== notificationId)
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  useEffect(() => {
    if (!currentUser) {
      statsSnapshotRef.current = { streak: null, points: null, ready: false };
      return;
    }

    const snapshot = getInitialStatsSnapshot(currentUser);
    const ref = statsSnapshotRef.current;

    if (!ref.ready) {
      statsSnapshotRef.current = { ...snapshot, ready: true };
      return;
    }

    if (
      typeof snapshot.streak === "number" &&
      snapshot.streak > (ref.streak ?? -Infinity)
    ) {
      addNotification({
        type: "streak",
        title: "🔥 Daily streak updated",
        message: `You're on a ${snapshot.streak}-day streak! Keep it going.`,
        externalId: `streak-${snapshot.streak}`,
      });
    }

    if (
      typeof snapshot.points === "number" &&
      snapshot.points > (ref.points ?? -Infinity)
    ) {
      const earned = ref.points
        ? snapshot.points - ref.points
        : snapshot.points;
      addNotification({
        type: "points",
        title: "⭐ Points earned",
        message: `You just earned ${earned} points. Total: ${snapshot.points}.`,
        externalId: `points-${snapshot.points}`,
      });
    }

    statsSnapshotRef.current = { ...snapshot, ready: true };
  }, [currentUser, addNotification]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearNotifications,
    }),
    [
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearNotifications,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};
