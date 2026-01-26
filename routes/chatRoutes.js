// Customer Chat Routes - For communication between sellers/farmers and customers
const router = require("express").Router();
const CustomerChat = require("../models/CustomerChat");
const ProductTracker = require("../models/ProductTracker");
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/auth");
const { isUserOnline } = require("../server");

// Get all chats for a seller/farmer
router.get("/my-chats", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const userRole = req.user.role;
    let query = {};

    if (userRole === "farmer" || userRole === "seller") {
      query.sellerId = req.userId;
    } else {
      query.customerId = req.userId;
    }

    const chats = await CustomerChat.find(query)
      .sort({ lastActivityAt: -1 })
      .populate('customerId', 'name email profilePhoto')
      .populate('sellerId', 'name email profilePhoto')
      .populate('productId')
      .populate('orderId');

    res.json(chats);
  } catch (error) {
    console.error("Get chats error:", error);
    res.status(500).json({
      error: "Failed to fetch chats",
      message: error.message || "Failed to retrieve chats"
    });
  }
});

// Get specific chat details
router.get("/:chatId", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const chat = await CustomerChat.findOne({
      _id: req.params.chatId,
      $or: [{ customerId: req.userId }, { sellerId: req.userId }]
    })
      .populate('customerId', 'name email profilePhoto')
      .populate('sellerId', 'name email profilePhoto')
      .populate('productId')
      .populate('orderId');

    if (!chat) {
      return res.status(404).json({
        error: "Chat not found",
        message: "Chat not found or access denied"
      });
    }

    res.json(chat);
  } catch (error) {
    console.error("Get chat error:", error);
    res.status(500).json({
      error: "Failed to fetch chat",
      message: error.message || "Failed to retrieve chat"
    });
  }
});

// Start new chat
router.post("/start", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const { productId, productType, orderId, subject, initialMessage } = req.body;

    // Find the seller of the product
    let seller;
    if (productType === "Crop") {
      const Crop = require("../models/Crop");
      const crop = await Crop.findById(productId).populate('sellerId');
      seller = crop.sellerId;
    } else {
      const Product = require("../models/Product");
      const product = await Product.findById(productId).populate('sellerId');
      seller = product.sellerId;
    }

    if (!seller) {
      return res.status(404).json({
        error: "Product not found",
        message: "Product not found"
      });
    }

    // Check if chat already exists
    let chat = await CustomerChat.findOne({
      productId,
      productType,
      customerId: req.userId,
      sellerId: seller._id
    });

    if (!chat) {
      // Create new chat
      chat = new CustomerChat({
        productId,
        productType,
        orderId,
        customerId: req.userId,
        sellerId: seller._id,
        subject: subject || `Inquiry about ${productType}`,
        chatStatus: "active"
      });
    }

    // Add initial message if provided
    if (initialMessage) {
      const message = {
        senderId: req.userId,
        senderType: "customer",
        content: initialMessage,
        messageType: "text",
        timestamp: new Date()
      };

      chat.messages.push(message);
      chat.lastMessage = message;
      chat.unreadCounts.seller += 1;
    }

    chat.lastActivityAt = new Date();
    await chat.save();

    // Add tracking event
    await ProductTracker.findOneAndUpdate(
      { productId, productType, sellerId: seller._id },
      {
        $inc: { totalInquiries: 1 },
        $push: {
          trackingEvents: {
            eventType: "inquired",
            description: "Customer sent inquiry",
            metadata: { customerId: req.userId }
          }
        }
      },
      { upsert: true }
    );

    const populatedChat = await CustomerChat.findById(chat._id)
      .populate('customerId', 'name email profilePhoto')
      .populate('sellerId', 'name email profilePhoto')
      .populate('productId');

    res.json(populatedChat);
  } catch (error) {
    console.error("Start chat error:", error);
    res.status(500).json({
      error: "Failed to start chat",
      message: error.message || "Failed to start chat"
    });
  }
});

// Send message
router.post("/:chatId/message", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const { content, messageType = "text", mediaUrl } = req.body;

    const chat = await CustomerChat.findOne({
      _id: req.params.chatId,
      $or: [{ customerId: req.userId }, { sellerId: req.userId }]
    });

    if (!chat) {
      return res.status(404).json({
        error: "Chat not found",
        message: "Chat not found or access denied"
      });
    }

    // Determine sender type and recipient
    const senderType = chat.customerId.toString() === req.userId ? "customer" : 
                      chat.sellerId.toString() === req.userId ? "seller" : "farmer";
    const recipientId = chat.customerId.toString() === req.userId ? chat.sellerId : chat.customerId;
    const isRecipientOnline = isUserOnline(recipientId.toString());

    const message = {
      senderId: req.userId,
      senderType,
      content,
      messageType,
      mediaUrl,
      timestamp: new Date(),
      delivered: isRecipientOnline, // Mark as delivered if recipient is online
      read: false
    };

    chat.messages.push(message);
    chat.lastMessage = message;
    chat.lastActivityAt = new Date();

    // Update unread counts
    if (senderType === "customer") {
      chat.unreadCounts.seller += 1;
    } else {
      chat.unreadCounts.customer += 1;
    }

    await chat.save();

    // Emit socket event for real-time delivery
    const io = require("../server").io;
    
    // Send to chat room
    io.to(req.params.chatId).emit("newMessage", {
      chatId: req.params.chatId,
      message: {
        ...message,
        senderOnline: true, // Sender is obviously online
        recipientOnline: isRecipientOnline
      }
    });

    // Send direct notification to recipient if online
    if (isRecipientOnline) {
      io.to(`user_${recipientId}`).emit("newMessageNotification", {
        chatId: req.params.chatId,
        message,
        senderId: req.userId,
        senderType
      });
    }

    // If recipient is offline, mark message as pending delivery
    if (!isRecipientOnline) {
      // Store in offline messages queue (could be implemented with Redis or database)
      console.log(`Message stored for offline user ${recipientId}`);
    }

    res.json({ 
      success: true, 
      message: {
        ...message,
        recipientOnline: isRecipientOnline,
        delivered: isRecipientOnline
      }
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({
      error: "Failed to send message",
      message: error.message || "Failed to send message"
    });
  }
});

// Mark messages as read
router.put("/:chatId/read", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const chat = await CustomerChat.findOne({
      _id: req.params.chatId,
      $or: [{ customerId: req.userId }, { sellerId: req.userId }]
    });

    if (!chat) {
      return res.status(404).json({
        error: "Chat not found",
        message: "Chat not found or access denied"
      });
    }

    const isCustomer = chat.customerId.toString() === req.userId;
    const unreadField = isCustomer ? "customer" : "seller";

    // Mark unread messages as read
    chat.messages.forEach(message => {
      if (message.senderId.toString() !== req.userId && !message.readAt) {
        message.readAt = new Date();
      }
    });

    chat.unreadCounts[unreadField] = 0;
    await chat.save();

    res.json({ success: true, unreadCount: 0 });
  } catch (error) {
    console.error("Mark messages read error:", error);
    res.status(500).json({
      error: "Failed to mark messages as read",
      message: error.message || "Failed to mark messages as read"
    });
  }
});

// Update chat status
router.put("/:chatId/status", authMiddleware, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database not connected",
        message: "MongoDB is not connected. Please check your database connection."
      });
    }

    const { chatStatus } = req.body;

    const chat = await CustomerChat.findOneAndUpdate(
      {
        _id: req.params.chatId,
        $or: [{ customerId: req.userId }, { sellerId: req.userId }]
      },
      { chatStatus },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({
        error: "Chat not found",
        message: "Chat not found or access denied"
      });
    }

    res.json(chat);
  } catch (error) {
    console.error("Update chat status error:", error);
    res.status(500).json({
      error: "Failed to update chat status",
      message: error.message || "Failed to update chat status"
    });
  }
});

module.exports = router;
