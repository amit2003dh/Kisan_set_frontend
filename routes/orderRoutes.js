// Order Routes
const router = require("express").Router();
const Order = require("../models/Order");
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/auth");

router.post("/create", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const order = new Order(req.body);
    await order.save();
    res.send(order);
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({
      error: "Failed to create order",
      message: error.message || "Failed to save order"
    });
  }
});

// Create multiple orders from cart items
router.post("/create-from-cart", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const { items, buyerId, paymentId, deliveryAddress } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: "Invalid cart items",
        message: "Cart items are required"
      });
    }

    // Get user's address if delivery address not provided
    let finalDeliveryAddress = deliveryAddress;
    if (!finalDeliveryAddress && req.userId) {
      const User = require("../models/User");
      const user = await User.findById(req.userId);
      if (user && user.address) {
        finalDeliveryAddress = user.address;
      }
    }

    // Create orders for each cart item
    const orders = await Promise.all(
      items.map(item => {
        const order = new Order({
          buyerId: req.userId || buyerId,
          itemId: item._id || item.itemId,
          itemType: item.type === "crop" ? "crop" : (item.type === "seed" || item.type === "pesticide" ? item.type : "product"),
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
          status: "Confirmed",
          paymentId: paymentId || undefined,
          deliveryAddress: finalDeliveryAddress
        });
        return order.save();
      })
    );

    // Decrease crop quantities for crop orders
    await Promise.all(
      items.map(async (item) => {
        if (item.type === "crop") {
          try {
            const Crop = require("../models/Crop");
            await Crop.findByIdAndUpdate(
              item._id || item.itemId,
              {
                $inc: { quantity: -item.quantity }
              }
            );

            // Check if quantity is now zero and update status
            const updatedCrop = await Crop.findById(item._id || item.itemId);
            if (updatedCrop.quantity <= 0) {
              await Crop.findByIdAndUpdate(
                item._id || item.itemId,
                { 
                  quantity: 0,
                  status: "Out of Stock"
                }
              );
            }

            // Add tracking event
            const ProductTracker = require("../models/ProductTracker");
            await ProductTracker.findOneAndUpdate(
              { productId: item._id || item.itemId, productType: "Crop", sellerId: updatedCrop.farmerId },
              {
                $inc: { 
                  totalOrders: 1,
                  totalRevenue: item.price * item.quantity
                },
                $push: {
                  trackingEvents: {
                    eventType: "ordered",
                    description: `${item.quantity} kg ordered via cart`,
                    metadata: { 
                      quantity: item.quantity,
                      price: item.price,
                      revenue: item.price * item.quantity,
                      remainingQuantity: updatedCrop.quantity,
                      orderId: orders.find(o => o.itemId.toString() === (item._id || item.itemId).toString())?._id
                    }
                  }
                },
                currentStatus: updatedCrop.quantity <= 0 ? "out_of_stock" : "available",
                lastUpdated: new Date()
              },
              { upsert: true }
            );

          } catch (error) {
            console.error("Error updating crop quantity:", error);
          }
        } else if (item.type === "seed" || item.type === "pesticide") {
          try {
            const Product = require("../models/Product");
            await Product.findByIdAndUpdate(
              item._id || item.itemId,
              {
                $inc: { stock: -item.quantity }
              }
            );

            // Check if stock is now zero
            const updatedProduct = await Product.findById(item._id || item.itemId);
            
            // Add tracking event
            const ProductTracker = require("../models/ProductTracker");
            await ProductTracker.findOneAndUpdate(
              { productId: item._id || item.itemId, productType: "Product", sellerId: updatedProduct.sellerId },
              {
                $inc: { 
                  totalOrders: 1,
                  totalRevenue: item.price * item.quantity
                },
                $push: {
                  trackingEvents: {
                    eventType: "ordered",
                    description: `${item.quantity} units ordered via cart`,
                    metadata: { 
                      quantity: item.quantity,
                      price: item.price,
                      revenue: item.price * item.quantity,
                      remainingStock: updatedProduct.stock,
                      orderId: orders.find(o => o.itemId.toString() === (item._id || item.itemId).toString())?._id
                    }
                  }
                },
                currentStatus: updatedProduct.stock <= 0 ? "out_of_stock" : "available",
                lastUpdated: new Date()
              },
              { upsert: true }
            );

          } catch (error) {
            console.error("Error updating product stock:", error);
          }
        }
      })
    );

    // Create delivery records for each order
    const Delivery = require("../models/Delivery");
    const deliveries = await Promise.all(
      orders.map(order => {
        const delivery = new Delivery({
          orderId: order._id,
          currentLocation: {
            lat: 0, // Default location, will be updated when delivery partner assigned
            lng: 0,
            status: "Confirmed"
          },
          status: "Assigned",
          destination: finalDeliveryAddress ? {
            lat: finalDeliveryAddress.lat || 0,
            lng: finalDeliveryAddress.lng || 0,
            address: finalDeliveryAddress.address || "Address not available"
          } : null
        });
        return delivery.save();
      })
    );

    res.json({
      success: true,
      orders,
      deliveries
    });
  } catch (error) {
    console.error("Create orders from cart error:", error);
    res.status(500).json({
      error: "Failed to create orders",
      message: error.message || "Failed to save orders"
    });
  }
});

router.get("/", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    // Get orders for the logged-in user
    const orders = await Order.find({ buyerId: req.userId })
      .sort({ createdAt: -1 });
    
    // Manually populate item details based on itemType
    const populatedOrders = await Promise.all(
      orders.map(async (order) => {
        const orderObj = order.toObject();
        
        try {
          if (order.itemType === "crop") {
            const Crop = require("../models/Crop");
            const crop = await Crop.findById(order.itemId);
            orderObj.itemId = crop;
          } else if (order.itemType === "product" || order.itemType === "seed" || order.itemType === "pesticide") {
            const Product = require("../models/Product");
            const product = await Product.findById(order.itemId);
            orderObj.itemId = product;
          }
        } catch (err) {
          console.log("Could not populate item:", err.message);
          // Keep itemId as is if population fails
        }
        
        return orderObj;
      })
    );
    
    res.send(populatedOrders);
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({
      error: "Failed to fetch orders",
      message: error.message || "Failed to retrieve orders"
    });
  }
});

router.put("/:id/status", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    await Order.findByIdAndUpdate(req.params.id, { status: req.body.status });
    res.send({ success: true });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({
      error: "Failed to update order",
      message: error.message || "Failed to update order status"
    });
  }
});

module.exports = router;
