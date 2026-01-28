import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API, { apiCall } from "../api/api";

export default function DeliveryPartnerDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [currentLocation, setCurrentLocation] = useState({ lat: 0, lng: 0 });
  const [isOnline, setIsOnline] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [earnings, setEarnings] = useState({ total: 0, today: 0, thisWeek: 0, thisMonth: 0 });
  const [performance, setPerformance] = useState({ avgDeliveryTime: 0, successRate: 0, totalDelivered: 0 });
  const [authStatus, setAuthStatus] = useState({ isAuthenticated: false, isDeliveryPartner: false });
  const navigate = useNavigate();

  useEffect(() => {
    const user = localStorage.getItem("user");
    const userData = user ? JSON.parse(user) : null;
    
    console.log("🔍 Delivery Partner Dashboard - Auth Check:");
    console.log("🔍 User from localStorage:", user);
    console.log("🔍 Parsed userData:", userData);
    console.log("🔍 User role:", userData?.role);
    console.log("🔍 User isVerified:", userData?.isVerified);
    console.log("🔍 Delivery Partner Registration:", userData?.deliveryPartnerRegistration);
    
    if (!user) {
      console.log("🔍 No user found, redirecting to login");
      navigate("/login");
      return;
    }

    // First, check the latest application status from server
    const checkApplicationStatus = async () => {
      try {
        console.log("🔍 Checking application status from API...");
        const { data, error } = await apiCall(() => API.get("/delivery-partner/application-status"));
        console.log("🔍 API Response - Data:", data);
        console.log("🔍 API Response - Error:", error);
        
        if (data) {
          console.log("🔍 Latest application status from server:", data);
          
          // Update localStorage with latest status
          userData.deliveryPartnerRegistration = {
            hasApplied: data.hasApplied,
            applicationStatus: data.applicationStatus,
            applicationDate: data.applicationDate
          };
          userData.role = data.role;
          localStorage.setItem("user", JSON.stringify(userData));
          
          console.log("🔍 Updated userData:", userData);
          
          // Check if user is a delivery partner by checking their role and application status
          const isDeliveryPartner = userData.role === "delivery_partner" && 
                                   userData.deliveryPartnerRegistration?.applicationStatus === "approved";
          console.log("🔍 Role check:", userData.role, "=== delivery_partner:", userData.role === "delivery_partner");
          console.log("🔍 Status check:", userData.deliveryPartnerRegistration?.applicationStatus, "=== approved:", userData.deliveryPartnerRegistration?.applicationStatus === "approved");
          console.log("🔍 Final isDeliveryPartner:", isDeliveryPartner);
          
          setAuthStatus({
            isAuthenticated: true,
            isDeliveryPartner: isDeliveryPartner
          });

          // Only fetch dashboard data if user is a verified delivery partner
          if (isDeliveryPartner) {
            console.log("🔍 User is verified delivery partner, fetching dashboard data");
            fetchDashboardData();
            fetchCurrentLocation();
            checkOnlineStatus();
            fetchEarnings();
            fetchPerformance();
            fetchMyDeliveries();
            fetchMessages();
          } else {
            console.log("🔍 User is not a verified delivery partner, setting loading to false");
            setLoading(false);
          }
        } else if (error) {
          console.error("🔍 API Error:", error);
          // Fallback to localStorage data
          const isDeliveryPartner = userData.role === "delivery_partner" && 
                                   userData.deliveryPartnerRegistration?.applicationStatus === "approved";
          console.log("🔍 Fallback - isDeliveryPartner:", isDeliveryPartner);
          
          setAuthStatus({
            isAuthenticated: true,
            isDeliveryPartner: isDeliveryPartner
          });

          if (isDeliveryPartner) {
            fetchDashboardData();
            fetchCurrentLocation();
            checkOnlineStatus();
            fetchEarnings();
            fetchPerformance();
            fetchMyDeliveries();
            fetchMessages();
          } else {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("🔍 Exception checking application status:", error);
        // Fallback to localStorage data
        const isDeliveryPartner = userData.role === "delivery_partner" && 
                                 userData.deliveryPartnerRegistration?.applicationStatus === "approved";
        console.log("🔍 Exception Fallback - isDeliveryPartner:", isDeliveryPartner);
        
        setAuthStatus({
          isAuthenticated: true,
          isDeliveryPartner: isDeliveryPartner
        });

        if (isDeliveryPartner) {
          fetchDashboardData();
          fetchCurrentLocation();
          checkOnlineStatus();
          fetchEarnings();
          fetchPerformance();
        } else {
          setLoading(false);
        }
      }
    };

    checkApplicationStatus();
  }, []);

  const fetchEarnings = async () => {
    try {
      const { data } = await apiCall(() => API.get("/delivery-partner/earnings"));
      if (data) {
        setEarnings(data);
      }
    } catch (error) {
      console.error("Error fetching earnings:", error);
      // Set mock data for demo
      setEarnings({
        total: 15420,
        today: 850,
        thisWeek: 3200,
        thisMonth: 8900
      });
    }
  };

  const fetchPerformance = async () => {
    try {
      const { data } = await apiCall(() => API.get("/delivery-partner/performance"));
      if (data) {
        setPerformance(data);
      }
    } catch (error) {
      console.error("Error fetching performance:", error);
      // Set mock data for demo
      setPerformance({
        avgDeliveryTime: 28,
        successRate: 96.5,
        totalDelivered: 147
      });
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError("");
    
    const { data, error: err } = await apiCall(() =>
      API.get("/delivery-partner/available-orders")
    );
    
    if (err) {
      // Don't show "not registered" errors since we know the user is approved
      if (!err.includes("not registered") && !err.includes("registered as a delivery partner")) {
        setError(err);
      }
    } else {
      setDashboardData(data);
    }
    
    setLoading(false);
  };

  const fetchCurrentLocation = async () => {
    try {
      const { data } = await apiCall(() => API.get("/delivery-partner/location"));
      if (data && data.location) {
        setCurrentLocation(data.location);
      }
    } catch (error) {
      console.error("Error fetching location:", error);
    }
  };

  const checkOnlineStatus = async () => {
    try {
      const user = localStorage.getItem("user");
      if (user) {
        const userData = JSON.parse(user);
        setIsOnline(userData.isOnline || false);
      }
    } catch (error) {
      console.error("Error checking online status:", error);
    }
  };

  const toggleOnlineStatus = async () => {
    try {
      const newStatus = !isOnline;
      const { error: err } = await apiCall(() =>
        API.put("/delivery-partner/status", { 
          status: newStatus ? "available" : "offline",
          isOnline: newStatus 
        })
      );

      if (err) {
        setError(err);
      } else {
        setIsOnline(newStatus);
        // Update localStorage
        const user = localStorage.getItem("user");
        if (user) {
          const userData = JSON.parse(user);
          userData.isOnline = newStatus;
          localStorage.setItem("user", JSON.stringify(userData));
        }
      }
    } catch (error) {
      console.error("Error toggling status:", error);
      setError("Failed to update status");
    }
  };

  const updateLocation = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          console.log("📍 Updating location to:", latitude, longitude);
          try {
            const { error: err } = await apiCall(() =>
              API.put("/delivery-partner/location", {
                lat: latitude,
                lng: longitude
              })
            );

            if (err) {
              console.error("❌ Update location error:", err);
              setError(err);
            } else {
              console.log("✅ Location updated successfully");
              setCurrentLocation({ lat: latitude, lng: longitude });
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

  const acceptOrder = async (orderId) => {
    try {
      console.log("🎯 Accepting order:", orderId);
      const { data, error } = await apiCall(() =>
        API.post(`/delivery-partner/accept-order/${orderId}`)
      );

      if (error) {
        console.error("❌ Accept order error:", error);
        setError(error);
      } else {
        console.log("✅ Order accepted successfully:", data);
        setSuccess("Order accepted successfully! You are now assigned to this delivery.");
        fetchDashboardData(); // Refresh the available orders
        fetchCurrentLocation();
        checkOnlineStatus();
        fetchEarnings(); // Refresh earnings
        fetchPerformance(); // Refresh performance
      }
    } catch (error) {
      console.error("❌ Exception in acceptOrder:", error);
      setError("Failed to accept order");
    }
  };

  // Map View Data
  const [mapCenter, setMapCenter] = useState({ lat: 20.5937, lng: 78.9629 }); // Default to India center
  const [mapZoom, setMapZoom] = useState(5);

  // Communication Data
  const [messages, setMessages] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [newMessage, setNewMessage] = useState("");

  // Delivery Queue Data
  const [myDeliveries, setMyDeliveries] = useState([]);

  const fetchMyDeliveries = async () => {
    try {
      const { data } = await apiCall(() => API.get("/delivery-partner/my-deliveries"));
      if (data) {
        setMyDeliveries(data.deliveries || []);
      }
    } catch (error) {
      console.error("Error fetching my deliveries:", error);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data } = await apiCall(() => API.get("/delivery-partner/messages"));
      if (data) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;
    
    console.log("💬 Sending message:", newMessage, "to chat:", selectedChat);

    try {
      const { data, error } = await apiCall(() =>
        API.post(`/delivery-partner/messages/${selectedChat}`, {
          message: newMessage.trim()
        })
      );

      if (error) {
        console.error("❌ Send message error:", error);
        setError(error);
      } else {
        console.log("✅ Message sent successfully:", data);
        setNewMessage("");
        fetchMessages();
      }
    } catch (error) {
      console.error("❌ Exception sending message:", error);
      setError("Failed to send message");
    }
  };

  const completeDelivery = async (deliveryId) => {
    try {
      const { data, error } = await apiCall(() =>
        API.put(`/delivery/${deliveryId}/status`, { status: "Delivered" })
      );

      if (error) {
        setError(error);
      } else {
        setSuccess("Delivery completed successfully!");
        fetchMyDeliveries(); // Refresh deliveries
        fetchEarnings(); // Refresh earnings
        fetchPerformance(); // Refresh performance
        fetchDashboardData(); // Refresh available orders
      }
    } catch (error) {
      setError("Failed to complete delivery");
    }
  };

  const handleStartDelivery = async (deliveryId) => {
    try {
      console.log("🚚 Starting delivery for:", deliveryId);
      const { error: err } = await apiCall(() =>
        API.put(`/delivery/${deliveryId}/status`, { status: "In Transit" })
      );
      
      if (err) {
        console.error("❌ Start delivery error:", err);
        setError(err);
      } else {
        console.log("✅ Delivery started successfully");
        fetchDashboardData(); // Refresh data
        fetchMyDeliveries(); // Refresh delivery queue
      }
    } catch (error) {
      console.error("❌ Exception in handleStartDelivery:", error);
      setError("Failed to start delivery");
    }
  };

  const handleCompleteDelivery = async (deliveryId) => {
    try {
      console.log("✅ Completing delivery for:", deliveryId);
      const { error: err } = await apiCall(() =>
        API.put(`/delivery/${deliveryId}/status`, { status: "Delivered" })
      );
      
      if (err) {
        console.error("❌ Complete delivery error:", err);
        setError(err);
      } else {
        console.log("✅ Delivery completed successfully");
        setSuccess("Delivery completed successfully!");
        fetchMyDeliveries(); // Refresh deliveries
        fetchEarnings(); // Refresh earnings
        fetchPerformance(); // Refresh performance
        fetchDashboardData(); // Refresh available orders
      }
    } catch (error) {
      console.error("❌ Exception in handleCompleteDelivery:", error);
      setError("Failed to complete delivery");
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <div className="loading-spinner"></div>
        <p style={{ textAlign: "center", color: "var(--text-secondary)" }}>Loading dashboard...</p>
      </div>
    );
  }

  // Debug: Log authStatus values
  console.log("🔍 Render - Auth Status:", authStatus);
  console.log("🔍 Render - Is Authenticated:", authStatus.isAuthenticated);
  console.log("🔍 Render - Is Delivery Partner:", authStatus.isDeliveryPartner);

  // Since debug shows everything is correct, restore normal dashboard
  const deliveries = dashboardData?.deliveries || [];
  const stats = {
    total: deliveries.length,
    pending: deliveries.filter(d => d.status === "Assigned").length,
    inTransit: deliveries.filter(d => d.status === "In Transit").length,
    delivered: deliveries.filter(d => d.status === "Delivered").length
  };

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
      <div className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1>🚚 Delivery Partner Dashboard</h1>
            <p>Manage deliveries and track your performance</p>
            {dashboardData?.partnerInfo && (
              <div style={{ 
                background: "var(--background-alt)", 
                padding: "8px 12px", 
                borderRadius: "6px", 
                marginTop: "8px",
                fontSize: "14px"
              }}>
                🚐 {dashboardData.partnerInfo.vehicleType} | 
                📦 Capacity: {dashboardData.partnerInfo.vehicleCapacity}kg | 
                📍 Range: {dashboardData.partnerInfo.maxDeliveryDistance || 50}km
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div style={{
              padding: "8px 16px",
              borderRadius: "20px",
              background: isOnline ? "#4caf50" : "#f44336",
              color: "white",
              fontSize: "14px",
              fontWeight: "600"
            }}>
              {isOnline ? "🟢 Online" : "🔴 Offline"}
            </div>
            <button
              onClick={toggleOnlineStatus}
              className={`btn ${isOnline ? "btn-secondary" : "btn-primary"}`}
              style={{ fontSize: "14px", padding: "10px 20px" }}
            >
              {isOnline ? "🔴 Go Offline" : "🟢 Go Online"}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ 
        borderBottom: "2px solid var(--border-color)", 
        marginBottom: "32px" 
      }}>
        <div style={{ display: "flex", gap: "0", overflowX: "auto" }}>
          {[/* eslint-disable indent */
            { id: "overview", label: "📊 Overview", icon: "📊", path: "/delivery-partner" },
            { id: "queue", label: "📦 Delivery Queue", icon: "📦", path: "/delivery-partner/queue" },
            { id: "map", label: "🗺️ Map View", icon: "🗺️", path: "/delivery-partner/map-view" },
            { id: "earnings", label: "💰 Earnings", icon: "💰", path: "/delivery-partner/earnings" },
            { id: "performance", label: "📈 Performance", icon: "📈", path: "/delivery-partner/performance" },
            { id: "communication", label: "💬 Communication", icon: "💬", path: "/delivery-partner/communication" }
          ].map((tab) => (
            <Link
              key={tab.id}
              to={tab.path}
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
                whiteSpace: "nowrap",
                textDecoration: "none",
                display: "inline-block"
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
            </Link>
          ))}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Stats Cards */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
        gap: "16px",
        marginBottom: "32px"
      }}>
        <div className="card" style={{ textAlign: "center", padding: "20px" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>📦</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "var(--primary-green)" }}>
            {stats.total}
          </div>
          <div style={{ color: "var(--text-secondary)" }}>Total Deliveries</div>
        </div>
        
        <div className="card" style={{ textAlign: "center", padding: "20px" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>⏳</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#ff9800" }}>
            {stats.pending}
          </div>
          <div style={{ color: "var(--text-secondary)" }}>Pending</div>
        </div>
        
        <div className="card" style={{ textAlign: "center", padding: "20px" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>🚚</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#2196f3" }}>
            {stats.inTransit}
          </div>
          <div style={{ color: "var(--text-secondary)" }}>In Transit</div>
        </div>
        
        <div className="card" style={{ textAlign: "center", padding: "20px" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>✅</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#4caf50" }}>
            {stats.delivered}
          </div>
          <div style={{ color: "var(--text-secondary)" }}>Delivered</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: "32px" }}>
        <h3 style={{ marginBottom: "16px" }}>🚀 Quick Actions</h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            onClick={updateLocation}
            className="btn btn-primary"
            style={{ fontSize: "14px", padding: "10px 20px" }}
          >
            � Update Location
          </button>
        </div>
      </div>

      {/* Available Orders - Only show on Overview */}
      <div className="card">
        <h3 style={{ marginBottom: "16px" }}>📦 Available Orders ({dashboardData?.count || 0})</h3>
        {(!dashboardData?.orders || dashboardData.orders.length === 0) ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📦</div>
            <p>No available orders matching your vehicle capacity and delivery range</p>
            <p style={{ fontSize: "14px" }}>
              {dashboardData?.partnerInfo ? 
                `Your ${dashboardData.partnerInfo.vehicleType} can carry up to ${dashboardData.partnerInfo.vehicleCapacity}kg within ${dashboardData.partnerInfo.maxDeliveryDistance || 50}km` : 
                "Go online to receive delivery assignments"
              }
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {dashboardData.orders.map((order) => (
              <div key={order._id} style={{
                border: "1px solid var(--border-color)",
                borderRadius: "var(--border-radius-sm)",
                padding: "16px",
                background: "var(--background)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: "0 0 8px 0", color: "var(--text-primary)" }}>
                      Order #{order._id.slice(-8).toUpperCase()}
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "8px", marginBottom: "8px" }}>
                      <p style={{ margin: "0", fontSize: "13px", color: "var(--text-secondary)" }}>
                        <strong>Customer:</strong> {order.buyerId?.name}
                      </p>
                      <p style={{ margin: "0", fontSize: "13px", color: "var(--text-secondary)" }}>
                        <strong>Total:</strong> ₹{order.total}
                      </p>
                      <p style={{ margin: "0", fontSize: "13px", color: "var(--text-secondary)" }}>
                        <strong>Weight:</strong> {order.totalWeight || 0}kg
                      </p>
                      <p style={{ margin: "0", fontSize: "13px", color: "var(--text-secondary)" }}>
                        <strong>Items:</strong> {order.totalQuantity || 0}
                      </p>
                      <p style={{ margin: "0", fontSize: "13px", color: "var(--text-secondary)" }}>
                        <strong>Distance:</strong> {order.maxDistance || 0}km
                      </p>
                    </div>
                    
                    {/* Order Items */}
                    <div style={{ marginBottom: "8px" }}>
                      <p style={{ margin: "0 0 4px 0", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>
                        📦 Items:
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {order.items?.map((item, index) => (
                          <span key={index} style={{
                            background: "var(--background-alt)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            color: "var(--text-secondary)"
                          }}>
                            {item.name} ({item.quantity})
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Delivery Address */}
                    {order.deliveryInfo?.deliveryAddress && (
                      <p style={{ margin: "0 0 4px 0", fontSize: "12px", color: "var(--text-secondary)" }}>
                        📍 {order.deliveryInfo.deliveryAddress.address}, {order.deliveryInfo.deliveryAddress.city}
                      </p>
                    )}

                    {/* Distance Details */}
                    <div style={{ display: "flex", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
                      <span style={{ 
                        background: "var(--background-alt)", 
                        padding: "2px 6px", 
                        borderRadius: "4px", 
                        fontSize: "11px",
                        color: "var(--text-secondary)"
                      }}>
                        🏪 Pickup: {order.pickupDistance || 0}km
                      </span>
                      <span style={{ 
                        background: "var(--background-alt)", 
                        padding: "2px 6px", 
                        borderRadius: "4px", 
                        fontSize: "11px",
                        color: "var(--text-secondary)"
                      }}>
                        🏠 Delivery: {order.deliveryDistance || 0}km
                      </span>
                    </div>

                    {/* Weight and Range Match Indicators */}
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {/* Weight Match Indicator */}
                      <div style={{ 
                        display: "inline-block", 
                        padding: "4px 8px", 
                        borderRadius: "4px", 
                        fontSize: "11px",
                        background: order.totalWeight <= (dashboardData?.partnerInfo?.vehicleCapacity || 0) ? "#e8f5e8" : "#ffeaea",
                        color: order.totalWeight <= (dashboardData?.partnerInfo?.vehicleCapacity || 0) ? "#2e7d32" : "#c62828"
                      }}>
                        {order.totalWeight <= (dashboardData?.partnerInfo?.vehicleCapacity || 0) ? 
                          "✅ Fits your vehicle" : 
                          "⚠️ Too heavy"
                        }
                      </div>

                      {/* Range Match Indicator */}
                      <div style={{ 
                        display: "inline-block", 
                        padding: "4px 8px", 
                        borderRadius: "4px", 
                        fontSize: "11px",
                        background: order.withinRange ? "#e8f5e8" : "#ffeaea",
                        color: order.withinRange ? "#2e7d32" : "#c62828"
                      }}>
                        {order.withinRange ? 
                          `✅ Within ${dashboardData?.partnerInfo?.maxDeliveryDistance || 50}km range` : 
                          `⚠️ Outside range`
                        }
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                    <button
                      onClick={() => acceptOrder(order._id)}
                      className="btn btn-primary"
                      style={{ fontSize: "12px", padding: "6px 12px" }}
                      disabled={order.totalWeight > (dashboardData?.partnerInfo?.vehicleCapacity || 0) || !order.withinRange}
                    >
                      {order.totalWeight > (dashboardData?.partnerInfo?.vehicleCapacity || 0) ? 
                        "Too Heavy" : 
                        !order.withinRange ? 
                        "Out of Range" :
                        "Accept Order"
                      }
                    </button>
                    <Link
                      to={`/orders/${order._id}`}
                      className="btn btn-secondary"
                      style={{ fontSize: "12px", padding: "6px 12px" }}
                    >
                      📋 Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
