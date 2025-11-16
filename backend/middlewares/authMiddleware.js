const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      console.log(
        "Auth middleware: Token received:",
        token ? "Token present" : "No token"
      );

      if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET is not defined in environment variables");
        return res.status(500).json({ message: "Server configuration error" });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log(
        "Auth middleware: Token decoded successfully, user ID:",
        decoded.id
      );

      req.user = await User.findById(decoded.id).select("-passwordHash");

      if (!req.user) {
        console.log("Auth middleware: User not found for ID:", decoded.id);
        return res.status(401).json({ message: "User not found" });
      }

      console.log("Auth middleware: User authenticated:", req.user.username);
      next();
    } catch (error) {
      console.error("Auth middleware error:", error.message);
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    console.log("Auth middleware: No authorization header found");
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(401).json({ message: "Not authorized as an admin" });
  }
};

// Alias for admin middleware
const adminOnly = admin;

module.exports = { protect, admin, adminOnly };
