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

    let sellerId = null;
    const { itemId, itemType } = req.body;

    // Get sellerId based on item type
    if (itemType === "seed" || itemType === "pesticide") {
      const Product = require("../models/Product");
      const product = await Product.findById(itemId);
      sellerId = product?.sellerId;
    } else if (itemType === "crop") {
      const Crop = require("../models/Crop");
      const crop = await Crop.findById(itemId);
      sellerId = crop?.farmerId;
    }

    const orderData = {
      ...req.body,
      sellerId: sellerId
    };

    const order = new Order(orderData);
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

    // Group items by product ID to combine quantities
    const groupedItems = {};
    items.forEach(item => {
      const key = `${item.type}_${item._id || item.itemId}`;
      if (!groupedItems[key]) {
        groupedItems[key] = {
          type: item.type,
          itemId: item._id || item.itemId,
          quantity: 0,
          price: item.price,
          items: []
        };
      }
      groupedItems[key].quantity += item.quantity;
      groupedItems[key].items.push(item);
    });

    // Create single orders for each product group
    const orders = await Promise.all(
      Object.values(groupedItems).map(async (group) => {
        let sellerId = null;
        
        // Get sellerId based on item type
        if (group.type === "seed" || group.type === "pesticide") {
          const Product = require("../models/Product");
          const product = await Product.findById(group.itemId);
          sellerId = product?.sellerId;
        } else if (group.type === "crop") {
          const Crop = require("../models/Crop");
          const crop = await Crop.findById(group.itemId);
          sellerId = crop?.farmerId;
        }

        const order = new Order({
          buyerId: req.userId || buyerId,
          sellerId: sellerId, // Add sellerId to order
          itemId: group.itemId,
          itemType: group.type === "crop" ? "crop" : (group.type === "seed" || group.type === "pesticide") ? group.type : "product",
          quantity: group.quantity,
          price: group.price,
          total: group.price * group.quantity,
          status: "Confirmed",
          paymentId: paymentId || undefined,
          paymentMethod: req.body.paymentMethod || "COD",
          deliveryAddress: finalDeliveryAddress,
          orderItems: group.items // Store individual cart items for reference
        });
        return order.save();
      })
    );

    // Decrease product quantities for all items
    await Promise.all(
      Object.values(groupedItems).map(async (group) => {
        if (group.type === "seed" || group.type === "pesticide") {
          try {
            const Product = require("../models/Product");
            const product = await Product.findByIdAndUpdate(
              group.itemId,
              {
                $inc: { 
                  stock: -group.quantity,
                  "salesStats.totalSold": group.quantity,
                  "salesStats.totalRevenue": group.price * group.quantity
                }
              }
            );

            // Check if stock is now zero and update status
            const updatedProduct = await Product.findById(group.itemId);
            if (updatedProduct.stock <= 0) {
              await Product.findByIdAndUpdate(
                group.itemId,
                { 
                  stock: 0,
                  status: "out_of_stock"
                }
              );
            }

            // Add tracking event
            const ProductTracker = require("../models/ProductTracker");
            await ProductTracker.findOneAndUpdate(
              { productId: group.itemId, productType: "Product", sellerId: updatedProduct.sellerId },
              {
                $inc: { 
                  totalOrders: 1,
                  totalRevenue: group.price * group.quantity
                },
                $push: {
                  trackingEvents: {
                    eventType: "ordered",
                    description: `${group.quantity} units ordered via cart (combined order)`,
                    metadata: { 
                      quantity: group.quantity,
                      price: group.price,
                      revenue: group.price * group.quantity,
                      remainingStock: updatedProduct.stock,
                      orderId: orders.find(o => o.itemId.toString() === group.itemId.toString())?._id
                    }
                  }
                },
                currentStatus: updatedProduct.stock <= 0 ? "out_of_stock" : "available",
                lastUpdated: new Date()
              },
              { upsert: true }
            );
          } catch (error) {
            console.error("Error updating product quantity:", error);
          }
        } else if (group.type === "crop") {
          try {
            const Crop = require("../models/Crop");
            await Crop.findByIdAndUpdate(
              group.itemId,
              {
                $inc: { 
                  quantity: -group.quantity,
                  "salesStats.totalSold": group.quantity,
                  "salesStats.totalRevenue": group.price * group.quantity
                }
              }
            );

            // Check if quantity is now zero and update status
            const updatedCrop = await Crop.findById(group.itemId);
            if (updatedCrop.quantity <= 0) {
              await Crop.findByIdAndUpdate(
                group.itemId,
                { 
                  quantity: 0,
                  status: "Out of Stock"
                }
              );
            }

            // Add tracking event
            const ProductTracker = require("../models/ProductTracker");
            await ProductTracker.findOneAndUpdate(
              { productId: group.itemId, productType: "Crop", sellerId: updatedCrop.farmerId },
              {
                $inc: { 
                  totalOrders: 1,
                  totalRevenue: group.price * group.quantity
                },
                $push: {
                  trackingEvents: {
                    eventType: "ordered",
                    description: `${group.quantity} kg ordered via cart (combined order)`,
                    metadata: { 
                      quantity: group.quantity,
                      price: group.price,
                      revenue: group.price * group.quantity,
                      remainingQuantity: updatedCrop.quantity,
                      orderId: orders.find(o => o.itemId.toString() === group.itemId.toString())?._id
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

    // Get current user to determine role
    const User = require("../models/User");
    const currentUser = await User.findById(req.userId);
    
    if (!currentUser) {
      return res.status(404).json({
        error: "User not found",
        message: "User not found"
      });
    }

    let orders = [];
    
    // Get orders based on user role
    if (currentUser.role === "buyer") {
      // Buyers see their orders
      orders = await Order.find({ buyerId: req.userId })
        .sort({ createdAt: -1 });
    } else if (currentUser.role === "seller") {
      // Sellers see orders for their products
      orders = await Order.find({ sellerId: req.userId })
        .sort({ createdAt: -1 });
    } else if (currentUser.role === "farmer") {
      // Farmers see orders for their crops
      orders = await Order.find({ sellerId: req.userId })
        .sort({ createdAt: -1 });
    } else {
      // Admin or other roles can see all orders (optional)
      orders = await Order.find({})
        .sort({ createdAt: -1 });
    }
    
    // Manually populate item details based on itemType
    const populatedOrders = await Promise.all(
      orders.map(async (order) => {
        const orderObj = order.toObject();
        
        try {
          // Populate item details
          if (order.itemType === "crop") {
            const Crop = require("../models/Crop");
            const crop = await Crop.findById(order.itemId);
            orderObj.itemId = crop;
          } else if (order.itemType === "product" || order.itemType === "seed" || order.itemType === "pesticide") {
            const Product = require("../models/Product");
            const product = await Product.findById(order.itemId);
            orderObj.itemId = product;
          }

          // Populate buyer details for sellers
          if (order.buyerId && (currentUser.role === "seller" || currentUser.role === "farmer")) {
            const buyer = await User.findById(order.buyerId).select('name email phone');
            orderObj.buyerId = buyer;
          }

          // Populate seller details for buyers
          if (order.sellerId && currentUser.role === "buyer") {
            const seller = await User.findById(order.sellerId).select('name email phone');
            orderObj.sellerId = seller;
          }

          // Populate delivery information
          const Delivery = require("../models/Delivery");
          const delivery = await Delivery.findOne({ orderId: order._id })
            .populate('partnerId');
          orderObj.delivery = delivery;
        } catch (err) {
          console.log("Could not populate order details:", err.message);
          // Keep fields as is if population fails
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

// Communication routes for buyer-seller interaction
router.post("/:orderId/message", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const { orderId } = req.params;
    const { message, senderType } = req.body; // senderType: "buyer" or "seller"

    if (!message || !senderType) {
      return res.status(400).json({
        error: "Message and sender type are required",
        message: "Please provide message content and sender type"
      });
    }

    // Get order details
    const Order = require("../models/Order");
    const order = await Order.findById(orderId).populate('buyerId sellerId');
    
    if (!order) {
      return res.status(404).json({
        error: "Order not found",
        message: "Order not found"
      });
    }

    // Verify sender is either buyer or seller of this order
    const userId = req.userId;
    const isBuyer = order.buyerId._id.toString() === userId;
    const isSeller = order.sellerId && order.sellerId._id.toString() === userId;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        error: "Unauthorized",
        message: "You are not authorized to communicate about this order"
      });
    }

    // Create message
    const Message = require("../models/Message");
    const newMessage = new Message({
      orderId: orderId,
      senderId: userId,
      senderType: senderType,
      recipientId: isBuyer ? order.sellerId._id : order.buyerId._id,
      content: message,
      messageType: "order_communication"
    });

    await newMessage.save();

    // Send real-time notification via socket.io
    const io = require("../socket");
    io.to(order.buyerId._id.toString()).emit('newMessage', {
      orderId,
      senderId: userId,
      senderType,
      message: message,
      timestamp: new Date()
    });

    if (order.sellerId) {
      io.to(order.sellerId._id.toString()).emit('newMessage', {
        orderId,
        senderId: userId,
        senderType,
        message: message,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: "Message sent successfully"
    });

  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({
      error: "Failed to send message",
      message: error.message || "Failed to send message"
    });
  }
});

// Get messages for an order
router.get("/:orderId/messages", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const { orderId } = req.params;
    const userId = req.userId;

    // Get order details
    const Order = require("../models/Order");
    const order = await Order.findById(orderId).populate('buyerId sellerId');
    
    if (!order) {
      return res.status(404).json({
        error: "Order not found",
        message: "Order not found"
      });
    }

    // Verify user is either buyer or seller of this order
    const isBuyer = order.buyerId._id.toString() === userId;
    const isSeller = order.sellerId && order.sellerId._id.toString() === userId;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        error: "Unauthorized",
        message: "You are not authorized to view messages for this order"
      });
    }

    // Get messages
    const Message = require("../models/Message");
    const messages = await Message.find({ 
      orderId: orderId 
    })
    .populate('senderId', 'name email')
    .sort({ createdAt: 1 });

    res.json({
      success: true,
      messages,
      orderDetails: {
        orderId: order._id,
        status: order.status,
        isBuyer,
        isSeller
      }
    });

  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({
      error: "Failed to get messages",
      message: error.message || "Failed to retrieve messages"
    });
  }
});

// Update order status (for delivery partners)
router.put("/:id/status", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const { id } = req.params;
    const { status, location, notes } = req.body;

    // Get order and verify user is authorized
    const Order = require("../models/Order");
    const order = await Order.findById(id).populate('buyerId sellerId');
    
    if (!order) {
      return res.status(404).json({
        error: "Order not found",
        message: "Order not found"
      });
    }

    // Create status update event
    const Message = require("../models/Message");
    const statusMessage = new Message({
      orderId: id,
      senderId: req.userId, // Usually delivery partner or system
      senderType: "system",
      content: `Order status updated to: ${status}${location ? `. Location: ${location}` : ''}${notes ? `. Notes: ${notes}` : ''}`,
      messageType: "status_update",
      metadata: {
        oldStatus: order.status,
        newStatus: status,
        location,
        notes,
        updatedBy: req.userId
      }
    });

    await statusMessage.save();

    // Update order status
    await Order.findByIdAndUpdate(id, { 
      status,
      ...(location && { currentLocation: location }),
      ...(notes && { deliveryNotes: notes })
    });

    // Send real-time notification
    const io = require("../socket");
    io.to(order.buyerId._id.toString()).emit('orderStatusUpdate', {
      orderId: id,
      status,
      location,
      notes,
      timestamp: new Date()
    });

    if (order.sellerId) {
      io.to(order.sellerId._id.toString()).emit('orderStatusUpdate', {
        orderId: id,
        status,
        location,
        notes,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: "Order status updated successfully"
    });

  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({
      error: "Failed to update order status",
      message: error.message || "Failed to update order status"
    });
  }
});

module.exports = router;
