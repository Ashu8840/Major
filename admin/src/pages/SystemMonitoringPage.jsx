import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FiActivity,
  FiServer,
  FiWifi,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiCpu,
  FiHardDrive,
  FiDatabase,
  FiGlobe,
  FiZap,
  FiTrendingUp,
  FiTrendingDown,
  FiRefreshCw,
  FiSettings,
  FiDownload,
  FiAlertCircle,
  FiPackage,
  FiUsers,
  FiBarChart2,
  FiUpload,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { apiClient } from "../lib/apiClient.js";
import Loader from "../components/loading/Loader.jsx";
import { useAdminSession } from "../context/AdminAuthContext.jsx";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const SystemMonitoringPage = () => {
  const { isAuthenticated } = useAdminSession();
  const queryClient = useQueryClient();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds

  // Fetch system health
  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ["monitoring", "health"],
    queryFn: () => apiClient.get("/monitoring/health"),
    enabled: isAuthenticated,
    refetchInterval: autoRefresh ? refreshInterval : false,
    retry: false,
  });

  // Fetch network metrics
  const { data: networkData, isLoading: networkLoading } = useQuery({
    queryKey: ["monitoring", "network"],
    queryFn: () => apiClient.get("/monitoring/network"),
    enabled: isAuthenticated,
    refetchInterval: autoRefresh ? refreshInterval : false,
    retry: false,
  });

  // Fetch server metrics
  const { data: serverData, isLoading: serverLoading } = useQuery({
    queryKey: ["monitoring", "server"],
    queryFn: () => apiClient.get("/monitoring/server"),
    enabled: isAuthenticated,
    refetchInterval: autoRefresh ? refreshInterval : false,
    retry: false,
  });

  // Fetch traffic analytics
  const { data: trafficData } = useQuery({
    queryKey: ["monitoring", "traffic"],
    queryFn: () => apiClient.get("/monitoring/traffic"),
    enabled: isAuthenticated,
    refetchInterval: autoRefresh ? refreshInterval : false,
    retry: false,
  });

  // Fetch downtime history
  const { data: downtimeData } = useQuery({
    queryKey: ["monitoring", "downtime"],
    queryFn: () => apiClient.get("/monitoring/downtime"),
    enabled: isAuthenticated,
    retry: false,
  });

  // Restart service mutation
  const restartServiceMutation = useMutation({
    mutationFn: async (service) => {
      return await apiClient.post(`/monitoring/restart/${service}`);
    },
    onSuccess: (_, service) => {
      queryClient.invalidateQueries(["monitoring"]);
      toast.success(`${service} restarted successfully`);
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to restart service");
    },
  });

  // Clear cache mutation
  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.post("/monitoring/clear-cache");
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["monitoring"]);
      toast.success("Cache cleared successfully");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to clear cache");
    },
  });

  // Sample data for visualizations
  const cpuHistory = serverData?.cpuHistory || [
    { time: "10:00", usage: 45 },
    { time: "10:05", usage: 52 },
    { time: "10:10", usage: 48 },
    { time: "10:15", usage: 65 },
    { time: "10:20", usage: 58 },
    { time: "10:25", usage: 71 },
    { time: "10:30", usage: 55 },
    { time: "10:35", usage: 62 },
  ];

  const memoryHistory = serverData?.memoryHistory || [
    { time: "10:00", usage: 3200 },
    { time: "10:05", usage: 3450 },
    { time: "10:10", usage: 3600 },
    { time: "10:15", usage: 3800 },
    { time: "10:20", usage: 3550 },
    { time: "10:25", usage: 3900 },
    { time: "10:30", usage: 3700 },
    { time: "10:35", usage: 3850 },
  ];

  const networkTraffic = networkData?.traffic || [
    { time: "10:00", incoming: 1200, outgoing: 800 },
    { time: "10:05", incoming: 1500, outgoing: 950 },
    { time: "10:10", incoming: 1350, outgoing: 900 },
    { time: "10:15", incoming: 1800, outgoing: 1200 },
    { time: "10:20", incoming: 1650, outgoing: 1100 },
    { time: "10:25", incoming: 2100, outgoing: 1400 },
    { time: "10:30", incoming: 1900, outgoing: 1250 },
    { time: "10:35", incoming: 2200, outgoing: 1500 },
  ];

  const requestsPerMinute = trafficData?.requestsPerMinute || [
    { time: "10:00", requests: 245, errors: 12 },
    { time: "10:05", requests: 312, errors: 8 },
    { time: "10:10", requests: 289, errors: 15 },
    { time: "10:15", requests: 456, errors: 23 },
    { time: "10:20", requests: 398, errors: 18 },
    { time: "10:25", requests: 523, errors: 31 },
    { time: "10:30", requests: 467, errors: 21 },
    { time: "10:35", requests: 501, errors: 19 },
  ];

  const health = healthData?.health || {
    status: "healthy",
    uptime: "15d 7h 23m",
    responseTime: 45,
    errorRate: 0.8,
  };

  const server = serverData?.server || {
    cpu: 58,
    memory: 3850,
    totalMemory: 8192,
    disk: 45,
    totalDisk: 512,
    processes: 156,
  };

  const network = networkData?.network || {
    strength: 98,
    latency: 12,
    packetLoss: 0.2,
    bandwidth: 1000,
    activeConnections: 342,
  };

  const traffic = trafficData?.traffic || {
    totalRequests: 1234567,
    avgResponseTime: 145,
    peakLoad: 892,
    activeUsers: 1245,
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "healthy":
      case "excellent":
        return "text-green-600 bg-green-100 border-green-300";
      case "warning":
      case "good":
        return "text-yellow-600 bg-yellow-100 border-yellow-300";
      case "critical":
      case "poor":
        return "text-red-600 bg-red-100 border-red-300";
      default:
        return "text-slate-600 bg-slate-100 border-slate-300";
    }
  };

  const getNetworkStrengthStatus = (strength) => {
    if (strength >= 90)
      return { label: "Excellent", color: "text-green-600 bg-green-100" };
    if (strength >= 70)
      return { label: "Good", color: "text-blue-600 bg-blue-100" };
    if (strength >= 50)
      return { label: "Fair", color: "text-yellow-600 bg-yellow-100" };
    return { label: "Poor", color: "text-red-600 bg-red-100" };
  };

  const isLoading = healthLoading || networkLoading || serverLoading;

  if (isLoading) {
    return <Loader label="Loading system monitoring data" />;
  }

  const networkStatus = getNetworkStrengthStatus(network.strength);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            System Monitoring
          </h1>
          <p className="mt-2 text-sm text-slate-600 flex items-center gap-2">
            <FiActivity className="w-4 h-4" />
            Real-time server health and network analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl">
            <FiRefreshCw
              className={`w-4 h-4 ${
                autoRefresh ? "text-green-600 animate-spin" : "text-slate-400"
              }`}
            />
            <select
              value={autoRefresh ? refreshInterval : "off"}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "off") {
                  setAutoRefresh(false);
                } else {
                  setAutoRefresh(true);
                  setRefreshInterval(parseInt(value));
                }
              }}
              className="bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="off">Auto-refresh: Off</option>
              <option value="5000">Every 5s</option>
              <option value="10000">Every 10s</option>
              <option value="30000">Every 30s</option>
              <option value="60000">Every 1m</option>
            </select>
          </div>
          <button
            onClick={() => queryClient.invalidateQueries(["monitoring"])}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-100 transition-all"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh Now
          </button>
        </div>
      </div>

      {/* System Health Overview */}
      <div
        className={`rounded-2xl border-2 p-6 ${getStatusColor(health.status)}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white/50 p-3">
              {health.status === "healthy" ? (
                <FiCheckCircle className="w-8 h-8" />
              ) : (
                <FiAlertTriangle className="w-8 h-8" />
              )}
            </div>
            <div>
              <h3 className="text-2xl font-bold capitalize">{health.status}</h3>
              <p className="text-sm font-medium opacity-80 mt-1">
                All systems operational
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium opacity-80">Uptime</p>
            <p className="text-2xl font-bold">{health.uptime}</p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">
                Response Time
              </p>
              <p className="mt-2 text-3xl font-bold text-green-600">
                {health.responseTime}ms
              </p>
              <div className="flex items-center gap-1 mt-2">
                <FiTrendingDown className="w-4 h-4 text-green-600" />
                <span className="text-xs font-semibold text-green-600">
                  -12% vs last hour
                </span>
              </div>
            </div>
            <div className="rounded-xl bg-green-100 p-3">
              <FiZap className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Active Users</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">
                {traffic.activeUsers.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <FiTrendingUp className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-blue-600">
                  +8% vs last hour
                </span>
              </div>
            </div>
            <div className="rounded-xl bg-blue-100 p-3">
              <FiUsers className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Error Rate</p>
              <p className="mt-2 text-3xl font-bold text-orange-600">
                {health.errorRate}%
              </p>
              <div className="flex items-center gap-1 mt-2">
                <FiTrendingDown className="w-4 h-4 text-green-600" />
                <span className="text-xs font-semibold text-green-600">
                  -0.3% vs last hour
                </span>
              </div>
            </div>
            <div className="rounded-xl bg-orange-100 p-3">
              <FiAlertCircle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Peak Load</p>
              <p className="mt-2 text-3xl font-bold text-purple-600">
                {traffic.peakLoad}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <FiActivity className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-semibold text-purple-600">
                  req/min
                </span>
              </div>
            </div>
            <div className="rounded-xl bg-purple-100 p-3">
              <FiBarChart2 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Server Resources */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* CPU & Memory */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <FiCpu className="w-5 h-5 text-indigo-600" />
            CPU & Memory Usage
          </h3>
          <div className="space-y-4 mb-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">
                  CPU Usage
                </span>
                <span
                  className={`text-sm font-bold ${
                    server.cpu > 80
                      ? "text-red-600"
                      : server.cpu > 60
                      ? "text-yellow-600"
                      : "text-green-600"
                  }`}
                >
                  {server.cpu}%
                </span>
              </div>
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    server.cpu > 80
                      ? "bg-red-600"
                      : server.cpu > 60
                      ? "bg-yellow-600"
                      : "bg-green-600"
                  }`}
                  style={{ width: `${server.cpu}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">
                  Memory Usage
                </span>
                <span
                  className={`text-sm font-bold ${
                    (server.memory / server.totalMemory) * 100 > 80
                      ? "text-red-600"
                      : "text-blue-600"
                  }`}
                >
                  {server.memory}MB / {server.totalMemory}MB
                </span>
              </div>
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    (server.memory / server.totalMemory) * 100 > 80
                      ? "bg-red-600"
                      : "bg-blue-600"
                  }`}
                  style={{
                    width: `${(server.memory / server.totalMemory) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">
                  Disk Usage
                </span>
                <span className="text-sm font-bold text-purple-600">
                  {server.disk}%
                </span>
              </div>
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-600 rounded-full transition-all"
                  style={{ width: `${server.disk}%` }}
                />
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={cpuHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="time"
                stroke="#64748b"
                style={{ fontSize: "12px" }}
              />
              <YAxis stroke="#64748b" style={{ fontSize: "12px" }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="usage"
                stroke="#6366f1"
                strokeWidth={2}
                name="CPU %"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Network Health */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <FiWifi className="w-5 h-5 text-green-600" />
            Network Health
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <FiWifi className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-semibold uppercase text-slate-600">
                  Strength
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {network.strength}%
              </p>
              <span
                className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${networkStatus.color}`}
              >
                {networkStatus.label}
              </span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <FiClock className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-semibold uppercase text-slate-600">
                  Latency
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {network.latency}ms
              </p>
              <span className="text-xs text-slate-600 mt-2 inline-block">
                Excellent
              </span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <FiPackage className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-semibold uppercase text-slate-600">
                  Packet Loss
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {network.packetLoss}%
              </p>
              <span className="text-xs text-green-600 mt-2 inline-block">
                Normal
              </span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <FiGlobe className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-semibold uppercase text-slate-600">
                  Connections
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {network.activeConnections}
              </p>
              <span className="text-xs text-slate-600 mt-2 inline-block">
                Active
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={networkTraffic}>
              <defs>
                <linearGradient id="colorIncoming" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorOutgoing" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="time"
                stroke="#64748b"
                style={{ fontSize: "12px" }}
              />
              <YAxis stroke="#64748b" style={{ fontSize: "12px" }} />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="incoming"
                stroke="#10b981"
                fill="url(#colorIncoming)"
                name="Incoming (KB/s)"
              />
              <Area
                type="monotone"
                dataKey="outgoing"
                stroke="#3b82f6"
                fill="url(#colorOutgoing)"
                name="Outgoing (KB/s)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Traffic & Requests */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <FiActivity className="w-5 h-5 text-purple-600" />
          Traffic & Request Analytics
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={requestsPerMinute}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="time" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="requests"
              fill="#8b5cf6"
              radius={[8, 8, 0, 0]}
              name="Successful Requests"
            />
            <Bar
              dataKey="errors"
              fill="#ef4444"
              radius={[8, 8, 0, 0]}
              name="Errors"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Downtime History */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <FiAlertTriangle className="w-5 h-5 text-red-600" />
          Downtime History (Last 30 Days)
        </h3>
        {downtimeData?.incidents && downtimeData.incidents.length > 0 ? (
          <div className="space-y-3">
            {downtimeData.incidents.slice(0, 5).map((incident, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-lg p-2 ${
                      incident.severity === "critical"
                        ? "bg-red-100"
                        : incident.severity === "warning"
                        ? "bg-yellow-100"
                        : "bg-blue-100"
                    }`}
                  >
                    <FiAlertTriangle
                      className={`w-5 h-5 ${
                        incident.severity === "critical"
                          ? "text-red-600"
                          : incident.severity === "warning"
                          ? "text-yellow-600"
                          : "text-blue-600"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {incident.service || "System"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {incident.description || "Service interruption detected"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-700">
                    {incident.duration || "5m 32s"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {incident.date || new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FiCheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
            <p className="text-slate-600 font-medium">
              No downtime incidents in the last 30 days
            </p>
            <p className="text-sm text-slate-500 mt-1">
              System has been running smoothly
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <FiSettings className="w-5 h-5 text-indigo-600" />
          Quick Actions
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <button
            onClick={() => clearCacheMutation.mutate()}
            disabled={clearCacheMutation.isPending}
            className="flex flex-col items-center gap-3 p-4 border-2 border-indigo-200 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-all disabled:opacity-50"
          >
            <FiRefreshCw className="w-6 h-6 text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-700">
              {clearCacheMutation.isPending ? "Clearing..." : "Clear Cache"}
            </span>
          </button>

          <button
            onClick={() => restartServiceMutation.mutate("api")}
            disabled={restartServiceMutation.isPending}
            className="flex flex-col items-center gap-3 p-4 border-2 border-green-200 rounded-xl bg-green-50 hover:bg-green-100 transition-all disabled:opacity-50"
          >
            <FiServer className="w-6 h-6 text-green-600" />
            <span className="text-sm font-semibold text-green-700">
              {restartServiceMutation.isPending
                ? "Restarting..."
                : "Restart API"}
            </span>
          </button>

          <button
            onClick={() => restartServiceMutation.mutate("database")}
            disabled={restartServiceMutation.isPending}
            className="flex flex-col items-center gap-3 p-4 border-2 border-blue-200 rounded-xl bg-blue-50 hover:bg-blue-100 transition-all disabled:opacity-50"
          >
            <FiDatabase className="w-6 h-6 text-blue-600" />
            <span className="text-sm font-semibold text-blue-700">
              {restartServiceMutation.isPending
                ? "Restarting..."
                : "Restart Database"}
            </span>
          </button>

          <button
            onClick={() =>
              window.open(
                `${apiClient.defaults.baseURL}/monitoring/export`,
                "_blank"
              )
            }
            className="flex flex-col items-center gap-3 p-4 border-2 border-purple-200 rounded-xl bg-purple-50 hover:bg-purple-100 transition-all"
          >
            <FiDownload className="w-6 h-6 text-purple-600" />
            <span className="text-sm font-semibold text-purple-700">
              Export Logs
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemMonitoringPage;
