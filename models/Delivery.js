// Delivery Model
const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema({
  orderId: mongoose.Schema.Types.ObjectId,
  partnerId: mongoose.Schema.Types.ObjectId,
  currentLocation: String,
  status: { type: String, default: "Assigned" }
});

module.exports = mongoose.model("Delivery", deliverySchema);
