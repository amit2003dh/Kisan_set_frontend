import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API, { apiCall } from "../api/api";
import {
  MessageSquare,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Send,
  CheckCircle2,
  Truck,
  PartyPopper,
  XCircle,
  Package
} from "lucide-react";

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
        setError(""); // Clear any previous error on successful order fetch
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
      const { data } = await apiCall(() => 
        API.get(`/orders/${orderId}/messages`)
      );
      
      if (data && Array.isArray(data)) {
        setMessages(data);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.warn("Could not load order messages:", error);
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const messageData = {
        message: newMessage.trim(),
        senderType: currentUser.role
      };

      const { data, error: err } = await apiCall(() =>
        API.post(`/orders/${orderId}/message`, messageData)
      );

      if (err) {
        setError(err);
      } else {
        setNewMessage("");
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
        return "#2e7d32";
      case "cancelled":
        return "#f44336";
      default:
        return "#757575";
    }
  };

  const renderStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return <CheckCircle2 size={14} />;
      case "out for delivery":
        return <Truck size={14} />;
      case "delivered":
        return <PartyPopper size={14} />;
      case "cancelled":
        return <XCircle size={14} />;
      default:
        return <Package size={14} />;
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <div className="page-header">
          <h1 style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
            <MessageSquare size={32} color="var(--primary-blue)" />
            <span>Order Communication</span>
          </h1>
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

  if (error || !order) {
    const errorMsg = typeof error === 'object' ? error.message || error.error || "Order not found" : error || "Order not found";
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <div className="page-header">
          <h1 style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
            <MessageSquare size={32} color="var(--primary-blue)" />
            <span>Order Communication</span>
          </h1>
          <p>View & manage order communications</p>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ marginBottom: "16px", display: "flex", justifyContent: "center" }}>
            <AlertCircle size={64} color="#ed6c02" />
          </div>
          <h3 style={{ marginBottom: "8px", color: "var(--text-primary)" }}>Order Details Unavailable</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "24px", maxWidth: "480px", margin: "0 auto 24px" }}>
            {errorMsg.includes("Network") ? "Could not reach the order service. Please check server or try again." : "The requested order ID does not exist or has been removed."}
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button
              onClick={() => navigate("/orders")}
              className="btn btn-secondary"
              style={{ display: "inline-flex", alignItems: 'center', gap: "8px" }}
            >
              <ArrowLeft size={16} />
              <span>Back to Orders</span>
            </button>
            <button
              onClick={() => { setError(""); setLoading(true); fetchOrderDetails(); fetchMessages(); }}
              className="btn btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
            >
              <RefreshCw size={16} />
              <span>Retry</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
      <div className="page-header">
        <h1 style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
          <MessageSquare size={32} color="var(--primary-blue)" />
          <span>Order Communication</span>
        </h1>
        <p style={{ marginTop: "8px" }}>Communicate with {currentUser?.role === "buyer" ? "seller" : "buyer"} about this order</p>
        <button
          onClick={() => navigate("/orders")}
          className="btn btn-secondary"
          style={{ marginTop: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <ArrowLeft size={16} />
          <span>Back to Orders</span>
        </button>
      </div>

      {order && (
        <div className="card" style={{ marginBottom: "32px", marginTop: "24px" }}>
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
                <p style={{ display: "flex", alignItems: "center", gap: "6px", margin: "8px 0" }}>
                  <strong>Status:</strong> 
                  <span style={{
                    padding: "4px 8px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    background: getStatusColor(order.status),
                    color: "white",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                    {renderStatusIcon(order.status)} <span>{order.status}</span>
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
                {order.deliveryInfo?.deliveryAddress ? (
                  <>
                    <p><strong>Address:</strong> {order.deliveryInfo.deliveryAddress.address}</p>
                    <p><strong>City:</strong> {order.deliveryInfo.deliveryAddress.city}</p>
                    <p><strong>State:</strong> {order.deliveryInfo.deliveryAddress.state}</p>
                    <p><strong>Pincode:</strong> {order.deliveryInfo.deliveryAddress.pincode}</p>
                  </>
                ) : (
                  <p>Address not provided</p>
                )}
              </div>
            </div>
          </div>

          <h3 style={{ marginBottom: "16px", fontSize: "18px", color: "var(--text-primary)", display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <MessageSquare size={20} color="var(--primary-blue)" />
            <span>Messages</span>
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
                <div style={{ marginBottom: "16px", display: "flex", justifyContent: "center" }}>
                  <MessageSquare size={48} color="#ccc" />
                </div>
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={message._id || index} style={{
                  marginBottom: "16px",
                  padding: "12px",
                  borderRadius: "8px",
                  background: message.senderType === "system" ? "#fff3e0" : 
                    message.senderType === currentUser?.role ? "#e3f2fd" : "#e8f5e9"
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
                    {message.message || message.content}
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
                style={{ padding: "12px 24px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Send size={16} />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
