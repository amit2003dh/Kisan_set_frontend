import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";

const socket = io(process.env.REACT_APP_API_URL?.replace('/api', '') || "http://localhost:5000");
console.log("Socket.IO connecting to:", socket.io.uri);
export default function ChatBox() {
  const [msg, setMsg] = useState("");
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const userName = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user")).name || "User"
    : "User";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("receiveMessage", (messageData) => {
      const message = typeof messageData === "string" 
        ? { text: messageData, sender: "Other", timestamp: new Date() }
        : messageData;
      
      setMessages(prev => [...prev, message]);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("receiveMessage");
    };
  }, []);

  const send = (e) => {
    e?.preventDefault();
    
    if (!msg.trim()) return;

    const messageData = {
      text: msg,
      sender: userName,
      timestamp: new Date()
    };

    socket.emit("sendMessage", messageData.text);
    
    // Add to local messages immediately for better UX
    setMessages(prev => [...prev, { ...messageData, sender: "You" }]);
    setMsg("");
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "500px",
      background: "var(--surface)",
      borderRadius: "var(--border-radius-sm)",
      overflow: "hidden",
      border: "1px solid var(--border)"
    }}>
      {/* Chat Header */}
      <div style={{
        background: "linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)",
        color: "white",
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ fontSize: "24px" }}>💬</div>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>Live Chat</h3>
            <div style={{ fontSize: "12px", opacity: 0.9 }}>
              {isConnected ? (
                <span style={{ color: "#4caf50" }}>● Online</span>
              ) : (
                <span style={{ color: "#f44336" }}>● Offline</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "20px",
        background: "var(--background)",
        display: "flex",
        flexDirection: "column",
        gap: "12px"
      }}>
        {messages.length === 0 ? (
          <div style={{
            textAlign: "center",
            color: "var(--text-secondary)",
            padding: "40px 20px"
          }}>
            <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.5 }}>💬</div>
            <p>No messages yet. Start a conversation!</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const isOwn = m.sender === "You" || m.sender === userName;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: isOwn ? "flex-end" : "flex-start",
                  marginBottom: "8px"
                }}
              >
                <div style={{
                  maxWidth: "70%",
                  padding: "12px 16px",
                  borderRadius: "var(--border-radius-sm)",
                  background: isOwn 
                    ? "linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)"
                    : "var(--surface)",
                  color: isOwn ? "white" : "var(--text-primary)",
                  boxShadow: "var(--shadow-sm)",
                  wordWrap: "break-word"
                }}>
                  {!isOwn && (
                    <div style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      marginBottom: "4px",
                      opacity: 0.8
                    }}>
                      {m.sender}
                    </div>
                  )}
                  <div style={{ fontSize: "15px", lineHeight: "1.5" }}>
                    {typeof m === "string" ? m : m.text}
                  </div>
                  <div style={{
                    fontSize: "11px",
                    marginTop: "4px",
                    opacity: 0.7,
                    textAlign: "right"
                  }}>
                    {formatTime(m.timestamp)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: "16px 20px",
        background: "var(--surface)",
        borderTop: "1px solid var(--border)"
      }}>
        <form onSubmit={send} style={{ display: "flex", gap: "12px" }}>
          <input
            className="input"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Type your message..."
            disabled={!isConnected}
            style={{ flex: 1, margin: 0 }}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(e);
              }
            }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!msg.trim() || !isConnected}
            style={{ padding: "12px 24px" }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
