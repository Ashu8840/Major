import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import AdminProtectedLayout from "./components/layout/AdminProtectedLayout.jsx";

const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const UsersPage = lazy(() => import("./pages/UsersPage.jsx"));
const CommunityPage = lazy(() => import("./pages/CommunityPage.jsx"));
const MarketplacePage = lazy(() => import("./pages/MarketplacePage.jsx"));
const SupportPage = lazy(() => import("./pages/SupportPage.jsx"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage.jsx"));
const AdminManagementPage = lazy(() =>
  import("./pages/AdminManagementPage.jsx")
);
const ContentModerationPage = lazy(() =>
  import("./pages/ContentModerationPage.jsx")
);
const MarketplaceControlPage = lazy(() =>
  import("./pages/MarketplaceControlPage.jsx")
);
const AnalyticsDeepDivePage = lazy(() =>
  import("./pages/AnalyticsDeepDivePage.jsx")
);
const SystemSettingsPage = lazy(() => import("./pages/SystemSettingsPage.jsx"));
const SystemMonitoringPage = lazy(() =>
  import("./pages/SystemMonitoringPage.jsx")
);
const NotificationsPage = lazy(() => import("./pages/NotificationsPage.jsx"));
const ChatbotTraining = lazy(() => import("./pages/ChatbotTraining.jsx"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage.jsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: <AdminProtectedLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "users", element: <UsersPage /> },
      { path: "community", element: <CommunityPage /> },
      { path: "marketplace", element: <MarketplacePage /> },
      { path: "marketplace-control", element: <MarketplaceControlPage /> },
      { path: "moderation", element: <ContentModerationPage /> },
      { path: "support", element: <SupportPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "analytics-deep", element: <AnalyticsDeepDivePage /> },
      { path: "monitoring", element: <SystemMonitoringPage /> },
      { path: "notifications", element: <NotificationsPage /> },
      { path: "chatbot-training", element: <ChatbotTraining /> },
      { path: "settings", element: <SystemSettingsPage /> },
      { path: "admins", element: <AdminManagementPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

export default router;
