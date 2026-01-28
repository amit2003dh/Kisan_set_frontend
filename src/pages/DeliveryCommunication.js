import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API, { apiCall } from "../api/api";

export default function DeliveryCommunication() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedChat, setSelectedChat] = useState("general");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const { data } = await apiCall(() => API.get("/delivery-partner/messages"));
      if (data) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      setError("Failed to fetch messages");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const { error } = await apiCall(() =>
        API.post(`/delivery-partner/messages/${selectedChat}`, {
          message: newMessage.trim()
        })
      );

      if (error) {
        setError(error);
      } else {
        setNewMessage("");
        // Mock message for now
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          message: newMessage.trim(),
          timestamp: new Date(),
          sender: "partner",
          type: "message"
        }]);
      }
    } catch (error) {
      setError("Failed to send message");
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <div style={{ textAlign: "center" }}>
          <div className="loading-spinner"></div>
          <p>Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
      <div className="page-header" style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <button
              onClick={() => navigate("/delivery-partner")}
              className="btn btn-outline"
              style={{ fontSize: "14px", padding: "8px 16px" }}
            >
              ← Back to Dashboard
            </button>
            <h1>💬 Communication</h1>
            <p>Chat with customers and support team</p>
          </div>
        </div>
      </div>

      {error && <div className="error-message" style={{ marginBottom: "16px" }}>{error}</div>}

      <div className="card">
        <div style={{ display: "flex", gap: "16px" }}>
          {/* Chat List */}
          <div style={{ width: "300px", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
            <div style={{ padding: "16px", borderBottom: "1px solid var(--border-color)" }}>
              <h4 style={{ margin: "0" }}>Chats</h4>
            </div>
            <div style={{ height: "400px", overflowY: "auto" }}>
              <div
                onClick={() => setSelectedChat("general")}
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--border-color)",
                  cursor: "pointer",
                  background: selectedChat === "general" ? "var(--background-alt)" : "transparent"
                }}
              >
                <div style={{ fontWeight: "600" }}>💬 General Support</div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Chat with support team</div>
              </div>
              <div
                onClick={() => setSelectedChat("admin")}
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--border-color)",
                  cursor: "pointer",
                  background: selectedChat === "admin" ? "var(--background-alt)" : "transparent"
                }}
              >
                <div style={{ fontWeight: "600" }}>👨‍💼 Admin</div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Chat with admin team</div>
              </div>
            </div>
          </div>

          {/* Chat Window */}
          <div style={{ flex: 1, border: "1px solid var(--border-color)", borderRadius: "8px" }}>
            <div style={{ padding: "16px", borderBottom: "1px solid var(--border-color)" }}>
              <h4 style={{ margin: "0" }}>
                {selectedChat === "general" ? "💬 General Support" : "👨‍💼 Admin"}
              </h4>
            </div>
            <div style={{ height: "400px", overflowY: "auto", padding: "16px" }}>
              {messages.length === 0 ? (
                <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px" }}>
                  No messages yet. Start a conversation!
                </p>
              ) : (
                messages.map((msg, index) => (
                  <div key={index} style={{
                    marginBottom: "16px",
                    display: "flex",
                    justifyContent: msg.sender === "partner" ? "flex-end" : "flex-start"
                  }}>
                    <div style={{
                      maxWidth: "70%",
                      padding: "8px 12px",
                      borderRadius: "12px",
                      background: msg.sender === "partner" ? "var(--primary-blue)" : "var(--background-alt)",
                      color: msg.sender === "partner" ? "white" : "var(--text-primary)"
                    }}>
                      <p style={{ margin: "0 0 4px 0", fontSize: "12px" }}>
                        {msg.sender === "partner" ? "You" : msg.sender}
                      </p>
                      <p style={{ margin: "0 0 4px 0" }}>{msg.message}</p>
                      <p style={{ margin: "0", fontSize: "10px", opacity: 0.7 }}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div style={{ padding: "16px", borderTop: "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  style={{ 
                    flex: 1, 
                    padding: "8px 12px", 
                    border: "1px solid var(--border-color)", 
                    borderRadius: "4px" 
                  }}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                />
                <button
                  onClick={sendMessage}
                  className="btn btn-primary"
                  style={{ fontSize: "14px", padding: "8px 16px" }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h3 style={{ marginBottom: "16px" }}>📞 Quick Actions</h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button className="btn btn-secondary" style={{ fontSize: "14px" }}>
            📞 Call Support
          </button>
          <button className="btn btn-secondary" style={{ fontSize: "14px" }}>
            📧 Email Support
          </button>
          <button className="btn btn-secondary" style={{ fontSize: "14px" }}>
            📋 Report Issue
          </button>
          <button className="btn btn-secondary" style={{ fontSize: "14px" }}>
            ❓ Help Center
          </button>
        </div>
      </div>
    </div>
  );
}
