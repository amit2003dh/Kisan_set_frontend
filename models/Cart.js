// Cart Model
const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true, 
    unique: true,
    ref: "User"
  },
  items: [{
    itemId: mongoose.Schema.Types.ObjectId,
    type: { type: String, enum: ["crop", "seed", "pesticide"] },
    name: String,
    price: Number,
    quantity: Number,
    stock: Number, // For products
    availableQuantity: Number, // For crops (original quantity)
    image: String
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model("Cart", cartSchema);


