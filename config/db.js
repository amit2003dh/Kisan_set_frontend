// Database Configuration
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/kisansetu";
    console.log("🌐 Connecting to MongoDB at:", mongoUri);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });
    
    console.log("✅ MongoDB Connected Successfully");
    
    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });
    
    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected");
    });
    
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:");
    console.error("   Error:", error.message);
    console.error("   Make sure MongoDB is running on port 27017");
    console.error("   Or set MONGODB_URI in your .env file");
    console.error("   Server will continue but database operations will fail");
    // Don't exit the process, allow server to start without DB
  }
};

module.exports = connectDB;
