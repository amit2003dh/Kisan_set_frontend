// Models Index - Register all Mongoose models
// This ensures all schemas are registered when the application starts

const User = require('./User');
const Crop = require('./Crop');
const Product = require('./Product');
const Order = require('./Order');
const Delivery = require('./Delivery');
const Cart = require('./Cart');
const ProductTracker = require('./ProductTracker');
const CustomerChat = require('./CustomerChat');
const SellerAnalytics = require('./SellerAnalytics');

module.exports = {
  User,
  Crop,
  Product,
  Order,
  Delivery,
  Cart,
  ProductTracker,
  CustomerChat,
  SellerAnalytics
};
