import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/api";
import { apiCall } from "../api/api";
import ChatBox from "../components/ChatBox";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchOrders();
  }, []);

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
      case "delivered":
        return "#4caf50";
      case "pending":
        return "#ff9800";
      case "cancelled":
        return "#f44336";
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
      default:
        return "📦";
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <div className="loading-spinner"></div>
        <p style={{ textAlign: "center", color: "var(--text-secondary)" }}>Loading orders...</p>
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
            Your orders will appear here
          </p>
          <Link to="/crops" className="btn btn-primary">
            Browse Crops
          </Link>
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
                        margin: 0,
                        color: "var(--text-secondary)",
                        fontSize: "14px"
                      }}>
                        {order.itemType === "crop" ? "🌾 Crop" : "🛒 Product"}
                      </p>
                    </div>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      background: `${getStatusColor(order.status)}20`,
                      color: getStatusColor(order.status),
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "600"
                    }}>
                      {getStatusIcon(order.status)} {order.status || "Pending"}
                    </span>
                  </div>

                  <div style={{
                    background: "var(--background)",
                    borderRadius: "var(--border-radius-sm)",
                    padding: "16px",
                    marginBottom: "16px"
                  }}>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                      fontSize: "14px"
                    }}>
                      <span style={{ color: "var(--text-secondary)" }}>Quantity:</span>
                      <strong style={{ color: "var(--text-primary)" }}>{order.quantity || 1}</strong>
                    </div>
                    {order.createdAt && (
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "14px"
                      }}>
                        <span style={{ color: "var(--text-secondary)" }}>Order Date:</span>
                        <strong style={{ color: "var(--text-primary)" }}>
                          {new Date(order.createdAt).toLocaleDateString()}
                        </strong>
                      </div>
                    )}
                  </div>

                  {order.status?.toLowerCase() !== "delivered" && (
                    <Link
                      to={`/tracking?deliveryId=${order._id}`}
                      className="btn btn-secondary"
                      style={{ width: "100%", fontSize: "14px" }}
                    >
                      📍 Track Delivery
                    </Link>
                  )}
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
