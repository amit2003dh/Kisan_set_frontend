import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API, { apiCall } from "../api/api";

export default function DeliveryPartnerCommunication() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);
  const [deliveryPartner, setDeliveryPartner] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);

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
    fetchDeliveryPartner();
    fetchMessages();
    
    // Set up polling for partner online status
    const interval = setInterval(() => {
      fetchDeliveryPartner();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
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
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      setError("Failed to fetch order details");
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryPartner = async () => {
    try {
      const { data, error: err } = await apiCall(() => 
        API.get(`/delivery/${orderId}/partner`)
      );
      
      if (err) {
        console.error("Error fetching delivery partner:", err);
      } else if (data && data.partner) {
        setDeliveryPartner(data.partner);
        setIsPartnerOnline(data.partner.isOnline);
      }
    } catch (error) {
      console.error("Error fetching delivery partner:", error);
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
          senderType: currentUser.role === "delivery_partner" ? "delivery_partner" : 
                     currentUser.role === "buyer" ? "buyer" : "seller"
        })
      );

      if (err) {
        setError(err);
      } else {
        setNewMessage("");
        fetchMessages();
        
        // Show success message based on partner status
        if (!isPartnerOnline && deliveryPartner) {
          // Show a temporary success message for offline partner
          const successMsg = document.createElement('div');
          successMsg.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4caf50;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 1000;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          `;
          successMsg.textContent = '✅ Message sent! Partner will receive it when online.';
          document.body.appendChild(successMsg);
          
          setTimeout(() => {
            document.body.removeChild(successMsg);
          }, 3000);
        }
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
          <h1>🚚 Delivery Communication</h1>
          <p>Loading delivery details...</p>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <div className="loading-spinner"></div>
          <p style={{ marginTop: "16px", color: "var(--text-secondary)" }}>
            Loading delivery communication panel...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <div className="page-header">
          <h1>🚚 Delivery Communication</h1>
          <p>Error loading delivery details</p>
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
        <h1>🚚 Delivery Communication</h1>
        <p>Chat with delivery partner about your order</p>
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
            Order & Delivery Details
          </h2>
          
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
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
                <p><strong>Total Amount:</strong> ₹{order.total?.toLocaleString('en-IN')}</p>
                <p><strong>Order Date:</strong> {new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            {deliveryPartner && (
              <div>
                <h4 style={{ marginBottom: "8px", color: "var(--text-secondary)" }}>
                  Delivery Partner 
                  <span style={{
                    marginLeft: "8px",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    background: isPartnerOnline ? "#4caf50" : "#f44336",
                    color: "white"
                  }}>
                    {isPartnerOnline ? "🟢 Online" : "🔴 Offline"}
                  </span>
                </h4>
                <div style={{ padding: "12px", background: "var(--background)", borderRadius: "8px" }}>
                  <p><strong>Name:</strong> {deliveryPartner.name}</p>
                  <p><strong>Partner ID:</strong> {deliveryPartner.partnerId}</p>
                  <p><strong>Phone:</strong> {deliveryPartner.phone}</p>
                  <p><strong>Vehicle:</strong> {deliveryPartner.vehicle?.type} ({deliveryPartner.vehicle?.number})</p>
                  <p><strong>Rating:</strong> ⭐ {deliveryPartner.deliveryStats?.averageRating?.toFixed(1) || "N/A"}</p>
                </div>
              </div>
            )}

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
            💬 Messages with Delivery Partner
          </h3>
          
          {!deliveryPartner ? (
            <div style={{ 
              textAlign: "center", 
              padding: "40px 20px", 
              background: "#fff3e0", 
              borderRadius: "8px",
              marginBottom: "16px"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>🚚</div>
              <h4 style={{ color: "#f57c00", marginBottom: "8px" }}>Delivery Partner Not Assigned</h4>
              <p style={{ color: "#666" }}>
                A delivery partner will be assigned soon. You'll be able to chat with them once they're assigned.
              </p>
            </div>
          ) : !isPartnerOnline ? (
            <div style={{ 
              textAlign: "center", 
              padding: "40px 20px", 
              background: "#e3f2fd", 
              borderRadius: "8px",
              marginBottom: "16px"
            }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>💬</div>
              <h4 style={{ color: "#1976d2", marginBottom: "8px" }}>Delivery Partner Currently Offline</h4>
              <p style={{ color: "#666", marginBottom: "12px" }}>
                You can still send messages. They will receive them when they come back online.
              </p>
              <div style={{ 
                padding: "8px 16px", 
                background: "#bbdefb", 
                borderRadius: "20px",
                display: "inline-block",
                fontSize: "14px",
                color: "#1565c0"
              }}>
                📨 Messages will be delivered when partner is online
              </div>
            </div>
          ) : null}
          
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
                  background: message.senderType === "delivery_partner" ? "#e8f5e9" : 
                    message.senderType === "system" ? "#fff3e0" : "#e3f2fd"
                }}>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "flex-start",
                    marginBottom: "8px"
                  }}>
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      <strong>
                        {message.senderType === "delivery_partner" ? "🚚 Delivery Partner" :
                         message.senderType === "buyer" ? "🛒 Buyer" :
                         message.senderType === "seller" ? "🏪 Seller" : "🤖 System"}
                      </strong>
                      <span style={{ marginLeft: "8px", fontSize: "11px", color: "#999" }}>
                        ({message.senderId?.name || "Unknown"})
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
                placeholder={
                  !deliveryPartner ? "Wait for delivery partner to be assigned..." :
                  "Type your message to delivery partner..."
                }
                className="input"
                style={{ 
                  flex: 1,
                  padding: "12px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--border-radius-sm)",
                  opacity: !deliveryPartner ? 0.6 : 1
                }}
                disabled={!deliveryPartner}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    sendMessage();
                  }
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || !deliveryPartner}
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
