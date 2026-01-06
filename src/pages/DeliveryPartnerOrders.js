import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API, { apiCall } from "../api/api";

export default function DeliveryPartnerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all"); // all, assigned, in-transit, delivered
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        setCurrentUser(JSON.parse(user));
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    
    const { data, error: err } = await apiCall(() => API.get("/delivery-partner/my-orders"));
    
    if (err) {
      setError(err);
    } else {
      setOrders(data.deliveries || []);
    }
    
    setLoading(false);
  };

  const filteredOrders = filter === "all" 
    ? orders 
    : orders.filter(o => o.status?.toLowerCase() === filter.toLowerCase());

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "assigned":
        return "#ff9800";
      case "picked up":
        return "#2196f3";
      case "in transit":
        return "#2196f3";
      case "delivered":
        return "#4caf50";
      case "failed":
        return "#f44336";
      default:
        return "#757575";
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "assigned":
        return "📋";
      case "picked up":
        return "📦";
      case "in transit":
        return "🚚";
      case "delivered":
        return "✅";
      case "failed":
        return "❌";
      default:
        return "📦";
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      const { error: err } = await apiCall(() =>
        API.put(`/delivery-partner/orders/${orderId}/accept`)
      );

      if (err) {
        setError(err);
      } else {
        fetchOrders(); // Refresh orders
      }
    } catch (error) {
      console.error("Error accepting order:", error);
      setError("Failed to accept order");
    }
  };

  const handlePickupOrder = async (orderId) => {
    try {
      const { error: err } = await apiCall(() =>
        API.put(`/delivery-partner/orders/${orderId}/pickup`)
      );

      if (err) {
        setError(err);
      } else {
        fetchOrders(); // Refresh orders
      }
    } catch (error) {
      console.error("Error picking up order:", error);
      setError("Failed to update pickup status");
    }
  };

  const handleDeliverOrder = async (orderId) => {
    try {
      const { error: err } = await apiCall(() =>
        API.put(`/delivery-partner/orders/${orderId}/deliver`)
      );

      if (err) {
        setError(err);
      } else {
        fetchOrders(); // Refresh orders
      }
    } catch (error) {
      console.error("Error delivering order:", error);
      setError("Failed to mark order as delivered");
    }
  };

  const updateLocation = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const { error: err } = await apiCall(() =>
              API.put("/delivery-partner/location", {
                lat: latitude,
                lng: longitude
              })
            );

            if (err) {
              setError(err);
            } else {
              alert("Location updated successfully!");
            }
          } catch (error) {
            console.error("Error updating location:", error);
            setError("Failed to update location");
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          setError("Failed to get current location");
        }
      );
    } else {
      setError("Geolocation is not supported by this browser");
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
        <h1>📦 My Delivery Orders</h1>
        <p>Manage and track your delivery assignments</p>
        <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
          <button
            onClick={updateLocation}
            className="btn btn-secondary"
            style={{ fontSize: "14px", padding: "10px 20px" }}
          >
            📍 Update Location
          </button>
          <Link
            to="/delivery-partner"
            className="btn btn-outline"
            style={{ fontSize: "14px", padding: "10px 20px" }}
          >
            🏠 Dashboard
          </Link>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Filter Buttons */}
      <div style={{ 
        display: "flex", 
        gap: "12px", 
        marginBottom: "32px",
        flexWrap: "wrap"
      }}>
        <button
          onClick={() => setFilter("all")}
          className={`btn ${filter === "all" ? "btn-primary" : "btn-secondary"}`}
          style={{ fontSize: "14px", padding: "10px 20px" }}
        >
          All Orders ({orders.length})
        </button>
        <button
          onClick={() => setFilter("assigned")}
          className={`btn ${filter === "assigned" ? "btn-primary" : "btn-secondary"}`}
          style={{ fontSize: "14px", padding: "10px 20px" }}
        >
          📋 Assigned ({orders.filter(o => o.status === "Assigned").length})
        </button>
        <button
          onClick={() => setFilter("in transit")}
          className={`btn ${filter === "in transit" ? "btn-primary" : "btn-secondary"}`}
          style={{ fontSize: "14px", padding: "10px 20px" }}
        >
          🚚 In Transit ({orders.filter(o => o.status === "In Transit").length})
        </button>
        <button
          onClick={() => setFilter("delivered")}
          className={`btn ${filter === "delivered" ? "btn-primary" : "btn-secondary"}`}
          style={{ fontSize: "14px", padding: "10px 20px" }}
        >
          ✅ Delivered ({orders.filter(o => o.status === "Delivered").length})
        </button>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="empty-state card">
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>📦</div>
          <h3 style={{ marginBottom: "8px", color: "var(--text-primary)" }}>
            No {filter === "all" ? "" : filter} orders yet
          </h3>
          <p style={{ color: "var(--text-secondary)" }}>
            {filter === "all" ? "Go online to receive delivery assignments" : `No ${filter} orders found`}
          </p>
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "1fr", gap: "16px" }}>
          {filteredOrders.map((order) => (
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
                    Order #{order.orderId?._id?.slice(-8).toUpperCase()}
                  </h3>
                  <p style={{
                    margin: "0 0 4px 0",
                    color: "var(--text-primary)",
                    fontSize: "16px",
                    fontWeight: "500"
                  }}>
                    {order.orderId?.itemId?.name || "Product Item"}
                  </p>
                  <p style={{
                    margin: 0,
                    color: "var(--text-secondary)",
                    fontSize: "14px"
                  }}>
                    {order.orderId?.itemType === "crop" ? "🌾 Crop" : 
                     order.orderId?.itemType === "seed" ? "🌱 Seed" : 
                     order.orderId?.itemType === "pesticide" ? "🧪 Pesticide" : "🛒 Product"}
                  </p>
                </div>
                <div style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "center"
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
                </div>
              </div>

              {/* Customer Information */}
              {order.orderId?.buyerId && (
                <div style={{
                  background: "#e3f2fd",
                  borderRadius: "var(--border-radius-sm)",
                  padding: "12px",
                  marginBottom: "16px"
                }}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#1976d2" }}>
                    🛒 Customer Information
                  </h4>
                  <div style={{ fontSize: "13px", color: "#666" }}>
                    <p style={{ margin: "4px 0" }}><strong>Name:</strong> {order.orderId.buyerId.name}</p>
                    <p style={{ margin: "4px 0" }}><strong>Phone:</strong> {order.orderId.buyerId.phone}</p>
                  </div>
                </div>
              )}

              {/* Delivery Address */}
              {order.destination && (
                <div style={{
                  background: "#fff3e0",
                  borderRadius: "var(--border-radius-sm)",
                  padding: "12px",
                  marginBottom: "16px"
                }}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#f57c00" }}>
                    📍 Delivery Address
                  </h4>
                  <div style={{ fontSize: "13px", color: "#666" }}>
                    <p style={{ margin: "4px 0" }}><strong>Address:</strong> {order.destination.address}</p>
                    {order.destination.city && <p style={{ margin: "4px 0" }}><strong>City:</strong> {order.destination.city}</p>}
                    {order.destination.pincode && <p style={{ margin: "4px 0" }}><strong>Pincode:</strong> {order.destination.pincode}</p>}
                  </div>
                </div>
              )}

              {/* Order Details */}
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
                    <strong style={{ color: "var(--text-primary)" }}>{order.orderId?.quantity || 1}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Total:</span>
                    <strong style={{ color: "var(--primary-green)" }}>₹{order.orderId?.total || 0}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Payment:</span>
                    <strong style={{ color: "var(--text-primary)" }}>{order.orderId?.paymentMethod || "COD"}</strong>
                  </div>
                  {order.assignedAt && (
                    <div>
                      <span style={{ color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Assigned:</span>
                      <strong style={{ color: "var(--text-primary)" }}>
                        {new Date(order.assignedAt).toLocaleDateString()}
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "8px" }}>
                <Link
                  to={`/orders/${order.orderId._id}/delivery-chat`}
                  className="btn btn-primary"
                  style={{ fontSize: "14px", flex: 1 }}
                >
                  💬 Chat with Customer
                </Link>
                
                {order.status === "Assigned" && (
                  <button
                    onClick={() => handleAcceptOrder(order._id)}
                    className="btn btn-success"
                    style={{ fontSize: "14px" }}
                  >
                    ✅ Accept
                  </button>
                )}
                
                {order.status === "Assigned" && (
                  <button
                    onClick={() => handlePickupOrder(order._id)}
                    className="btn btn-secondary"
                    style={{ fontSize: "14px" }}
                  >
                    📦 Picked Up
                  </button>
                )}
                
                {order.status === "In Transit" && (
                  <button
                    onClick={() => handleDeliverOrder(order._id)}
                    className="btn btn-success"
                    style={{ fontSize: "14px" }}
                  >
                    ✅ Mark Delivered
                  </button>
                )}
                
                <Link
                  to={`/tracking?deliveryId=${order._id}`}
                  className="btn btn-outline"
                  style={{ fontSize: "14px" }}
                >
                  📍 Track
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
