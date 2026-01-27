const User = require("../models/User");

const adminMiddleware = async (req, res, next) => {
  try {
    // Get user from auth middleware (req.userId should be set)
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin role required." });
    }
    
    req.user = user; // Add user to request for future use
    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = adminMiddleware;
