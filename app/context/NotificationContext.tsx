import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./AuthContext";

type NotificationType =
  | "message"
  | "streak"
  | "community"
  | "general"
  | "voice_call"
  | "video_call";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  timestamp: string;
  isRead: boolean;
  readAt: string | null;
  link?: string;
  meta?: Record<string, any>;
  externalId?: string;
  priority?: "normal" | "high";
  icon?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Partial<Notification>) => void;
  clearAll: () => void;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

const generateId = () =>
  `ntf-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const storageKey = user?.id ? `notifications:${user.id}` : null;

  // Load notifications from storage on mount
  useEffect(() => {
    const loadNotifications = async () => {
      if (!storageKey) {
        setNotifications([]);
        setIsLoading(false);
        return;
      }

      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setNotifications(parsed);
          } else {
            setNotifications([]);
          }
        } else {
          setNotifications([]);
        }
      } catch (error) {
        console.warn("Failed to load notifications:", error);
        setNotifications([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadNotifications();
  }, [storageKey]);

  // Save notifications to storage whenever they change
  useEffect(() => {
    if (isLoading || !storageKey) return;
    const saveNotifications = async () => {
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(notifications));
      } catch (error) {
        console.warn("Failed to save notifications:", error);
      }
    };
    saveNotifications();
  }, [notifications, storageKey, isLoading]);

  const addNotification = useCallback((notification: Partial<Notification>) => {
    if (!notification) return;

    setNotifications((prev) => {
      const id = notification.id || generateId();
      const timestamp = notification.timestamp || new Date().toISOString();
      const externalId = notification.externalId || null;

      // Prevent duplicate notifications based on externalId
      if (
        externalId &&
        prev.some((item) => item.externalId && item.externalId === externalId)
      ) {
        return prev;
      }

      const entry: Notification = {
        id,
        type: notification.type || "general",
        title: notification.title || "Notification",
        message: notification.message || "",
        timestamp,
        isRead: Boolean(notification.isRead),
        readAt: notification.isRead
          ? notification.readAt || new Date().toISOString()
          : null,
        link: notification.link || undefined,
        meta: notification.meta || {},
        externalId: externalId || undefined,
        priority: notification.priority || "normal",
        icon: notification.icon || undefined,
      };

      return [entry, ...prev].slice(0, 100); // Keep max 100 notifications
    });
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
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

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      addNotification,
      clearAll,
      isLoading,
    }),
    [
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      addNotification,
      clearAll,
      isLoading,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};
