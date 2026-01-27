import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const STATIC_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function Cart() {
  const navigate = useNavigate();
  const { cart, updateQuantity, removeFromCart, clearCart, getCartTotal, loading: cartLoading } = useCart();
  const [currentUser, setCurrentUser] = useState(null);
  const [quantityInputs, setQuantityInputs] = useState({});

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        setCurrentUser(JSON.parse(user));
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
  }, []);

  const canCheckout = () => {
    if (!currentUser) return false;
    // Only farmers and buyers can checkout
    return currentUser.role === "farmer" || currentUser.role === "buyer";
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    if (!canCheckout()) {
      alert("Sellers cannot checkout. You can only add and sell products.");
      return;
    }
    
    // Navigate to payment page with cart items
    const total = getCartTotal();
    navigate(`/payment?total=${total}&fromCart=true`);
  };

  // Show loading state while cart is being loaded
  if (cartLoading) {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <div className="page-header">
          <h1>🛒 Shopping Cart</h1>
          <p>Loading your cart...</p>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <div className="loading-spinner"></div>
          <p style={{ marginTop: "16px", color: "var(--text-secondary)" }}>Loading cart items...</p>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <div className="page-header">
          <h1>🛒 Shopping Cart</h1>
          <p>Your cart is empty</p>
        </div>

        <div className="empty-state card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: "64px", marginBottom: "24px" }}>🛒</div>
          <h3 style={{ marginBottom: "12px", color: "var(--text-primary)" }}>
            Your cart is empty
          </h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "32px" }}>
            Start adding items to your cart to continue shopping
          </p>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
            <Link to="/crops" className="btn btn-primary">
              Browse Crops
            </Link>
            <Link to="/products" className="btn btn-secondary">
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const total = getCartTotal();

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
      <div className="page-header">
        <h1>🛒 Shopping Cart</h1>
        <p>{cart.length} {cart.length === 1 ? "item" : "items"} in your cart</p>
      </div>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: window.innerWidth < 768 ? "1fr" : "1fr 400px", 
        gap: "32px", 
        marginTop: "32px" 
      }}>
        {/* Cart Items */}
        <div>
          <div className="card">
            {cart.map((item) => (
              <div
                key={`${item._id}-${item.type}`}
                style={{
                  display: "flex",
                  gap: "20px",
                  padding: "20px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {/* Product/Crop Image */}
                {(item.type === "crop" && item.image) ? (
                  <img
                    src={item.image.startsWith("http") ? item.image : `${STATIC_BASE_URL}${item.image}`}
                    alt={item.name}
                    style={{
                      width: "120px",
                      height: "120px",
                      objectFit: "cover",
                      borderRadius: "var(--border-radius-sm)",
                      flexShrink: 0
                    }}
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                ) : (item.type !== "crop" && item.images && item.images.length > 0 && item.images[0]) ? (
                  <img
                    src={item.images[0].startsWith("http") ? item.images[0] : `${STATIC_BASE_URL}${item.images[0]}`}
                    alt={item.name}
                    style={{
                      width: "120px",
                      height: "120px",
                      objectFit: "cover",
                      borderRadius: "var(--border-radius-sm)",
                      flexShrink: 0
                    }}
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                ) : null}
                
                {/* Fallback placeholder */}
                <div
                  style={{
                    width: "120px",
                    height: "120px",
                    background: item.type === "crop" 
                      ? "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)"
                      : "linear-gradient(135deg, #ff9800 0%, #f57c00 100%)",
                    borderRadius: "var(--border-radius-sm)",
                    display: "none",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "48px",
                    flexShrink: 0
                  }}
                >
                  {item.type === "crop" ? "🌾" : item.type === "seed" ? "🌱" : "🧪"}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h3 style={{
                        marginBottom: "8px",
                        fontSize: "20px",
                        color: "var(--text-primary)",
                        fontWeight: "600"
                      }}>
                        {item.name}
                      </h3>
                      <div style={{
                        display: "inline-block",
                        padding: "4px 12px",
                        background: item.type === "crop" ? "#e8f5e9" : "#fff3e0",
                        color: item.type === "crop" ? "var(--primary-green)" : "#ff9800",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "600",
                        marginBottom: "8px"
                      }}>
                        {item.type === "crop" ? "Crop" : item.type === "seed" ? "Seed" : "Pesticide"}
                      </div>
                      <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--primary-green)", marginTop: "8px" }}>
                        ₹{item.price?.toFixed(2) || 0} per unit
                      </div>
                      {/* Show stock for products, quantity for crops */}
                      {item.type === "crop" && item.availableQuantity !== undefined && item.availableQuantity !== null && (
                        <div style={{ 
                          fontSize: "14px", 
                          color: item.availableQuantity > 0 ? "var(--text-secondary)" : "var(--error)",
                          marginTop: "4px"
                        }}>
                          Available: {item.availableQuantity} kg
                        </div>
                      )}
                      {item.type !== "crop" && item.stock !== undefined && item.stock !== null && (
                        <div style={{ 
                          fontSize: "14px", 
                          color: item.stock > 0 ? "var(--text-secondary)" : "var(--error)",
                          marginTop: "4px"
                        }}>
                          Stock: {item.stock} units
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => removeFromCart(item._id, item.type)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-secondary)",
                        cursor: "pointer",
                        fontSize: "20px",
                        padding: "4px 8px",
                        borderRadius: "var(--border-radius-sm)",
                        transition: "background 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = "#fee";
                        e.target.style.color = "#f44336";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = "transparent";
                        e.target.style.color = "var(--text-secondary)";
                      }}
                    >
                      ×
                    </button>
                  </div>

                  <div style={{ 
                    marginTop: "20px", 
                    paddingTop: "16px", 
                    borderTop: "1px solid var(--border)",
                    display: "flex", 
                    flexDirection: "column", 
                    gap: "12px" 
                  }}>
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "12px", 
                      flexWrap: "wrap",
                      padding: "8px 0"
                    }}>
                      <label style={{ 
                        fontSize: "15px", 
                        color: "var(--text-primary)", 
                        fontWeight: "700", 
                        minWidth: "90px" 
                      }}>
                        Quantity:
                      </label>
                      <div style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "10px", 
                        flex: "1", 
                        minWidth: "180px",
                        background: "#f9f9f9",
                        padding: "4px",
                        borderRadius: "var(--border-radius-sm)"
                      }}>
                        <button
                          onClick={() => updateQuantity(item._id, item.type, Math.max(1, item.quantity - 1))}
                          style={{
                            width: "36px",
                            height: "36px",
                            border: "2px solid var(--border)",
                            background: "white",
                            borderRadius: "var(--border-radius-sm)",
                            cursor: "pointer",
                            fontSize: "20px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--text-primary)",
                            fontWeight: "bold",
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = "#f5f5f5";
                            e.target.style.borderColor = "var(--primary-green)";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = "white";
                            e.target.style.borderColor = "var(--border)";
                          }}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={
                            item.type === "crop" && item.availableQuantity !== undefined && item.availableQuantity !== null
                              ? item.availableQuantity
                              : item.stock !== undefined && item.stock !== null
                              ? item.stock
                              : undefined
                          }
                          value={quantityInputs[`${item._id}-${item.type}`] !== undefined 
                            ? quantityInputs[`${item._id}-${item.type}`] 
                            : item.quantity}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            const itemKey = `${item._id}-${item.type}`;
                            // Allow empty input while typing
                            if (inputValue === "") {
                              setQuantityInputs({ ...quantityInputs, [itemKey]: "" });
                              return;
                            }
                            const numValue = parseInt(inputValue, 10);
                            if (!isNaN(numValue) && numValue > 0) {
                              setQuantityInputs({ ...quantityInputs, [itemKey]: numValue });
                            }
                          }}
                          onBlur={(e) => {
                            const itemKey = `${item._id}-${item.type}`;
                            const inputValue = e.target.value;
                            
                            if (inputValue === "" || inputValue === "0") {
                              // If empty or 0, reset to current quantity
                              setQuantityInputs({ ...quantityInputs, [itemKey]: undefined });
                              return;
                            }
                            
                            const numValue = parseInt(inputValue, 10);
                            if (isNaN(numValue) || numValue < 1) {
                              // Invalid input, reset to current quantity
                              setQuantityInputs({ ...quantityInputs, [itemKey]: undefined });
                              return;
                            }
                            
                            // Get the available limit
                            const availableLimit = item.type === "crop" && item.availableQuantity !== undefined && item.availableQuantity !== null
                              ? item.availableQuantity
                              : item.stock !== undefined && item.stock !== null
                              ? item.stock
                              : null;
                            
                            // Limit to available stock/quantity
                            const finalQuantity = availableLimit !== null 
                              ? Math.min(numValue, availableLimit)
                              : numValue;
                            
                            // Update quantity
                            updateQuantity(item._id, item.type, finalQuantity);
                            
                            // Clear input state to show updated value
                            setQuantityInputs({ ...quantityInputs, [itemKey]: undefined });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.target.blur();
                            }
                          }}
                          style={{
                            width: "70px",
                            height: "36px",
                            border: "2px solid var(--border)",
                            borderRadius: "var(--border-radius-sm)",
                            textAlign: "center",
                            fontSize: "16px",
                            fontWeight: "600",
                            color: "var(--text-primary)",
                            padding: "0 4px"
                          }}
                        />
                        <button
                          onClick={() => {
                            const newQuantity = item.quantity + 1;
                            // For crops, use availableQuantity field; for products, use stock field
                            if (item.type === "crop" && item.availableQuantity !== undefined && item.availableQuantity !== null) {
                              // Limit to available crop quantity
                              updateQuantity(item._id, item.type, Math.min(newQuantity, item.availableQuantity));
                            } else if (item.stock !== undefined && item.stock !== null) {
                              // Limit to available product stock
                              updateQuantity(item._id, item.type, Math.min(newQuantity, item.stock));
                            } else {
                              updateQuantity(item._id, item.type, newQuantity);
                            }
                          }}
                          disabled={
                            (item.type === "crop" && item.availableQuantity !== undefined && item.availableQuantity !== null && item.quantity >= item.availableQuantity) ||
                            (item.type !== "crop" && item.stock !== undefined && item.stock !== null && item.quantity >= item.stock)
                          }
                          style={{
                            width: "36px",
                            height: "36px",
                            border: "2px solid var(--border)",
                            background: (
                              (item.type === "crop" && item.availableQuantity !== undefined && item.availableQuantity !== null && item.quantity >= item.availableQuantity) ||
                              (item.type !== "crop" && item.stock !== undefined && item.stock !== null && item.quantity >= item.stock)
                            ) 
                              ? "var(--background)" 
                              : "white",
                            borderRadius: "var(--border-radius-sm)",
                            cursor: (
                              (item.type === "crop" && item.availableQuantity !== undefined && item.availableQuantity !== null && item.quantity >= item.availableQuantity) ||
                              (item.type !== "crop" && item.stock !== undefined && item.stock !== null && item.quantity >= item.stock)
                            ) 
                              ? "not-allowed" 
                              : "pointer",
                            fontSize: "20px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: (
                              (item.type === "crop" && item.availableQuantity !== undefined && item.availableQuantity !== null && item.quantity >= item.availableQuantity) ||
                              (item.type !== "crop" && item.stock !== undefined && item.stock !== null && item.quantity >= item.stock)
                            )
                              ? "var(--text-light)"
                              : "var(--text-primary)",
                            fontWeight: "bold",
                            opacity: (
                              (item.type === "crop" && item.availableQuantity !== undefined && item.availableQuantity !== null && item.quantity >= item.availableQuantity) ||
                              (item.type !== "crop" && item.stock !== undefined && item.stock !== null && item.quantity >= item.stock)
                            ) 
                              ? 0.5 
                              : 1,
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => {
                            if (!e.target.disabled) {
                              e.target.style.background = "#f5f5f5";
                              e.target.style.borderColor = "var(--primary-green)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!e.target.disabled) {
                              e.target.style.background = "white";
                              e.target.style.borderColor = "var(--border)";
                            }
                          }}
                        >
                          +
                        </button>
                      </div>
                      <div style={{ marginLeft: "auto", fontSize: "18px", fontWeight: "700", color: "var(--primary-green)", minWidth: "100px", textAlign: "right" }}>
                        ₹{(item.price * item.quantity)?.toFixed(2) || 0}
                      </div>
                    </div>
                    {/* Show warning for crops when quantity limit reached */}
                    {item.type === "crop" && item.availableQuantity !== undefined && item.availableQuantity !== null && item.quantity >= item.availableQuantity && (
                      <div style={{
                        marginTop: "8px",
                        padding: "8px 12px",
                        background: "#fff3e0",
                        border: "1px solid #ff9800",
                        borderRadius: "var(--border-radius-sm)",
                        fontSize: "13px",
                        color: "#f57c00"
                      }}>
                        ⚠️ Maximum quantity reached. Only {item.availableQuantity} kg available.
                      </div>
                    )}
                    {/* Show warning for products when stock limit reached */}
                    {item.type !== "crop" && item.stock !== undefined && item.stock !== null && item.quantity >= item.stock && (
                      <div style={{
                        marginTop: "8px",
                        padding: "8px 12px",
                        background: "#fff3e0",
                        border: "1px solid #ff9800",
                        borderRadius: "var(--border-radius-sm)",
                        fontSize: "13px",
                        color: "#f57c00"
                      }}>
                        ⚠️ Maximum quantity reached. Only {item.stock} unit{item.stock !== 1 ? "s" : ""} available in stock.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <div className="card" style={{ position: "sticky", top: "100px" }}>
            <h2 style={{
              marginBottom: "24px",
              fontSize: "24px",
              color: "var(--text-primary)",
              fontWeight: "600"
            }}>
              Order Summary
            </h2>

            <div style={{ marginBottom: "20px" }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "12px",
                fontSize: "16px",
                color: "var(--text-secondary)"
              }}>
                <span>Subtotal ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "12px",
                fontSize: "16px",
                color: "var(--text-secondary)"
              }}>
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <div style={{
                height: "1px",
                background: "var(--border)",
                margin: "20px 0"
              }}></div>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "20px",
                fontWeight: "700",
                color: "var(--text-primary)"
              }}>
                <span>Total</span>
                <span style={{ color: "var(--primary-green)" }}>₹{total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              className="btn btn-primary"
              style={{
                width: "100%",
                padding: "14px",
                fontSize: "16px",
                fontWeight: "600",
                marginBottom: "12px"
              }}
            >
              Proceed to Checkout
            </button>

            <button
              onClick={clearCart}
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "14px",
                background: "transparent",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
                borderRadius: "var(--border-radius-sm)",
                cursor: "pointer",
                fontWeight: "600"
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "#f5f5f5";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "transparent";
              }}
            >
              Clear Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

