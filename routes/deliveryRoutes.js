// Delivery Routes
const router = require("express").Router();
const Delivery = require("../models/Delivery");
const mongoose = require("mongoose");

router.post("/assign", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const delivery = new Delivery(req.body);
    await delivery.save();
    res.send(delivery);
  } catch (error) {
    console.error("Assign delivery error:", error);
    res.status(500).json({
      error: "Failed to assign delivery",
      message: error.message || "Failed to save delivery"
    });
  }
});

router.put("/location/:id", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const { lat, lng, status } = req.body.location || req.body;
    
    // Update delivery location and emit socket event
    const delivery = await Delivery.findByIdAndUpdate(
      req.params.id,
      {
        currentLocation: { lat, lng, status: status || "In Transit" },
        status: status || "In Transit"
      },
      { new: true }
    );

    // Emit real-time update to tracking clients
    const { io } = require('../server');
    if (io) {
      io.to(req.params.id).emit("locationUpdate", {
        lat,
        lng,
        status: status || "In Transit"
      });
    }

    res.send({ success: true, delivery });
  } catch (error) {
    console.error("Update delivery location error:", error);
    res.status(500).json({
      error: "Failed to update location",
      message: error.message || "Failed to update delivery location"
    });
  }
});

router.get("/location/:id", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const delivery = await Delivery.findById(req.params.id);
    if (!delivery || !delivery.currentLocation) {
      return res.status(404).json({
        error: "Delivery not found",
        message: "Delivery location not found"
      });
    }

    // Handle both old string format and new object format
    let location;
    if (typeof delivery.currentLocation === 'string') {
      const [lat, lng] = delivery.currentLocation.split(",");
      location = { lat: Number(lat), lng: Number(lng) };
    } else {
      location = delivery.currentLocation;
    }

    res.send(location);
  } catch (error) {
    console.error("Get delivery location error:", error);
    res.status(500).json({
      error: "Failed to fetch location",
      message: error.message || "Failed to retrieve delivery location"
    });
  }
});
router.get("/tracking/:deliveryId", async (req, res) => {
  try {
    const order = await Order.findById(req.params.deliveryId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({
      currentLocation: order.deliveryPartnerInfo?.currentLocation || {
        lat: 22.7196,
        lng: 75.8577,
        status: order.status
      },
      destination: {
        lat: order.deliveryInfo?.deliveryAddress?.lat,
        lng: order.deliveryInfo?.deliveryAddress?.lng,
        address: order.deliveryInfo?.deliveryAddress?.address
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get("/tracking/:id", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    let delivery = await Delivery.findById(req.params.id)
      .populate('orderId')
      .populate('partnerId', 'name phone address location');
    
    // If no delivery found, try to find by orderId
    if (!delivery) {
      const Order = require('../models/Order');
      const order = await Order.findById(req.params.id).populate('buyerId', 'name phone address');
      
      if (order) {
        // Create a mock delivery object for tracking
        delivery = {
          _id: order._id,
          orderId: order,
          currentLocation: {
            lat: 0,
            lng: 0,
            status: order.status || "Confirmed"
          },
          status: order.status || "Confirmed",
          destination: null,
          partnerId: null
        };
      }
    }
    
    if (!delivery) {
      return res.status(404).json({
        error: "Delivery not found",
        message: "No delivery or order found with this ID"
      });
    }

    // Parse currentLocation for backward compatibility
    let currentLocation = delivery.currentLocation;
    if (typeof currentLocation === 'string') {
      const [lat, lng] = currentLocation.split(",");
      currentLocation = { 
        lat: Number(lat), 
        lng: Number(lng), 
        status: delivery.status || "In Transit" 
      };
    }

    // Get destination from order delivery address
    let destination = null;
    let customerInfo = null;
    let providerInfo = null;

    if (delivery.orderId) {
      // Customer information
      customerInfo = {
        name: "Customer",
        phone: null,
        address: null
      };

      // Try to get buyer information from populated order
      if (delivery.orderId.buyerId) {
        customerInfo = {
          name: delivery.orderId.buyerId.name,
          phone: delivery.orderId.buyerId.phone,
          address: delivery.orderId.buyerId.address || delivery.orderId.deliveryAddress
        };
      }

      // Use delivery address from order as destination
      if (delivery.orderId.deliveryAddress) {
        const orderAddress = delivery.orderId.deliveryAddress;
        destination = {
          lat: orderAddress.lat || 0,
          lng: orderAddress.lng || 0,
          address: `${orderAddress.address}${orderAddress.city ? `, ${orderAddress.city}` : ''}${orderAddress.state ? `, ${orderAddress.state}` : ''}${orderAddress.pincode ? ` - ${orderAddress.pincode}` : ''}`
        };
      }
    }

    // Provider (delivery partner) information
    if (delivery.partnerId) {
      providerInfo = {
        name: delivery.partnerId.name,
        phone: delivery.partnerId.phone,
        address: delivery.partnerId.address || {
          address: delivery.partnerId.location || "Location not available"
        }
      };
    }

    // If no destination found, use customer address
    if (!destination && customerInfo && customerInfo.address) {
      const customerAddress = customerInfo.address;
      if (typeof customerAddress === 'object') {
        destination = {
          lat: customerAddress.lat || 0,
          lng: customerAddress.lng || 0,
          address: `${customerAddress.address}${customerAddress.city ? `, ${customerAddress.city}` : ''}${customerAddress.state ? `, ${customerAddress.state}` : ''}${customerAddress.pincode ? ` - ${customerAddress.pincode}` : ''}`
        };
      } else {
        destination = {
          lat: 0,
          lng: 0,
          address: customerAddress
        };
      }
    }

    res.json({
      currentLocation,
      destination,
      customerInfo,
      providerInfo,
      deliveryStatus: delivery.status || "Confirmed"
    });
  } catch (error) {
    console.error("Get tracking data error:", error);
    res.status(500).json({
      error: "Failed to fetch tracking data",
      message: error.message || "Failed to retrieve tracking information"
    });
  }
});

module.exports = router;
