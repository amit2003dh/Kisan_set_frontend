import { useState, useEffect } from "react";
import API, { apiCall } from "../api/api";

export default function OrderChat({ orderId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
    if (orderId) {
      console.log("🔍 OrderChat: Fetching messages for orderId:", orderId);
      fetchMessages();
    } else {
      console.log("⚠️ OrderChat: No orderId provided, setting loading to false");
      setLoading(false);
    }
  }, [orderId]);

  const fetchMessages = async () => {
    if (!orderId) {
      console.log("❌ OrderChat: No orderId available");
      setError("Order ID is required");
      setLoading(false);
      return;
    }

    try {
      console.log("📨 OrderChat: Fetching messages from:", `/orders/${orderId}/messages`);
      const { data, error: err } = await apiCall(() => 
        API.get(`/orders/${orderId}/messages`)
      );
      
      if (err) {
        console.error("❌ OrderChat: API Error:", err);
        setError(err);
      } else {
        console.log("✅ OrderChat: Messages fetched successfully:", data);
        // Backend returns messages array directly, not wrapped in data.messages
        setMessages(data || []);
      }
    } catch (error) {
      console.error("❌ OrderChat: Error fetching messages:", error);
      setError("Failed to fetch messages");
    } finally {
      console.log("🏁 OrderChat: Setting loading to false");
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const messageData = {
        message: newMessage.trim(),
        senderType: currentUser.role // 'buyer' or 'seller'
      };
      
      console.log("📝 Sending message with data:", messageData);
      console.log("🔍 Current user:", currentUser);
      console.log("🔍 Order ID:", orderId);

      const { data, error: err } = await apiCall(() =>
        API.post(`/orders/${orderId}/message`, messageData)
      );

      if (err) {
        console.error("❌ API Error:", err);
        setError(err);
      } else {
        console.log("✅ Message sent successfully:", data);
        setNewMessage("");
        // Refresh messages to get the new one
        fetchMessages();
      }
    } catch (error) {
      console.error("❌ Error sending message:", error);
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

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div className="loading-spinner"></div>
        <p style={{ marginTop: "16px", color: "var(--text-secondary)" }}>
          Loading messages...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px", color: "var(--error)" }}>❌</div>
        <p style={{ color: "var(--error)" }}>{error}</p>
        <button
          onClick={fetchMessages}
          className="btn btn-primary"
          style={{ marginTop: "16px" }}
        >
          🔄 Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {error && <div className="error-message">{error}</div>}
      
      <div style={{ 
        border: "1px solid var(--border)", 
        borderRadius: "var(--border-radius-sm)", 
        height: "400px",
        overflowY: "auto",
        padding: "16px",
        background: "#fafafa",
        marginBottom: "16px"
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
  );
}
