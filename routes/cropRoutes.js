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
      sellerId: req.userId,
      type: "crop"  
    };

    // Add image path if uploaded
    if (req.file) {
      cropData.image = `/uploads/crops/${req.file.filename}`;
    }

    // Parse quantity and price as numbers
    if (cropData.quantity) cropData.quantity = parseFloat(cropData.quantity);
    if (cropData.price) cropData.price = parseFloat(cropData.price);

    // Handle location data if provided
    if (cropData.location) {
      try {
        cropData.location = JSON.parse(cropData.location);
      } catch (e) {
        console.error("Error parsing location data:", e);
      }
    }

    // Handle contact info if provided
    if (cropData.contactInfo) {
      try {
        cropData.contactInfo = JSON.parse(cropData.contactInfo);
      } catch (e) {
        console.error("Error parsing contact info:", e);
      }
    }

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

    // If sellerId query param is provided, filter by seller
    const sellerId = req.query.sellerId;
    const query = sellerId ? { sellerId } : {};
    
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

// Get crops for current farmer
router.get("/my-crops", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const crops = await Crop.find({ sellerId: req.userId })
      .sort({ createdAt: -1 });
    
    res.send(crops);
  } catch (error) {
    console.error("Get my crops error:", error);
    res.status(500).json({
      error: "Failed to fetch your crops",
      message: error.message || "Failed to retrieve your crops"
    });
  }
});

// Update crop
router.put("/:id", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const crop = await Crop.findOne({ _id: req.params.id, sellerId: req.userId });
    
    if (!crop) {
      return res.status(404).json({
        error: "Crop not found",
        message: "Crop not found or you don't have permission to edit it"
      });
    }

    const updateData = { ...req.body };
    
    // Add image path if uploaded
    if (req.file) {
      // Delete old image if exists
      if (crop.image && fs.existsSync(crop.image.replace('/uploads/', 'uploads/'))) {
        fs.unlinkSync(crop.image.replace('/uploads/', 'uploads/'));
      }
      updateData.image = `/uploads/crops/${req.file.filename}`;
    }

    // Parse quantity and price as numbers
    if (updateData.quantity) updateData.quantity = parseFloat(updateData.quantity);
    if (updateData.price) updateData.price = parseFloat(updateData.price);

    // Handle location data if provided
    if (updateData.location) {
      try {
        updateData.location = JSON.parse(updateData.location);
      } catch (e) {
        console.error("Error parsing location data:", e);
      }
    }

    // Handle contact info if provided
    if (updateData.contactInfo) {
      try {
        updateData.contactInfo = JSON.parse(updateData.contactInfo);
      } catch (e) {
        console.error("Error parsing contact info:", e);
      }
    }

    // Check if quantity is zero and update status
    if (updateData.quantity === 0) {
      updateData.status = "Out of Stock";
    } else if (updateData.quantity > 0 && crop.status === "Out of Stock") {
      updateData.status = "Available";
    }

    const updatedCrop = await Crop.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    // Add tracking event
    const ProductTracker = require("../models/ProductTracker");
    await ProductTracker.findOneAndUpdate(
      { productId: req.params.id, productType: "Crop", sellerId: req.userId },
      {
        $push: {
          trackingEvents: {
            eventType: "updated",
            description: "Crop information updated",
            metadata: { 
              oldQuantity: crop.quantity,
              newQuantity: updateData.quantity,
              oldPrice: crop.price,
              newPrice: updateData.price
            }
          }
        },
        lastUpdated: new Date()
      },
      { upsert: true }
    );

    res.send(updatedCrop);
  } catch (error) {
    console.error("Update crop error:", error);
    // Delete uploaded file if error occurred
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      error: "Failed to update crop",
      message: error.message || "Failed to update crop"
    });
  }
});

// Update crop status
router.put("/:id/status", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const { status } = req.body;
    
    const crop = await Crop.findOne({ _id: req.params.id, sellerId: req.userId });
    
    if (!crop) {
      return res.status(404).json({
        error: "Crop not found",
        message: "Crop not found or you don't have permission to edit it"
      });
    }

    // Check if quantity is zero
    if (crop.quantity === 0 && status !== "Out of Stock") {
      return res.status(400).json({
        error: "Cannot change status",
        message: "Cannot change status when quantity is zero. Please update quantity first."
      });
    }

    const updatedCrop = await Crop.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    // Add tracking event
    const ProductTracker = require("../models/ProductTracker");
    await ProductTracker.findOneAndUpdate(
      { productId: req.params.id, productType: "Crop", sellerId: req.userId },
      {
        $push: {
          trackingEvents: {
            eventType: "updated",
            description: `Crop status changed to ${status}`,
            metadata: { oldStatus: crop.status, newStatus: status }
          }
        },
        lastUpdated: new Date()
      },
      { upsert: true }
    );

    res.send(updatedCrop);
  } catch (error) {
    console.error("Update crop status error:", error);
    res.status(500).json({
      error: "Failed to update crop status",
      message: error.message || "Failed to update crop status"
    });
  }
});

// Delete crop
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const crop = await Crop.findOne({ _id: req.params.id, sellerId: req.userId });
    
    if (!crop) {
      return res.status(404).json({
        error: "Crop not found",
        message: "Crop not found or you don't have permission to delete it"
      });
    }

    // Delete image if exists
    if (crop.image && fs.existsSync(crop.image.replace('/uploads/', 'uploads/'))) {
      fs.unlinkSync(crop.image.replace('/uploads/', 'uploads/'));
    }

    await Crop.findByIdAndDelete(req.params.id);

    // Add tracking event
    const ProductTracker = require("../models/ProductTracker");
    await ProductTracker.findOneAndUpdate(
      { productId: req.params.id, productType: "Crop", sellerId: req.userId },
      {
        $push: {
          trackingEvents: {
            eventType: "updated",
            description: "Crop deleted",
            metadata: { cropName: crop.name }
          }
        },
        currentStatus: "deleted",
        lastUpdated: new Date()
      },
      { upsert: true }
    );

    res.json({ success: true, message: "Crop deleted successfully" });
  } catch (error) {
    console.error("Delete crop error:", error);
    res.status(500).json({
      error: "Failed to delete crop",
      message: error.message || "Failed to delete crop"
    });
  }
});

// Decrease crop quantity (when order is confirmed)
router.put("/:id/decrease-quantity", authMiddleware, async (req, res) => {
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

    const crop = await Crop.findById(req.params.id);
    
    if (!crop) {
      return res.status(404).json({
        error: "Crop not found",
        message: "Crop not found"
      });
    }

    if (crop.quantity < quantity) {
      return res.status(400).json({
        error: "Insufficient quantity",
        message: `Only ${crop.quantity} kg available, but ${quantity} kg requested`
      });
    }

    const newQuantity = crop.quantity - quantity;
    const newStatus = newQuantity === 0 ? "Out of Stock" : crop.status;

    const updatedCrop = await Crop.findByIdAndUpdate(
      req.params.id,
      { 
        quantity: newQuantity,
        status: newStatus
      },
      { new: true }
    );

    // Add tracking event
    const ProductTracker = require("../models/ProductTracker");
    await ProductTracker.findOneAndUpdate(
      { productId: req.params.id, productType: "Crop", sellerId: crop.sellerId },
      {
        $inc: { 
          totalOrders: 1,
          totalRevenue: quantity * crop.price
        },
        $push: {
          trackingEvents: {
            eventType: "ordered",
            description: `${quantity} kg ordered`,
            metadata: { 
              quantity,
              price: crop.price,
              revenue: quantity * crop.price,
              remainingQuantity: newQuantity
            }
          }
        },
        currentStatus: newStatus,
        lastUpdated: new Date()
      },
      { upsert: true }
    );

    res.send(updatedCrop);
  } catch (error) {
    console.error("Decrease quantity error:", error);
    res.status(500).json({
      error: "Failed to decrease quantity",
      message: error.message || "Failed to decrease crop quantity"
    });
  }
});

module.exports = router;
