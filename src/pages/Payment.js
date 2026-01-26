import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import API, { apiCall } from "../api/api";
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

  const [paymentMethod, setPaymentMethod] = useState("ONLINE"); // ONLINE | COD
  const [address, setAddress] = useState({
    name: "",
    phone: "",
    address: "", // Changed from addressLine to address to match schema
    city: "",
    state: "",
    pincode: "",
    lat: 20.5937, // Default India center latitude
    lng: 78.9629  // Default India center longitude
  });

  useEffect(() => {
    const urlAmount = searchParams.get("amount");
    const cropId = searchParams.get("cropId");
    const productId = searchParams.get("productId");
    const fromCartParam = searchParams.get("fromCart");

    if (fromCartParam === "true" && cart.length > 0) {
      setFromCart(true);
      const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      setAmount(total);
      setPaymentDetails({ items: cart });
    } else if (urlAmount) {
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

  const handleAddressChange = (e) => {
    setAddress({ ...address, [e.target.name]: e.target.value });
  };

  const isAddressValid = () => {
    return (
      address.name &&
      address.phone &&
      address.address && // Updated from addressLine to address
      address.city &&
      address.state &&
      address.pincode &&
      address.lat !== undefined && // Check lat is provided
      address.lng !== undefined    // Check lng is provided
    );
  };

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const placeOrderCOD = async () => {
    if (!isAddressValid()) {
      setError("Please fill complete delivery address");
      return;
    }

    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const buyerId = user?._id;

      if (!buyerId) {
        setError("Please login again");
        setLoading(false);
        return;
      }

      console.log("🛒 PLACING COD ORDER");
      console.log("🔍 User:", user);
      console.log("🔍 Buyer ID:", buyerId);
      console.log("🔍 Payment Details:", paymentDetails);
      console.log("🔍 Address:", address);
      console.log("🔍 From Cart:", fromCart);
      console.log("🔍 Amount:", amount);

      if (fromCart) {
        console.log("🛒 Creating cart order with data:", {
          items: paymentDetails.items,
          buyerId,
          paymentMethod: "COD",
          deliveryAddress: address
        });
        
        await apiCall(() =>
          API.post("/orders/create-from-cart", {
            items: paymentDetails.items,
            buyerId,
            paymentMethod: "COD",
            deliveryAddress: address
          })
        );
        clearCart();
      } else {
        const itemId = paymentDetails.cropId || paymentDetails.productId;
        console.log("🔍 Extracted itemId:", itemId);
        console.log("🔍 paymentDetails.cropId:", paymentDetails.cropId);
        console.log("🔍 paymentDetails.productId:", paymentDetails.productId);
        
        console.log("🛒 Creating single order with data:", {
          buyerId,
          itemId: itemId,
          itemType: paymentDetails.itemType,
          quantity: 1,
          price: amount,
          total: amount,
          status: "Confirmed",
          paymentMethod: "COD",
          deliveryAddress: address
        });
        
        await apiCall(() =>
          API.post("/orders/create", {
            buyerId,
            itemId: itemId,
            itemType: paymentDetails.itemType,
            quantity: 1,
            price: amount,
            total: amount,
            status: "Confirmed",
            paymentMethod: "COD",
            deliveryAddress: address
          })
        );
      }

      console.log("✅ Order placed successfully!");
      alert("Order placed successfully 🚚 Cash on Delivery");
      navigate("/orders");
    } catch (err) {
      console.error("❌ Order placement error:", err);
      setError("Failed to place COD order");
    } finally {
      setLoading(false);
    }
  };

  const payNow = async () => {
    if (paymentMethod === "COD") {
      return placeOrderCOD();
    }

    if (!isAddressValid()) {
      setError("Please fill complete delivery address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const razorpayLoaded = await loadRazorpay();
      if (!razorpayLoaded) {
        setError("Failed to load Razorpay");
        setLoading(false);
        return;
      }

      const { data: orderData } = await apiCall(() =>
        API.post("/payment/create-order", { amount })
      );

      const razorpayKey = process.env.REACT_APP_RAZORPAY_KEY;
      if (!razorpayKey) {
        setError("Razorpay key not configured");
        setLoading(false);
        return;
      }

      const user = JSON.parse(localStorage.getItem("user"));

      const options = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: "INR",
        order_id: orderData.id,
        name: "KisanSetu",
        handler: async function (response) {
          await apiCall(() =>
            API.post("/payment/verify", response)
          );

          if (fromCart) {
            await apiCall(() =>
              API.post("/orders/create-from-cart", {
                items: paymentDetails.items,
                buyerId: user._id,
                paymentMethod: "ONLINE",
                paymentId: response.razorpay_payment_id,
                deliveryAddress: address  // Fixed: changed from address to deliveryAddress
              })
            );
            clearCart();
          } else {
            await apiCall(() =>
              API.post("/orders/create", {
                buyerId: user._id,
                itemId: paymentDetails.cropId || paymentDetails.productId,
                itemType: paymentDetails.itemType,
                quantity: 1,
                price: amount,
                total: amount,
                status: "Confirmed",
                paymentMethod: "ONLINE",
                paymentId: response.razorpay_payment_id,
                deliveryAddress: address  // Fixed: changed from address to deliveryAddress
              })
            );
          }

          alert("Payment Successful ✅");
          navigate("/orders");
        },
        modal: {
          ondismiss: async function() {
            // Payment cancelled by user - switch to COD
            console.log("Payment cancelled, switching to COD");
            setLoading(true);
            setError("Payment cancelled. Switching to Cash on Delivery...");
            
            try {
              // Place order with COD
              if (fromCart) {
                await apiCall(() =>
                  API.post("/orders/create-from-cart", {
                    items: paymentDetails.items,
                    buyerId: user._id,
                    paymentMethod: "COD",
                    address
                  })
                );
                clearCart();
              } else {
                await apiCall(() =>
                  API.post("/orders/create", {
                    buyerId: user._id,
                    itemId: paymentDetails.cropId || paymentDetails.productId,
                    itemType: paymentDetails.itemType,
                    quantity: 1,
                    price: amount,
                    total: amount,
                    status: "Confirmed",
                    paymentMethod: "COD",
                    address
                  })
                );
              }

              alert("Order placed successfully with Cash on Delivery 🚚");
              navigate("/orders");
            } catch (err) {
              setError("Failed to place COD order after payment cancellation");
            } finally {
              setLoading(false);
            }
          },
          escape: async function() {
            // Payment modal escaped - switch to COD
            console.log("Payment modal escaped, switching to COD");
            setLoading(true);
            setError("Payment cancelled. Switching to Cash on Delivery...");
            
            try {
              // Place order with COD
              if (fromCart) {
                await apiCall(() =>
                  API.post("/orders/create-from-cart", {
                    items: paymentDetails.items,
                    buyerId: user._id,
                    paymentMethod: "COD",
                    address
                  })
                );
                clearCart();
              } else {
                await apiCall(() =>
                  API.post("/orders/create", {
                    buyerId: user._id,
                    itemId: paymentDetails.cropId || paymentDetails.productId,
                    itemType: paymentDetails.itemType,
                    quantity: 1,
                    price: amount,
                    total: amount,
                    status: "Confirmed",
                    paymentMethod: "COD",
                    address
                  })
                );
              }

              alert("Order placed successfully with Cash on Delivery 🚚");
              navigate("/orders");
            } catch (err) {
              setError("Failed to place COD order after payment cancellation");
            } finally {
              setLoading(false);
            }
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone
        },
        theme: { color: "#2e7d32" }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
      setLoading(false);
    } catch (err) {
      setError("Payment failed");
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: "600px", padding: "40px" }}>
      <h1>💳 Payment</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <h2>₹ {amount.toLocaleString("en-IN")}</h2>

      <h3>Delivery Address</h3>
      {["name","phone","address","city","state","pincode"].map((f) => (
        <input
          key={f}
          name={f}
          placeholder={f}
          onChange={handleAddressChange}
          style={{ width: "100%", marginBottom: "8px" }}
        />
      ))}
      
      {/* Hidden coordinates - using default India coordinates */}
      <input
        type="hidden"
        name="lat"
        value={20.5937} // Default India center latitude
        onChange={handleAddressChange}
      />
      <input
        type="hidden"
        name="lng"
        value={78.9629} // Default India center longitude
        onChange={handleAddressChange}
      />

      <h3>Payment Method</h3>
      <div style={{ marginBottom: "16px", padding: "12px", background: "#f5f5f5", borderRadius: "8px" }}>
        <p style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>
          💡 <strong>Smart Payment:</strong> If you cancel online payment, your order will automatically be placed with Cash on Delivery.
        </p>
      </div>
      <label>
        <input
          type="radio"
          checked={paymentMethod === "ONLINE"}
          onChange={() => setPaymentMethod("ONLINE")}
        /> Online Payment
      </label>
      <br />
      <label>
        <input
          type="radio"
          checked={paymentMethod === "COD"}
          onChange={() => setPaymentMethod("COD")}
        /> Cash on Delivery
      </label>

      <button
        onClick={payNow}
        disabled={loading}
        style={{ width: "100%", marginTop: "20px", padding: "14px" }}
      >
        {loading
          ? "Processing..."
          : paymentMethod === "COD"
          ? "🚚 Place Order"
          : "💳 Pay Now"}
      </button>
    </div>
  );
}
