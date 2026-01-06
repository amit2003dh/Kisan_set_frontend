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
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional - for product orders
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  itemType: { type: String, enum: ["crop","product", "seed", "pesticide"], required: true },
  quantity: { type: Number, required: true, default: 1 },
  price: { type: Number, required: true },
  total: { type: Number, required: true },
  status: { type: String, default: "Pending", enum: ["Pending", "Confirmed", "Out for Delivery", "Delivered", "Cancelled"] },
  paymentId: String,
  paymentMethod: { type: String, enum: ["ONLINE", "COD"] },
  deliveryAddress: addressSchema,
  orderItems: [{ type: mongoose.Schema.Types.Mixed }], // Store individual cart items for reference
  currentLocation: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
    status: { type: String, default: "Confirmed" },
    lastUpdated: { type: Date, default: Date.now }
  },
  deliveryNotes: { type: String },
  estimatedDelivery: { type: Date },
  actualDelivery: { type: Date }
}, {
  timestamps: true
});

module.exports = mongoose.model("Order", orderSchema);
