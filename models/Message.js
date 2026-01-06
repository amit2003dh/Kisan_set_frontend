// Message Model
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderType: { type: String, enum: ['buyer', 'seller', 'system'], required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  messageType: { type: String, enum: ['order_communication', 'status_update', 'delivery_update'], required: true },
  metadata: { type: mongoose.Schema.Types.Mixed }, // For additional data like location, status changes, etc.
  read: { type: Boolean, default: false },
  readAt: { type: Date }
}, {
  timestamps: true
});

module.exports = mongoose.model("Message", messageSchema);
