// Product Tracker Routes - For sellers and farmers to track their products
const router = require("express").Router();
const ProductTracker = require("../models/ProductTracker");
const Crop = require("../models/Crop");
const Product = require("../models/Product");
const CustomerChat = require("../models/CustomerChat");
const SellerAnalytics = require("../models/SellerAnalytics");
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/auth");

// Get all tracked products for a seller
router.get("/my-products", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const trackers = await ProductTracker.find({ sellerId: req.userId })
      .sort({ lastUpdated: -1 })
      .populate('productId');

    res.json(trackers);
  } catch (error) {
    console.error("Get tracked products error:", error);
    res.status(500).json({
      error: "Failed to fetch tracked products",
      message: error.message || "Failed to retrieve tracked products"
    });
  }
});

// Create or update product tracker
router.post("/track/:productId/:productType", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const { productId, productType } = req.params;
    const { status, notes, tags, priority } = req.body;

    let tracker = await ProductTracker.findOne({
      productId,
      productType,
      sellerId: req.userId
    });

    if (!tracker) {
      // Create new tracker
      tracker = new ProductTracker({
        productId,
        productType,
        sellerId: req.userId,
        currentStatus: status || "available",
        notes,
        tags: tags || [],
        priority: priority || "medium",
        trackingEvents: [{
          eventType: "created",
          description: "Product tracking initiated",
          metadata: { notes }
        }]
      });
    } else {
      // Update existing tracker
      tracker.currentStatus = status || tracker.currentStatus;
      tracker.notes = notes || tracker.notes;
      tracker.tags = tags || tracker.tags;
      tracker.priority = priority || tracker.priority;
      tracker.lastUpdated = new Date();
      
      tracker.trackingEvents.push({
        eventType: "updated",
        description: "Product information updated",
        metadata: { notes }
      });
    }

    await tracker.save();
    res.json(tracker);
  } catch (error) {
    console.error("Track product error:", error);
    res.status(500).json({
      error: "Failed to track product",
      message: error.message || "Failed to track product"
    });
  }
});

// Add tracking event
router.post("/event/:trackerId", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const { trackerId } = req.params;
    const { eventType, description, metadata } = req.body;

    const tracker = await ProductTracker.findOne({
      _id: trackerId,
      sellerId: req.userId
    });

    if (!tracker) {
      return res.status(404).json({
        error: "Tracker not found",
        message: "Product tracker not found"
      });
    }

    // Update counters based on event type
    switch (eventType) {
      case "viewed":
        tracker.totalViews += 1;
        break;
      case "inquired":
        tracker.totalInquiries += 1;
        break;
      case "ordered":
        tracker.totalOrders += 1;
        if (metadata?.price && metadata?.quantity) {
          tracker.totalRevenue += (metadata.price * metadata.quantity);
        }
        break;
    }

    tracker.trackingEvents.push({
      eventType,
      description,
      metadata
    });

    tracker.lastUpdated = new Date();
    await tracker.save();

    res.json(tracker);
  } catch (error) {
    console.error("Add tracking event error:", error);
    res.status(500).json({
      error: "Failed to add tracking event",
      message: error.message || "Failed to add tracking event"
    });
  }
});

// Get product analytics
router.get("/analytics/:productId/:productType", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const { productId, productType } = req.params;

    const tracker = await ProductTracker.findOne({
      productId,
      productType,
      sellerId: req.userId
    }).populate('productId');

    if (!tracker) {
      return res.status(404).json({
        error: "Tracker not found",
        message: "Product tracker not found"
      });
    }

    // Get related chats
    const chats = await CustomerChat.find({
      productId,
      productType,
      sellerId: req.userId
    }).populate('customerId', 'name email');

    // Calculate conversion rate
    const conversionRate = tracker.totalViews > 0 
      ? (tracker.totalOrders / tracker.totalViews) * 100 
      : 0;

    res.json({
      tracker,
      chats,
      analytics: {
        conversionRate: conversionRate.toFixed(2),
        avgResponseTime: tracker.trackingEvents
          .filter(e => e.eventType === 'inquired')
          .length > 0 ? 30 : 0, // Placeholder
        recentActivity: tracker.trackingEvents.slice(-10)
      }
    });
  } catch (error) {
    console.error("Get product analytics error:", error);
    res.status(500).json({
      error: "Failed to fetch product analytics",
      message: error.message || "Failed to fetch product analytics"
    });
  }
});

// Get seller dashboard data
router.get("/dashboard", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    // Get all trackers for this seller
    const trackers = await ProductTracker.find({ sellerId: req.userId })
      .populate('productId');

    // Get active chats
    const activeChats = await CustomerChat.find({
      sellerId: req.userId,
      chatStatus: "active"
    }).populate('customerId', 'name');

    // Calculate totals
    const totalViews = trackers.reduce((sum, t) => sum + t.totalViews, 0);
    const totalInquiries = trackers.reduce((sum, t) => sum + t.totalInquiries, 0);
    const totalOrders = trackers.reduce((sum, t) => sum + t.totalOrders, 0);
    const totalRevenue = trackers.reduce((sum, t) => sum + t.totalRevenue, 0);

    // Get recent activities
    const recentActivities = trackers
      .flatMap(t => t.trackingEvents)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    // Status breakdown
    const statusBreakdown = trackers.reduce((acc, t) => {
      acc[t.currentStatus] = (acc[t.currentStatus] || 0) + 1;
      return acc;
    }, {});

    res.json({
      overview: {
        totalProducts: trackers.length,
        activeProducts: trackers.filter(t => t.currentStatus === "available").length,
        totalViews,
        totalInquiries,
        totalOrders,
        totalRevenue,
        activeChats: activeChats.length
      },
      statusBreakdown,
      recentActivities,
      topProducts: trackers
        .sort((a, b) => b.totalOrders - a.totalOrders)
        .slice(0, 5)
        .map(t => ({
          ...t.productId.toObject(),
          stats: {
            views: t.totalViews,
            orders: t.totalOrders,
            revenue: t.totalRevenue
          }
        })),
      recentChats: activeChats.slice(0, 5)
    });
  } catch (error) {
    console.error("Get dashboard error:", error);
    res.status(500).json({
      error: "Failed to fetch dashboard data",
      message: error.message || "Failed to fetch dashboard data"
    });
  }
});

module.exports = router;
