const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("mongo-sanitize");
const { notFound, errorHandler } = require("./middlewares/errorMiddleware");

const userRoutes = require("./routes/userRoutes");
const entryRoutes = require("./routes/entryRoutes");
const postRoutes = require("./routes/postRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const aiRoutes = require("./routes/aiRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

dotenv.config();

// Debug: Check if JWT_SECRET is loaded
console.log("Environment check:");
console.log("- JWT_SECRET:", process.env.JWT_SECRET ? "✓ Loaded" : "✗ Missing");
console.log("- MONGO_URI:", process.env.MONGO_URI ? "✓ Loaded" : "✗ Missing");
console.log("- CLIENT_URL:", process.env.CLIENT_URL ? "✓ Loaded" : "✗ Missing");

connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URL, "http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(express.json());
app.use(helmet());
app.use(cors({ 
  origin: [process.env.CLIENT_URL, "http://localhost:5173", "http://localhost:5174"],
  credentials: true 
}));

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

app.use("/uploads", express.static("uploads"));

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("joinChat", (chatId) => {
    socket.join(chatId);
  });

  socket.on("sendMessage", (message) => {
    io.to(message.chatId).emit("receiveMessage", message);
  });

  // WebRTC Signaling
  socket.on("webrtc-signal", (data) => {
    io.to(data.to).emit("webrtc-signal", data);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
