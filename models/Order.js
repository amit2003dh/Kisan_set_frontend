// Order Model
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  buyerId: mongoose.Schema.Types.ObjectId,
  itemId: mongoose.Schema.Types.ObjectId,
  itemType: { type: String, enum: ["crop","product", "seed", "pesticide"] },
  quantity: Number,
  price: Number,
  total: Number,
  status: { type: String, default: "Pending" },
  paymentId: String
}, {
  timestamps: true
});

module.exports = mongoose.model("Order", orderSchema);
