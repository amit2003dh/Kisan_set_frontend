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

// Get products for current seller
router.get("/my-products", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const products = await Product.find({ sellerId: req.userId })
      .sort({ createdAt: -1 });
    
    res.send(products);
  } catch (error) {
    console.error("Get my products error:", error);
    res.status(500).json({
      error: "Failed to fetch your products",
      message: error.message || "Failed to retrieve your products"
    });
  }
});

// Update product
router.put("/:id", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const product = await Product.findOne({ _id: req.params.id, sellerId: req.userId });
    
    if (!product) {
      return res.status(404).json({
        error: "Product not found",
        message: "Product not found or you don't have permission to edit it"
      });
    }

    const updateData = { ...req.body };
    
    // Add image path if uploaded
    if (req.file) {
      // Delete old image if exists
      if (product.image && fs.existsSync(product.image.replace('/uploads/', 'uploads/'))) {
        fs.unlinkSync(product.image.replace('/uploads/', 'uploads/'));
      }
      updateData.image = `/uploads/products/${req.file.filename}`;
    }

    // Parse price and stock as numbers
    if (updateData.price) updateData.price = parseFloat(updateData.price);
    if (updateData.stock) updateData.stock = parseInt(updateData.stock);

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    // Add tracking event
    const ProductTracker = require("../models/ProductTracker");
    await ProductTracker.findOneAndUpdate(
      { productId: req.params.id, productType: "Product", sellerId: req.userId },
      {
        $push: {
          trackingEvents: {
            eventType: "updated",
            description: "Product information updated",
            metadata: { 
              oldStock: product.stock,
              newStock: updateData.stock,
              oldPrice: product.price,
              newPrice: updateData.price
            }
          }
        },
        lastUpdated: new Date()
      },
      { upsert: true }
    );

    res.send(updatedProduct);
  } catch (error) {
    console.error("Update product error:", error);
    // Delete uploaded file if error occurred
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      error: "Failed to update product",
      message: error.message || "Failed to update product"
    });
  }
});

// Update product verification status
router.put("/:id/status", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const { verified } = req.body;
    
    const product = await Product.findOne({ _id: req.params.id, sellerId: req.userId });
    
    if (!product) {
      return res.status(404).json({
        error: "Product not found",
        message: "Product not found or you don't have permission to edit it"
      });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { verified },
      { new: true }
    );

    // Add tracking event
    const ProductTracker = require("../models/ProductTracker");
    await ProductTracker.findOneAndUpdate(
      { productId: req.params.id, productType: "Product", sellerId: req.userId },
      {
        $push: {
          trackingEvents: {
            eventType: "updated",
            description: `Product verification ${verified ? "approved" : "revoked"}`,
            metadata: { oldVerified: product.verified, newVerified: verified }
          }
        },
        lastUpdated: new Date()
      },
      { upsert: true }
    );

    res.send(updatedProduct);
  } catch (error) {
    console.error("Update product status error:", error);
    res.status(500).json({
      error: "Failed to update product status",
      message: error.message || "Failed to update product status"
    });
  }
});

// Delete product
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const product = await Product.findOne({ _id: req.params.id, sellerId: req.userId });
    
    if (!product) {
      return res.status(404).json({
        error: "Product not found",
        message: "Product not found or you don't have permission to delete it"
      });
    }

    // Delete image if exists
    if (product.image && fs.existsSync(product.image.replace('/uploads/', 'uploads/'))) {
      fs.unlinkSync(product.image.replace('/uploads/', 'uploads/'));
    }

    await Product.findByIdAndDelete(req.params.id);

    // Add tracking event
    const ProductTracker = require("../models/ProductTracker");
    await ProductTracker.findOneAndUpdate(
      { productId: req.params.id, productType: "Product", sellerId: req.userId },
      {
        $push: {
          trackingEvents: {
            eventType: "updated",
            description: "Product deleted",
            metadata: { productName: product.name }
          }
        },
        currentStatus: "deleted",
        lastUpdated: new Date()
      },
      { upsert: true }
    );

    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({
      error: "Failed to delete product",
      message: error.message || "Failed to delete product"
    });
  }
});

// Decrease product stock (when order is confirmed)
router.put("/:id/decrease-stock", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const { quantity } = req.body;
    
    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        error: "Invalid quantity",
        message: "Please provide a valid quantity to decrease"
      });
    }

    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        error: "Product not found",
        message: "Product not found"
      });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        error: "Insufficient stock",
        message: `Only ${product.stock} units available, but ${quantity} units requested`
      });
    }

    const newStock = product.stock - quantity;

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { stock: newStock },
      { new: true }
    );

    // Add tracking event
    const ProductTracker = require("../models/ProductTracker");
    await ProductTracker.findOneAndUpdate(
      { productId: req.params.id, productType: "Product", sellerId: product.sellerId },
      {
        $inc: { 
          totalOrders: 1,
          totalRevenue: quantity * product.price
        },
        $push: {
          trackingEvents: {
            eventType: "ordered",
            description: `${quantity} units ordered`,
            metadata: { 
              quantity,
              price: product.price,
              revenue: quantity * product.price,
              remainingStock: newStock
            }
          }
        },
        currentStatus: newStock === 0 ? "out_of_stock" : "available",
        lastUpdated: new Date()
      },
      { upsert: true }
    );

    res.send(updatedProduct);
  } catch (error) {
    console.error("Decrease stock error:", error);
    res.status(500).json({
      error: "Failed to decrease stock",
      message: error.message || "Failed to decrease product stock"
    });
  }
});

module.exports = router;
