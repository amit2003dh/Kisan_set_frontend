// Delivery Model
const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPartner' },
  assignedAt: { type: Date },
  pickedUpAt: { type: Date },
  deliveredAt: { type: Date },
  currentLocation: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    status: { type: String, default: "Assigned" },
    lastUpdated: { type: Date, default: Date.now }
  },
  status: { 
    type: String, 
    enum: ["Assigned", "Picked Up", "In Transit", "Delivered", "Failed"], 
    default: "Assigned" 
  },
  destination: {
    lat: Number,
    lng: Number,
    address: String,
    city: String,
    state: String,
    pincode: String
  },
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date,
  deliveryNotes: String,
  deliveryProof: {
    photo: String,
    signature: String,
    recipientName: String,
    timestamp: Date
  }
}, {
  timestamps: true
});

// Update the updatedAt field on save
deliverySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Delivery", deliverySchema);
