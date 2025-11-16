// Demo notifications for testing
// This file provides sample notifications to demonstrate the notification feature

import { useNotifications } from "@/context/NotificationContext";

export const useDemoNotifications = () => {
  const { addNotification } = useNotifications();

  const addSampleNotifications = () => {
    // Message notification
    addNotification({
      type: "message",
      title: "New message from John",
      message: "Hey! How are you doing?",
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(), // 5 minutes ago
      link: "/social",
    });

    // Streak notification
    addNotification({
      type: "streak",
      title: "Daily Streak Achievement!",
      message: "You've maintained a 7-day streak! Keep it up! 🔥",
      timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
    });

    // Community notification
    addNotification({
      type: "community",
      title: "New post in Writing Circle",
      message: "Sarah shared a new story in your favorite community",
      timestamp: new Date(Date.now() - 24 * 3600000).toISOString(), // 1 day ago
      link: "/community",
    });

    // Voice call notification
    addNotification({
      type: "voice_call",
      title: "Missed voice call",
      message: "You missed a call from Alice",
      timestamp: new Date(Date.now() - 3 * 3600000).toISOString(), // 3 hours ago
    });

    // General notification
    addNotification({
      type: "general",
      title: "Welcome to Major!",
      message: "Thank you for joining our creative community",
      timestamp: new Date(Date.now() - 48 * 3600000).toISOString(), // 2 days ago
    });
  };

  return { addSampleNotifications };
};
