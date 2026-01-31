import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import API, { apiCall } from "../api/api";
import { useCart } from "../context/CartContext";
import "../index.css";

export default function Payment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { cart, clearCart } = useCart();

  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [fromCart, setFromCart] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

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

  const validateForm = () => {
    const errors = {};
    
    if (!address.name.trim()) {
      errors.name = "Name is required";
    }
    
    if (!address.phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (!/^[6-9]\d{9}$/.test(address.phone.replace(/\D/g, ''))) {
      errors.phone = "Please enter a valid 10-digit mobile number";
    }
    
    if (!address.address.trim()) {
      errors.address = "Address is required";
    }
    
    if (!address.city.trim()) {
      errors.city = "City is required";
    }
    
    if (!address.state.trim()) {
      errors.state = "State is required";
    }
    
    if (!address.pincode.trim()) {
      errors.pincode = "Pincode is required";
    } else if (!/^\d{6}$/.test(address.pincode)) {
      errors.pincode = "Please enter a valid 6-digit pincode";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setAddress(prev => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: "" }));
    }
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
    if (!validateForm()) {
      setError("Please fill all required fields correctly");
      return;
    }

    setLoading(true);
    setIsProcessing(true);
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
        // Transform cart items to match backend expectations
        const transformedItems = paymentDetails.items.map(item => ({
          itemId: item._id,
          itemType: item.type,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        }));
        
        console.log("🛒 Creating cart order with data:", {
          items: transformedItems,
          buyerId,
          paymentMethod: "COD",
          deliveryAddress: address
        });
        
        const result = await apiCall(() =>
          API.post("/orders/create-from-cart", {
            items: transformedItems,
            buyerId,
            paymentMethod: "COD",
            deliveryAddress: address
          })
        );
        
        console.log("📦 Cart order creation response:", result);
        
        if (result.error) {
          console.error("❌ Cart order creation failed:", result.error);
          setError(`Failed to create order: ${result.error}`);
          return;
        }
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
      setIsProcessing(false);
    }
  };

  const payNow = async () => {
    if (paymentMethod === "COD") {
      return placeOrderCOD();
    }

    if (!validateForm()) {
      setError("Please fill all required fields correctly");
      return;
    }

    setLoading(true);
    setIsProcessing(true);
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
            // Transform cart items to match backend expectations
            const transformedItems = paymentDetails.items.map(item => ({
              itemId: item._id,
              itemType: item.type,
              name: item.name,
              quantity: item.quantity,
              price: item.price
            }));
            
            const result = await apiCall(() =>
              API.post("/orders/create-from-cart", {
                items: transformedItems,
                buyerId: user._id,
                paymentMethod: "ONLINE",
                paymentId: response.razorpay_payment_id,
                deliveryAddress: address
              })
            );
            
            console.log("📦 Online cart order creation response:", result);
            
            if (result.error) {
              console.error("❌ Online cart order creation failed:", result.error);
              setError(`Failed to create order: ${result.error}`);
              return;
            }
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
                // Transform cart items to match backend expectations
                const transformedItems = paymentDetails.items.map(item => ({
                  itemId: item._id,
                  itemType: item.type,
                  name: item.name,
                  quantity: item.quantity,
                  price: item.price
                }));
                
                await apiCall(() =>
                  API.post("/orders/create-from-cart", {
                    items: transformedItems,
                    buyerId: user._id,
                    paymentMethod: "COD",
                    deliveryAddress: address
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
                // Transform cart items to match backend expectations
                const transformedItems = paymentDetails.items.map(item => ({
                  itemId: item._id,
                  itemType: item.type,
                  name: item.name,
                  quantity: item.quantity,
                  price: item.price
                }));
                
                await apiCall(() =>
                  API.post("/orders/create-from-cart", {
                    items: transformedItems,
                    buyerId: user._id,
                    paymentMethod: "COD",
                    deliveryAddress: address
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
      setError("Payment failed. Please try again.");
      setLoading(false);
      setIsProcessing(false);
    }
  };

  return (
    <div className="page-header">
      <div className="container">
        <div className="card" style={{ maxWidth: "800px", margin: "0 auto" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{ 
              width: "64px", 
              height: "64px", 
              backgroundColor: "var(--primary-green-light)", 
              borderRadius: "50%", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              margin: "0 auto 16px" 
            }}>
              <span style={{ fontSize: "32px" }}>💳</span>
            </div>
            <h1 style={{ fontSize: "28px", marginBottom: "8px", color: "var(--text-primary)" }}>Secure Payment</h1>
            <p style={{ color: "var(--text-secondary)", margin: 0 }}>Complete your order securely</p>
          </div>

          {error && (
            <div className="error-message" style={{ marginBottom: "24px" }}>
              {error}
            </div>
          )}

          {/* Order Summary */}
          <div className="card" style={{ 
            backgroundColor: "var(--background)", 
            marginBottom: "24px", 
            padding: "20px" 
          }}>
            <h3 style={{ marginBottom: "16px", color: "var(--text-primary)" }}>Order Summary</h3>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ color: "var(--text-secondary)", margin: "0 0 8px 0" }}>
                  {fromCart ? `${cart.length} items` : "1 item"}
                </p>
                <p style={{ fontSize: "14px", color: "var(--text-light)", margin: 0 }}>
                  {fromCart ? "Items from cart" : "Direct purchase"}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: "0 0 4px 0" }}>Total Amount</p>
                <p style={{ 
                  fontSize: "32px", 
                  fontWeight: "bold", 
                  color: "var(--primary-green)", 
                  margin: 0 
                }}>
                  ₹ {amount.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div style={{ marginBottom: "24px" }}>
            <h3 style={{ marginBottom: "16px", color: "var(--text-primary)" }}>
              📍 Delivery Address
            </h3>
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", marginBottom: "6px", color: "var(--text-secondary)", fontSize: "14px" }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={address.name}
                  onChange={handleAddressChange}
                  className={`input ${formErrors.name ? "error" : ""}`}
                  placeholder="Enter your full name"
                  disabled={isProcessing}
                />
                {formErrors.name && (
                  <p style={{ color: "var(--error)", fontSize: "12px", marginTop: "4px", margin: "4px 0 0 0" }}>
                    {formErrors.name}
                  </p>
                )}
              </div>
              
              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "var(--text-secondary)", fontSize: "14px" }}>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={address.phone}
                  onChange={handleAddressChange}
                  className={`input ${formErrors.phone ? "error" : ""}`}
                  placeholder="10-digit mobile number"
                  disabled={isProcessing}
                />
                {formErrors.phone && (
                  <p style={{ color: "var(--error)", fontSize: "12px", marginTop: "4px", margin: "4px 0 0 0" }}>
                    {formErrors.phone}
                  </p>
                )}
              </div>
              
              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "var(--text-secondary)", fontSize: "14px" }}>
                  Pincode *
                </label>
                <input
                  type="text"
                  name="pincode"
                  value={address.pincode}
                  onChange={handleAddressChange}
                  className={`input ${formErrors.pincode ? "error" : ""}`}
                  placeholder="6-digit pincode"
                  maxLength={6}
                  disabled={isProcessing}
                />
                {formErrors.pincode && (
                  <p style={{ color: "var(--error)", fontSize: "12px", marginTop: "4px", margin: "4px 0 0 0" }}>
                    {formErrors.pincode}
                  </p>
                )}
              </div>
              
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", marginBottom: "6px", color: "var(--text-secondary)", fontSize: "14px" }}>
                  Street Address *
                </label>
                <input
                  type="text"
                  name="address"
                  value={address.address}
                  onChange={handleAddressChange}
                  className={`input ${formErrors.address ? "error" : ""}`}
                  placeholder="House number, street name, area"
                  disabled={isProcessing}
                />
                {formErrors.address && (
                  <p style={{ color: "var(--error)", fontSize: "12px", marginTop: "4px", margin: "4px 0 0 0" }}>
                    {formErrors.address}
                  </p>
                )}
              </div>
              
              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "var(--text-secondary)", fontSize: "14px" }}>
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  value={address.city}
                  onChange={handleAddressChange}
                  className={`input ${formErrors.city ? "error" : ""}`}
                  placeholder="Enter your city"
                  disabled={isProcessing}
                />
                {formErrors.city && (
                  <p style={{ color: "var(--error)", fontSize: "12px", marginTop: "4px", margin: "4px 0 0 0" }}>
                    {formErrors.city}
                  </p>
                )}
              </div>
              
              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "var(--text-secondary)", fontSize: "14px" }}>
                  State *
                </label>
                <input
                  type="text"
                  name="state"
                  value={address.state}
                  onChange={handleAddressChange}
                  className={`input ${formErrors.state ? "error" : ""}`}
                  placeholder="Enter your state"
                  disabled={isProcessing}
                />
                {formErrors.state && (
                  <p style={{ color: "var(--error)", fontSize: "12px", marginTop: "4px", margin: "4px 0 0 0" }}>
                    {formErrors.state}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div style={{ marginBottom: "32px" }}>
            <h3 style={{ marginBottom: "16px", color: "var(--text-primary)" }}>
              💳 Payment Method
            </h3>
            
            <div className="card" style={{ 
              backgroundColor: "var(--background)", 
              marginBottom: "16px", 
              padding: "16px" 
            }}>
              <p style={{ 
                fontSize: "14px", 
                color: "var(--text-secondary)", 
                margin: 0, 
                display: "flex", 
                alignItems: "center", 
                gap: "8px" 
              }}>
                <span>💡</span>
                <span><strong>Smart Payment:</strong> If you cancel online payment, your order will automatically be placed with Cash on Delivery.</span>
              </p>
            </div>
            
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <label 
                className={`card ${paymentMethod === "ONLINE" ? "selected" : ""}`}
                style={{ 
                  cursor: "pointer", 
                  padding: "20px", 
                  textAlign: "center", 
                  border: paymentMethod === "ONLINE" ? "2px solid var(--primary-green)" : "2px solid var(--border)",
                  backgroundColor: paymentMethod === "ONLINE" ? "var(--surface)" : "var(--background)",
                  transition: "all 0.3s ease",
                  position: "relative"
                }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="ONLINE"
                  checked={paymentMethod === "ONLINE"}
                  onChange={() => setPaymentMethod("ONLINE")}
                  disabled={isProcessing}
                  style={{ position: "absolute", opacity: 0 }}
                />
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>💳</div>
                <div style={{ fontWeight: "600", color: "var(--text-primary)" }}>Online Payment</div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                  Secure & Instant
                </div>
                {paymentMethod === "ONLINE" && (
                  <div style={{ 
                    position: "absolute", 
                    top: "8px", 
                    right: "8px", 
                    color: "var(--primary-green)",
                    fontSize: "20px"
                  }}>
                    ✓
                  </div>
                )}
              </label>
              
              <label 
                className={`card ${paymentMethod === "COD" ? "selected" : ""}`}
                style={{ 
                  cursor: "pointer", 
                  padding: "20px", 
                  textAlign: "center", 
                  border: paymentMethod === "COD" ? "2px solid var(--primary-green)" : "2px solid var(--border)",
                  backgroundColor: paymentMethod === "COD" ? "var(--surface)" : "var(--background)",
                  transition: "all 0.3s ease",
                  position: "relative"
                }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="COD"
                  checked={paymentMethod === "COD"}
                  onChange={() => setPaymentMethod("COD")}
                  disabled={isProcessing}
                  style={{ position: "absolute", opacity: 0 }}
                />
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>🚚</div>
                <div style={{ fontWeight: "600", color: "var(--text-primary)" }}>Cash on Delivery</div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                  Pay when you receive
                </div>
                {paymentMethod === "COD" && (
                  <div style={{ 
                    position: "absolute", 
                    top: "8px", 
                    right: "8px", 
                    color: "var(--primary-green)",
                    fontSize: "20px"
                  }}>
                    ✓
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={payNow}
            disabled={loading || isProcessing}
            className="btn btn-primary"
            style={{ 
              width: "100%", 
              padding: "16px", 
              fontSize: "18px", 
              fontWeight: "600",
              position: "relative",
              overflow: "hidden"
            }}
          >
            {loading || isProcessing ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
                <div className="loading-spinner" style={{ 
                  width: "20px", 
                  height: "20px", 
                  margin: 0, 
                  borderWidth: "3px" 
                }}></div>
                {paymentMethod === "COD" ? "Placing Order..." : "Processing Payment..."}
              </span>
            ) : (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                {paymentMethod === "COD" ? (
                  <>
                    <span>🚚</span>
                    <span>Place Order - Cash on Delivery</span>
                  </>
                ) : (
                  <>
                    <span>💳</span>
                    <span>Pay Now - ₹ {amount.toLocaleString("en-IN")}</span>
                  </>
                )}
              </span>
            )}
          </button>

          {/* Security Badge */}
          <div style={{ 
            textAlign: "center", 
            marginTop: "24px", 
            padding: "16px", 
            backgroundColor: "var(--background)",
            borderRadius: "var(--border-radius-sm)"
          }}>
            <p style={{ 
              fontSize: "12px", 
              color: "var(--text-secondary)", 
              margin: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}>
              <span>🔒</span>
              <span>Secured by Razorpay • 256-bit SSL encryption</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
