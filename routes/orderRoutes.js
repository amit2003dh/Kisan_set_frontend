const router = require("express").Router();
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/auth");

const Order = require("../models/Order");
const Product = require("../models/Product");
const Crop = require("../models/Crop");
const User = require("../models/User");
const Delivery = require("../models/Delivery");
const Message = require("../models/Message");

/* ---------------------------------------------------
   CREATE SINGLE ORDER
--------------------------------------------------- */
router.post("/create", authMiddleware, async (req, res) => {
  try {
    console.log("🛒 CREATE ORDER - Starting order creation");
    console.log("🔍 Request body:", req.body);
    console.log("🔍 User ID from auth:", req.userId);
    console.log("🔍 User ID from body:", req.body.buyerId);
    console.log("🔍 User:", req.user);
    
    const { itemId, itemType, quantity = 1, price, deliveryAddress, paymentMethod, buyerId: bodyBuyerId } = req.body;

    // Use buyerId from body if provided, otherwise use from auth
    const finalBuyerId = bodyBuyerId || req.userId;
    console.log("🔍 Final buyer ID:", finalBuyerId);

    // Validate required fields
    if (!itemId || !itemType || !price) {
      console.error("❌ Missing required fields:", { itemId, itemType, price });
      return res.status(400).json({ 
        error: "Missing required fields",
        required: ["itemId", "itemType", "price"],
        received: { itemId, itemType, price }
      });
    }

    let sellerId;
    let pickupAddress;
    let actualPrice; // Get actual price from product/crop
    let availableQuantity; // Get available quantity for decrease

    if (itemType === "crop") {
      console.log("🌾 Looking up crop:", itemId);
      const crop = await Crop.findById(itemId);
      sellerId = crop?.sellerId;
      pickupAddress = crop?.location; // Get pickup location from crop
      actualPrice = crop?.price; // Get actual price from crop
      availableQuantity = crop?.quantity; // Get available quantity
      console.log("🌾 Crop found:", crop ? "YES" : "NO");
      console.log("🌾 Seller ID:", sellerId);
      console.log("🌾 Pickup location:", pickupAddress);
      console.log("🌾 Actual price:", actualPrice);
      console.log("🌾 Available quantity:", availableQuantity);
    } else {
      console.log("📦 Looking up product:", itemId);
      const product = await Product.findById(itemId);
      sellerId = product?.sellerId;
      pickupAddress = product?.location; // Get pickup location from product
      actualPrice = product?.price; // Get actual price from product
      availableQuantity = product?.stock; // Get available stock
      console.log("📦 Product found:", product ? "YES" : "NO");
      console.log("📦 Seller ID:", sellerId);
      console.log("📦 Pickup location:", pickupAddress);
      console.log("📦 Actual price:", actualPrice);
      console.log("📦 Available stock:", availableQuantity);
    }

    // Use actual price from product/crop instead of request body price
    const finalPrice = actualPrice || price;
    console.log("🔍 Final price used:", finalPrice);

    // Check if enough quantity is available
    if (availableQuantity !== undefined && availableQuantity < quantity) {
      console.error("❌ Insufficient quantity available:", {
        requested: quantity,
        available: availableQuantity
      });
      return res.status(400).json({ 
        error: "Insufficient quantity available",
        requested: quantity,
        available: availableQuantity
      });
    }
    if (!sellerId) {
      console.error("❌ Seller not found for item:", itemId);
      return res.status(400).json({ error: "Seller not found" });
    }

    console.log("✅ Creating order with data:", {
      buyerId: finalBuyerId,
      sellerId,
      orderType: itemType === "crop" ? "crop_purchase" : "product_purchase",
      items: [{
        itemId,
        itemType,
        name: req.body.name || "Item",
        quantity,
        price: finalPrice // Use actual price from product/crop
      }],
      total: quantity * finalPrice, // Use actual price for total
      status: "Confirmed",
      paymentMethod: paymentMethod || "COD",
      deliveryInfo: {
        deliveryAddress,
        pickupAddress: pickupAddress, // Use actual pickup location from product/crop
        currentLocation: pickupAddress ? {
          lat: pickupAddress.lat || 0,
          lng: pickupAddress.lng || 0
        } : { lat: 0, lng: 0 } // Initially set to pickup location
      },
      orderTimeline: [{
        status: "Confirmed",
        timestamp: new Date()
      }]
    });

    const order = await Order.create({
      buyerId: finalBuyerId,
      sellerId,
      orderType: itemType === "crop" ? "crop_purchase" : "product_purchase",
      items: [{
        itemId,
        itemType,
        name: req.body.name || "Item",
        quantity,
        price: finalPrice // Use actual price from product/crop
      }],
      total: quantity * finalPrice, // Use actual price for total
      status: "Confirmed",
      paymentMethod: paymentMethod || "COD",
      deliveryInfo: {
        deliveryAddress,
        pickupAddress: pickupAddress, // Use actual pickup location from product/crop
        currentLocation: pickupAddress ? {
          lat: pickupAddress.lat || 0,
          lng: pickupAddress.lng || 0
        } : { lat: 0, lng: 0 } // Initially set to pickup location
      },
      orderTimeline: [{
        status: "Confirmed",
        timestamp: new Date()
      }]
    });

    // If this is a crop purchase, also create a crop_sale order for the seller
    if (itemType === "crop") {
      const sellerOrder = await Order.create({
        buyerId: finalBuyerId,
        sellerId,
        orderType: "crop_sale",
        items: [{
          itemId,
          itemType,
          name: req.body.name || "Item",
          quantity,
          price: finalPrice
        }],
        total: quantity * finalPrice,
        status: "Confirmed",
        paymentMethod: paymentMethod || "COD",
        deliveryInfo: {
          deliveryAddress,
          pickupAddress: pickupAddress,
          currentLocation: pickupAddress ? {
            lat: pickupAddress.lat || 0,
            lng: pickupAddress.lng || 0
          } : { lat: 0, lng: 0 }
        },
        orderTimeline: [{
          status: "Confirmed",
          timestamp: new Date()
        }]
      });
      
      console.log("✅ Created seller crop_sale order:", sellerOrder._id);
    }

    // Decrease quantity/stock after successful order creation
    if (itemType === "crop") {
      console.log("🌾 Decreasing crop quantity:", { itemId, quantity });
      await Crop.findByIdAndUpdate(itemId, { 
        $inc: { 
          quantity: -quantity,
          "salesStats.totalSold": quantity,
          "salesStats.totalRevenue": quantity * finalPrice
        }
      });
      console.log("✅ Crop quantity and sales stats updated successfully");
    } else {
      console.log("📦 Decreasing product stock:", { itemId, quantity });
      await Product.findByIdAndUpdate(itemId, { 
        $inc: { 
          stock: -quantity,
          "salesStats.totalSold": quantity,
          "salesStats.totalRevenue": quantity * finalPrice
        }
      });
      console.log("✅ Product stock and sales stats updated successfully");
    }

    console.log("✅ Order created successfully:", order._id);
    console.log("🔍 Order details:", {
      id: order._id,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      orderType: order.orderType,
      total: order.total,
      status: order.status,
      currentLocation: order.deliveryInfo.currentLocation,
      pickupLocation: order.deliveryInfo.pickupAddress
    });

    await Delivery.create({
      orderId: order._id,
      status: "Assigned",
      destination: deliveryAddress
    });

    console.log("✅ Delivery created for order:", order._id);

    res.json({ success: true, order });

  } catch (err) {
    console.error("❌ CREATE ORDER ERROR:", err);
    console.error("❌ Error name:", err.name);
    console.error("❌ Error message:", err.message);
    if (err.errors) {
      console.error("❌ Validation errors:", err.errors);
      Object.keys(err.errors).forEach(key => {
        console.error(`  - ${key}:`, err.errors[key].message);
      });
    }
    res.status(500).json({ error: err.message });
  }
});

/* ---------------------------------------------------
   CREATE ORDERS FROM CART
--------------------------------------------------- */
router.post("/create-from-cart", authMiddleware, async (req, res) => {
  try {
    console.log("🛒 CREATE FROM CART - Starting cart order creation");
    console.log("🔍 Request body:", req.body);
    console.log("🔍 User ID from auth:", req.userId);
    console.log("🔍 User ID from body:", req.body.buyerId);
    console.log("🔍 User:", req.user);
    
    const { items, deliveryAddress, paymentMethod, buyerId: bodyBuyerId } = req.body;
    
    // Use buyerId from body if provided, otherwise use from auth
    const finalBuyerId = bodyBuyerId || req.userId;
    console.log("🔍 Final buyer ID:", finalBuyerId);

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error("❌ Invalid cart items:", items);
      return res.status(400).json({ 
        error: "Invalid cart items",
        message: "Cart items are required and must be an array"
      });
    }

    console.log("📦 Processing", items.length, "cart items");

    const orders = [];

    for (const item of items) {
      console.log("🔄 Processing item:", item);
      
      let sellerId;
      let pickupAddress;
      let actualPrice; // Get actual price from product/crop
      let availableQuantity; // Get available quantity for decrease

      if (item.type === "crop") {
        console.log("🌾 Looking up crop:", item._id);
        const crop = await Crop.findById(item._id);
        sellerId = crop?.sellerId;
        pickupAddress = crop?.location; // Get pickup location from crop
        actualPrice = crop?.price; // Get actual price from crop
        availableQuantity = crop?.quantity; // Get available quantity
        console.log("🌾 Crop found:", crop ? "YES" : "NO");
        console.log("🌾 Seller ID:", sellerId);
        console.log("🌾 Pickup location:", pickupAddress);
        console.log("🌾 Actual price:", actualPrice);
        console.log("🌾 Available quantity:", availableQuantity);
      } else {
        console.log("📦 Looking up product:", item._id);
        const product = await Product.findById(item._id);
        sellerId = product?.sellerId;
        pickupAddress = product?.location; // Get pickup location from product
        actualPrice = product?.price; // Get actual price from product
        availableQuantity = product?.stock; // Get available stock
        console.log("📦 Product found:", product ? "YES" : "NO");
        console.log("📦 Seller ID:", sellerId);
        console.log("📦 Pickup location:", pickupAddress);
        console.log("📦 Actual price:", actualPrice);
        console.log("📦 Available stock:", availableQuantity);
      }

      // Use actual price from product/crop instead of cart price
      const finalPrice = actualPrice || item.price;
      console.log("🔍 Final price used for item:", finalPrice);

      // Check if enough quantity is available
      if (availableQuantity !== undefined && availableQuantity < item.quantity) {
        console.error("❌ Insufficient quantity available for item:", {
          itemId: item._id,
          requested: item.quantity,
          available: availableQuantity
        });
        continue; // Skip this item but continue with others
      }

      if (!sellerId) {
        console.error("❌ Seller not found for item:", item._id);
        continue; // Skip this item but continue with others
      }

      console.log("✅ Creating order for item:", {
        buyerId: finalBuyerId,
        sellerId,
        orderType: item.type === "crop" ? "crop_purchase" : "product_purchase",
        items: [{
          itemId: item._id,
          itemType: item.type,
          name: item.name,
          quantity: item.quantity,
          price: finalPrice // Use actual price from product/crop
        }],
        total: item.quantity * finalPrice, // Use actual price for total
        status: "Confirmed",
        paymentMethod: paymentMethod || "COD",
        deliveryInfo: {
          deliveryAddress,
          pickupAddress: pickupAddress, // Use actual pickup location from product/crop
          currentLocation: pickupAddress ? {
            lat: pickupAddress.lat || 0,
            lng: pickupAddress.lng || 0
          } : { lat: 0, lng: 0 } // Initially set to pickup location
        },
        orderTimeline: [{
          status: "Confirmed",
          timestamp: new Date()
        }]
      });

      const order = await Order.create({
        buyerId: finalBuyerId,
        sellerId,
        orderType: item.type === "crop" ? "crop_purchase" : "product_purchase",
        items: [{
          itemId: item._id,
          itemType: item.type,
          name: item.name,
          quantity: item.quantity,
          price: finalPrice // Use actual price from product/crop
        }],
        total: item.quantity * finalPrice, // Use actual price for total
        status: "Confirmed",
        paymentMethod: paymentMethod || "COD",
        deliveryInfo: {
          deliveryAddress,
          pickupAddress: pickupAddress, // Use actual pickup location from product/crop
          currentLocation: pickupAddress ? {
            lat: pickupAddress.lat || 0,
            lng: pickupAddress.lng || 0
          } : { lat: 0, lng: 0 } // Initially set to pickup location
        },
        orderTimeline: [{
          status: "Confirmed",
          timestamp: new Date()
        }]
      });

      // If this is a crop purchase, also create a crop_sale order for the seller
      if (item.type === "crop") {
        const sellerOrder = await Order.create({
          buyerId: finalBuyerId,
          sellerId,
          orderType: "crop_sale",
          items: [{
            itemId: item._id,
            itemType: item.type,
            name: item.name,
            quantity: item.quantity,
            price: finalPrice
          }],
          total: item.quantity * finalPrice,
          status: "Confirmed",
          paymentMethod: paymentMethod || "COD",
          deliveryInfo: {
            deliveryAddress,
            pickupAddress: pickupAddress,
            currentLocation: pickupAddress ? {
              lat: pickupAddress.lat || 0,
              lng: pickupAddress.lng || 0
            } : { lat: 0, lng: 0 }
          },
          orderTimeline: [{
            status: "Confirmed",
            timestamp: new Date()
          }]
        });
        
        console.log("✅ Created seller crop_sale order from cart:", sellerOrder._id);
      }

      // Decrease quantity/stock after successful order creation
      if (item.type === "crop") {
        console.log("🌾 Decreasing crop quantity:", { itemId: item._id, quantity: item.quantity });
        await Crop.findByIdAndUpdate(item._id, { 
          $inc: { 
            quantity: -item.quantity,
            "salesStats.totalSold": item.quantity,
            "salesStats.totalRevenue": item.quantity * finalPrice
          }
        });
        console.log("✅ Crop quantity and sales stats updated successfully");
      } else {
        console.log("📦 Decreasing product stock:", { itemId: item._id, quantity: item.quantity });
        await Product.findByIdAndUpdate(item._id, { 
          $inc: { 
            stock: -item.quantity,
            "salesStats.totalSold": item.quantity,
            "salesStats.totalRevenue": item.quantity * finalPrice
          }
        });
        console.log("✅ Product stock and sales stats updated successfully");
      }

      console.log("✅ Order created successfully:", order._id);

      await Delivery.create({
        orderId: order._id,
        status: "Assigned",
        destination: deliveryAddress
      });

      console.log("✅ Delivery created for order:", order._id);

      orders.push(order);
    }

    console.log("📦 Total orders created:", orders.length);

    res.json({ success: true, orders });
  } catch (err) {
    console.error("❌ CREATE FROM CART ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* -------------------- ASSIGN DELIVERY PARTNER -------------------- */

router.put("/:orderId/assign-delivery-partner", authMiddleware, async (req, res) => {
  try {
    console.log("🚚 ASSIGN DELIVERY PARTNER - Starting assignment");
    console.log("🔍 Order ID:", req.params.orderId);
    console.log("🔍 Request body:", req.body);
    
    const { deliveryPartnerId, partnerLocation } = req.body;
    
    if (!deliveryPartnerId) {
      return res.status(400).json({ error: "Delivery partner ID is required" });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    console.log("🔍 Current order location:", order.deliveryInfo.currentLocation);
    console.log("🚚 Partner location:", partnerLocation);

    // Update order with delivery partner and their current location
    order.deliveryInfo.deliveryPartnerId = deliveryPartnerId;
    
    // Update currentLocation to delivery partner's location when assigned
    if (partnerLocation && partnerLocation.lat && partnerLocation.lng) {
      order.deliveryInfo.currentLocation = {
        lat: partnerLocation.lat,
        lng: partnerLocation.lng
      };
      console.log("✅ Updated current location to partner location:", order.deliveryInfo.currentLocation);
    }

    // Add to order timeline
    order.orderTimeline.push({
      status: "Delivery Partner Assigned",
      timestamp: new Date()
    });

    await order.save();

    console.log("✅ Delivery partner assigned successfully");
    console.log("🔍 Updated order:", {
      id: order._id,
      deliveryPartnerId: order.deliveryInfo.deliveryPartnerId,
      currentLocation: order.deliveryInfo.currentLocation,
      timelineStatus: order.orderTimeline[order.orderTimeline.length - 1].status
    });

    res.json({ 
      success: true, 
      order,
      message: "Delivery partner assigned successfully" 
    });

  } catch (err) {
    console.error("❌ ASSIGN DELIVERY PARTNER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* -------------------- UPDATE DELIVERY LOCATION -------------------- */

router.put("/:orderId/update-location", authMiddleware, async (req, res) => {
  try {
    console.log("📍 UPDATE DELIVERY LOCATION - Starting location update");
    console.log("🔍 Order ID:", req.params.orderId);
    console.log("🔍 Request body:", req.body);
    
    const { currentLocation } = req.body;
    
    if (!currentLocation || !currentLocation.lat || !currentLocation.lng) {
      return res.status(400).json({ error: "Current location (lat, lng) is required" });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    console.log("🔍 Previous location:", order.deliveryInfo.currentLocation);
    console.log("📍 New location:", currentLocation);

    // Update current location
    order.deliveryInfo.currentLocation = {
      lat: currentLocation.lat,
      lng: currentLocation.lng
    };

    await order.save();

    console.log("✅ Location updated successfully");
    console.log("🔍 Updated order:", {
      id: order._id,
      currentLocation: order.deliveryInfo.currentLocation
    });

    res.json({ 
      success: true, 
      order,
      message: "Location updated successfully" 
    });

  } catch (err) {
    console.error("❌ UPDATE LOCATION ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------------------------------------------------
   CATCH-ALL ORDERS (Role-based routing)
--------------------------------------------------- */
router.get("/", authMiddleware, async (req, res) => {
  try {
    console.log("🔍 CATCH-ALL ORDERS - Routing based on user role");
    console.log("🔍 User ID:", req.userId);
    console.log("🔍 User:", req.user);
    
    // Get current user to determine role
    const currentUser = await User.findById(req.userId);
    
    if (!currentUser) {
      return res.status(404).json({
        error: "User not found",
        message: "User not found"
      });
    }

    console.log("👤 User role:", currentUser.role);

    // Route based on user role
    if (currentUser.role === "buyer") {
      console.log("🛍️ Routing to buyer orders");
      const orders = await Order.find({ buyerId: req.userId })
        .sort({ createdAt: -1 });
      return res.json(orders);
    } else if (currentUser.role === "farmer") {
      console.log("👨‍🌾 Routing to farmer orders (purchases)");
      const purchases = await Order.find({
        buyerId: req.userId,
        orderType: "product_purchase"
      }).sort({ createdAt: -1 });
      return res.json(purchases);
    } else if (currentUser.role === "seller") {
      console.log("🏪 Routing to seller orders");
      const orders = await Order.find({
        sellerId: req.userId,
        orderType: "product_purchase"
      }).sort({ createdAt: -1 });
      return res.json(orders);
    } else if (currentUser.role === "delivery_partner") {
      console.log("🚚 Routing to delivery partner orders");
      const orders = await Order.find({
        "deliveryInfo.deliveryPartnerId": req.userId
      }).sort({ createdAt: -1 });
      return res.json(orders);
    } else {
      console.log("👤 Routing to admin orders (all orders)");
      const orders = await Order.find({})
        .sort({ createdAt: -1 });
      return res.json(orders);
    }

  } catch (error) {
    console.error("❌ Get orders error:", error);
    res.status(500).json({
      error: "Failed to fetch orders",
      message: error.message || "Failed to retrieve orders"
    });
  }
});

/* ---------------------------------------------------
   BUYER ORDERS
--------------------------------------------------- */
router.get("/buyer", authMiddleware, async (req, res) => {
  const orders = await Order.find({ buyerId: req.userId })
    .sort({ createdAt: -1 });
  res.json(orders);
});

/* ---------------------------------------------------
   FARMER DASHBOARD (SALES + PURCHASES)
--------------------------------------------------- */
router.get("/farmer", authMiddleware, async (req, res) => {
  const sales = await Order.find({
    sellerId: req.userId,
    orderType: "crop_sale"
  }).sort({ createdAt: -1 });

  const cropPurchases = await Order.find({
    buyerId: req.userId,
    orderType: "crop_purchase"
  }).sort({ createdAt: -1 });

  const productPurchases = await Order.find({
    buyerId: req.userId,
    orderType: "product_purchase"
  }).sort({ createdAt: -1 });

  // Combine all purchases (crops + products) and sort by date
  const allPurchases = [...cropPurchases, ...productPurchases].sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  res.json({ sales, purchases: allPurchases });
});

/* ---------------------------------------------------
   SELLER DASHBOARD
--------------------------------------------------- */
router.get("/seller", authMiddleware, async (req, res) => {
  const cropSales = await Order.find({
    sellerId: req.userId,
    orderType: "crop_sale"
  }).sort({ createdAt: -1 });

  const productSales = await Order.find({
    sellerId: req.userId,
    orderType: "product_purchase"
  }).sort({ createdAt: -1 });

  // Return both crop sales and product sales
  res.json([...cropSales, ...productSales]);
});

/* ---------------------------------------------------
   DELIVERY PARTNER DASHBOARD
--------------------------------------------------- */
router.get("/delivery", authMiddleware, async (req, res) => {
  const orders = await Order.find({
    "deliveryInfo.deliveryPartnerId": req.userId
  });
  res.json(orders);
});

/* ---------------------------------------------------
   UPDATE ORDER STATUS (DELIVERY PARTNER)
--------------------------------------------------- */
router.put("/:id/status", authMiddleware, async (req, res) => {
  const { status, location } = req.body;

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    {
      status,
      ...(location && { "deliveryInfo.currentLocation": location })
    },
    { new: true }
  );

  await Message.create({
    orderId: order._id,
    senderId: req.userId,
    senderType: "system",
    content: `Order status updated to ${status}`,
    messageType: "status_update"
  });

  res.json({ success: true, order });
});

/* ---------------------------------------------------
   ORDER CHAT
--------------------------------------------------- */
router.post("/:orderId/message", authMiddleware, async (req, res) => {
  const message = await Message.create({
    orderId: req.params.orderId,
    senderId: req.userId,
    senderType: req.body.senderType,
    content: req.body.message,
    messageType: "order_communication"
  });

  res.json({ success: true, message });
});

router.get("/:orderId/messages", authMiddleware, async (req, res) => {
  const messages = await Message.find({ orderId: req.params.orderId })
    .sort({ createdAt: 1 });
  res.json(messages);
});

module.exports = router;
