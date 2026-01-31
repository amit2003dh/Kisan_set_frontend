import { useState, useEffect, useRef } from "react";
import API from "../api/api";
import { apiCall } from "../api/api";

export default function AIChatbot() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "👋 Hello! I'm your AI farming assistant. I can help you with crop diseases, farming practices, weather advice, and more. How can I assist you today?",
      sender: "bot",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const simulateTyping = (text, delay = 20) => {
    return new Promise((resolve) => {
      let index = 0;
      let currentText = "";
      
      const typeInterval = setInterval(() => {
        if (index < text.length) {
          currentText += text[index];
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              ...newMessages[newMessages.length - 1],
              text: currentText
            };
            return newMessages;
          });
          index++;
        } else {
          clearInterval(typeInterval);
          setIsTyping(false);
          resolve();
        }
      }, delay);
    });
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: inputText,
      sender: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);
    setIsTyping(true);

    // Add typing indicator
    const typingMessage = {
      id: Date.now() + 1,
      text: "",
      sender: "bot",
      timestamp: new Date()
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      const { data, error } = await apiCall(() =>
        API.post("/ai/chatbot", {
          message: inputText,
          conversationHistory: messages.slice(-5).map(msg => ({
            text: msg.text,
            sender: msg.sender
          }))
        })
      );

      if (error) {
        throw new Error(error);
      }

      // Remove typing indicator and add actual response
      setMessages(prev => {
        const newMessages = prev.filter(msg => msg.id !== typingMessage.id);
        return [...newMessages, {
          id: Date.now() + 2,
          text: data.response || "I'm sorry, I couldn't process your request. Please try again.",
          sender: "bot",
          timestamp: new Date(),
          suggestions: data.suggestions || []
        }];
      });

      // Simulate typing effect
      const finalMessage = data.response || "I'm sorry, I couldn't process your request. Please try again.";
      await simulateTyping(finalMessage);

    } catch (error) {
      console.error("Chatbot error:", error);
      setMessages(prev => {
        const newMessages = prev.filter(msg => msg.id !== typingMessage.id);
        return [...newMessages, {
          id: Date.now() + 2,
          text: "🔧 I'm having trouble connecting right now. Please try again later or contact our support team.",
          sender: "bot",
          timestamp: new Date()
        }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickActions = [
    { text: "🌱 What crops grow well in my region?", icon: "🌱" },
    { text: "🌧️ What's the best irrigation method?", icon: "🌧️" },
    { text: "🐛 How to identify common pests?", icon: "🐛" },
    { text: "💰 Best practices for crop yield?", icon: "💰" },
    { text: "🌾 When to harvest my crops?", icon: "🌾" },
    { text: "🧪 Soil testing recommendations?", icon: "🧪" }
  ];

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
      <div className="page-header">
        <h1>🤖 AI Farming Assistant</h1>
        <p>Get instant help with farming questions, crop advice, and agricultural best practices</p>
      </div>

      <div className="grid" style={{ 
        gridTemplateColumns: isMobile ? "1fr" : "300px 1fr", 
        gap: "32px",
        height: isMobile ? "auto" : "calc(100vh - 200px)"
      }}>
        {/* Quick Actions Sidebar */}
        {!isMobile && (
          <div className="card" style={{ height: "fit-content", position: "sticky", top: "40px" }}>
            <h3 style={{ marginBottom: "16px", fontSize: "18px" }}>💡 Quick Questions</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => setInputText(action.text)}
                  className="btn btn-secondary"
                  style={{
                    textAlign: "left",
                    fontSize: "14px",
                    padding: "12px",
                    background: "var(--background)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--border-radius-sm)"
                  }}
                  disabled={isLoading}
                >
                  <span style={{ marginRight: "8px" }}>{action.icon}</span>
                  {action.text}
                </button>
              ))}
            </div>

            <div style={{ marginTop: "24px", padding: "16px", background: "#f0f9ff", borderRadius: "var(--border-radius-sm)" }}>
              <h4 style={{ fontSize: "14px", marginBottom: "8px", color: "#1976d2" }}>💡 Pro Tips</h4>
              <ul style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0, paddingLeft: "16px" }}>
                <li>Be specific about your crop type</li>
                <li>Include your region/climate</li>
                <li>Describe symptoms in detail</li>
                <li>Ask about soil conditions</li>
              </ul>
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div className="card" style={{ display: "flex", flexDirection: "column", height: isMobile ? "600px" : "100%" }}>
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            background: "var(--background)",
            borderRadius: "var(--border-radius-sm)",
            marginBottom: "16px"
          }}>
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: "flex",
                  justifyContent: message.sender === "user" ? "flex-end" : "flex-start",
                  marginBottom: "16px"
                }}
              >
                <div style={{
                  maxWidth: "70%",
                  padding: "12px 16px",
                  borderRadius: "18px",
                  background: message.sender === "user" ? "var(--primary-blue)" : "white",
                  color: message.sender === "user" ? "white" : "var(--text-primary)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                  wordWrap: "break-word"
                }}>
                  <div style={{ fontSize: "14px", lineHeight: "1.4" }}>
                    {message.text}
                  </div>
                  <div style={{
                    fontSize: "11px",
                    opacity: 0.7,
                    marginTop: "4px"
                  }}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "16px" }}>
                <div style={{
                  padding: "12px 16px",
                  borderRadius: "18px",
                  background: "white",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
                }}>
                  <div className="loading-spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Mobile Quick Actions */}
          {isMobile && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "var(--text-primary)" }}>
                💡 Quick Questions
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {quickActions.slice(0, 3).map((action, index) => (
                  <button
                    key={index}
                    onClick={() => setInputText(action.text)}
                    className="btn btn-secondary"
                    style={{
                      fontSize: "12px",
                      padding: "8px 12px",
                      background: "var(--background)",
                      border: "1px solid var(--border)",
                      borderRadius: "16px"
                    }}
                    disabled={isLoading}
                  >
                    {action.icon}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about farming, crops, diseases, weather..."
                disabled={isLoading}
                rows={1}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "1px solid var(--border)",
                  borderRadius: "24px",
                  resize: "none",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  maxHeight: "100px",
                  outline: "none",
                  background: "var(--background)"
                }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!inputText.trim() || isLoading}
              className="btn btn-primary"
              style={{
                borderRadius: "50%",
                width: "48px",
                height: "48px",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px"
              }}
            >
              {isLoading ? (
                <div className="loading-spinner" style={{ width: "20px", height: "20px", borderWidth: "2px" }}></div>
              ) : (
                "➤"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
