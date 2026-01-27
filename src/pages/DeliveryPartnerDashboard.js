import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API, { apiCall } from "../api/api";

export default function DeliveryPartnerDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

    // Check if user is a delivery partner by checking their role and verification status
    const isDeliveryPartner = userData.role === "delivery_partner" && userData.isVerified === true;
    console.log("🔍 Is delivery partner:", isDeliveryPartner);
    
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
    } else {
      console.log("🔍 User is not a verified delivery partner, setting loading to false");
      setLoading(false);
    }
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
      API.get("/delivery-partner/my-orders")
    );
    
    if (err) {
      setError(err);
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
          try {
            const { error: err } = await apiCall(() =>
              API.put("/delivery-partner/location", {
                lat: latitude,
                lng: longitude
              })
            );

            if (err) {
              setError(err);
            } else {
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

  const handleStartDelivery = async (deliveryId) => {
    try {
      const { error: err } = await apiCall(() =>
        API.put(`/delivery/${deliveryId}/status`, { status: "In Transit" })
      );
      
      if (err) {
        setError(err);
      } else {
        fetchDashboardData(); // Refresh data
      }
    } catch (error) {
      console.error("Error starting delivery:", error);
      setError("Failed to start delivery");
    }
  };

  const handleCompleteDelivery = async (deliveryId) => {
    try {
      const { error: err } = await apiCall(() =>
        API.put(`/delivery/${deliveryId}/status`, { status: "Delivered" })
      );
      
      if (err) {
        setError(err);
      } else {
        fetchDashboardData(); // Refresh data
      }
    } catch (error) {
      console.error("Error completing delivery:", error);
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

  // Show registration prompt if user is not a verified delivery partner
  if (!authStatus.isDeliveryPartner && authStatus.isAuthenticated) {
    console.log("🔍 Showing registration prompt");
    
    // Get user data to show specific message
    const user = localStorage.getItem("user");
    const userData = user ? JSON.parse(user) : null;
    const registrationStatus = userData?.deliveryPartnerRegistration?.applicationStatus || "not_applied";
    const hasApplied = registrationStatus === "pending" || registrationStatus === "rejected";
    
    console.log("🔍 Registration Status:", registrationStatus);
    console.log("🔍 Has Applied:", hasApplied);
    
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px", textAlign: "center" }}>
        <div className="card" style={{ maxWidth: "500px", margin: "0 auto", padding: "40px" }}>
          <div style={{ fontSize: "64px", marginBottom: "24px" }}>🚚</div>
          <h2 style={{ marginBottom: "16px", color: "var(--text-primary)" }}>
            {registrationStatus === "pending" ? "Application Pending Verification" : 
             registrationStatus === "rejected" ? "Application Rejected" :
             "Not Registered as Delivery Partner"}
          </h2>
          <p style={{ marginBottom: "32px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
            {registrationStatus === "pending" 
              ? "Your delivery partner application is pending admin verification. You will receive an email once your account is approved."
              : registrationStatus === "rejected"
              ? "Your delivery partner application was rejected. You can reapply with updated information."
              : "Your account is not registered as a delivery partner. Please register as a delivery partner to access this dashboard."
            }
          </p>
          
          {!hasApplied && (
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
              gap: "16px", 
              marginBottom: "32px" 
            }}>
              <div style={{ 
                padding: "20px", 
                textAlign: "center", 
                background: "var(--primary-blue)", 
                color: "white", 
                borderRadius: "8px" 
              }}>
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>🚚</div>
                <h4 style={{ margin: "0 0 8px 0" }}>Become a Partner</h4>
                <p style={{ margin: "0", fontSize: "14px" }}>Register as delivery partner</p>
              </div>
              
              <div style={{ 
                padding: "20px", 
                textAlign: "center", 
                background: "#4caf50", 
                color: "white", 
                borderRadius: "8px" 
              }}>
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>👤</div>
                <h4 style={{ margin: "0 0 8px 0" }}>Already Registered?</h4>
                <p style={{ margin: "0", fontSize: "14px" }}>Login as delivery partner</p>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginBottom: "24px" }}>
            {!hasApplied && (
              <Link 
                to="/delivery-partner/register" 
                className="btn btn-primary"
                style={{ 
                  fontSize: "16px", 
                  padding: "12px 24px", 
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                🚚 Register Now
              </Link>
            )}
            
            {registrationStatus === "rejected" && (
              <Link 
                to="/delivery-partner/register" 
                className="btn btn-primary"
                style={{ 
                  fontSize: "16px", 
                  padding: "12px 24px", 
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                🔄 Reapply Now
              </Link>
            )}
            
            <Link 
              to="/login" 
              className="btn btn-secondary"
              style={{ 
                fontSize: "16px", 
                padding: "12px 24px", 
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              👤 {hasApplied ? "Check Status" : "Login"}
            </Link>
          </div>

          <div style={{ marginTop: "24px", textAlign: "center" }}>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
              {hasApplied 
                ? "Need help? Contact support for assistance."
                : "Already have an account? <Link to=\"/login\" style={{ color: \"var(--primary-blue)\", textDecoration: \"none\" }}>Login here</Link>"
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

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
            { id: "overview", label: "📊 Overview", icon: "📊" },
            { id: "queue", label: "📦 Delivery Queue", icon: "📦" },
            { id: "map", label: "🗺️ Map View", icon: "🗺️" },
            { id: "earnings", label: "💰 Earnings", icon: "💰" },
            { id: "performance", label: "📈 Performance", icon: "📈" },
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

      {error && <div className="error-message">{error}</div>}

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
            📍 Update Location
          </button>
          <Link
            to="/delivery-partner/orders"
            className="btn btn-secondary"
            style={{ fontSize: "14px", padding: "10px 20px" }}
          >
            📦 View All Orders
          </Link>
          <Link
            to="/profile"
            className="btn btn-outline"
            style={{ fontSize: "14px", padding: "10px 20px" }}
          >
            👤 My Profile
          </Link>
        </div>
      </div>

      {/* Current Location */}
      <div className="card" style={{ marginBottom: "32px" }}>
        <h3 style={{ marginBottom: "16px" }}>📍 Current Location</h3>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", 
          gap: "16px" 
        }}>
          <div>
            <span style={{ color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Latitude:</span>
            <strong style={{ color: "var(--text-primary)" }}>{currentLocation.lat.toFixed(6)}</strong>
          </div>
          <div>
            <span style={{ color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Longitude:</span>
            <strong style={{ color: "var(--text-primary)" }}>{currentLocation.lng.toFixed(6)}</strong>
          </div>
          <div>
            <span style={{ color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Last Updated:</span>
            <strong style={{ color: "var(--text-primary)" }}>
              {new Date().toLocaleTimeString()}
            </strong>
          </div>
        </div>
      </div>

      {/* Recent Deliveries */}
      <div className="card">
        <h3 style={{ marginBottom: "16px" }}>📦 Recent Deliveries</h3>
        {deliveries.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📦</div>
            <p>No deliveries assigned yet</p>
            <p style={{ fontSize: "14px" }}>Go online to receive delivery assignments</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {deliveries.slice(0, 5).map((delivery) => (
              <div key={delivery._id} style={{
                border: "1px solid var(--border-color)",
                borderRadius: "var(--border-radius-sm)",
                padding: "16px",
                background: "var(--background)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h4 style={{ margin: "0 0 8px 0", color: "var(--text-primary)" }}>
                      Order #{delivery.orderId?._id?.slice(-8).toUpperCase()}
                    </h4>
                    <p style={{ margin: "0 0 4px 0", color: "var(--text-secondary)" }}>
                      Status: <span style={{
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        background: delivery.status === "Delivered" ? "#4caf50" : 
                                   delivery.status === "In Transit" ? "#2196f3" : "#ff9800",
                        color: "white"
                      }}>
                        {delivery.status}
                      </span>
                    </p>
                    {delivery.destination && (
                      <p style={{ margin: "0 0 4px 0", color: "var(--text-secondary)" }}>
                        📍 {delivery.destination.address || "Address not available"}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <Link
                      to={`/orders/${delivery.orderId._id}/delivery-chat`}
                      className="btn btn-primary"
                      style={{ fontSize: "12px", padding: "6px 12px" }}
                    >
                      💬 Chat
                    </Link>
                    <Link
                      to={`/tracking?deliveryId=${delivery._id}`}
                      className="btn btn-secondary"
                      style={{ fontSize: "12px", padding: "6px 12px" }}
                    >
                      📍 Track
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
