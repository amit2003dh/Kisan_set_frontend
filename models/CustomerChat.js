// Customer Chat Model - For communication between sellers/farmers and customers
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderType: {
    type: String,
    enum: ["customer", "seller", "farmer"],
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  messageType: {
    type: String,
    enum: ["text", "image", "document", "location", "product_inquiry"],
    default: "text"
  },
  mediaUrl: String,
  timestamp: { type: Date, default: Date.now },
  readAt: Date,
  isEdited: { type: Boolean, default: false },
  editedAt: Date,
  reactions: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: String,
    timestamp: { type: Date, default: Date.now }
  }]
});

const customerChatSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'productType'
  },
  productType: {
    type: String,
    enum: ["Crop", "Product"]
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chatStatus: {
    type: String,
    enum: ["active", "archived", "blocked", "resolved"],
    default: "active"
  },
  lastMessage: messageSchema,
  unreadCounts: {
    customer: { type: Number, default: 0 },
    seller: { type: Number, default: 0 }
  },
  messages: [messageSchema],
  tags: [String],
  priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  subject: String,
  createdAt: { type: Date, default: Date.now },
  lastActivityAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes for efficient queries
customerChatSchema.index({ customerId: 1, sellerId: 1 });
customerChatSchema.index({ sellerId: 1, chatStatus: 1 });
customerChatSchema.index({ productId: 1, productType: 1 });
customerChatSchema.index({ lastActivityAt: -1 });

module.exports = mongoose.model("CustomerChat", customerChatSchema);
