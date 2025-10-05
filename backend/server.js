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
const { notFound, errorHandler } = require("./middlewares/errorMiddleware");
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
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:5174",
  DEFAULT_CLIENT_ORIGIN,
].filter(Boolean);

const uniqueAllowedOrigins = [...new Set(allowedOrigins)];

const presenceTimers = new Map();
const PRESENCE_GRACE_PERIOD_MS = 30 * 1000;

const io = new Server(server, {
  cors: {
    origin: uniqueAllowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);

app.use(
  cors({
    origin: uniqueAllowedOrigins,
    credentials: true,
  })
);
app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use((req, res, next) => {
  req.body = mongoSanitize(req.body);
  next();
});

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

  socket.on("circle:join", async ({ circleId }) => {
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
    } catch (error) {
      console.error("Circle join socket error:", error);
    }
  });

  socket.on("circle:leave", ({ circleId }) => {
    if (!circleId) return;
    socket.leave(`circle:${circleId}`);
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

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
