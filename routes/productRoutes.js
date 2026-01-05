// Product Routes
const router = require("express").Router();
const Product = require("../models/Product");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authMiddleware = require("../middleware/auth");

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/products";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, "product-" + uniqueSuffix + path.extname(file.originalname));
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

    const productData = {
      ...req.body,
      sellerId: req.userId
    };

    // Add image path if uploaded
    if (req.file) {
      productData.image = `/uploads/products/${req.file.filename}`;
    }

    // Parse price and stock as numbers
    if (productData.price) productData.price = parseFloat(productData.price);
    if (productData.stock) productData.stock = parseInt(productData.stock);

    const product = new Product(productData);
    await product.save();
    res.send(product);
  } catch (error) {
    console.error("Add product error:", error);
    // Delete uploaded file if error occurred
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      error: "Failed to add product",
      message: error.message || "Failed to save product"
    });
  }
});

router.get("/", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    // If sellerId query param is provided, filter by seller (for sellers to see their products)
    // Otherwise, show all verified products (for buyers)
    const sellerId = req.query.sellerId;
    const query = sellerId ? { sellerId } : { verified: true };
    
    const products = await Product.find(query).sort({ createdAt: -1 });
    res.send(products);
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({
      error: "Failed to fetch products",
      message: error.message || "Failed to retrieve products"
    });
  }
});

module.exports = router;
