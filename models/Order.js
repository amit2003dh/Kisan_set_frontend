// Order Model
const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  address: { type: String, required: true },
  city: String,
  state: String,
  pincode: String,
  lat: Number,
  lng: Number
});

const orderSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  itemType: { type: String, enum: ["crop","product", "seed", "pesticide"], required: true },
  quantity: { type: Number, required: true, default: 1 },
  price: { type: Number, required: true },
  total: { type: Number, required: true },
  status: { type: String, default: "Pending", enum: ["Pending", "Confirmed", "Out for Delivery", "Delivered", "Cancelled"] },
  paymentId: String,
  deliveryAddress: addressSchema
}, {
  timestamps: true
});

module.exports = mongoose.model("Order", orderSchema);
