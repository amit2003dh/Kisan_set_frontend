const router = require("express").Router();
const razorpay = require("../config/razorpay");
const crypto = require("crypto");

// STEP 1: Create Order
router.post("/create-order", async (req, res) => {
  try {
    const options = {
      amount: req.body.amount * 100, // INR → paise
      currency: "INR",
      receipt: "kisansetu_order_" + Date.now()
    };

    const order = await razorpay.orders.create(options);
    res.send(order);
  } catch (error) {
    res.status(500).send({ error: "Order creation failed" });
  }
});

// STEP 2: Verify Payment
router.post("/verify", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    res.send({ success: true });
  } else {
    res.status(400).send({ success: false });
  }
});

module.exports = router;

