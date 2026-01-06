// Product Tracker Model - For sellers and farmers to track their products
const mongoose = require("mongoose");

const trackingEventSchema = new mongoose.Schema({
  eventType: {
    type: String,
    enum: ["created", "updated", "viewed", "inquired", "ordered", "payment_received", "shipped", "delivered", "cancelled"],
    required: true
  },
  timestamp: { type: Date, default: Date.now },
  description: String,
  metadata: {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    quantity: Number,
    price: Number,
    notes: String
  }
});

const productTrackerSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'productType'
  },
  productType: {
    type: String,
    enum: ["Crop", "Product"],
    required: true
  },
  sellerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  currentStatus: {
    type: String,
    enum: ["available", "reserved", "sold", "shipped", "delivered", "out_of_stock"],
    default: "available"
  },
  totalViews: { type: Number, default: 0 },
  totalInquiries: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  trackingEvents: [trackingEventSchema],
  lastUpdated: { type: Date, default: Date.now },
  notes: String,
  tags: [String],
  priority: { type: String, enum: ["low", "medium", "high"], default: "medium" }
}, {
  timestamps: true
});

// Index for efficient queries
productTrackerSchema.index({ sellerId: 1, productType: 1 });
productTrackerSchema.index({ productId: 1, productType: 1 });
productTrackerSchema.index({ currentStatus: 1 });

module.exports = mongoose.model("ProductTracker", productTrackerSchema);
