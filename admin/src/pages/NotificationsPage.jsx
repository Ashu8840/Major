import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FiBell,
  FiCheck,
  FiCheckCircle,
  FiTrash2,
  FiAlertTriangle,
  FiAlertCircle,
  FiInfo,
  FiX,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { apiClient } from "../lib/apiClient.js";
import { useAdminSession } from "../context/AdminAuthContext.jsx";
import Loader from "../components/loading/Loader.jsx";
import { useNavigate } from "react-router-dom";

const NotificationsPage = () => {
  const { isAuthenticated } = useAdminSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all"); // all, unread, read

  // Fetch notifications
  const { data, isLoading } = useQuery({
    queryKey: ["notifications", filter],
    queryFn: () => {
      const params = filter === "unread" ? "?unreadOnly=true" : "";
      return apiClient.get(`/notifications${params}`);
    },
    enabled: isAuthenticated,
    retry: 1,
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      return await apiClient.put(`/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["notifications"]);
      toast.success("Notification marked as read");
    },
    onError: () => {
      toast.error("Failed to mark notification as read");
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.put("/notifications/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["notifications"]);
      toast.success("All notifications marked as read");
    },
    onError: () => {
      toast.error("Failed to mark all as read");
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId) => {
      return await apiClient.delete(`/notifications/${notificationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["notifications"]);
      toast.success("Notification deleted");
    },
    onError: () => {
      toast.error("Failed to delete notification");
    },
  });

  const getSeverityStyles = (severity) => {
    switch (severity) {
      case "critical":
        return {
          bg: "bg-red-50 border-red-200",
          icon: FiAlertCircle,
          iconColor: "text-red-600",
          badge: "bg-red-100 text-red-700",
        };
      case "warning":
        return {
          bg: "bg-yellow-50 border-yellow-200",
          icon: FiAlertTriangle,
          iconColor: "text-yellow-600",
          badge: "bg-yellow-100 text-yellow-700",
        };
      default:
        return {
          bg: "bg-blue-50 border-blue-200",
          icon: FiInfo,
          iconColor: "text-blue-600",
          badge: "bg-blue-100 text-blue-700",
        };
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification._id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  if (isLoading) {
    return <Loader label="Loading notifications" />;
  }

  const notifications = data?.data?.notifications || [];
  const unreadCount = data?.data?.unreadCount || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Notifications
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Stay updated with system events and alerts
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="rounded-xl border-2 border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-600 hover:bg-green-100 transition-all disabled:opacity-50"
            >
              <FiCheck className="inline w-4 h-4 mr-2" />
              Mark All as Read
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border-2 border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {notifications.length}
              </p>
            </div>
            <FiBell className="w-8 h-8 text-indigo-600" />
          </div>
        </div>

        <div className="rounded-xl border-2 border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Unread</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {unreadCount}
              </p>
            </div>
            <FiAlertCircle className="w-8 h-8 text-rose-600" />
          </div>
        </div>

        <div className="rounded-xl border-2 border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Read</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {notifications.length - unreadCount}
              </p>
            </div>
            <FiCheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b-2 border-slate-200">
        {["all", "unread", "read"].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 text-sm font-semibold capitalize transition-all ${
              filter === tab
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="rounded-xl border-2 border-slate-200 bg-white p-12 text-center">
            <FiBell className="mx-auto w-12 h-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              No notifications
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              You're all caught up! No new notifications at this time.
            </p>
          </div>
        ) : (
          notifications.map((notification) => {
            const styles = getSeverityStyles(notification.severity);
            const Icon = styles.icon;

            return (
              <div
                key={notification._id}
                className={`rounded-xl border-2 ${
                  styles.bg
                } p-4 transition-all hover:shadow-md cursor-pointer ${
                  !notification.isRead ? "ring-2 ring-indigo-200" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-4">
                  <div className={`rounded-lg p-2 ${styles.bg}`}>
                    <Icon className={`w-5 h-5 ${styles.iconColor}`} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900">
                            {notification.title}
                          </h3>
                          {!notification.isRead && (
                            <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {notification.message}
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${styles.badge}`}
                          >
                            {notification.severity}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(notification.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!notification.isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsReadMutation.mutate(notification._id);
                            }}
                            className="rounded-lg p-2 text-green-600 hover:bg-green-100 transition-all"
                            title="Mark as read"
                          >
                            <FiCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotificationMutation.mutate(notification._id);
                          }}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-100 transition-all"
                          title="Delete"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
