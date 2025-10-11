import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import AdminProtectedLayout from "./components/layout/AdminProtectedLayout.jsx";

const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const UsersPage = lazy(() => import("./pages/UsersPage.jsx"));
const CommunityPage = lazy(() => import("./pages/CommunityPage.jsx"));
const MarketplacePage = lazy(() => import("./pages/MarketplacePage.jsx"));
const SupportPage = lazy(() => import("./pages/SupportPage.jsx"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage.jsx"));
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
      { path: "support", element: <SupportPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

export default router;
