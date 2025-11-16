const monitoringService = require("../services/monitoringService");

/**
 * Middleware to track request metrics for monitoring
 * Tracks response time, success/failure, and active connections
 */
const trackMetrics = (req, res, next) => {
  const startTime = Date.now();

  // Track connection
  monitoringService.trackConnection(true);

  // Override res.end to capture response
  const originalEnd = res.end;

  res.end = function (...args) {
    const responseTime = Date.now() - startTime;
    const success = res.statusCode < 400;

    // Track the request with response time
    monitoringService.trackRequest(success, responseTime);

    // Decrement active connections
    monitoringService.trackConnection(false);

    // Call original end
    originalEnd.apply(res, args);
  };

  next();
};

module.exports = { trackMetrics };
