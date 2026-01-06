// Seller Analytics Model - For tracking seller/farmer performance
const mongoose = require("mongoose");

const dailyStatsSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  views: { type: Number, default: 0 },
  inquiries: { type: Number, default: 0 },
  orders: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  newCustomers: { type: Number, default: 0 },
  responseTime: { type: Number, default: 0 }, // in minutes
  conversionRate: { type: Number, default: 0 } // percentage
});

const sellerAnalyticsSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  sellerType: {
    type: String,
    enum: ["farmer", "seller"],
    required: true
  },
  totalProducts: { type: Number, default: 0 },
  activeProducts: { type: Number, default: 0 },
  soldProducts: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  totalCustomers: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  totalReviews: { type: Number, default: 0 },
  averageResponseTime: { type: Number, default: 0 }, // in minutes
  conversionRate: { type: Number, default: 0 }, // percentage
  dailyStats: [dailyStatsSchema],
  weeklyStats: {
    week: String, // YYYY-WW format
    views: { type: Number, default: 0 },
    inquiries: { type: Number, default: 0 },
    orders: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    newCustomers: { type: Number, default: 0 }
  },
  monthlyStats: {
    month: String, // YYYY-MM format
    views: { type: Number, default: 0 },
    inquiries: { type: Number, default: 0 },
    orders: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    newCustomers: { type: Number, default: 0 }
  },
  topProducts: [{
    productId: { type: mongoose.Schema.Types.ObjectId, refPath: 'productType' },
    productType: { type: String, enum: ["Crop", "Product"] },
    sales: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    views: { type: Number, default: 0 }
  }],
  customerDemographics: {
    cities: [String],
    states: [String],
    orderFrequency: {
      oneTime: { type: Number, default: 0 },
      repeat: { type: Number, default: 0 }
    }
  },
  performanceMetrics: {
    listingQuality: { type: Number, default: 0 }, // 0-100
    customerSatisfaction: { type: Number, default: 0 }, // 0-100
    deliveryTime: { type: Number, default: 0 }, // in days
    returnRate: { type: Number, default: 0 } // percentage
  },
  lastUpdated: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes for efficient queries
sellerAnalyticsSchema.index({ sellerId: 1 });
sellerAnalyticsSchema.index({ sellerType: 1 });
sellerAnalyticsSchema.index({ "dailyStats.date": -1 });

module.exports = mongoose.model("SellerAnalytics", sellerAnalyticsSchema);
