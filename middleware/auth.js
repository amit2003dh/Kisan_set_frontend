// Authentication Middleware
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "No token provided. Please login."
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "kisansetu_secret_key_change_in_production");
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User not found"
      });
    }

    req.userId = decoded.userId;
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        error: "Invalid token",
        message: "Token is invalid. Please login again."
      });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Token expired",
        message: "Token has expired. Please login again."
      });
    }
    res.status(500).json({
      error: "Authentication error",
      message: error.message
    });
  }
};

module.exports = authMiddleware;

