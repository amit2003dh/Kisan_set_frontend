// Delivery Model
const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  currentLocation: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    status: { type: String, default: "In Transit" }
  },
  status: { type: String, default: "Assigned" },
  destination: {
    lat: Number,
    lng: Number,
    address: String
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field on save
deliverySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Delivery", deliverySchema);
