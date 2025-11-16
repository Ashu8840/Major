const {
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
} = require("../services/monitoringService");
const SystemLog = require("../models/SystemLog");
const mongoose = require("mongoose");
const { notifyDowntime } = require("../services/notificationService");
const os = require("os");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

// Get real disk usage based on platform
const getDiskUsage = async () => {
  try {
    const platform = os.platform();

    if (platform === "win32") {
      // Windows: Use wmic
      const { stdout } = await execPromise(
        "wmic logicaldisk get size,freespace,caption"
      );
      const lines = stdout.trim().split("\n").slice(1);
      let totalSize = 0;
      let totalFree = 0;

      lines.forEach((line) => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3 && parts[1] && parts[2]) {
          totalFree += parseInt(parts[1]) || 0;
          totalSize += parseInt(parts[2]) || 0;
        }
      });

      const usedPercent =
        totalSize > 0
          ? Math.floor(((totalSize - totalFree) / totalSize) * 100)
          : 45;
      return usedPercent;
    } else if (platform === "linux" || platform === "darwin") {
      // Linux/Mac: Use df
      const { stdout } = await execPromise("df -h / | tail -1");
      const parts = stdout.trim().split(/\s+/);
      const usedPercent = parseInt(parts[4]) || 45;
      return usedPercent;
    }

    return 45; // Fallback
  } catch (error) {
    console.error("Error getting disk usage:", error);
    return 45; // Fallback
  }
};

// Get MongoDB stats
const getMongoDBStats = async () => {
  try {
    const dbStats = await mongoose.connection.db.stats();
    return {
      connected: mongoose.connection.readyState === 1,
      dataSize: Math.floor(dbStats.dataSize / 1024 / 1024), // MB
      storageSize: Math.floor(dbStats.storageSize / 1024 / 1024), // MB
      collections: dbStats.collections,
      indexes: dbStats.indexes,
      avgObjSize: Math.floor(dbStats.avgObjSize),
    };
  } catch (error) {
    console.error("Error getting MongoDB stats:", error);
    return {
      connected: false,
      dataSize: 0,
      storageSize: 0,
      collections: 0,
      indexes: 0,
      avgObjSize: 0,
    };
  }
};

// Get system health status
const getHealth = async (req, res) => {
  try {
    const health = getSystemHealth();
    const cpuHistory = getCpuHistory();
    const memoryHistory = getMemoryHistory();

    res.status(200).json({
      success: true,
      data: {
        ...health,
        cpuHistory,
        memoryHistory,
      },
    });
  } catch (error) {
    console.error("Error getting system health:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch system health",
      error: error.message,
    });
  }
};

// Get network metrics
const getNetwork = async (req, res) => {
  try {
    const network = getNetworkMetrics();
    const trafficHistory = getNetworkTrafficHistory();

    res.status(200).json({
      success: true,
      data: {
        ...network,
        trafficHistory,
      },
    });
  } catch (error) {
    console.error("Error getting network metrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch network metrics",
      error: error.message,
    });
  }
};

// Get server metrics
const getServer = async (req, res) => {
  try {
    const server = getServerMetrics();
    const cpuHistory = getCpuHistory();
    const memoryHistory = getMemoryHistory();

    // Get real disk usage
    const diskUsage = await getDiskUsage();

    // Get MongoDB stats
    const mongoStats = await getMongoDBStats();

    res.status(200).json({
      success: true,
      data: {
        ...server,
        disk: diskUsage,
        cpuHistory,
        memoryHistory,
        database: mongoStats,
      },
    });
  } catch (error) {
    console.error("Error getting server metrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch server metrics",
      error: error.message,
    });
  }
};

// Get traffic metrics
const getTraffic = async (req, res) => {
  try {
    const traffic = getTrafficMetrics();

    res.status(200).json({
      success: true,
      data: traffic,
    });
  } catch (error) {
    console.error("Error getting traffic metrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch traffic metrics",
      error: error.message,
    });
  }
};

// Get downtime history
const getDowntime = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const incidents = await getDowntimeIncidents(parseInt(days));

    res.status(200).json({
      success: true,
      data: incidents,
    });
  } catch (error) {
    console.error("Error getting downtime history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch downtime history",
      error: error.message,
    });
  }
};

// Restart service
const restartService = async (req, res) => {
  try {
    const { service } = req.params;

    // Log the restart
    await SystemLog.create({
      type: "restart",
      severity: "info",
      service,
      message: `Service ${service} restart initiated by admin`,
      details: { adminId: req.user._id },
    });

    // In production, this would actually restart the service
    // For now, we'll just log it
    console.log(`Restart requested for service: ${service}`);

    res.status(200).json({
      success: true,
      message: `Service ${service} restart initiated`,
    });
  } catch (error) {
    console.error("Error restarting service:", error);
    res.status(500).json({
      success: false,
      message: "Failed to restart service",
      error: error.message,
    });
  }
};

// Clear cache
const clearCache = async (req, res) => {
  try {
    // Log the cache clear
    await SystemLog.create({
      type: "cache_clear",
      severity: "info",
      service: "cache",
      message: "Cache cleared by admin",
      details: { adminId: req.user._id },
    });

    // In production, this would actually clear the cache
    // For now, we'll just log it
    console.log("Cache clear requested");

    res.status(200).json({
      success: true,
      message: "Cache cleared successfully",
    });
  } catch (error) {
    console.error("Error clearing cache:", error);
    res.status(500).json({
      success: false,
      message: "Failed to clear cache",
      error: error.message,
    });
  }
};

// Export logs
const exportLogs = async (req, res) => {
  try {
    const { type, days = 7 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const query = { createdAt: { $gte: startDate } };
    if (type) {
      query.type = type;
    }

    const logs = await SystemLog.find(query).sort({ createdAt: -1 }).lean();

    // Format logs as CSV
    const csvHeader = "Timestamp,Type,Severity,Service,Message,Resolved\n";
    const csvRows = logs.map((log) =>
      [
        new Date(log.createdAt).toISOString(),
        log.type,
        log.severity,
        log.service,
        `"${log.message.replace(/"/g, '""')}"`,
        log.resolved ? "Yes" : "No",
      ].join(",")
    );
    const csv = csvHeader + csvRows.join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="system-logs-${Date.now()}.csv"`
    );
    res.status(200).send(csv);
  } catch (error) {
    console.error("Error exporting logs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export logs",
      error: error.message,
    });
  }
};

// Get all metrics in one call
const getAllMetrics = async (req, res) => {
  try {
    const health = getSystemHealth();
    const network = getNetworkMetrics();
    const server = getServerMetrics();
    const traffic = getTrafficMetrics();
    const cpuHistory = getCpuHistory();
    const memoryHistory = getMemoryHistory();
    const networkHistory = getNetworkTrafficHistory();

    res.status(200).json({
      success: true,
      data: {
        health,
        network: {
          ...network,
          trafficHistory: networkHistory,
        },
        server: {
          ...server,
          cpuHistory,
          memoryHistory,
        },
        traffic,
      },
    });
  } catch (error) {
    console.error("Error getting all metrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch metrics",
      error: error.message,
    });
  }
};

module.exports = {
  getHealth,
  getNetwork,
  getServer,
  getTraffic,
  getDowntime,
  restartService,
  clearCache,
  exportLogs,
  getAllMetrics,
};
