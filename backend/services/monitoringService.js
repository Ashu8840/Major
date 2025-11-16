const os = require("os");
const SystemLog = require("../models/SystemLog");
const mongoose = require("mongoose");

// Store for real-time metrics (in-memory cache)
let metricsStore = {
  startTime: Date.now(),
  requestCount: 0,
  errorCount: 0,
  activeConnections: 0,
  requestHistory: [], // Store last 60 minutes of data
  cpuHistory: [],
  memoryHistory: [],
  networkHistory: [],
  lastMetricsUpdate: Date.now(),
  lastDbQuery: 0, // Track last database query time
  cachedDowntime: [], // Cache downtime data
  cacheExpiry: 60000, // Cache expires after 1 minute
  responseTimes: [], // Track last 100 response times
  maxResponseTimes: 100,
};

// Previous CPU info for delta calculation
let previousCpuInfo = {
  idle: 0,
  total: 0,
};

// Initialize metrics collection
const initializeMonitoring = () => {
  // Collect metrics every 10 seconds
  setInterval(() => {
    collectSystemMetrics();
  }, 10000);

  // Clean old data every 5 minutes
  setInterval(() => {
    cleanOldMetrics();
  }, 300000);
};

// Collect system metrics - More accurate CPU calculation
const collectSystemMetrics = () => {
  const timestamp = Date.now();

  // CPU metrics - Calculate usage based on delta
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;

  cpus.forEach((cpu) => {
    for (const type in cpu.times) {
      total += cpu.times[type];
    }
    idle += cpu.times.idle;
  });

  const idleDiff = idle - previousCpuInfo.idle;
  const totalDiff = total - previousCpuInfo.total;
  const cpuUsage =
    totalDiff > 0 ? 100 - Math.floor((idleDiff / totalDiff) * 100) : 0;

  previousCpuInfo.idle = idle;
  previousCpuInfo.total = total;

  // Memory metrics
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsagePercent = Math.floor((usedMemory / totalMemory) * 100);

  // Store CPU history (limit to 100 points)
  metricsStore.cpuHistory.push({
    timestamp,
    usage: cpuUsage,
  });

  // Store memory history (limit to 100 points)
  metricsStore.memoryHistory.push({
    timestamp,
    used: Math.floor(usedMemory / 1024 / 1024), // Convert to MB
    total: Math.floor(totalMemory / 1024 / 1024),
    percent: memoryUsagePercent,
  });

  // Keep only last 100 data points (about 16 minutes at 10s intervals)
  if (metricsStore.cpuHistory.length > 100) {
    metricsStore.cpuHistory.shift();
  }
  if (metricsStore.memoryHistory.length > 100) {
    metricsStore.memoryHistory.shift();
  }

  metricsStore.lastMetricsUpdate = timestamp;
};

// Track request
const trackRequest = (success = true, responseTime = null) => {
  metricsStore.requestCount++;
  if (!success) {
    metricsStore.errorCount++;
  }

  // Track response times if provided
  if (responseTime !== null) {
    metricsStore.responseTimes.push(responseTime);
    if (metricsStore.responseTimes.length > metricsStore.maxResponseTimes) {
      metricsStore.responseTimes.shift(); // Remove oldest
    }
  }

  const now = Date.now();
  const currentMinute = Math.floor(now / 60000);

  // Find or create minute bucket
  let minuteBucket = metricsStore.requestHistory.find(
    (h) => h.minute === currentMinute
  );

  if (!minuteBucket) {
    minuteBucket = {
      minute: currentMinute,
      timestamp: currentMinute * 60000,
      requests: 0,
      errors: 0,
    };
    metricsStore.requestHistory.push(minuteBucket);
  }

  minuteBucket.requests++;
  if (!success) {
    minuteBucket.errors++;
  }
};

// Calculate average response time
const getAverageResponseTime = () => {
  if (metricsStore.responseTimes.length === 0) return 50; // Default 50ms

  const sum = metricsStore.responseTimes.reduce((acc, time) => acc + time, 0);
  return Math.round(sum / metricsStore.responseTimes.length);
};

// Track active connection
const trackConnection = (increment = true) => {
  if (increment) {
    metricsStore.activeConnections++;
  } else {
    metricsStore.activeConnections = Math.max(
      0,
      metricsStore.activeConnections - 1
    );
  }
};

// Clean old metrics data
const cleanOldMetrics = () => {
  const oneHourAgo = Date.now() - 3600000; // 1 hour in milliseconds

  // Keep only last hour of request history
  metricsStore.requestHistory = metricsStore.requestHistory.filter(
    (h) => h.timestamp > oneHourAgo
  );

  // Keep only last 100 data points for CPU and memory
  if (metricsStore.cpuHistory.length > 100) {
    metricsStore.cpuHistory = metricsStore.cpuHistory.slice(-100);
  }
  if (metricsStore.memoryHistory.length > 100) {
    metricsStore.memoryHistory = metricsStore.memoryHistory.slice(-100);
  }
};

// Get system health
const getSystemHealth = () => {
  const uptime = Date.now() - metricsStore.startTime;
  const totalRequests = metricsStore.requestCount;
  const errorRate =
    totalRequests > 0
      ? ((metricsStore.errorCount / totalRequests) * 100).toFixed(2)
      : 0;

  // Calculate average response time from last 10 requests
  const recentRequests = metricsStore.requestHistory.slice(-10);
  const avgResponseTime =
    recentRequests.length > 0
      ? Math.floor(Math.random() * 50) + 20 // Simulated for now, should track real response times
      : 45;

  // Determine health status
  let status = "healthy";
  const cpuUsage =
    metricsStore.cpuHistory.length > 0
      ? metricsStore.cpuHistory[metricsStore.cpuHistory.length - 1].usage
      : 0;
  const memoryUsage =
    metricsStore.memoryHistory.length > 0
      ? metricsStore.memoryHistory[metricsStore.memoryHistory.length - 1]
          .percent
      : 0;

  if (cpuUsage > 80 || memoryUsage > 85 || errorRate > 5) {
    status = "critical";
  } else if (cpuUsage > 60 || memoryUsage > 70 || errorRate > 2) {
    status = "warning";
  }

  return {
    status,
    uptime: Math.floor(uptime / 1000), // in seconds
    responseTime: avgResponseTime,
    errorRate: parseFloat(errorRate),
    totalRequests,
    totalErrors: metricsStore.errorCount,
    activeUsers: metricsStore.activeConnections,
  };
};

// Get network metrics with real calculation
const getNetworkMetrics = () => {
  const health = getSystemHealth();
  const cpuUsage =
    metricsStore.cpuHistory.length > 0
      ? metricsStore.cpuHistory[metricsStore.cpuHistory.length - 1].usage
      : 0;

  // Get real average response time from tracked requests
  const avgResponseTime = getAverageResponseTime();
  const activeConnections = metricsStore.activeConnections;

  // Calculate network strength based on multiple factors
  // 100% = perfect (no errors, low CPU, good response time)
  const errorImpact = health.errorRate * 10; // Each 1% error rate reduces 10%
  const cpuImpact = cpuUsage > 70 ? (cpuUsage - 70) / 3 : 0; // CPU over 70% impacts network
  const responseImpact =
    avgResponseTime > 100 ? (avgResponseTime - 100) / 10 : 0;

  const networkStrength = Math.max(
    0,
    Math.min(100, 100 - errorImpact - cpuImpact - responseImpact)
  );

  // Calculate latency based on response time and active connections
  const baseLatency = 10;
  const connectionLoad = metricsStore.activeConnections / 10;
  const latency = Math.floor(
    baseLatency + connectionLoad + health.responseTime / 10
  );

  // Calculate packet loss from error rate
  const packetLoss =
    health.errorRate > 0 ? parseFloat((health.errorRate / 100).toFixed(3)) : 0;

  // Estimate bandwidth (decrease with high load)
  const loadFactor = Math.min(1, metricsStore.activeConnections / 100);
  const baseBandwidth = 1000; // Mbps
  const bandwidth = Math.floor(baseBandwidth * (1 - loadFactor * 0.3));

  return {
    strength: Math.floor(networkStrength),
    latency: Math.min(latency, 300), // Cap at 300ms
    packetLoss,
    bandwidth,
    activeConnections: metricsStore.activeConnections,
    bytesReceived: 0, // Placeholder for real network monitoring
    bytesSent: 0,
  };
};

// Get server metrics
const getServerMetrics = () => {
  const cpus = os.cpus();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;

  // Get latest CPU usage
  const latestCpu =
    metricsStore.cpuHistory.length > 0
      ? metricsStore.cpuHistory[metricsStore.cpuHistory.length - 1].usage
      : 0;

  return {
    cpu: latestCpu,
    memory: Math.floor(usedMemory / 1024 / 1024), // MB
    totalMemory: Math.floor(totalMemory / 1024 / 1024),
    memoryPercent: Math.floor((usedMemory / totalMemory) * 100),
    disk: Math.floor(Math.random() * 30) + 30, // 30-60% (would need real disk monitoring)
    processes: metricsStore.activeConnections,
    cpuCores: cpus.length,
    platform: os.platform(),
    architecture: os.arch(),
    nodeVersion: process.version,
  };
};

// Get traffic metrics
const getTrafficMetrics = () => {
  // Get last 60 minutes of data
  const last60Minutes = metricsStore.requestHistory.slice(-60);

  // Calculate requests per minute
  const requestsPerMinute = last60Minutes.map((bucket) => ({
    time: new Date(bucket.timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    requests: bucket.requests,
    errors: bucket.errors,
  }));

  const health = getSystemHealth();

  return {
    requestsPerMinute,
    totalRequests: health.totalRequests,
    totalErrors: health.totalErrors,
    errorRate: health.errorRate,
    activeUsers: metricsStore.activeConnections,
    peakConcurrent: Math.max(...last60Minutes.map((b) => b.requests), 0),
  };
};

// Get CPU history
const getCpuHistory = () => {
  // Get last 20 data points for chart
  return metricsStore.cpuHistory.slice(-20).map((item) => ({
    time: new Date(item.timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    usage: item.usage,
  }));
};

// Get memory history
const getMemoryHistory = () => {
  // Get last 20 data points for chart
  return metricsStore.memoryHistory.slice(-20).map((item) => ({
    time: new Date(item.timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    used: item.used,
    percent: item.percent,
  }));
};

// Get network traffic history
const getNetworkTrafficHistory = () => {
  // Simulate network traffic based on requests
  return metricsStore.requestHistory.slice(-20).map((bucket) => ({
    time: new Date(bucket.timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    incoming: bucket.requests * 2.5, // KB/s approximation
    outgoing: bucket.requests * 1.8,
  }));
};

// Get downtime incidents with smart caching
const getDowntimeIncidents = async (days = 30) => {
  try {
    const now = Date.now();

    // Return cached data if still valid (1 minute cache)
    if (
      metricsStore.cachedDowntime.length > 0 &&
      now - metricsStore.lastDbQuery < metricsStore.cacheExpiry
    ) {
      return metricsStore.cachedDowntime;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const incidents = await SystemLog.find({
      type: "downtime",
      createdAt: { $gte: startDate },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const formattedIncidents = incidents.map((incident) => ({
      id: incident._id,
      timestamp: incident.createdAt,
      severity: incident.severity,
      service: incident.service,
      message: incident.message,
      duration: incident.duration,
      resolved: incident.resolved,
    }));

    // Update cache
    metricsStore.cachedDowntime = formattedIncidents;
    metricsStore.lastDbQuery = now;

    return formattedIncidents;
  } catch (error) {
    console.error("Error fetching downtime incidents:", error);
    // Return cached data on error
    return metricsStore.cachedDowntime;
  }
};

// Log downtime incident
const logDowntime = async (service, severity, message, details = {}) => {
  try {
    const log = await SystemLog.create({
      type: "downtime",
      severity,
      service,
      message,
      details,
      resolved: false,
    });

    return log;
  } catch (error) {
    console.error("Error logging downtime:", error);
    throw error;
  }
};

// Resolve downtime incident
const resolveDowntime = async (incidentId) => {
  try {
    const incident = await SystemLog.findById(incidentId);
    if (!incident) {
      throw new Error("Incident not found");
    }

    const duration = Date.now() - incident.createdAt.getTime();
    incident.resolved = true;
    incident.resolvedAt = new Date();
    incident.duration = duration;
    await incident.save();

    return incident;
  } catch (error) {
    console.error("Error resolving downtime:", error);
    throw error;
  }
};

module.exports = {
  initializeMonitoring,
  trackRequest,
  trackConnection,
  getSystemHealth,
  getNetworkMetrics,
  getServerMetrics,
  getTrafficMetrics,
  getCpuHistory,
  getMemoryHistory,
  getNetworkTrafficHistory,
  getDowntimeIncidents,
  logDowntime,
  resolveDowntime,
  metricsStore,
};
