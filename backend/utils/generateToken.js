const jwt = require("jsonwebtoken");

const generateToken = (id) => {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN;

  if (!secret) {
    console.error("JWT_SECRET is not defined in environment variables");
    throw new Error("JWT_SECRET must be defined");
  }

  return jwt.sign({ id }, secret, {
    expiresIn: expiresIn || "7d",
  });
};

const generateRefreshToken = (id) => {
  const refreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!refreshSecret) {
    console.error("JWT_REFRESH_SECRET is not defined in environment variables");
    throw new Error("JWT_REFRESH_SECRET must be defined");
  }

  return jwt.sign({ id }, refreshSecret, {
    expiresIn: "30d",
  });
};

module.exports = { generateToken, generateRefreshToken };
