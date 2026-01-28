// Delivery Partner Routes
const router = require("express").Router();
const DeliveryPartner = require("../models/DeliveryPartner");
const Order = require("../models/Order");
const Delivery = require("../models/Delivery");
const User = require("../models/User");
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/auth");
const multer = require("multer");
const path = require("path");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/id-proofs/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Get available delivery partners for order assignment
router.get("/available", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const { lat, lng, city } = req.query;
    
    let query = { 
      status: "available", 
      isOnline: true 
    };

    // Filter by city if provided
    if (city) {
      query["serviceArea.cities"] = city;
    }

    // Get available partners
    const partners = await DeliveryPartner.find(query)
      .populate('userId', 'name email phone')
      .sort({ "deliveryStats.averageRating": -1 });

    // Calculate distance if coordinates provided
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      
      const partnersWithDistance = partners.map(partner => {
        const distance = calculateDistance(
          userLat, userLng,
          partner.currentLocation.lat, 
          partner.currentLocation.lng
        );
        
        return {
          ...partner.toObject(),
          distance: Math.round(distance * 100) / 100 // Round to 2 decimal places
        };
      });

      // Filter by max service distance and sort by distance
      const availablePartners = partnersWithDistance
        .filter(partner => partner.distance <= partner.serviceArea.maxDistance)
        .sort((a, b) => a.distance - b.distance);

      res.json({
        success: true,
        partners: availablePartners
      });
    } else {
      res.json({
        success: true,
        partners: partners.map(p => p.toObject())
      });
    }
  } catch (error) {
    console.error("Get available partners error:", error);
    res.status(500).json({
      error: "Failed to fetch available partners",
      message: error.message || "Failed to retrieve delivery partners"
    });
  }
});

// Assign delivery partner to order
router.post("/assign", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const { orderId, partnerId } = req.body;

    if (!orderId || !partnerId) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "Order ID and Partner ID are required"
      });
    }

    // Get order details
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        error: "Order not found",
        message: "Order not found"
      });
    }

    // Get delivery partner details
    const partner = await DeliveryPartner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({
        error: "Delivery partner not found",
        message: "Delivery partner not found"
      });
    }

    // Check if partner is available
    if (partner.status !== "available" || !partner.isOnline) {
      return res.status(400).json({
        error: "Partner not available",
        message: "Delivery partner is not available for assignment"
      });
    }

    // Update partner status to busy
    await DeliveryPartner.findByIdAndUpdate(partnerId, {
      status: "busy",
      currentLocation: {
        lat: order.deliveryAddress?.lat || 0,
        lng: order.deliveryAddress?.lng || 0,
        lastUpdated: new Date()
      }
    });

    // Create or update delivery record
    const Delivery = require("../models/Delivery");
    let delivery = await Delivery.findOne({ orderId });

    if (delivery) {
      delivery.partnerId = partnerId;
      delivery.status = "Assigned";
      delivery.assignedAt = new Date();
      delivery.currentLocation = {
        lat: partner.currentLocation.lat,
        lng: partner.currentLocation.lng,
        status: "Assigned",
        lastUpdated: new Date()
      };
      await delivery.save();
    } else {
      delivery = new Delivery({
        orderId,
        partnerId,
        status: "Assigned",
        assignedAt: new Date(),
        currentLocation: {
          lat: partner.currentLocation.lat,
          lng: partner.currentLocation.lng,
          status: "Assigned",
          lastUpdated: new Date()
        },
        destination: order.deliveryAddress ? {
          lat: order.deliveryAddress.lat || 0,
          lng: order.deliveryAddress.lng || 0,
          address: order.deliveryAddress.address || "Address not available"
        } : null
      });
      await delivery.save();
    }

    // Update order status
    await Order.findByIdAndUpdate(orderId, {
      status: "Out for Delivery",
      currentLocation: {
        lat: partner.currentLocation.lat,
        lng: partner.currentLocation.lng,
        status: "Out for Delivery",
        lastUpdated: new Date()
      }
    });

    // Send notification to buyer and seller
    const io = require("../socket");
    io.to(order.buyerId.toString()).emit('deliveryPartnerAssigned', {
      orderId,
      partner: {
        name: partner.name,
        phone: partner.phone,
        vehicle: partner.vehicle,
        partnerId: partner.partnerId
      },
      estimatedDelivery: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
    });

    if (order.sellerId) {
      io.to(order.sellerId.toString()).emit('deliveryPartnerAssigned', {
        orderId,
        partner: {
          name: partner.name,
          phone: partner.phone,
          vehicle: partner.vehicle,
          partnerId: partner.partnerId
        }
      });
    }

    res.json({
      success: true,
      message: "Delivery partner assigned successfully",
      delivery,
      partner: {
        name: partner.name,
        phone: partner.phone,
        vehicle: partner.vehicle,
        partnerId: partner.partnerId,
        currentLocation: partner.currentLocation
      }
    });

  } catch (error) {
    console.error("Assign delivery partner error:", error);
    res.status(500).json({
      error: "Failed to assign delivery partner",
      message: error.message || "Failed to assign delivery partner"
    });
  }
});

// Update delivery partner location
router.put("/location", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const { lat, lng, orderId } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({
        error: "Missing coordinates",
        message: "Latitude and longitude are required"
      });
    }

    // Get delivery partner by user ID
    const partner = await DeliveryPartner.findOne({ userId: req.userId });
    if (!partner) {
      return res.status(404).json({
        error: "Delivery partner not found",
        message: "You are not registered as a delivery partner"
      });
    }

    // Update partner location
    await DeliveryPartner.findByIdAndUpdate(partner._id, {
      currentLocation: {
        lat,
        lng,
        lastUpdated: new Date()
      },
      isOnline: true,
      lastSeen: new Date()
    });

    // Update delivery location if orderId provided
    if (orderId) {
      const Delivery = require("../models/Delivery");
      await Delivery.findOneAndUpdate(
        { orderId, partnerId: partner._id },
        {
          currentLocation: {
            lat,
            lng,
            status: "In Transit",
            lastUpdated: new Date()
          }
        }
      );

      // Update order location
      await Order.findByIdAndUpdate(orderId, {
        currentLocation: {
          lat,
          lng,
          status: "In Transit",
          lastUpdated: new Date()
        }
      });

      // Send real-time location update to buyer and seller
      const order = await Order.findById(orderId);
      const io = require("../socket");
      
      io.to(order.buyerId.toString()).emit('deliveryLocationUpdate', {
        orderId,
        location: { lat, lng },
        timestamp: new Date()
      });

      if (order.sellerId) {
        io.to(order.sellerId.toString()).emit('deliveryLocationUpdate', {
          orderId,
          location: { lat, lng },
          timestamp: new Date()
        });
      }
    }

    res.json({
      success: true,
      message: "Location updated successfully"
    });

  } catch (error) {
    console.error("Update location error:", error);
    res.status(500).json({
      error: "Failed to update location",
      message: error.message || "Failed to update location"
    });
  }
});

// Get delivery partner's current orders
router.get("/my-orders", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    // Get delivery partner by user ID
    const partner = await DeliveryPartner.findOne({ userId: req.userId });
    if (!partner) {
      return res.status(404).json({
        error: "Delivery partner not found",
        message: "You are not registered as a delivery partner"
      });
    }

    // Get deliveries assigned to this partner
    const Delivery = require("../models/Delivery");
    const deliveries = await Delivery.find({ partnerId: partner._id })
      .populate('orderId')
      .sort({ assignedAt: -1 });

    res.json({
      success: true,
      deliveries
    });

  } catch (error) {
    console.error("Get partner orders error:", error);
    res.status(500).json({
      error: "Failed to fetch orders",
      message: error.message || "Failed to retrieve delivery orders"
    });
  }
});

// Update delivery partner online status
router.put("/status", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const { status, isOnline } = req.body;

    // Get delivery partner by user ID
    let partner = await DeliveryPartner.findOne({ userId: req.userId });
    
    // If no delivery partner record exists but user is approved, create one
    if (!partner) {
      const user = await User.findById(req.userId);
      if (user && user.role === "delivery_partner" && user.deliveryPartnerRegistration?.applicationStatus === "approved") {
        console.log("🆕 Creating delivery partner record for approved user");
        partner = new DeliveryPartner({
          userId: user._id,
          partnerId: `DP${Date.now().toString().slice(-6)}`,
          name: user.name,
          email: user.email,
          phone: user.phone,
          vehicle: {
            type: "bike",
            number: "TBD",
            capacity: 50
          },
          currentLocation: {
            lat: 0,
            lng: 0,
            lastUpdated: new Date()
          },
          status: "offline",
          isOnline: false,
          serviceArea: { cities: [], maxDistance: 50 },
          documents: {
            drivingLicense: "",
            vehicleInsurance: "",
            policeVerification: "",
            aadharCard: ""
          },
          bankDetails: {
            accountNumber: "",
            ifscCode: "",
            accountHolderName: ""
          },
          workingHours: {
            start: "09:00",
            end: "18:00",
            workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"]
          }
        });
        
        partner = await partner.save();
        console.log("✅ Delivery partner record created:", partner._id);
      } else {
        return res.status(404).json({
          error: "Delivery partner not found",
          message: "You are not registered as a delivery partner"
        });
      }
    }

    const updateData = {
      lastSeen: new Date()
    };

    if (status) {
      updateData.status = status;
    }

    if (typeof isOnline === 'boolean') {
      updateData.isOnline = isOnline;
    }

    await DeliveryPartner.findByIdAndUpdate(partner._id, updateData);

    res.json({
      success: true,
      message: "Status updated successfully"
    });

  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({
      error: "Failed to update status",
      message: error.message || "Failed to update delivery partner status"
    });
  }
});

// Get delivery partner for a specific order
router.get("/:orderId/partner", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const { orderId } = req.params;

    // Get delivery record for this order
    const Delivery = require("../models/Delivery");
    const delivery = await Delivery.findOne({ orderId })
      .populate('partnerId');

    if (!delivery || !delivery.partnerId) {
      return res.json({
        success: true,
        partner: null,
        message: "No delivery partner assigned yet"
      });
    }

    res.json({
      success: true,
      partner: delivery.partnerId
    });

  } catch (error) {
    console.error("Get delivery partner error:", error);
    res.status(500).json({
      error: "Failed to fetch delivery partner",
      message: error.message || "Failed to retrieve delivery partner"
    });
  }
});

// Accept order
router.put("/orders/:orderId/accept", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const { orderId } = req.params;

    // Get delivery partner by user ID
    const DeliveryPartner = require("../models/DeliveryPartner");
    const partner = await DeliveryPartner.findOne({ userId: req.userId });
    if (!partner) {
      return res.status(404).json({
        error: "Delivery partner not found",
        message: "You are not registered as a delivery partner"
      });
    }

    // Update delivery status
    const Delivery = require("../models/Delivery");
    const delivery = await Delivery.findOneAndUpdate(
      { orderId, partnerId: partner._id },
      { 
        status: "Picked Up",
        pickedUpAt: new Date(),
        currentLocation: {
          lat: partner.currentLocation.lat,
          lng: partner.currentLocation.lng,
          status: "Picked Up",
          lastUpdated: new Date()
        }
      },
      { new: true }
    ).populate('orderId');

    if (!delivery) {
      return res.status(404).json({
        error: "Delivery not found",
        message: "Delivery assignment not found"
      });
    }

    // Update order status
    const Order = require("../models/Order");
    await Order.findByIdAndUpdate(orderId, {
      status: "Out for Delivery"
    });

    res.json({
      success: true,
      message: "Order accepted successfully",
      delivery
    });

  } catch (error) {
    console.error("Accept order error:", error);
    res.status(500).json({
      error: "Failed to accept order",
      message: error.message || "Failed to accept order"
    });
  }
});

// Mark order as picked up
router.put("/orders/:orderId/pickup", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const { orderId } = req.params;

    // Get delivery partner by user ID
    const DeliveryPartner = require("../models/DeliveryPartner");
    const partner = await DeliveryPartner.findOne({ userId: req.userId });
    if (!partner) {
      return res.status(404).json({
        error: "Delivery partner not found",
        message: "You are not registered as a delivery partner"
      });
    }

    // Update delivery status
    const Delivery = require("../models/Delivery");
    const delivery = await Delivery.findOneAndUpdate(
      { orderId, partnerId: partner._id },
      { 
        status: "In Transit",
        pickedUpAt: new Date(),
        currentLocation: {
          lat: partner.currentLocation.lat,
          lng: partner.currentLocation.lng,
          status: "In Transit",
          lastUpdated: new Date()
        }
      },
      { new: true }
    );

    if (!delivery) {
      return res.status(404).json({
        error: "Delivery not found",
        message: "Delivery assignment not found"
      });
    }

    res.json({
      success: true,
      message: "Order picked up successfully",
      delivery
    });

  } catch (error) {
    console.error("Pickup order error:", error);
    res.status(500).json({
      error: "Failed to update pickup status",
      message: error.message || "Failed to update pickup status"
    });
  }
});

// Mark order as delivered
router.put("/orders/:orderId/deliver", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const { orderId } = req.params;

    // Get delivery partner by user ID
    const DeliveryPartner = require("../models/DeliveryPartner");
    const partner = await DeliveryPartner.findOne({ userId: req.userId });
    if (!partner) {
      return res.status(404).json({
        error: "Delivery partner not found",
        message: "You are not registered as a delivery partner"
      });
    }

    // Update delivery status
    const Delivery = require("../models/Delivery");
    const delivery = await Delivery.findOneAndUpdate(
      { orderId, partnerId: partner._id },
      { 
        status: "Delivered",
        deliveredAt: new Date(),
        currentLocation: {
          lat: partner.currentLocation.lat,
          lng: partner.currentLocation.lng,
          status: "Delivered",
          lastUpdated: new Date()
        }
      },
      { new: true }
    );

    if (!delivery) {
      return res.status(404).json({
        error: "Delivery not found",
        message: "Delivery assignment not found"
      });
    }

    // Update order status
    const Order = require("../models/Order");
    await Order.findByIdAndUpdate(orderId, {
      status: "Delivered",
      actualDelivery: new Date()
    });

    // Update partner stats
    await DeliveryPartner.findByIdAndUpdate(partner._id, {
      $inc: { "deliveryStats.totalDeliveries": 1, "deliveryStats.successfulDeliveries": 1 }
    });

    res.json({
      success: true,
      message: "Order marked as delivered successfully",
      delivery
    });

  } catch (error) {
    console.error("Deliver order error:", error);
    res.status(500).json({
      error: "Failed to mark order as delivered",
      message: error.message || "Failed to mark order as delivered"
    });
  }
});

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
}

// Get delivery partner performance metrics
router.get("/performance", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    // Get delivery partner by user ID
    const partner = await DeliveryPartner.findOne({ userId: req.userId });
    if (!partner) {
      return res.status(404).json({
        error: "Delivery partner not found",
        message: "You are not registered as a delivery partner"
      });
    }

    // Get delivery statistics
    const Delivery = require("../models/Delivery");
    const deliveries = await Delivery.find({ partnerId: partner._id });
    
    const totalDeliveries = deliveries.length;
    const successfulDeliveries = deliveries.filter(d => d.status === "Delivered").length;
    const successRate = totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0;
    
    // Calculate average delivery time (in minutes)
    let totalDeliveryTime = 0;
    let deliveriesWithTime = 0;
    
    deliveries.forEach(delivery => {
      if (delivery.pickedUpAt && delivery.deliveredAt) {
        const pickupTime = new Date(delivery.pickedUpAt);
        const deliveredTime = new Date(delivery.deliveredAt);
        const diffInMinutes = (deliveredTime - pickupTime) / (1000 * 60);
        totalDeliveryTime += diffInMinutes;
        deliveriesWithTime++;
      }
    });
    
    const avgDeliveryTime = deliveriesWithTime > 0 ? Math.round(totalDeliveryTime / deliveriesWithTime) : 0;

    res.json({
      success: true,
      performance: {
        avgDeliveryTime,
        successRate: Math.round(successRate * 10) / 10, // Round to 1 decimal place
        totalDelivered: successfulDeliveries
      }
    });

  } catch (error) {
    console.error("Get performance error:", error);
    res.status(500).json({
      error: "Failed to fetch performance data",
      message: error.message || "Failed to retrieve performance metrics"
    });
  }
});

// Get delivery partner earnings
router.get("/earnings", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    // Get delivery partner by user ID
    const partner = await DeliveryPartner.findOne({ userId: req.userId });
    if (!partner) {
      return res.status(404).json({
        error: "Delivery partner not found",
        message: "You are not registered as a delivery partner"
      });
    }

    // Get completed deliveries with order details
    const Delivery = require("../models/Delivery");
    const deliveries = await Delivery.find({ 
      partnerId: partner._id, 
      status: "Delivered" 
    }).populate('orderId');

    let totalEarnings = 0;
    let todayEarnings = 0;
    let thisWeekEarnings = 0;
    let thisMonthEarnings = 0;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    deliveries.forEach(delivery => {
      if (delivery.orderId && delivery.orderId.total) {
        const deliveryFee = delivery.orderId.total * 0.1; // Assume 10% delivery fee
        const deliveredAt = new Date(delivery.deliveredAt);
        
        totalEarnings += deliveryFee;
        
        if (deliveredAt >= today) {
          todayEarnings += deliveryFee;
        }
        
        if (deliveredAt >= weekStart) {
          thisWeekEarnings += deliveryFee;
        }
        
        if (deliveredAt >= monthStart) {
          thisMonthEarnings += deliveryFee;
        }
      }
    });

    res.json({
      success: true,
      earnings: {
        total: Math.round(totalEarnings),
        today: Math.round(todayEarnings),
        thisWeek: Math.round(thisWeekEarnings),
        thisMonth: Math.round(thisMonthEarnings)
      }
    });

  } catch (error) {
    console.error("Get earnings error:", error);
    res.status(500).json({
      error: "Failed to fetch earnings data",
      message: error.message || "Failed to retrieve earnings information"
    });
  }
});

// Register new delivery partner application
router.post("/register", upload.fields([
  { name: 'idProof.frontImage', maxCount: 1 },
  { name: 'idProof.backImage', maxCount: 1 }
]), authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    console.log("📝 DELIVERY PARTNER APPLICATION - Starting application");
    console.log("🔍 Request body keys:", Object.keys(req.body));
    console.log("👤 User ID from auth:", req.userId);

    // Get authenticated user
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        error: "User not found",
        message: "Please login to submit a delivery partner application"
      });
    }

    console.log("👤 Found user:", user.email);

    // Check if user already has an application
    if (user.deliveryPartnerRegistration.hasApplied && user.deliveryPartnerRegistration.applicationStatus !== "rejected") {
      return res.status(400).json({
        error: "Application already exists",
        message: `Your application is currently ${user.deliveryPartnerRegistration.applicationStatus}`
      });
    }

    // If user is reapplying after rejection, update existing delivery partner record
    let existingDeliveryPartner = null;
    if (user.deliveryPartnerRegistration.hasApplied && user.deliveryPartnerRegistration.applicationStatus === "rejected") {
      console.log("🔄 User is reapplying after rejection, updating existing record");
      existingDeliveryPartner = await DeliveryPartner.findOne({ userId: user._id });
    }

    // Parse form data
    const formData = {};
    const files = {};
    
    // Handle form data
    Object.keys(req.body).forEach(key => {
      if (key.includes(".")) {
        const keys = key.split(".");
        let current = formData;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) {
            current[keys[i]] = {};
          }
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = req.body[key];
      } else {
        formData[key] = req.body[key];
      }
    });

    // Handle uploaded files
    if (req.files) {
      Object.keys(req.files).forEach(key => {
        if (req.files[key] && req.files[key].length > 0) {
          files[key] = req.files[key][0];
        }
      });
    }

    console.log("🔍 Parsed form data:", formData);
    console.log("🔍 Uploaded files:", Object.keys(files));

    // Update user role and delivery partner registration
    user.role = "delivery_partner";
    user.deliveryPartnerRegistration = {
      hasApplied: true,
      applicationDate: new Date(),
      applicationStatus: "pending"
    };

    const savedUser = await user.save();
    console.log("✅ User updated with delivery partner application:", savedUser._id);

    // Create or update delivery partner record
    let savedPartner;
    if (existingDeliveryPartner) {
      // Update existing delivery partner record
      console.log("🔄 Updating existing delivery partner record");
      existingDeliveryPartner.name = formData.name || savedUser.name;
      existingDeliveryPartner.email = formData.email || savedUser.email;
      existingDeliveryPartner.phone = formData.phone || savedUser.phone;
      existingDeliveryPartner.vehicle = {
        type: formData.vehicleType === "motorcycle" || formData.vehicleType === "scooter" ? "bike" : 
              formData.vehicleType === "car" ? "van" : "truck",
        number: formData.vehicleNumber,
        capacity: formData.vehicleType === "motorcycle" || formData.vehicleType === "scooter" ? 50 :
                formData.vehicleType === "car" ? 200 : 500
      };
      existingDeliveryPartner.serviceArea = formData.serviceArea || { cities: [], maxDistance: 50 };
      existingDeliveryPartner.documents = {
        drivingLicense: formData.licenseNumber,
        vehicleInsurance: "",
        policeVerification: "",
        aadharCard: formData.idProof?.number || ""
      };
      existingDeliveryPartner.bankDetails = {
        accountNumber: formData.bankAccount?.accountNumber || "",
        ifscCode: formData.bankAccount?.ifscCode || "",
        accountHolderName: formData.bankAccount?.accountHolderName || ""
      };
      existingDeliveryPartner.workingHours = {
        start: formData.availability?.startTime || "09:00",
        end: formData.availability?.endTime || "18:00",
        workingDays: Object.keys(formData.availability || {}).filter(day => 
          ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].includes(day) && 
          formData.availability[day] === true
        )
      };
      existingDeliveryPartner.status = "offline"; // Reset to offline for reapplication
      
      savedPartner = await existingDeliveryPartner.save();
      console.log("✅ Delivery partner record updated:", savedPartner._id);
    } else {
      // Create new delivery partner record
      console.log("🆕 Creating new delivery partner record");
      const newPartner = new DeliveryPartner({
        userId: savedUser._id,
        partnerId: `DP${Date.now().toString().slice(-6)}`, // Generate unique partner ID
        name: formData.name || savedUser.name,
        email: formData.email || savedUser.email,
        phone: formData.phone || savedUser.phone,
        vehicle: {
          type: formData.vehicleType === "motorcycle" || formData.vehicleType === "scooter" ? "bike" : 
                formData.vehicleType === "car" ? "van" : "truck",
          number: formData.vehicleNumber,
          capacity: formData.vehicleType === "motorcycle" || formData.vehicleType === "scooter" ? 50 :
                  formData.vehicleType === "car" ? 200 : 500
        },
        currentLocation: {
          lat: 0,
          lng: 0,
          lastUpdated: new Date()
        },
        status: "offline", // Valid enum value
        isOnline: false,
        serviceArea: formData.serviceArea || { cities: [], maxDistance: 50 },
        documents: {
          drivingLicense: formData.licenseNumber,
          vehicleInsurance: "",
          policeVerification: "",
          aadharCard: formData.idProof?.number || ""
        },
        bankDetails: {
          accountNumber: formData.bankAccount?.accountNumber || "",
          ifscCode: formData.bankAccount?.ifscCode || "",
          accountHolderName: formData.bankAccount?.accountHolderName || ""
        },
        workingHours: {
          start: formData.availability?.startTime || "09:00",
          end: formData.availability?.endTime || "18:00",
          workingDays: Object.keys(formData.availability || {}).filter(day => 
            ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].includes(day) && 
            formData.availability[day] === true
          )
        }
      });

      savedPartner = await newPartner.save();
      console.log("✅ Delivery partner application created:", savedPartner._id);
    }

    res.status(201).json({
      success: true,
      message: "Delivery partner application submitted successfully! Your application is now pending admin verification.",
      applicationId: savedPartner._id,
      user: savedUser.toJSON(),
      applicationStatus: "pending"
    });

  } catch (error) {
    console.error("❌ REGISTRATION ERROR:", error);
    console.error("❌ Error name:", error.name);
    console.error("❌ Error message:", error.message);
    
    res.status(500).json({
      error: "Application submission failed",
      message: error.message || "Failed to submit delivery partner application. Please try again."
    });
  }
});

// Get available orders for delivery partner (matched by vehicle capacity and delivery range)
router.get("/available-orders", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    // Get the delivery partner's profile
    const deliveryPartner = await DeliveryPartner.findOne({ userId: req.userId });
    if (!deliveryPartner) {
      return res.status(404).json({
        error: "Delivery partner not found",
        message: "No delivery partner profile found for this user"
      });
    }

    // Get vehicle capacity and type
    const vehicleCapacity = deliveryPartner.vehicle.capacity; // in kg
    const vehicleType = deliveryPartner.vehicle.type; // bike, van, truck
    const maxDeliveryDistance = deliveryPartner.serviceArea?.maxDistance || 50; // in km
    const partnerLocation = deliveryPartner.currentLocation; // {lat, lng}

    // Get orders that need delivery (confirmed but not assigned)
    const Order = require("../models/Order");
    const availableOrders = await Order.find({
      status: { $in: ["Confirmed", "Processing"] },
      "deliveryInfo.deliveryPartnerId": { $exists: false }
    }).populate('buyerId sellerId', 'name phone address')
    .populate('items');

    // Filter orders based on vehicle capacity, delivery range, and calculate order weight
    const matchedOrders = availableOrders.filter(order => {
      // Calculate total weight/quantity of the order
      let totalWeight = 0;
      let totalQuantity = 0;
      
      order.items.forEach(item => {
        // Estimate weight based on item type and quantity
        let itemWeight = 0;
        switch(item.itemType) {
          case 'crop':
            itemWeight = item.quantity * 0.5; // Assume 0.5kg per unit
            break;
          case 'seed':
            itemWeight = item.quantity * 0.1; // Assume 0.1kg per unit
            break;
          case 'pesticide':
          case 'fertilizer':
            itemWeight = item.quantity * 1; // Assume 1kg per unit
            break;
          case 'equipment':
            itemWeight = item.quantity * 5; // Assume 5kg per unit
            break;
          default:
            itemWeight = item.quantity * 0.5; // Default weight
        }
        totalWeight += itemWeight;
        totalQuantity += item.quantity;
      });

      // Add order weight and quantity to the order object for display
      order.totalWeight = Math.round(totalWeight * 100) / 100; // Round to 2 decimal places
      order.totalQuantity = totalQuantity;

      // Check if the order fits in the vehicle capacity
      const canHandleOrder = totalWeight <= vehicleCapacity;

      // Additional matching logic based on vehicle type
      let suitableForVehicle = true;
      if (vehicleType === "bike" && totalWeight > 10) {
        suitableForVehicle = false; // Bikes can't handle heavy loads
      } else if (vehicleType === "van" && totalWeight > 100) {
        suitableForVehicle = false; // Vans have medium capacity
      }
      // Trucks can handle any load within their capacity

      // Calculate distance from partner to pickup location (seller's location)
      let pickupDistance = Infinity;
      let deliveryDistance = Infinity;
      
      // Use Haversine formula to calculate distance between two coordinates
      const calculateDistance = (lat1, lng1, lat2, lng2) => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
          Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // Distance in km
      };

      // Calculate distance to pickup location (seller's location)
      if (order.sellerId?.location && partnerLocation.lat && partnerLocation.lng) {
        // Try to get seller's coordinates from their location or address
        let sellerLat = 0, sellerLng = 0;
        
        if (typeof order.sellerId.location === 'string') {
          // If location is a string like "lat,lng"
          const coords = order.sellerId.location.split(',');
          if (coords.length === 2) {
            sellerLat = parseFloat(coords[0]);
            sellerLng = parseFloat(coords[1]);
          }
        } else if (order.sellerId.location?.lat && order.sellerId.location?.lng) {
          sellerLat = order.sellerId.location.lat;
          sellerLng = order.sellerId.location.lng;
        }
        
        if (sellerLat && sellerLng) {
          pickupDistance = calculateDistance(
            partnerLocation.lat, 
            partnerLocation.lng, 
            sellerLat, 
            sellerLng
          );
        }
      }

      // Calculate distance to delivery location (buyer's address)
      if (order.deliveryInfo?.deliveryAddress?.lat && order.deliveryInfo?.deliveryAddress?.lng) {
        deliveryDistance = calculateDistance(
          partnerLocation.lat, 
          partnerLocation.lng, 
          order.deliveryInfo.deliveryAddress.lat, 
          order.deliveryInfo.deliveryAddress.lng
        );
      }

      // Check if order is within delivery range
      const maxDistance = Math.max(pickupDistance, deliveryDistance);
      const withinDeliveryRange = maxDistance <= maxDeliveryDistance;

      // Add distance information to order object
      order.pickupDistance = Math.round(pickupDistance * 10) / 10; // Round to 1 decimal place
      order.deliveryDistance = Math.round(deliveryDistance * 10) / 10;
      order.maxDistance = Math.round(maxDistance * 10) / 10;
      order.withinRange = withinDeliveryRange;

      return canHandleOrder && suitableForVehicle && withinDeliveryRange;
    });

    // Sort orders by distance (closest first) then by weight (lightest first)
    matchedOrders.sort((a, b) => {
      if (a.maxDistance !== b.maxDistance) {
        return a.maxDistance - b.maxDistance;
      }
      return a.totalWeight - b.totalWeight;
    });

    console.log(`📦 Found ${matchedOrders.length} suitable orders for partner ${deliveryPartner.name} (capacity: ${vehicleCapacity}kg, range: ${maxDeliveryDistance}km)`);

    res.json({
      success: true,
      orders: matchedOrders,
      partnerInfo: {
        name: deliveryPartner.name,
        vehicleType: deliveryPartner.vehicle.type,
        vehicleCapacity: deliveryPartner.vehicle.capacity,
        maxDeliveryDistance: maxDeliveryDistance,
        currentLocation: deliveryPartner.currentLocation,
        serviceArea: deliveryPartner.serviceArea
      },
      count: matchedOrders.length
    });

  } catch (error) {
    console.error("Get available orders error:", error);
    res.status(500).json({
      error: "Failed to fetch available orders",
      message: error.message || "Failed to retrieve available orders"
    });
  }
});

// Accept an order (delivery partner accepts to deliver)
router.post("/accept-order/:orderId", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const { orderId } = req.params;

    // Get the delivery partner
    const deliveryPartner = await DeliveryPartner.findOne({ userId: req.userId });
    if (!deliveryPartner) {
      return res.status(404).json({
        error: "Delivery partner not found",
        message: "No delivery partner profile found for this user"
      });
    }

    // Get the order
    const Order = require("../models/Order");
    const order = await Order.findById(orderId).populate('buyerId sellerId');
    if (!order) {
      return res.status(404).json({
        error: "Order not found",
        message: "No order found with this ID"
      });
    }

    // Check if order is already assigned
    if (order.deliveryInfo?.deliveryPartnerId) {
      return res.status(400).json({
        error: "Order already assigned",
        message: "This order has already been assigned to another delivery partner"
      });
    }

    // Check if partner can handle this order (double-check)
    let totalWeight = 0;
    order.items.forEach(item => {
      let itemWeight = 0;
      switch(item.itemType) {
        case 'crop':
          itemWeight = item.quantity * 0.5;
          break;
        case 'seed':
          itemWeight = item.quantity * 0.1;
          break;
        case 'pesticide':
        case 'fertilizer':
          itemWeight = item.quantity * 1;
          break;
        case 'equipment':
          itemWeight = item.quantity * 5;
          break;
        default:
          itemWeight = item.quantity * 0.5;
      }
      totalWeight += itemWeight;
    });

    if (totalWeight > deliveryPartner.vehicle.capacity) {
      return res.status(400).json({
        error: "Order too heavy",
        message: `Order weight (${totalWeight.toFixed(2)}kg) exceeds your vehicle capacity (${deliveryPartner.vehicle.capacity}kg)`
      });
    }

    // Create delivery record
    const Delivery = require("../models/Delivery");
    const delivery = new Delivery({
      orderId: orderId,
      partnerId: deliveryPartner._id,
      assignedAt: new Date(),
      status: "Assigned",
      currentLocation: {
        lat: deliveryPartner.currentLocation?.lat || 0,
        lng: deliveryPartner.currentLocation?.lng || 0,
        status: "Assigned",
        lastUpdated: new Date()
      },
      destination: {
        lat: order.deliveryInfo?.deliveryAddress?.lat || 0,
        lng: order.deliveryInfo?.deliveryAddress?.lng || 0,
        address: order.deliveryInfo?.deliveryAddress?.address || "Delivery address",
        city: order.deliveryInfo?.deliveryAddress?.city || "",
        state: order.deliveryInfo?.deliveryAddress?.state || "",
        pincode: order.deliveryInfo?.deliveryAddress?.pincode || ""
      },
      estimatedDeliveryTime: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
    });

    await delivery.save();

    // Update order with delivery partner
    order.deliveryInfo.deliveryPartnerId = deliveryPartner._id;
    order.status = "Out for Delivery";
    await order.save();

    // Update partner status to busy
    deliveryPartner.status = "busy";
    await deliveryPartner.save();

    console.log(`✅ Order ${orderId} accepted by delivery partner ${deliveryPartner.name}`);

    res.status(201).json({
      success: true,
      message: "Order accepted successfully",
      delivery: await Delivery.findById(delivery._id)
        .populate('orderId', 'total status items')
        .populate('partnerId', 'name phone email')
    });

  } catch (error) {
    console.error("Accept order error:", error);
    res.status(500).json({
      error: "Failed to accept order",
      message: error.message || "Failed to accept order"
    });
  }
});

// Get my deliveries for the delivery partner
router.get("/my-deliveries", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    // Get the delivery partner
    const deliveryPartner = await DeliveryPartner.findOne({ userId: req.userId });
    if (!deliveryPartner) {
      return res.status(404).json({
        error: "Delivery partner not found",
        message: "No delivery partner profile found for this user"
      });
    }

    // Get all deliveries assigned to this partner
    const Delivery = require("../models/Delivery");
    const deliveries = await Delivery.find({ partnerId: deliveryPartner._id })
      .populate('orderId', 'total status items')
      .populate('orderId.buyerId', 'name phone address')
      .sort({ assignedAt: -1 });

    res.json({
      success: true,
      deliveries: deliveries,
      count: deliveries.length
    });

  } catch (error) {
    console.error("Get my deliveries error:", error);
    res.status(500).json({
      error: "Failed to fetch deliveries",
      message: error.message || "Failed to retrieve your deliveries"
    });
  }
});

// Get messages for the delivery partner
router.get("/messages", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    // Get the delivery partner
    const deliveryPartner = await DeliveryPartner.findOne({ userId: req.userId });
    if (!deliveryPartner) {
      return res.status(404).json({
        error: "Delivery partner not found",
        message: "No delivery partner profile found for this user"
      });
    }

    // Mock messages for now - in real app, this would come from a chat system
    const mockMessages = [
      {
        id: "1",
        message: "Welcome to the delivery team!",
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        sender: "admin",
        type: "system"
      },
      {
        id: "2", 
        message: "Your first delivery is ready for pickup",
        timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
        sender: "admin",
        type: "notification"
      }
    ];

    res.json({
      success: true,
      messages: mockMessages
    });

  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({
      error: "Failed to fetch messages",
      message: error.message || "Failed to retrieve messages"
    });
  }
});

// Send message (placeholder for chat functionality)
router.post("/messages/:chatId", authMiddleware, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { message } = req.body;

    // In a real app, this would save the message to a chat collection
    // For now, we'll just return success
    res.json({
      success: true,
      message: "Message sent successfully",
      chatId: chatId,
      message: message
    });

  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({
      error: "Failed to send message",
      message: error.message || "Failed to send message"
    });
  }
});

// Get delivery partner application status
router.get("/application-status", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    // Get authenticated user
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        error: "User not found",
        message: "User not found"
      });
    }

    res.json({
      success: true,
      hasApplied: user.deliveryPartnerRegistration.hasApplied,
      applicationStatus: user.deliveryPartnerRegistration.applicationStatus,
      applicationDate: user.deliveryPartnerRegistration.applicationDate,
      role: user.role
    });

  } catch (error) {
    console.error("Get application status error:", error);
    res.status(500).json({
      error: "Failed to fetch application status",
      message: error.message || "Failed to retrieve application status"
    });
  }
});

// Get delivery partner current location
router.get("/location", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    // Get delivery partner by user ID
    const partner = await DeliveryPartner.findOne({ userId: req.userId });
    if (!partner) {
      return res.status(404).json({
        error: "Delivery partner not found",
        message: "You are not registered as a delivery partner"
      });
    }

    res.json({
      success: true,
      location: partner.currentLocation || { lat: 0, lng: 0 }
    });

  } catch (error) {
    console.error("Get location error:", error);
    res.status(500).json({
      error: "Failed to fetch location",
      message: error.message || "Failed to retrieve current location"
    });
  }
});

module.exports = router;
