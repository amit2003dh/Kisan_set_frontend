// Crop Routes
const router = require("express").Router();
const Crop = require("../models/Crop");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authMiddleware = require("../middleware/auth");

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/crops";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, "crop-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed (jpeg, jpg, png, gif, webp)"));
  }
});

router.post("/add", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const cropData = {
      ...req.body,
      farmerId: req.userId
    };

    // Add image path if uploaded
    if (req.file) {
      cropData.image = `/uploads/crops/${req.file.filename}`;
    }

    // Parse quantity and price as numbers
    if (cropData.quantity) cropData.quantity = parseFloat(cropData.quantity);
    if (cropData.price) cropData.price = parseFloat(cropData.price);

    const crop = new Crop(cropData);
    await crop.save();
    res.send(crop);
  } catch (error) {
    console.error("Add crop error:", error);
    // Delete uploaded file if error occurred
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      error: "Failed to add crop",
      message: error.message || "Failed to save crop"
    });
  }
});

router.get("/", async (req, res) => {
  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    // If farmerId query param is provided, filter by farmer
    const farmerId = req.query.farmerId;
    const query = farmerId ? { farmerId } : {};
    
    const crops = await Crop.find(query).sort({ createdAt: -1 });
    res.send(crops);
  } catch (error) {
    console.error("Get crops error:", error);
    res.status(500).json({
      error: "Failed to fetch crops",
      message: error.message || "Failed to retrieve crops"
    });
  }
});

module.exports = router;
