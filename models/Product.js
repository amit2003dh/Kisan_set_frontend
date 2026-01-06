// Product Model
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
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ["seed","pesticide"], required: true },
  crop: String,
  price: { type: Number, required: true },
  stock: { type: Number, required: true, min: 0 },
  initialStock: { type: Number, required: true, min: 0 }, // Track original stock
  verified: { type: Boolean, default: false },
  image: String,
  images: [String], // Multiple images support
  description: String,
  brand: String,
  location: locationSchema,
  contactInfo: {
    phone: String,
    email: String,
    preferredContact: { type: String, enum: ["phone", "email", "whatsapp"], default: "phone" }
  },
  specifications: {
    weight: String,
    dimensions: String,
    shelfLife: String,
    usageInstructions: String,
    safetyInfo: String
  },
  certifications: [String],
  minimumOrder: { type: Number, default: 1 },
  deliveryOptions: {
    available: { type: Boolean, default: true },
    cost: Number,
    estimatedDays: Number
  },
  salesStats: {
    totalSold: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Product", productSchema);
