import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import API from "../api/api";
import { apiCall } from "../api/api";
import { useCart } from "../context/CartContext";

export default function Payment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { cart, clearCart } = useCart();
  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [fromCart, setFromCart] = useState(false);

  useEffect(() => {
    // Get amount from URL params
    const urlAmount = searchParams.get("amount");
    const cropId = searchParams.get("cropId");
    const productId = searchParams.get("productId");
    const fromCartParam = searchParams.get("fromCart");
    
    if (fromCartParam === "true" && cart.length > 0) {
      // Payment from cart
      setFromCart(true);
      const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      setAmount(total);
      setPaymentDetails({ items: cart });
    } else if (urlAmount) {
      // Single item payment
      setFromCart(false);
      setAmount(parseFloat(urlAmount));
      setPaymentDetails({
        cropId,
        productId,
        itemType: cropId ? "crop" : "product"
      });
    } else {
      setError("No payment amount specified");
    }
  }, [searchParams, cart]);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const payNow = async () => {
    if (!amount || amount <= 0) {
      setError("Invalid payment amount");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Load Razorpay script
      const razorpayLoaded = await loadRazorpay();
      if (!razorpayLoaded) {
        setError("Failed to load Razorpay. Please check your internet connection.");
        setLoading(false);
        return;
      }

      // STEP 1: Create order from backend
      const { data: orderData, error: orderError } = await apiCall(() =>
        API.post("/payment/create-order", { amount })
      );

      if (orderError || !orderData) {
        setError(orderError || "Failed to create payment order");
        setLoading(false);
        return;
      }

      // STEP 2: Razorpay options
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID || "rzp_test_xxxxxxxx", // Get from env
        amount: orderData.amount,
        currency: "INR",
        order_id: orderData.id,
        name: "KisanSetu",
        description: fromCart 
          ? `Payment for ${cart.length} item${cart.length > 1 ? "s" : ""} from cart`
          : `Payment for ${paymentDetails?.itemType || "item"}`,
        prefill: {
          name: "Customer",
          email: "customer@example.com",
          contact: "9999999999"
        },

        handler: async function (response) {
          // STEP 3: Verify payment on backend
          const { data: verifyData, error: verifyError } = await apiCall(() =>
            API.post("/payment/verify", response)
          );

          if (verifyError || !verifyData?.success) {
            setError("Payment verification failed. Please contact support.");
            setLoading(false);
            return;
          }

          // Get current user
          const user = localStorage.getItem("user");
          const userData = user ? JSON.parse(user) : null;
          const buyerId = userData?._id;

          if (!buyerId) {
            setError("User not found. Please login again.");
            setLoading(false);
            return;
          }

          // Create order record(s)
          if (fromCart && paymentDetails?.items) {
            // Create multiple orders from cart
            const { data: ordersData, error: ordersError } = await apiCall(() =>
              API.post("/orders/create-from-cart", {
                items: paymentDetails.items,
                buyerId,
                paymentId: response.razorpay_payment_id
              })
            );

            if (ordersError) {
              setError("Failed to create orders. Payment was successful but orders were not created.");
              setLoading(false);
              return;
            }

            // Clear cart after successful payment
            clearCart();
          } else if (paymentDetails && !fromCart) {
            // Single item order
            await apiCall(() =>
              API.post("/orders/create", {
                buyerId,
                itemId: paymentDetails.cropId || paymentDetails.productId,
                itemType: paymentDetails.itemType,
                quantity: 1,
                price: amount,
                total: amount,
                status: "Confirmed",
                paymentId: response.razorpay_payment_id
              })
            );
          }

          // Success
          setLoading(false);
          alert("Payment Successful ✅\nYour order has been confirmed!");
          navigate("/orders");
        },

        modal: {
          ondismiss: function () {
            setLoading(false);
            setError("Payment cancelled");
          }
        },

        theme: {
          color: "#2e7d32"
        }
      };

      // STEP 4: Open Razorpay popup
      const rzp = new window.Razorpay(options);
      rzp.open();
      setLoading(false);

    } catch (error) {
      console.error(error);
      setError(error.message || "Payment failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px", maxWidth: "600px" }}>
      <div className="page-header">
        <h1>💳 Secure Payment</h1>
        <p>Complete your purchase with secure payment</p>
      </div>

      <div className="card">
        {error && <div className="error-message">{error}</div>}

        <div style={{
          background: "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)",
          borderRadius: "var(--border-radius-sm)",
          padding: "32px",
          color: "white",
          textAlign: "center",
          marginBottom: "32px"
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>💰</div>
          <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "8px" }}>Amount to Pay</div>
          <div style={{ fontSize: "48px", fontWeight: "700" }}>
            ₹{amount.toLocaleString("en-IN")}
          </div>
        </div>

        <div style={{
          background: "var(--background)",
          borderRadius: "var(--border-radius-sm)",
          padding: "20px",
          marginBottom: "24px"
        }}>
          <h3 style={{ marginBottom: "16px", fontSize: "18px", color: "var(--text-primary)" }}>
            Payment Details
          </h3>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "12px",
            paddingBottom: "12px",
            borderBottom: "1px solid var(--border)"
          }}>
            {fromCart && cart.length > 0 ? (
              <>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px"
                }}>
                  <span style={{ color: "var(--text-secondary)" }}>Items:</span>
                  <strong style={{ color: "var(--text-primary)" }}>
                    {cart.length} item{cart.length > 1 ? "s" : ""}
                  </strong>
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-light)", marginTop: "8px" }}>
                  {cart.map((item, index) => (
                    <div key={index} style={{ marginBottom: "4px" }}>
                      {item.name} × {item.quantity} - ₹{(item.price * item.quantity).toFixed(2)}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <span style={{ color: "var(--text-secondary)" }}>Item Type:</span>
                <strong style={{ color: "var(--text-primary)" }}>
                  {paymentDetails?.itemType === "crop" ? "🌾 Crop" : "🛒 Product"}
                </strong>
              </>
            )}
          </div>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "12px"
          }}>
            <span style={{ color: "var(--text-secondary)" }}>Amount:</span>
            <strong style={{ color: "var(--text-primary)" }}>
              ₹{amount.toLocaleString("en-IN")}
            </strong>
          </div>
        </div>

        <div style={{
          background: "#fff3e0",
          borderLeft: "4px solid #ff9800",
          padding: "16px",
          borderRadius: "var(--border-radius-sm)",
          marginBottom: "24px",
          fontSize: "14px",
          color: "#f57c00"
        }}>
          <strong>🔒 Secure Payment:</strong> Powered by Razorpay. Your payment information is encrypted and secure.
        </div>

        <button
          onClick={payNow}
          className="btn btn-primary"
          disabled={loading || !amount || amount <= 0}
          style={{ width: "100%", fontSize: "18px", padding: "16px" }}
        >
          {loading ? (
            <>
              <div className="loading-spinner" style={{
                width: "20px",
                height: "20px",
                borderWidth: "2px",
                margin: "0"
              }}></div>
              Processing...
            </>
          ) : (
            "💳 Pay Now"
          )}
        </button>

        <button
          onClick={() => navigate(-1)}
          className="btn btn-secondary"
          disabled={loading}
          style={{ width: "100%", marginTop: "12px" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
