const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("mongo-sanitize");
const os = require("os");
const { notFound, errorHandler } = require("./middlewares/errorMiddleware");
const { trackMetrics } = require("./middlewares/metricsMiddleware");
const User = require("./models/User");
const Chat = require("./models/Chat");
const Circle = require("./models/Circle");

const userRoutes = require("./routes/userRoutes");
const entryRoutes = require("./routes/entryRoutes");
const postRoutes = require("./routes/postRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const aiRoutes = require("./routes/aiRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const communityRoutes = require("./routes/communityRoutes");
const profileRoutes = require("./routes/profileRoutes");
const chatRoutes = require("./routes/chatRoutes");
const socialRoutes = require("./routes/socialRoutes");
const creatorRoutes = require("./routes/creatorRoutes");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const marketplaceRoutes = require("./routes/marketplaceRoutes");
const supportRoutes = require("./routes/supportRoutes");
const adminRoutes = require("./routes/adminRoutes");
const monitoringRoutes = require("./routes/monitoringRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const chatbotTrainingRoutes = require("./routes/chatbotTrainingRoutes");

// Import monitoring service
const {
  initializeMonitoring,
  trackRequest,
} = require("./services/monitoringService");

const parseOrigins = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

// Get local network IP address
const getNetworkIP = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
};

dotenv.config();

// Debug: Check if JWT_SECRET is loaded
console.log("Environment check:");
console.log("- JWT_SECRET:", process.env.JWT_SECRET ? "✓ Loaded" : "✗ Missing");
console.log("- MONGO_URI:", process.env.MONGO_URI ? "✓ Loaded" : "✗ Missing");
console.log("- CLIENT_URL:", process.env.CLIENT_URL ? "✓ Loaded" : "✗ Missing");

connectDB();

const app = express();
const server = http.createServer(app);

const DEFAULT_CLIENT_ORIGIN = "http://10.100.246.93:5173";
const envOrigins = parseOrigins(process.env.CLIENT_ORIGINS);
const singleClientOrigin = parseOrigins(process.env.CLIENT_URL);
const deploymentOrigins = parseOrigins(process.env.DEPLOYMENT_CLIENT_ORIGINS);

const normalizeOrigin = (origin) => {
  if (!origin || typeof origin !== "string") return origin;
  return origin.replace(/\/$/, "");
};

const allowedOrigins = [
  ...envOrigins,
  ...singleClientOrigin,
  ...deploymentOrigins,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://localhost:19006",
  "http://localhost:19000",
  "http://192.168.1.1:8081",
  "http://10.0.2.2:8081",
  "exp://localhost:8081",
  "exp://192.168.1.1:8081",
  "exp://10.0.2.2:8081",
  DEFAULT_CLIENT_ORIGIN,
  "https://major-five.vercel.app",
].filter(Boolean);

const uniqueAllowedOrigins = [...new Set(allowedOrigins.map(normalizeOrigin))];

console.log("Allowed CORS origins:", uniqueAllowedOrigins);

const ORIGIN_REGEX_ALLOW_LIST = [/^https:\/\/[a-z0-9-]+\.vercel\.app$/i];

const isOriginAllowed = (origin) => {
  if (!origin) {
    return true;
  }

  const normalizedOrigin = normalizeOrigin(origin);

  if (uniqueAllowedOrigins.includes(normalizedOrigin)) {
    return true;
  }

  // Allow all localhost and local network IPs for development
  if (
    normalizedOrigin.includes("localhost") ||
    normalizedOrigin.includes("127.0.0.1") ||
    /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(
      normalizedOrigin
    ) ||
    normalizedOrigin.startsWith("exp://") ||
    /^exp:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(
      normalizedOrigin
    )
  ) {
    return true;
  }

  const matchesPattern = ORIGIN_REGEX_ALLOW_LIST.some((pattern) =>
    pattern.test(normalizedOrigin)
  );

  if (!matchesPattern) {
    console.warn(`Rejected origin: ${origin}`);
  }

  return matchesPattern;
};

const buildCorsOriginValidator = () => (origin, callback) => {
  if (isOriginAllowed(origin)) {
    return callback(null, true);
  }

  console.warn(`Blocked CORS request from origin: ${origin}`);
  return callback(new Error("Not allowed by CORS"));
};

const presenceTimers = new Map();
const PRESENCE_GRACE_PERIOD_MS = 30 * 1000;

const corsOriginValidator = buildCorsOriginValidator();

const io = new Server(server, {
  cors: {
    origin: corsOriginValidator,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);

app.use(
  cors({
    origin: corsOriginValidator,
    credentials: true,
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Rate limiter with exceptions for admin/monitoring
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased from 100 to 500 for admin panel
  skip: (req) => {
    // Skip rate limiting for admin and monitoring endpoints
    return (
      req.path.startsWith("/api/admin") ||
      req.path.startsWith("/api/monitoring") ||
      req.path.startsWith("/api/notifications")
    );
  },
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});
app.use(limiter);

app.use((req, res, next) => {
  req.body = mongoSanitize(req.body);
  next();
});

// Track all requests for monitoring with response time
app.use(trackMetrics);

app.use("/api/users", userRoutes);
app.use("/api/entries", entryRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/creator", creatorRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/monitoring", monitoringRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chatbot-training", chatbotTrainingRoutes);

app.use("/uploads", express.static("uploads"));

const broadcastPresence = (userId, isOnline, lastActive) => {
  io.emit("presence:update", {
    userId: userId?.toString(),
    isOnline,
    lastActive:
      lastActive?.toISOString?.() ||
      new Date(lastActive || Date.now()).toISOString(),
  });
};

const markUserOnline = async (userId) => {
  if (!userId) return;

  try {
    const lastActive = new Date();
    await User.findByIdAndUpdate(userId, {
      isActive: true,
      lastActive,
    }).lean();
    broadcastPresence(userId, true, lastActive);
  } catch (error) {
    console.error("Failed to mark user online", error);
  }
};

const markUserOffline = async (userId) => {
  if (!userId) return;

  try {
    const lastActive = new Date();
    await User.findByIdAndUpdate(userId, {
      isActive: false,
      lastActive,
    }).lean();
    broadcastPresence(userId, false, lastActive);
  } catch (error) {
    console.error("Failed to mark user offline", error);
  }
};

const toObjectId = (value) => {
  if (!value) return null;
  try {
    return new mongoose.Types.ObjectId(value);
  } catch (error) {
    return null;
  }
};

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("user:register", (userId) => {
    if (!userId) return;
    socket.userId = userId.toString();
    socket.join(socket.userId);

    const existingTimer = presenceTimers.get(socket.userId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      presenceTimers.delete(socket.userId);
    }

    markUserOnline(socket.userId);
  });

  socket.on("joinChat", (chatId) => {
    socket.join(chatId);
  });

  socket.on("sendMessage", (message) => {
    io.to(message.chatId).emit("receiveMessage", message);
  });

  socket.on("circle:join", async (data) => {
    // Support both { circleId } and just circleId string
    const circleId = typeof data === "string" ? data : data?.circleId;

    if (!circleId || !socket.userId) return;

    try {
      const circle = await Circle.findById(circleId).select(
        "members visibility"
      );
      if (!circle) return;

      const isMember = circle.members.some(
        (member) => member.user.toString() === socket.userId.toString()
      );

      if (!isMember) return;

      socket.join(`circle:${circleId}`);
      console.log(
        `User ${socket.userId} joined circle room: circle:${circleId}`
      );
    } catch (error) {
      console.error("Circle join socket error:", error);
    }
  });

  socket.on("circle:leave", (data) => {
    // Support both { circleId } and just circleId string
    const circleId = typeof data === "string" ? data : data?.circleId;
    if (!circleId) return;
    socket.leave(`circle:${circleId}`);
    console.log(`User ${socket.userId} left circle room: circle:${circleId}`);
  });

  // WebRTC Signaling
  socket.on("webrtc-signal", async (data = {}) => {
    try {
      const { to, from } = data;
      if (!to || !from) return;

      const toId = toObjectId(to);
      const fromId = toObjectId(from);
      if (!toId || !fromId) return;

      const chat = await Chat.findOne({
        isGroup: false,
        participants: { $all: [toId, fromId] },
      }).select("_id blockedBy participants");

      if (!chat) {
        socket.emit("call:error", { code: "chat_not_found" });
        return;
      }

      const blockedSet = new Set(
        Array.isArray(chat.blockedBy)
          ? chat.blockedBy.map((id) => id.toString())
          : []
      );

      if (blockedSet.has(toId.toString())) {
        socket.emit("call:error", { code: "blocked_by_target" });
        return;
      }

      if (blockedSet.has(fromId.toString())) {
        socket.emit("call:error", { code: "you_blocked_target" });
        return;
      }

      io.to(to.toString()).emit("webrtc-signal", data);
    } catch (error) {
      console.error("WebRTC signal error:", error);
      socket.emit("call:error", { code: "call_setup_failed" });
    }
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");

    if (!socket.userId) {
      return;
    }

    const existingTimer = presenceTimers.get(socket.userId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timeout = setTimeout(() => {
      markUserOffline(socket.userId).finally(() => {
        presenceTimers.delete(socket.userId);
      });
    }, PRESENCE_GRACE_PERIOD_MS);

    presenceTimers.set(socket.userId, timeout);
  });
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0"; // Listen on all network interfaces
const NETWORK_IP = getNetworkIP();

server.listen(PORT, HOST, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`Listening on all network interfaces (${HOST}:${PORT})`);
  console.log(`Local: http://localhost:${PORT}`);
  console.log(`Network: http://${NETWORK_IP}:${PORT}`);
  console.log(`\n📱 For mobile development, update your app/.env file:`);
  console.log(`   EXPO_PUBLIC_API_URL=http://${NETWORK_IP}:${PORT}/api\n`);

  // Initialize monitoring service
  console.log("🔍 Initializing system monitoring...");
  initializeMonitoring();
  console.log("✅ System monitoring initialized\n");
});
