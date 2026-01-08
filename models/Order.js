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
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Made required for better tracking
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
  
  // Order type classification
  orderType: { 
    type: String, 
    enum: ["crop_sale", "product_purchase"], 
    required: true 
  },
  
  // Seller information (who sold the item)
  sellerInfo: {
    name: { type: String },
    phone: { type: String },
    email: { type: String },
    businessName: { type: String }
  },
  
  // Buyer information (who bought the item)
  buyerInfo: {
    name: { type: String },
    phone: { type: String },
    email: { type: String },
    deliveryAddress: addressSchema
  },
  
  // Delivery partner information
  deliveryPartnerInfo: {
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPartner' },
    name: { type: String },
    phone: { type: String },
    currentLocation: {
      lat: { type: Number },
      lng: { type: Number },
      status: { type: String }
    }
  },
  
  // Order timeline for tracking
  orderTimeline: [{
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    notes: { type: String },
    updatedBy: { type: String } // buyer, seller, delivery_partner, system
  }],
  
  // Delivery information
  deliveryInfo: {
    status: { type: String, default: "Pending", enum: ["Pending", "Confirmed", "Picked Up", "In Transit", "Delivered", "Failed"] },
    estimatedDelivery: { type: Date },
    actualDelivery: { type: Date },
    trackingNumber: { type: String },
    deliveryNotes: { type: String },
    pickupAddress: addressSchema,
    deliveryAddress: addressSchema
  },
  
  // Payment information
  paymentInfo: {
    status: { type: String, enum: ["Pending", "Completed", "Failed", "Refunded"] },
    amount: { type: Number },
    method: { type: String },
    transactionId: { type: String },
    paidAt: { type: Date }
  },
  
  
}, {timestamps: true});

module.exports = mongoose.model("Order", orderSchema);
