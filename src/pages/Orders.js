import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API, { apiCall } from "../api/api";
import ChatBox from "../components/ChatBox";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
    // Get current user
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const userData = JSON.parse(user);
        setCurrentUser(userData);
        
        // Redirect sellers/farmers to their orders page
        if (userData.role === "seller" || userData.role === "farmer") {
          navigate("/seller-orders");
        }
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
  }, [navigate]);

  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    
    const { data, error: err } = await apiCall(() => API.get("/orders"));
    
    if (err) {
      setError(err);
    } else {
      setOrders(data || []);
    }
    
    setLoading(false);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return "#4caf50";
      case "delivered":
        return "#4caf50";
      case "pending":
        return "#ff9800";
      case "cancelled":
        return "#f44336";
      case "out for delivery":
        return "#2196f3";
      default:
        return "#757575";
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return "✅";
      case "delivered":
        return "🎉";
      case "pending":
        return "⏳";
      case "cancelled":
        return "❌";
      case "out for delivery":
        return "🚚";
      default:
        return "📦";
    }
  };

  const getItemName = (order) => {
    if (order.itemId?.name) {
      return order.itemId.name;
    }
    // Fallback for orders without populated itemId
    return order.itemType === "crop" ? "Crop Item" : "Product Item";
  };

  const getItemImage = (order) => {
    // Check for single image field
    if (order.itemId?.image) {
      const imageUrl = order.itemId.image;
      return imageUrl.startsWith("http") ? imageUrl : `${API_BASE_URL}${imageUrl}`;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <div className="loading-spinner"></div>
        <p style={{ textAlign: "center", color: "var(--text-secondary)" }}>Loading your orders...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
      <div className="page-header">
        <h1>📦 My Orders</h1>
        <p>Track and manage your orders</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {orders.length === 0 ? (
        <div className="empty-state card">
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>📦</div>
          <h3 style={{ marginBottom: "8px", color: "var(--text-primary)" }}>No orders yet</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
            Start shopping to see your orders here
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <Link to="/crops" className="btn btn-primary">
              Browse Crops
            </Link>
            <Link to="/products" className="btn btn-secondary">
              Browse Products
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "2fr 1fr", gap: "32px" }}>
          {/* Orders List */}
          <div>
            <div className="grid" style={{ gridTemplateColumns: "1fr", gap: "16px" }}>
              {orders.map((order) => (
                <div key={order._id} className="card">
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "16px"
                  }}>
                    <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                      {getItemImage(order) && (
                        <img
                          src={getItemImage(order)}
                          alt={getItemName(order)}
                          style={{
                            width: "60px",
                            height: "60px",
                            borderRadius: "var(--border-radius-sm)",
                            objectFit: "cover",
                            border: "1px solid var(--border-color)"
                          }}
                          onError={(e) => {
                            // Fallback to icon based on item type
                            const icon = order.itemType === "crop" ? "🌾" : 
                                        order.itemType === "seed" ? "🌱" : 
                                        order.itemType === "pesticide" ? "🧪" : "🛒";
                            e.target.style.display = "none";
                            const parent = e.target.parentElement;
                            const fallback = document.createElement("div");
                            fallback.style.cssText = "width: 60px; height: 60px; border-radius: var(--border-radius-sm); display: flex; align-items: center; justify-content: center; background: var(--background); border: 1px solid var(--border-color); font-size: 24px;";
                            fallback.textContent = icon;
                            parent.replaceChild(fallback, e.target);
                          }}
                        />
                      )}
                      {!getItemImage(order) && (
                        <div style={{
                          width: "60px",
                          height: "60px",
                          borderRadius: "var(--border-radius-sm)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "var(--background)",
                          border: "1px solid var(--border-color)",
                          fontSize: "24px"
                        }}>
                          {order.itemType === "crop" ? "🌾" : 
                           order.itemType === "seed" ? "🌱" : 
                           order.itemType === "pesticide" ? "🧪" : "🛒"}
                        </div>
                      )}
                      <div>
                        <h3 style={{
                          margin: "0 0 8px 0",
                          fontSize: "18px",
                          color: "var(--text-primary)",
                          fontWeight: "600"
                        }}>
                          Order #{order._id?.slice(-8).toUpperCase()}
                        </h3>
                        <p style={{
                          margin: "0 0 4px 0",
                          color: "var(--text-primary)",
                          fontSize: "16px",
                          fontWeight: "500"
                        }}>
                          {getItemName(order)}
                        </p>
                        <p style={{
                          margin: 0,
                          color: "var(--text-secondary)",
                          fontSize: "14px"
                        }}>
                          {order.itemType === "crop" ? "🌾 Crop" : order.itemType === "seed" ? "🌱 Seed" : order.itemType === "pesticide" ? "🧪 Pesticide" : "🛒 Product"}
                        </p>
                      </div>
                    </div>
                    <div style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                      marginBottom: "12px"
                    }}>
                      <span style={{
                        padding: "4px 12px",
                        background: getStatusColor(order.status),
                        color: "white",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "600"
                      }}>
                        {getStatusIcon(order.status)} {order.status}
                      </span>
                      {order.status === "Delivered" && (
                        <button
                          onClick={() => navigate(`/products?type=${order.itemType}`)}
                          className="btn btn-secondary"
                          style={{ fontSize: "12px", padding: "6px 12px" }}
                        >
                          🛒 Buy Again
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/orders/${order._id}/communication`)}
                        className="btn btn-outline"
                        style={{ fontSize: "12px", padding: "6px 12px" }}
                      >
                        💬 {currentUser?.role === "buyer" ? "Message Seller" : "Message Buyer"}
                      </button>
                      {order.status === "Out for Delivery" && (
                        <button
                          onClick={() => navigate(`/orders/${order._id}/delivery-chat`)}
                          className="btn btn-primary"
                          style={{ fontSize: "12px", padding: "6px 12px" }}
                        >
                          🚚 Chat with Delivery Partner
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{
                    background: "var(--background)",
                    borderRadius: "var(--border-radius-sm)",
                    padding: "16px",
                    marginBottom: "16px"
                  }}>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                      gap: "12px",
                      fontSize: "14px"
                    }}>
                      <div>
                        <span style={{ color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Quantity:</span>
                        <strong style={{ color: "var(--text-primary)" }}>{order.quantity || 1}</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Price:</span>
                        <strong style={{ color: "var(--text-primary)" }}>₹{order.price || 0}</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Total:</span>
                        <strong style={{ color: "var(--primary-green)" }}>₹{order.total || (order.price * order.quantity) || 0}</strong>
                      </div>
                      {order.createdAt && (
                        <div>
                          <span style={{ color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Date:</span>
                          <strong style={{ color: "var(--text-primary)" }}>
                            {new Date(order.createdAt).toLocaleDateString()}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    {order.status?.toLowerCase() !== "delivered" && (
                      <Link
                        to={`/tracking?deliveryId=${order._id}`}
                        className="btn btn-secondary"
                        style={{ flex: 1, fontSize: "14px" }}
                      >
                        📍 Track Delivery
                      </Link>
                    )}
                    <Link
                      to="/orders"
                      className="btn btn-outline"
                      style={{ fontSize: "14px" }}
                      onClick={(e) => {
                        e.preventDefault();
                        // TODO: Implement order details modal or navigation
                        alert("Order details feature coming soon!");
                      }}
                    >
                      📋 Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Section */}
          <div className="card" style={{ position: "sticky", top: "100px", height: "fit-content" }}>
            <h2 style={{ marginBottom: "24px", fontSize: "20px", color: "var(--text-primary)" }}>
              💬 Need Help?
            </h2>
            <ChatBox />
          </div>
        </div>
      )}
    </div>
  );
}
