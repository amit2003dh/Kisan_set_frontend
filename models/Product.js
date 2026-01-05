// Product Model
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  sellerId: mongoose.Schema.Types.ObjectId,
  name: String,
  type: { type: String, enum: ["seed","pesticide"] },
  crop: String,
  price: Number,
  stock: Number,
  verified: { type: Boolean, default: false },
  image: String
}, {
  timestamps: true
});

module.exports = mongoose.model("Product", productSchema);
