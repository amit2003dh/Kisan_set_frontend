import { useEffect, useState, useRef } from "react";
import API, { apiCall } from "../api/api";
import { io } from "socket.io-client";

export default function SellerChat({ chatId, onBack }) {
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [recipientOnline, setRecipientOnline] = useState(false);
  const [recipientLastSeen, setRecipientLastSeen] = useState(null);
  const [messageStatus, setMessageStatus] = useState({});
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [smartResponses, setSmartResponses] = useState([]);
  const [customResponses, setCustomResponses] = useState([]);
  const [showCustomResponses, setShowCustomResponses] = useState(false);
  const [editingCustomResponse, setEditingCustomResponse] = useState("");
  const [editingIndex, setEditingIndex] = useState(-1);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Load custom responses from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("customResponses");
    if (saved) {
      try {
        setCustomResponses(JSON.parse(saved));
      } catch (error) {
        console.error("Error loading custom responses:", error);
      }
    }
  }, []);

  // Save custom responses to localStorage
  const saveCustomResponses = (responses) => {
    localStorage.setItem("customResponses", JSON.stringify(responses));
  };

  // Add custom response
  const addCustomResponse = () => {
    if (editingCustomResponse.trim()) {
      const newResponses = [...customResponses, editingCustomResponse];
      setCustomResponses(newResponses);
      saveCustomResponses(newResponses);
      setEditingCustomResponse("");
      setEditingIndex(-1);
      setShowCustomResponses(false);
    }
  };

  // Update custom response
  const updateCustomResponse = (index, newText) => {
    const updatedResponses = [...customResponses];
    updatedResponses[index] = newText;
    setCustomResponses(updatedResponses);
    saveCustomResponses(updatedResponses);
    setEditingCustomResponse("");
    setEditingIndex(-1);
    setShowCustomResponses(false);
  };

  // Delete custom response
  const deleteCustomResponse = (index) => {
    const updatedResponses = customResponses.filter((_, i) => i !== index);
    setCustomResponses(updatedResponses);
    saveCustomResponses(updatedResponses);
  };

  // Smart response templates
  const responseTemplates = {
    greeting: [
      "Hello! How can I help you today?",
      "Hi there! What can I do for you?",
      "Good day! How may I assist you?"
    ],
    price: [
      "The price is ₹{price} per {unit}. Would you like to know more?",
      "This item costs ₹{price} per {unit}. Is there anything else you'd like to know?",
      "Current price: ₹{price}/{unit}. Would you like to place an order?"
    ],
    availability: [
      "Yes, this item is available! Would you like to order?",
      "This item is currently in stock. How many would you like?",
      "Great news! This item is available. What quantity do you need?"
    ],
    location: [
      "We're located in {location}. Would you like directions?",
      "Our shop is at {location}. Can I help you find us?",
      "We're based in {location}. How can I assist you?"
    ],
    delivery: [
      "We offer delivery within {area}. When would you like it delivered?",
      "Delivery available in {area}. What's your preferred time?",
      "We can deliver to {area}. Would you like to know the delivery charges?"
    ],
    payment: [
      "We accept cash, UPI, and bank transfers. How would you like to pay?",
      "Payment options: Cash, UPI, Bank Transfer. What works for you?",
      "You can pay via cash, UPI, or bank transfer. Which do you prefer?"
    ],
    thanks: [
      "You're welcome! Is there anything else I can help with?",
      "My pleasure! Let me know if you need anything else.",
      "Happy to help! Feel free to ask if you have more questions."
    ],
    bye: [
      "Goodbye! Have a great day!",
      "Thank you for chatting! See you soon!",
      "Take care! Feel free to reach out anytime."
    ]
  };

  // Generate smart responses based on message content
  const generateSmartResponses = (message) => {
    const lowerMessage = message.toLowerCase().trim();
    const responses = [];

    // Check for greetings
    if (lowerMessage.match(/^(hi|hello|hey|good morning|good afternoon|good evening)/)) {
      responses.push(...responseTemplates.greeting);
    }

    // Check for price inquiries
    if (lowerMessage.match(/price|cost|rate|how much/)) {
      const priceMatch = lowerMessage.match(/(\d+)/);
      if (priceMatch) {
        responses.push(...responseTemplates.price.map(r => r.replace('{price}', priceMatch[1]).replace('{unit}', 'kg')));
      } else {
        responses.push("Could you please specify which item you're interested in? I'd be happy to provide pricing information.");
      }
    }

    // Check for availability
    if (lowerMessage.match(/available|stock|in stock|have you got/)) {
      responses.push(...responseTemplates.availability);
    }

    // Check for location/directions
    if (lowerMessage.match(/where|location|address|directions|find you/)) {
      responses.push(...responseTemplates.location.map(r => r.replace('{location}', 'our shop')));
    }

    // Check for delivery
    if (lowerMessage.match(/delivery|deliver|shipping|courier/)) {
      responses.push(...responseTemplates.delivery.map(r => r.replace('{area}', 'your area')));
    }

    // Check for payment
    if (lowerMessage.match(/pay|payment|cash|upi|bank/)) {
      responses.push(...responseTemplates.payment);
    }

    // Check for thanks
    if (lowerMessage.match(/thank|thanks|appreciate/)) {
      responses.push(...responseTemplates.thanks);
    }

    // Check for goodbye
    if (lowerMessage.match(/bye|goodbye|see you|take care/)) {
      responses.push(...responseTemplates.bye);
    }

    // Add custom responses
    const customMatches = customResponses.filter(response => 
      lowerMessage.includes(response.toLowerCase()) || 
      response.toLowerCase().includes(lowerMessage)
    );
    responses.push(...customMatches);

    // Default responses
    if (responses.length === 0) {
      responses.push(
        "I understand your message. Let me help you with that.",
        "That's interesting! Could you provide more details?",
        "I'm here to help! Could you please clarify what you need?",
        "Let me assist you with that. What specific information would you like?"
      );
    }

    return responses.slice(0, 5); // Return top 5 suggestions
  };

  useEffect(() => {
    if (chatId) {
      fetchChat();
      connectSocket();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [chatId]);

  const connectSocket = () => {
    const token = localStorage.getItem("token");
    if (token) {
      socketRef.current = io(process.env.REACT_APP_API_URL, {
        auth: { token }
      });

      // Authenticate user
      socketRef.current.emit("authenticate", {
        userId: user._id,
        userRole: user.role,
        name: user.name
      });

      socketRef.current.emit("joinChat", chatId);
      
      socketRef.current.on("newMessage", (data) => {
        if (data.chatId === chatId) {
          setMessages(prev => [...prev, data.message]);
          scrollToBottom();
          
          // Update message status
          if (data.message.senderId !== user._id) {
            setMessageStatus(prev => ({
              ...prev,
              [data.message._id || `${data.message.timestamp}`]: {
                delivered: true,
                read: false,
                timestamp: new Date()
              }
            }));
          }
        }
      });

      socketRef.current.on("newMessageNotification", (data) => {
        if (data.chatId === chatId) {
          setMessages(prev => [...prev, data.message]);
          scrollToBottom();
        }
      });

      socketRef.current.on("userTyping", (data) => {
        if (data.isTyping) {
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 3000);
        }
      });

      // Handle online/offline status
      socketRef.current.on("userOnline", (userData) => {
        if (chat && (userData.userId === chat.customerId?._id || userData.userId === chat.sellerId?._id)) {
          setRecipientOnline(true);
          setRecipientLastSeen(null);
        }
      });

      socketRef.current.on("userOffline", (userData) => {
        if (chat && (userData.userId === chat.customerId?._id || userData.userId === chat.sellerId?._id)) {
          setRecipientOnline(false);
          setRecipientLastSeen(userData.lastSeen);
        }
      });
    }
  };

  const fetchChat = async () => {
    setLoading(true);
    setError("");
    
    const { data, error: err } = await apiCall(() =>
      API.get(`/chat/${chatId}`)
    );
    
    if (err) {
      setError(err);
    } else {
      setChat(data);
      setMessages(data.messages || []);
      scrollToBottom();
      markAsRead();
    }
    
    setLoading(false);
  };

  const markAsRead = async () => {
    await apiCall(() => API.put(`/chat/${chatId}/read`));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    const messageData = {
      content: newMessage.trim(),
      messageType: "text"
    };

    try {
      const { data } = await apiCall(() =>
        API.post(`/chat/${chatId}/message`, messageData)
      );

      if (data.success) {
        const messageWithStatus = {
          ...data.message,
          senderId: user._id,
          pending: !data.message.delivered
        };
        
        setMessages(prev => [...prev, messageWithStatus]);
        setNewMessage("");
        scrollToBottom();

        // Update local message status
        setMessageStatus(prev => ({
          ...prev,
          [data.message._id || `${data.message.timestamp}`]: {
            delivered: data.message.delivered,
            pending: !data.message.delivered,
            timestamp: new Date()
          }
        }));

        // Show status message for offline recipient
        if (!data.message.delivered) {
          setError("Message sent. Recipient will receive it when they come online.");
          setTimeout(() => setError(""), 3000);
        }
      }
    } catch (err) {
      setError("Failed to send message");
    }
  };

  const handleTyping = (e) => {
    const message = e.target.value;
    setNewMessage(message);
    
    // Generate smart responses for user
    if (message.length > 2) {
      const suggestions = generateSmartResponses(message);
      setSmartResponses(suggestions);
      setShowQuickReplies(true);
    } else {
      setShowQuickReplies(false);
      setSmartResponses([]);
    }
    
    // Emit typing indicator
    if (socketRef.current) {
      socketRef.current.emit("typing", { 
        chatId, 
        userId: user._id,
        isTyping: message.length > 0 
      });
    }
  };

  const selectQuickReply = (response) => {
    setNewMessage(response);
    setShowQuickReplies(false);
    setSmartResponses([]);
    // Focus back to input
    setTimeout(() => {
      const input = document.querySelector('input[type="text"]');
      if (input) {
        input.focus();
      }
    }, 100);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "400px" }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "400px" }}>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "400px" }}>
        <p>Chat not found</p>
      </div>
    );
  }

  const customer = chat.customerId;
  const product = chat.productId;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Chat Header */}
      <div style={{
        padding: "16px",
        borderBottom: "1px solid var(--border-color)",
        background: "var(--background)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {onBack && (
            <button
              onClick={onBack}
              className="btn btn-outline"
              style={{ padding: "8px", fontSize: "16px" }}
            >
              ←
            </button>
          )}
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "var(--primary-green)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: "600"
          }}>
            {customer?.name?.charAt(0) || "C"}
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: "0 0 4px 0" }}>{customer?.name || "Customer"}</h4>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)" }}>
              {chat.subject}
              {product && ` • ${product.name}`}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
              <span style={{
                fontSize: "11px",
                padding: "2px 6px",
                borderRadius: "10px",
                background: recipientOnline ? "var(--success)" : "var(--border-color)",
                color: recipientOnline ? "white" : "var(--text-secondary)"
              }}>
                {recipientOnline ? "🟢 Online" : "⚪ Offline"}
              </span>
              {!recipientOnline && recipientLastSeen && (
                <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                  Last seen: {new Date(recipientLastSeen).toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            {chat.chatStatus === "active" ? "🟢 Active" : "⚪ Archived"}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        padding: "16px",
        overflowY: "auto",
        background: "#f9f9f9"
      }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <p style={{ color: "var(--text-secondary)" }}>No messages yet</p>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
              Start the conversation by sending a message
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {messages.map((message, index) => {
              const isOwn = message.senderId === localStorage.getItem("userId");
              return (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    justifyContent: isOwn ? "flex-end" : "flex-start",
                    maxWidth: "70%"
                  }}
                >
                  <div style={{
                    background: isOwn ? "var(--primary-green)" : "white",
                    color: isOwn ? "white" : "var(--text-primary)",
                    padding: "12px 16px",
                    borderRadius: "18px",
                    borderBottomLeftRadius: isOwn ? "18px" : "4px",
                    borderBottomRightRadius: isOwn ? "4px" : "18px",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
                  }}>
                    <p style={{ margin: 0, wordWrap: "break-word" }}>
                      {message.content}
                    </p>
                    <p style={{
                      margin: "4px 0 0 0",
                      fontSize: "10px",
                      opacity: 0.7,
                      textAlign: isOwn ? "right" : "left",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}>
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                      {message.pending && (
                        <span style={{
                          fontSize: "9px",
                          padding: "1px 4px",
                          borderRadius: "8px",
                          background: "var(--warning)",
                          color: "white"
                        }}>
                          ⏳ Sending...
                        </span>
                      )}
                      {message.delivered && !message.read && (
                        <span style={{
                          fontSize: "9px",
                          padding: "1px 4px",
                          borderRadius: "8px",
                          background: "var(--info)",
                          color: "white"
                        }}>
                          ✓ Delivered
                        </span>
                      )}
                      {message.read && (
                        <span style={{
                          fontSize: "9px",
                          padding: "1px 4px",
                          borderRadius: "8px",
                          background: "var(--success)",
                          color: "white"
                        }}>
                          ✓ Read
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
            {isTyping && (
              <div style={{ display: "flex", justifyContent: "flex-start", maxWidth: "70%" }}>
                <div style={{
                  background: "white",
                  padding: "12px 16px",
                  borderRadius: "18px",
                  borderBottomRightRadius: "18px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
                }}>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <div style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#999",
                      animation: "bounce 1.4s infinite ease-in-out both"
                    }}></div>
                    <div style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#999",
                      animation: "bounce 1.4s infinite ease-in-out both",
                      animationDelay: "0.16s"
                    }}></div>
                    <div style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#999",
                      animation: "bounce 1.4s infinite ease-in-out both",
                      animationDelay: "0.32s"
                    }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={sendMessage} style={{
        padding: "16px",
        borderTop: "1px solid var(--border-color)",
        background: "white"
      }}>
        {/* Quick Reply Suggestions */}
        {showQuickReplies && smartResponses.length > 0 && (
          <div style={{
            marginBottom: "12px",
            padding: "12px",
            background: "var(--background)",
            borderRadius: "var(--border-radius-sm)",
            border: "1px solid var(--border-color)"
          }}>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px" }}>
              💡 Quick Responses:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {smartResponses.map((response, index) => (
                <button
                  key={index}
                  onClick={() => selectQuickReply(response)}
                  style={{
                    padding: "6px 12px",
                    background: "var(--primary-blue)",
                    color: "white",
                    border: "none",
                    borderRadius: "var(--border-radius-sm)",
                    cursor: "pointer",
                    fontSize: "14px",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "var(--primary-blue-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "var(--primary-blue)";
                  }}
                >
                  {response}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setShowQuickReplies(false);
                setSmartResponses([]);
              }}
              style={{
                fontSize: "12px",
                color: "var(--text-secondary)",
                background: "none",
                border: "none",
                cursor: "pointer",
                textDecoration: "underline"
              }}
            >
              ❌ Close suggestions
            </button>
          </div>
        )}

        {/* Custom Responses Management */}
        <div style={{
          marginBottom: "12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <button
            onClick={() => setShowCustomResponses(!showCustomResponses)}
            style={{
              fontSize: "12px",
              color: "var(--primary-blue)",
              background: "none",
              border: "1px solid var(--primary-blue)",
              borderRadius: "var(--border-radius-sm)",
              cursor: "pointer",
              padding: "4px 8px"
            }}
          >
            📝 Manage Custom Responses ({customResponses.length})
          </button>
        </div>

        {showCustomResponses && (
          <div style={{
            marginBottom: "12px",
            padding: "12px",
            background: "var(--background)",
            borderRadius: "var(--border-radius-sm)",
            border: "1px solid var(--border-color)"
          }}>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px" }}>
              📝 Custom Responses:
            </div>
            
            {/* Add/Edit Custom Response */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <input
                type="text"
                value={editingCustomResponse}
                onChange={(e) => setEditingCustomResponse(e.target.value)}
                placeholder="Add a custom response..."
                style={{
                  flex: 1,
                  padding: "6px 12px",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--border-radius-sm)",
                  fontSize: "14px"
                }}
              />
              {editingIndex >= 0 ? (
                <>
                  <button
                    onClick={() => updateCustomResponse(editingIndex, editingCustomResponse)}
                    style={{
                      padding: "6px 12px",
                      background: "var(--success)",
                      color: "white",
                      border: "none",
                      borderRadius: "var(--border-radius-sm)",
                      cursor: "pointer",
                      fontSize: "12px"
                    }}
                  >
                    ✅ Update
                  </button>
                  <button
                    onClick={() => {
                      setEditingCustomResponse("");
                      setEditingIndex(-1);
                    }}
                    style={{
                      padding: "6px 12px",
                      background: "var(--border-color)",
                      color: "var(--text-secondary)",
                      border: "none",
                      borderRadius: "var(--border-radius-sm)",
                      cursor: "pointer",
                      fontSize: "12px"
                    }}
                  >
                    ❌ Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={addCustomResponse}
                  style={{
                    padding: "6px 12px",
                    background: "var(--primary-blue)",
                    color: "white",
                    border: "none",
                    borderRadius: "var(--border-radius-sm)",
                    cursor: "pointer",
                    fontSize: "12px"
                  }}
                >
                  ➕ Add
                </button>
              )}
            </div>

            {/* List Custom Responses */}
            {customResponses.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {customResponses.map((response, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "4px 8px",
                      background: "white",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--border-radius-sm)",
                      fontSize: "12px"
                    }}
                  >
                    <button
                      onClick={() => selectQuickReply(response)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-primary)",
                        cursor: "pointer",
                        fontSize: "12px",
                        textDecoration: "underline"
                      }}
                    >
                      {response}
                    </button>
                    <button
                      onClick={() => {
                        setEditingCustomResponse(response);
                        setEditingIndex(index);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--primary-blue)",
                        cursor: "pointer",
                        fontSize: "10px"
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteCustomResponse(index)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--error)",
                        cursor: "pointer",
                        fontSize: "10px"
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder="Type your message... (AI suggestions will appear)"
            className="input"
            style={{ flex: 1 }}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="btn btn-primary"
            style={{ padding: "12px 20px" }}
          >
            Send
          </button>
        </div>
      </form>

      <style jsx>{`
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1.0);
          }
        }
      `}</style>
    </div>
  );
}
