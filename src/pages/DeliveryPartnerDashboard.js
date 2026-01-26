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
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
    fetchCurrentLocation();
    checkOnlineStatus();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError("");
    
    const { data, error: err } = await apiCall(() =>
      API.get("/orders/delivery/my-orders")
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

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <div className="loading-spinner"></div>
        <p style={{ textAlign: "center", color: "var(--text-secondary)" }}>Loading dashboard...</p>
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
