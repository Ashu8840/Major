#!/usr/bin/env node

const express = require("express");
const cors = require("cors");

// Simple test server to verify if port 5000 is working
const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);

app.use(express.json());

app.get("/test", (req, res) => {
  res.json({ message: "Backend is working!", timestamp: new Date() });
});

app.get("/api/users/check-username/test", (req, res) => {
  res.json({ available: true, message: "Username is available" });
});

app.listen(5000, () => {
  console.log("Test server running on port 5000");
  console.log("Test it at: http://localhost:5000/test");
});
