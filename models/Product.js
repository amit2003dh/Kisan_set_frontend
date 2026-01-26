// Product Model (Seeds / Pesticides / Fertilizers / Equipment)
const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
  address: { type: String, required: true },
  city: String,
  state: String,
  pincode: String,
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  landmark: String
});

const productSchema = new mongoose.Schema({
  // 🔗 Seller info
  sellerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },

  // 📦 Product core details
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ["seed", "pesticide", "fertilizer", "equipment"],
    required: true
  },

  category: String,
  brand: String,

  // 💰 Pricing & inventory
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
  minimumOrder: { type: Number, default: 1 },

  // 🖼 Images (same idea as Crop but multiple allowed)
  images: {
    type: [String],
    default: []
  },

  // 📝 Description & usage
  description: String,
  usageInstructions: String,
  suitableCrops: [String], // eg: ["wheat", "rice"]

  // 🧪 Extra product metadata
  composition: String, // esp. for pesticides/fertilizers
  expiryDate: Date,
  batchNumber: String,

  // 📍 Seller location
  location: locationSchema,

  // 📞 Contact info
  contactInfo: {
    phone: String,
    email: String,
    preferredContact: {
      type: String,
      enum: ["phone", "email", "whatsapp"],
      default: "phone"
    }
  },

  // ⭐ Quality & status
  qualityGrade: {
    type: String,
    enum: ["A", "B", "C"],
    default: "A"
  },

  status: {
    type: String,
    enum: ["Available", "Out of Stock", "Discontinued"],
    default: "Available"
  },

  // 📊 Sales stats (VERY IMPORTANT for dashboard)
  salesStats: {
    totalSold: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 }
  }

}, {
  timestamps: true
});

module.exports = mongoose.model("Product", productSchema);
