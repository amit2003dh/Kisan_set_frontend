import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import API, { apiCall } from "../api/api";

export default function DeliveryDetails() {
  const { deliveryId } = useParams();
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("details");
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (deliveryId) {
      fetchDeliveryDetails();
    }
  }, [deliveryId]);

  const fetchDeliveryDetails = async () => {
    setLoading(true);
    setError("");
    
    try {
      const { data, error } = await apiCall(() =>
        API.get(`/delivery/${deliveryId}`)
      );
      
      if (error) {
        setError(error);
      } else {
        setDelivery(data);
      }
    } catch (err) {
      setError("Failed to fetch delivery details");
    } finally {
      setLoading(false);
    }
  };

  const startDelivery = async () => {
    try {
      setLoading(true);
      const { data, error } = await apiCall(() =>
        API.put(`/delivery/${deliveryId}/status`, { status: "In Transit" })
      );
      
      if (error) {
        setError(error);
      } else {
        setSuccess("Delivery started successfully!");
        setDelivery(prev => ({ ...prev, status: "In Transit" }));
      }
    } catch (error) {
      setError("Failed to start delivery");
    } finally {
      setLoading(false);
    }
  };

  const completeDelivery = async () => {
    try {
      setLoading(true);
      const { data, error } = await apiCall(() =>
        API.put(`/delivery/${deliveryId}/status`, { status: "Delivered" })
      );
      
      if (error) {
        setError(error);
      } else {
        setSuccess("Delivery completed successfully!");
        setDelivery(prev => ({ ...prev, status: "Delivered" }));
      }
    } catch (error) {
      setError("Failed to complete delivery");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      const { data, error } = await apiCall(() =>
        API.post(`/delivery-partner/messages/${deliveryId}`, {
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

  const updateLocation = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const { error } = await apiCall(() =>
              API.put(`/delivery/${deliveryId}/location`, {
                lat: latitude,
                lng: longitude
              })
            );

            if (error) {
              setError(error);
            } else {
              setDelivery(prev => ({
                ...prev,
                currentLocation: { lat: latitude, lng: longitude }
              }));
            }
          } catch (error) {
            setError("Failed to update location");
          }
        },
        (error) => {
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
        <div style={{ textAlign: "center" }}>
          <div className="loading-spinner"></div>
          <p>Loading delivery details...</p>
        </div>
      </div>
    );
  }

  if (error && !delivery) {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <div className="card" style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ marginBottom: "16px", color: "var(--text-primary)" }}>❌ Error</h2>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <div className="card" style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ marginBottom: "16px", color: "var(--text-primary)" }}>📦 Delivery Not Found</h2>
          <p>The delivery you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate("/delivery-partner/dashboard")}
            className="btn btn-primary"
          >
            ← Back to Dashboard
          </button>
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
              onClick={() => navigate("/delivery-partner/dashboard")}
              className="btn btn-outline"
              style={{ fontSize: "14px", padding: "8px 16px" }}
            >
              ← Back to Dashboard
            </button>
            <h1>📦 Delivery Details</h1>
            <p>Track and manage your delivery</p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{
              padding: "4px 12px",
              borderRadius: "20px",
              background: delivery.status === "Delivered" ? "#4caf50" : 
                         delivery.status === "In Transit" ? "#2196f3" : "#ff9800",
              color: "white",
              fontSize: "14px",
              fontWeight: "600"
            }}>
              {delivery.status === "Delivered" ? "✅ Delivered" : 
               delivery.status === "In Transit" ? "🚚 In Transit" : "📋 Assigned"}
            </span>
          </div>
        </div>
      </div>

      {success && <div className="success-message" style={{ marginBottom: "16px" }}>{success}</div>}
      {error && <div className="error-message" style={{ marginBottom: "16px" }}>{error}</div>}

      {/* Tab Navigation */}
      <div style={{ 
        borderBottom: "2px solid var(--border-color)", 
        marginBottom: "32px" 
      }}>
        <div style={{ display: "flex", gap: "0", overflowX: "auto" }}>
          {[/* eslint-disable indent */
            { id: "details", label: "📋 Details", icon: "📋" },
            { id: "tracking", label: "📍 Tracking", icon: "📍" },
            { id: "communication", label: "💬 Communication", icon: "💬" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "12px 24px",
                border: "none",
                background: activeTab === tab.id ? "var(--primary-blue)" : "transparent",
                color: activeTab === tab.id ? "white" : "var(--text-secondary)",
                borderBottom: activeTab === tab.id ? "3px solid var(--primary-blue)" : "3px solid transparent",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                transition: "all 0.3s ease",
                whiteSpace: "nowrap"
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.background = "var(--background-alt)";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.background = "transparent";
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "details" && (
        <div className="card">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "32px" }}>
            {/* Left Column - Delivery Info */}
            <div>
              <h3 style={{ marginBottom: "16px" }}>📋 Delivery Information</h3>
              <div style={{ display: "grid", gap: "16px" }}>
                <div>
                  <strong>Order ID:</strong> #{delivery.orderId?._id?.slice(-8).toUpperCase()}
                </div>
                <div>
                  <strong>Status:</strong> 
                  <span style={{
                    padding: "4px 8px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    background: delivery.status === "Delivered" ? "#4caf50" : 
                               delivery.status === "In Transit" ? "#2196f3" : "#ff9800",
                    color: "white"
                  }}>
                    {delivery.status}
                  </span>
                </div>
                <div>
                  <strong>Assigned At:</strong> {new Date(delivery.assignedAt).toLocaleString()}
                </div>
                <div>
                  <strong>Estimated Delivery:</strong> {new Date(delivery.estimatedDeliveryTime).toLocaleString()}
                </div>
              </div>

              {/* Customer Information */}
              <div>
                <h4 style={{ marginBottom: "12px" }}>👤 Customer Information</h4>
                <div style={{ background: "var(--background-alt)", padding: "12px", borderRadius: "8px" }}>
                  <p><strong>Name:</strong> {delivery.orderId?.buyerId?.name || "Not available"}</p>
                  <p><strong>Phone:</strong> {delivery.orderId?.buyerId?.phone || "Not available"}</p>
                  <p><strong>Email:</strong> {delivery.orderId?.buyerId?.email || "Not available"}</p>
                </div>
              </div>

              {/* Delivery Address */}
              <div>
                <h4 style={{ marginBottom: "12px" }}>🏠 Delivery Address</h4>
                <div style={{ background: "var(--background-alt)", padding: "12px", borderRadius: "8px" }}>
                  <p><strong>Address:</strong> {delivery.destination?.address || "Not available"}</p>
                  <p><strong>City:</strong> {delivery.destination?.city || "Not available"}</p>
                  <p><strong>State:</strong> {delivery.destination?.state || "Not available"}</p>
                  <p><strong>Pincode:</strong> {delivery.destination?.pincode || "Not available"}</p>
                </div>
              </div>
            </div>

            {/* Right Column - Actions */}
            <div>
              <h3 style={{ marginBottom: "16px" }}>🚚 Delivery Actions</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {delivery.status === "Assigned" && (
                  <button
                    onClick={() => startDelivery(delivery._id)}
                    className="btn btn-primary"
                    disabled={loading}
                    style={{ fontSize: "14px", padding: "12px 24px" }}
                  >
                    🚚 Start Delivery
                  </button>
                )}
                
                {delivery.status === "In Transit" && (
                  <button
                    onClick={() => completeDelivery(delivery._id)}
                    className="btn btn-success"
                    disabled={loading}
                    style={{ fontSize: "14px", padding: "12px 24px" }}
                  >
                    ✅ Complete Delivery
                  </button>
                )}
                
                {delivery.status === "Delivered" && (
                  <div style={{
                    background: "#e8f5e8",
                    padding: "16px",
                    borderRadius: "8px",
                    textAlign: "center"
                  }}>
                    <div style={{ fontSize: "48px", marginBottom: "8px" }}>✅</div>
                    <h4 style={{ margin: "0", color: "var(--primary-green)" }}>Delivery Completed!</h4>
                    <p style={{ margin: "0" }}>Thank you for your service!</p>
                  </div>
                )}
                
                <button
                  onClick={() => updateLocation()}
                  className="btn btn-secondary"
                  style={{ fontSize: "14px", padding: "12px 24px" }}
                >
                  📍 Update Location
                </button>
                
                <Link
                  to={`/tracking?deliveryId=${delivery._id}`}
                  className="btn btn-outline"
                  style={{ fontSize: "14px", padding: "12px 24px" }}
                >
                  📍 Track Delivery
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "tracking" && (
        <div className="card">
          <h3 style={{ marginBottom: "16px" }}>📍 Live Tracking</h3>
          <div style={{ 
            height: "400px", 
            background: "var(--background-alt)", 
            borderRadius: "8px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            flexDirection: "column"
          }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📍</div>
            <p style={{ color: "var(--text-secondary)", textAlign: "center" }}>
              Live tracking will be implemented here
            </p>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", textAlign: "center" }}>
              Shows real-time delivery progress and location updates
            </p>
            <div style={{ marginTop: "16px" }}>
              <button
                onClick={updateLocation}
                className="btn btn-primary"
              >
                📍 Update Current Location
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "communication" && (
        <div className="card">
          <h3 style={{ marginBottom: "16px" }}>💬 Communication</h3>
          <div style={{ display: "flex", gap: "16px" }}>
            <div style={{ flex: 1, border: "1px solid var(--border-color)", borderRadius: "8px" }}>
              <div style={{ padding: "16px", borderBottom: "1px solid var(--border-color)" }}>
                <h4 style={{ margin: "0 0 8px 0" }}>Messages</h4>
                <div style={{ height: "300px", overflowY: "auto" }}>
                  {messages.length === 0 ? (
                    <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "20px" }}>
                      No messages yet
                    </p>
                  ) : (
                    messages.map((msg, index) => (
                      <div key={index} style={{
                        padding: "8px 12px",
                        marginBottom: "8px",
                        background: "var(--background-alt)",
                        borderRadius: "8px"
                      }}>
                        <p style={{ margin: "0 0 4px 0", fontSize: "12px", color: "var(--text-secondary)" }}>
                          {new Date(msg.timestamp).toLocaleString()}
                        </p>
                        <p style={{ margin: "0" }}>{msg.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div style={{ padding: "16px" }}>
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
      )}
    </div>
  );
}
