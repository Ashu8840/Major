import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { apiClient } from "../lib/apiClient";
import { useAdminSession } from "../context/AdminAuthContext.jsx";
import Loader from "../components/loading/Loader.jsx";

const LoginPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading, refresh } = useAdminSession();
  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return <Loader label="Checking admin session" />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.email || !form.password) {
      toast.error("Enter your email and password.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiClient.post("/users/login", {
        email: form.email,
        password: form.password,
      });

      const isAdmin =
        response?.role === "admin" || response?.role === "moderator";
      if (!isAdmin) {
        throw new Error("You do not have administrator access.");
      }

      localStorage.setItem("admin_token", response.token);
      if (response?.refreshToken) {
        localStorage.setItem("admin_refresh_token", response.refreshToken);
      }
      const displayName =
        response?.displayName || response?.username || "Administrator";
      localStorage.setItem("admin_name", displayName);

      toast.success("Welcome back!");
      await refresh();
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Admin login failed:", error);
      const message =
        error?.payload?.message ||
        error?.message ||
        "Unable to sign in. Please check your credentials.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">
            Admin Portal
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Use your administrator account to manage the platform.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="mb-1 block text-sm font-medium text-slate-600"
              htmlFor="email"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label
              className="mb-1 block text-sm font-medium text-slate-600"
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary-600 disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
