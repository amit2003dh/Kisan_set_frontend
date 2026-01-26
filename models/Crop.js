// Crop Model
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

const cropSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  harvestDate: { type: Date, required: true },
  status: { type: String, default: "Available", enum: ["Available", "Sold", "Reserved"] },
  image: String, // Single image field only
  description: String,
  category: String,
  location: locationSchema,
  contactInfo: {
    phone: String,
    email: String,
    preferredContact: { type: String, enum: ["phone", "email", "whatsapp"], default: "phone" }
  },
  qualityGrade: { type: String, enum: ["A", "B", "C"], default: "A" },
  availableUntil: Date,
  minimumOrder: { type: Number, default: 1 }
}, {
  timestamps: true
});

module.exports = mongoose.model("Crop", cropSchema);
