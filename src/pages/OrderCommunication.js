import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API, { apiCall } from "../api/api";

export default function OrderCommunication() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

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

  useEffect(() => {
    fetchOrderDetails();
    fetchMessages();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const { data, error: err } = await apiCall(() => 
        API.get(`/orders/${orderId}`)
      );
      
      if (err) {
        setError(err);
      } else {
        setOrder(data);
        console.log("Order details fetched:", data); // Debug log
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      setError("Failed to fetch order details");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error: err } = await apiCall(() => 
        API.get(`/orders/${orderId}/messages`)
      );
      
      if (err) {
        setError(err);
      } else {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      setError("Failed to fetch messages");
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const { data, error: err } = await apiCall(() =>
        API.post(`/orders/${orderId}/message`, {
          message: newMessage.trim(),
          senderType: currentUser.role // 'buyer' or 'seller'
        })
      );

      if (err) {
        setError(err);
      } else {
        setNewMessage("");
        // Refresh messages to get the new one
        fetchMessages();
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message");
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return "#4caf50";
      case "out for delivery":
        return "#2196f3";
      case "delivered":
        return "#4caf50";
      case "cancelled":
        return "#f44336";
      default:
        return "#757575";
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return "📋";
      case "out for delivery":
        return "🚚";
      case "delivered":
        return "✅";
      case "cancelled":
        return "❌";
      default:
        return "📋";
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <div className="page-header">
          <h1>📋 Order Communication</h1>
          <p>Loading order details...</p>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <div className="loading-spinner"></div>
          <p style={{ marginTop: "16px", color: "var(--text-secondary)" }}>
            Loading communication panel...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <div className="page-header">
          <h1>📋 Order Communication</h1>
          <p>Error loading order</p>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px", color: "var(--error)" }}>❌</div>
          <p style={{ color: "var(--error)" }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
            style={{ marginTop: "16px" }}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
      <div className="page-header">
        <h1>📋 Order Communication</h1>
        <p>Communicate with {currentUser?.role === "buyer" ? "seller" : "buyer"} about this order</p>
        <button
          onClick={() => navigate("/orders")}
          className="btn btn-secondary"
          style={{ marginLeft: "16px" }}
        >
          ← Back to Orders
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {order && (
        <div className="card" style={{ marginBottom: "32px" }}>
          <h2 style={{ marginBottom: "24px", fontSize: "20px", color: "var(--text-primary)" }}>
            Order Details
          </h2>
          
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
            gap: "16px",
            marginBottom: "24px"
          }}>
            <div>
              <h4 style={{ marginBottom: "8px", color: "var(--text-secondary)" }}>Order Information</h4>
              <div style={{ padding: "12px", background: "var(--background)", borderRadius: "8px" }}>
                <p><strong>Order ID:</strong> {order._id}</p>
                <p><strong>Status:</strong> 
                  <span style={{
                    padding: "4px 8px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    background: getStatusColor(order.status),
                    color: "white"
                  }}>
                    {getStatusIcon(order.status)} {order.status}
                  </span>
                </p>
                <p><strong>Payment Method:</strong> {order.paymentMethod || "Not specified"}</p>
                <p><strong>Total Amount:</strong> ₹{order.total?.toLocaleString('en-IN')}</p>
                <p><strong>Order Date:</strong> {new Date(order.createdAt).toLocaleDateString()}</p>
                {order.orderItems && order.orderItems.length > 1 && (
                  <p><strong>Items:</strong> {order.orderItems.length} items combined into this order</p>
                )}
              </div>
            </div>

            <div>
              <h4 style={{ marginBottom: "8px", color: "var(--text-secondary)" }}>Delivery Address</h4>
              <div style={{ padding: "12px", background: "var(--background)", borderRadius: "8px" }}>
                {order.deliveryAddress ? (
                  <>
                    <p><strong>Address:</strong> {order.deliveryAddress.address}</p>
                    <p><strong>City:</strong> {order.deliveryAddress.city}</p>
                    <p><strong>State:</strong> {order.deliveryAddress.state}</p>
                    <p><strong>Pincode:</strong> {order.deliveryAddress.pincode}</p>
                  </>
                ) : (
                  <p>Address not provided</p>
                )}
              </div>
            </div>
          </div>

          <h3 style={{ marginBottom: "16px", fontSize: "18px", color: "var(--text-primary)" }}>
            💬 Messages
          </h3>
          
          <div style={{ 
            border: "1px solid var(--border)", 
            borderRadius: "var(--border-radius-sm)", 
            height: "400px",
            overflowY: "auto",
            padding: "16px",
            background: "#fafafa"
          }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-secondary)" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>💬</div>
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={message._id} style={{
                  marginBottom: "16px",
                  padding: "12px",
                  borderRadius: "8px",
                  background: message.senderType === "system" ? "#fff3e0" : 
                    message.senderType === currentUser.role ? "#e3f2fd" : "#e8f5e9"
                }}>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "flex-start",
                    marginBottom: "8px"
                  }}>
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      <strong>{message.senderId?.name || "Unknown"}</strong>
                      <span style={{ marginLeft: "8px", fontSize: "11px", color: "#999" }}>
                        ({message.senderType})
                      </span>
                      <span style={{ marginLeft: "8px", fontSize: "11px", color: "#999" }}>
                        {new Date(message.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {message.messageType === "status_update" && (
                      <div style={{ 
                        fontSize: "11px", 
                        padding: "4px 8px", 
                        background: "#e8f5e9", 
                        borderRadius: "4px",
                        color: "white"
                      }}>
                        Status Update
                      </div>
                    )}
                  </div>
                  <div style={{ 
                    fontSize: "14px", 
                    lineHeight: "1.5",
                    color: "var(--text-primary)",
                    whiteSpace: "pre-wrap"
                  }}>
                    {message.content}
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: "16px" }}>
            <div style={{ display: "flex", gap: "12px" }}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="input"
                style={{ 
                  flex: 1,
                  padding: "12px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--border-radius-sm)"
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    sendMessage();
                  }
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="btn btn-primary"
                style={{ padding: "12px 24px" }}
              >
                📤 Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
