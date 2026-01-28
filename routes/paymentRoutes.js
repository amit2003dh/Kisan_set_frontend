const router = require("express").Router();
const razorpay = require("../config/razorpay");
const crypto = require("crypto");

// STEP 1: Create Order
router.post("/create-order", async (req, res) => {
  try {
    // Check if Razorpay is configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({
        error: "Payment gateway not configured",
        message: "Razorpay credentials are not set. Please configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables."
      });
    }

    if (!req.body.amount || req.body.amount <= 0) {
      return res.status(400).json({
        error: "Invalid amount",
        message: "Amount must be greater than 0"
      });
    }

    const options = {
      amount: Math.round(req.body.amount * 100), // INR → paise (round to avoid decimals)
      currency: "INR",
      receipt: "kisansetu_order_" + Date.now()
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    res.status(500).json({ 
      error: "Order creation failed",
      message: error.message || "Failed to create payment order. Please try again."
    });
  }
});

// STEP 2: Verify Payment
router.post("/verify", (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({
        success: false,
        error: "Payment gateway not configured",
        message: "Razorpay secret key is not set."
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: "Missing payment details",
        message: "All payment verification fields are required"
      });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      res.json({ success: true });
    } else {
      console.error("Payment verification failed: Signature mismatch");
      res.status(400).json({ 
        success: false,
        error: "Payment verification failed",
        message: "Invalid payment signature"
      });
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({
      success: false,
      error: "Verification error",
      message: error.message || "Failed to verify payment"
    });
  }
});

module.exports = router;

