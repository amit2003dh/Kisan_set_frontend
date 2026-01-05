// Order Routes
const router = require("express").Router();
const Order = require("../models/Order");
const mongoose = require("mongoose");

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
router.post("/create-from-cart", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const { items, buyerId, paymentId } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: "Invalid cart items",
        message: "Cart items are required"
      });
    }

    // Create orders for each cart item
    const orders = await Promise.all(
      items.map(item => {
        const order = new Order({
          buyerId,
          itemId: item._id || item.itemId,
          itemType: item.type === "crop" ? "crop" : (item.type === "seed" || item.type === "pesticide" ? item.type : "product"),
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
          status: "Confirmed",
          paymentId: paymentId || undefined
        });
        return order.save();
      })
    );

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error("Create orders from cart error:", error);
    res.status(500).json({
      error: "Failed to create orders",
      message: error.message || "Failed to save orders"
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

    const orders = await Order.find().sort({ createdAt: -1 });
    res.send(orders);
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
