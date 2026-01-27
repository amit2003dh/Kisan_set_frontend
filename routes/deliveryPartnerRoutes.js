// Delivery Partner Routes
const router = require("express").Router();
const DeliveryPartner = require("../models/DeliveryPartner");
const Order = require("../models/Order");
const Delivery = require("../models/Delivery");
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
    const partner = await DeliveryPartner.findOne({ userId: req.userId });
    if (!partner) {
      return res.status(404).json({
        error: "Delivery partner not found",
        message: "You are not registered as a delivery partner"
      });
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

// Register new delivery partner
router.post("/register", authMiddleware, upload.fields([
  { name: 'idProof.frontImage', maxCount: 1 },
  { name: 'idProof.backImage', maxCount: 1 }
]), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    console.log("📝 DELIVERY PARTNER REGISTRATION - Starting registration");
    console.log("🔍 Request body keys:", Object.keys(req.body));

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

    // Handle files
    if (req.files) {
      Object.keys(req.files).forEach(key => {
        if (req.files[key] && req.files[key].length > 0) {
          files[key] = req.files[key][0];
        }
      });
    }

    console.log("🔍 Parsed form data:", formData);
    console.log("🔍 Files:", Object.keys(files));

    // Validate required fields
    const requiredFields = ['name', 'email', 'phone', 'age', 'gender', 'vehicleType', 'vehicleNumber', 'licenseNumber'];
    for (const field of requiredFields) {
      if (!formData[field]) {
        return res.status(400).json({
          error: `Missing required field: ${field}`,
          message: `Please provide ${field}`
        });
      }
    }

    // Check if user already exists
    const User = require("../models/User");
    const existingUser = await User.findOne({ 
      $or: [{ email: formData.email }, { phone: formData.phone }] 
    });

    if (existingUser) {
      return res.status(400).json({
        error: "User already exists",
        message: "An account with this email or phone number already exists"
      });
    }

    // Check if delivery partner already registered
    const existingPartner = await DeliveryPartner.findOne({ 
      $or: [{ email: formData.email }, { phone: formData.phone }] 
    });

    if (existingPartner) {
      return res.status(400).json({
        error: "Application already submitted",
        message: "You have already submitted an application. Please wait for admin verification."
      });
    }

    // Parse JSON fields
    let serviceArea, address, idProof, bankAccount, emergencyContact, availability;
    try {
      serviceArea = JSON.parse(formData.serviceArea || '{}');
      address = JSON.parse(formData.address || '{}');
      idProof = JSON.parse(formData.idProof || '{}');
      bankAccount = JSON.parse(formData.bankAccount || '{}');
      emergencyContact = JSON.parse(formData.emergencyContact || '{}');
      availability = JSON.parse(formData.availability || '{}');
    } catch (error) {
      console.error("❌ Error parsing JSON fields:", error);
      return res.status(400).json({
        error: "Invalid data format",
        message: "Please check your form data and try again"
      });
    }

    // Create user account
    const newUser = new User({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      role: "delivery_partner",
      isVerified: false, // Will be verified by admin
      verificationDocuments: [],
      deliveryPartnerRegistration: {
        hasApplied: true,
        applicationDate: new Date(),
        applicationStatus: "pending"
      }
    });

    const savedUser = await newUser.save();
    console.log("✅ User account created:", savedUser._id);

    // Create delivery partner application
    const newPartner = new DeliveryPartner({
      userId: savedUser._id,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      age: parseInt(formData.age),
      gender: formData.gender,
      vehicleType: formData.vehicleType,
      vehicleNumber: formData.vehicleNumber,
      licenseNumber: formData.licenseNumber,
      experience: parseInt(formData.experience) || 0,
      serviceArea: {
        cities: serviceArea.cities || [],
        maxDistance: parseInt(serviceArea.maxDistance) || 10
      },
      address: {
        street: address.street || "",
        city: address.city || "",
        state: address.state || "",
        pincode: address.pincode || "",
        lat: parseFloat(address.lat) || 0,
        lng: parseFloat(address.lng) || 0
      },
      idProof: {
        type: idProof.type || "aadhaar",
        number: idProof.number || "",
        frontImage: files['idProof.frontImage'] ? files['idProof.frontImage'].filename : "",
        backImage: files['idProof.backImage'] ? files['idProof.backImage'].filename : ""
      },
      bankAccount: {
        accountNumber: bankAccount.accountNumber || "",
        accountHolderName: bankAccount.accountHolderName || "",
        bankName: bankAccount.bankName || "",
        ifscCode: bankAccount.ifscCode || "",
        branchName: bankAccount.branchName || ""
      },
      emergencyContact: {
        name: emergencyContact.name || "",
        phone: emergencyContact.phone || "",
        relationship: emergencyContact.relationship || ""
      },
      availability: {
        monday: availability.monday !== false,
        tuesday: availability.tuesday !== false,
        wednesday: availability.wednesday !== false,
        thursday: availability.thursday !== false,
        friday: availability.friday !== false,
        saturday: availability.saturday !== false,
        sunday: availability.sunday !== false,
        startTime: availability.startTime || "09:00",
        endTime: availability.endTime || "18:00"
      },
      status: "pending", // Pending admin verification
      isOnline: false,
      currentLocation: {
        lat: parseFloat(address.lat) || 0,
        lng: parseFloat(address.lng) || 0,
        lastUpdated: new Date()
      },
      deliveryStats: {
        totalDeliveries: 0,
        successfulDeliveries: 0,
        averageRating: 0,
        totalEarnings: 0
      },
      registrationDate: new Date(),
      lastSeen: new Date()
    });

    const savedPartner = await newPartner.save();
    console.log("✅ Delivery partner application created:", savedPartner._id);

    // Send notification to admin (you can implement email notification here)
    console.log("📧 Sending notification to admin for verification");

    res.status(201).json({
      success: true,
      message: "Registration submitted successfully! Your application is now pending admin verification.",
      applicationId: savedPartner._id,
      status: "pending"
    });

  } catch (error) {
    console.error("❌ REGISTRATION ERROR:", error);
    console.error("❌ Error name:", error.name);
    console.error("❌ Error message:", error.message);
    
    res.status(500).json({
      error: "Registration failed",
      message: error.message || "Failed to submit registration. Please try again."
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
