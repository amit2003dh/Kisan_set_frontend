// Delivery Partner Routes
const router = require("express").Router();
const DeliveryPartner = require("../models/DeliveryPartner");
const Order = require("../models/Order");
const Delivery = require("../models/Delivery");
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/auth");

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

module.exports = router;
