import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API, { apiCall } from "../api/api";
import LiveMap from "../components/LiveMap";

export default function SellerDashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [userLocation, setUserLocation] = useState({ lat: 0, lng: 0, address: "" });
  const [useLiveLocation, setUseLiveLocation] = useState(false);
  const [locationError, setLocationError] = useState("");

  // Load saved location on component mount
  useEffect(() => {
    const savedLocation = localStorage.getItem("sellerLocation");
    if (savedLocation) {
      try {
        const location = JSON.parse(savedLocation);
        setUserLocation(location);
      } catch (error) {
        console.error("Error parsing saved location:", error);
      }
    }
  }, []);

  const handleLocationUpdate = (location) => {
    const updatedLocation = {
      ...location,
      address: userLocation.address || "Current Location",
      timestamp: new Date().toISOString()
    };
    setUserLocation(updatedLocation);
    localStorage.setItem("sellerLocation", JSON.stringify(updatedLocation));
    setLocationError("");
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError("");
    
    const { data, error: err } = await apiCall(() =>
      API.get("/tracker/dashboard")
    );
    
    if (err) {
      setError(err);
    } else {
      setDashboardData(data);
    }
    
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <div className="loading-spinner"></div>
        <p style={{ textAlign: "center", color: "var(--text-secondary)" }}>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  const { overview, statusBreakdown, recentActivities, topProducts, recentChats } = dashboardData;

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
      <div className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1>🏪 Seller Dashboard</h1>
            <p>Manage your products and track sales performance</p>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <Link to="/seller-orders" className="btn btn-primary" style={{ fontSize: "14px", padding: "10px 20px" }}>
              📦 View Orders
            </Link>
            <Link to="/add-product" className="btn btn-secondary" style={{ fontSize: "14px", padding: "10px 20px" }}>
              ➕ Add Product
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: "flex", 
        gap: "8px", 
        marginBottom: "32px",
        borderBottom: "1px solid var(--border-color)",
        paddingBottom: "16px"
      }}>
        {["overview", "products", "chats", "analytics", "location"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`btn ${activeTab === tab ? "btn-primary" : "btn-outline"}`}
            style={{ 
              padding: "8px 16px",
              borderRadius: "var(--border-radius-sm)",
              fontSize: "14px",
              textTransform: "capitalize"
            }}
          >
            {tab === "overview" && "📊 Overview"}
            {tab === "products" && "🌾 Products"}
            {tab === "chats" && "💬 Chats"}
            {tab === "analytics" && "📈 Analytics"}
            {tab === "location" && "📍 Location"}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div>
          {/* Stats Cards */}
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "32px" }}>
            <div className="card">
              <h3 style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "8px" }}>Total Products</h3>
              <p style={{ fontSize: "32px", fontWeight: "700", color: "var(--primary-green)" }}>{overview.totalProducts}</p>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{overview.activeProducts} active</p>
            </div>
            <div className="card">
              <h3 style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "8px" }}>Total Views</h3>
              <p style={{ fontSize: "32px", fontWeight: "700", color: "var(--primary-blue)" }}>{overview.totalViews}</p>
            </div>
            <div className="card">
              <h3 style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "8px" }}>Inquiries</h3>
              <p style={{ fontSize: "32px", fontWeight: "700", color: "var(--warning)" }}>{overview.totalInquiries}</p>
            </div>
            <div className="card">
              <h3 style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "8px" }}>Orders</h3>
              <p style={{ fontSize: "32px", fontWeight: "700", color: "var(--success)" }}>{overview.totalOrders}</p>
            </div>
            <div className="card">
              <h3 style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "8px" }}>Revenue</h3>
              <p 
                style={{ 
                  fontSize: "32px", 
                  fontWeight: "700", 
                  color: "var(--primary-green)",
                  cursor: "pointer",
                  textDecoration: "underline",
                  textDecorationColor: "var(--primary-green)",
                  textUnderlineOffset: "4px"
                }}
                onClick={() => navigate("/revenue-details")}
              >
                ₹{overview.totalRevenue}
              </p>
            </div>
            <div className="card">
              <h3 style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "8px" }}>Active Chats</h3>
              <p style={{ fontSize: "32px", fontWeight: "700", color: "var(--info)" }}>{overview.activeChats}</p>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card" style={{ marginBottom: "32px" }}>
            <h3 style={{ marginBottom: "20px" }}>📋 Recent Activity</h3>
            <div style={{ maxHeight: "300px", overflowY: "auto" }}>
              {recentActivities.length === 0 ? (
                <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "20px" }}>
                  No recent activity
                </p>
              ) : (
                recentActivities.map((activity, index) => (
                  <div key={index} style={{
                    padding: "12px",
                    borderBottom: "1px solid var(--border-color)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: "500" }}>
                        {activity.eventType === "viewed" && "👁️ Product viewed"}
                        {activity.eventType === "inquired" && "💬 New inquiry"}
                        {activity.eventType === "ordered" && "🛒 New order"}
                        {activity.eventType === "created" && "➕ Product created"}
                        {activity.eventType === "updated" && "✏️ Product updated"}
                      </p>
                      <p style={{ margin: 0, fontSize: "12px", color: "var(--text-secondary)" }}>
                        {activity.description}
                      </p>
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      {new Date(activity.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top Products */}
          <div className="card">
            <h3 style={{ marginBottom: "20px" }}>🏆 Top Performing Products</h3>
            {topProducts.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "20px" }}>
                No products available
              </p>
            ) : (
              <div className="grid" style={{ gridTemplateColumns: "1fr", gap: "16px" }}>
                {topProducts.map((product, index) => (
                  <div key={product._id} style={{
                    padding: "16px",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--border-radius-sm)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div>
                      <h4 style={{ margin: "0 0 8px 0" }}>{product.name}</h4>
                      <p style={{ margin: 0, fontSize: "14px", color: "var(--text-secondary)" }}>
                        {product.quantity} {product.unit || "kg"} available
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: "0 0 4px 0", fontSize: "14px" }}>
                        <strong>{product.stats.orders}</strong> orders
                      </p>
                      <p style={{ margin: 0, fontSize: "14px", color: "var(--success)" }}>
                        ₹{product.stats.revenue}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === "products" && (
        <div>
          <div style={{ marginBottom: "24px" }}>
            <h3>🌾 Your Products</h3>
          </div>
          <div className="card">
            <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px" }}>
              Product management interface coming soon...
            </p>
          </div>
        </div>
      )}

      {/* Chats Tab */}
      {activeTab === "chats" && (
        <div>
          <h3 style={{ marginBottom: "24px" }}>💬 Customer Chats</h3>
          {recentChats.length === 0 ? (
            <div className="card">
              <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px" }}>
                No active chats
              </p>
            </div>
          ) : (
            <div className="grid" style={{ gridTemplateColumns: "1fr", gap: "16px" }}>
              {recentChats.map((chat) => (
                <div key={chat._id} className="card">
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
                        {chat.customerId?.name?.charAt(0) || "C"}
                      </div>
                      <div>
                        <h4 style={{ margin: "0 0 4px 0" }}>{chat.customerId?.name || "Customer"}</h4>
                        <p style={{ margin: 0, fontSize: "14px", color: "var(--text-secondary)" }}>
                          {chat.subject}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: "0 0 4px 0", fontSize: "12px", color: "var(--text-secondary)" }}>
                        {new Date(chat.lastActivityAt).toLocaleString()}
                      </p>
                      {chat.unreadCounts?.seller > 0 && (
                        <span style={{
                          background: "var(--error)",
                          color: "white",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "12px"
                        }}>
                          {chat.unreadCounts.seller}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Location Tab */}
      {activeTab === "location" && (
        <div>
          <h3 style={{ marginBottom: "24px" }}>📍 Your Location</h3>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            {/* Location Info Card */}
            <div className="card">
              <h4 style={{ marginBottom: "16px" }}>📍 Current Location Details</h4>
              
              <div style={{ marginBottom: "16px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  color: "var(--text-primary)",
                  fontWeight: "600",
                  fontSize: "14px"
                }}>
                  📍 Address
                </label>
                <input
                  type="text"
                  value={userLocation.address || ""}
                  onChange={(e) => setUserLocation(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter your business address"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--border-radius-sm)",
                    fontSize: "14px"
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "4px",
                    color: "var(--text-primary)",
                    fontWeight: "600",
                    fontSize: "12px"
                  }}>
                    Latitude
                  </label>
                  <input
                    type="text"
                    value={userLocation.lat || ""}
                    readOnly
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--border-radius-sm)",
                      fontSize: "14px",
                      background: "var(--background)",
                      color: "var(--text-secondary)"
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "4px",
                    color: "var(--text-primary)",
                    fontWeight: "600",
                    fontSize: "12px"
                  }}>
                    Longitude
                  </label>
                  <input
                    type="text"
                    value={userLocation.lng || ""}
                    readOnly
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--border-radius-sm)",
                      fontSize: "14px",
                      background: "var(--background)",
                      color: "var(--text-secondary)"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                <button
                  onClick={() => setUseLiveLocation(!useLiveLocation)}
                  style={{
                    padding: "8px 16px",
                    background: useLiveLocation ? "var(--success)" : "var(--primary-blue)",
                    color: "white",
                    border: "none",
                    borderRadius: "var(--border-radius-sm)",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500"
                  }}
                >
                  {useLiveLocation ? "📍 Using Live Location" : "👤 Use My Location"}
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem("sellerLocation");
                    setUserLocation({ lat: 0, lng: 0, address: "" });
                    setUseLiveLocation(false);
                  }}
                  style={{
                    padding: "8px 16px",
                    background: "var(--error)",
                    color: "white",
                    border: "none",
                    borderRadius: "var(--border-radius-sm)",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500"
                  }}
                >
                  🗑️ Clear Location
                </button>
              </div>

              {userLocation.timestamp && (
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  Last updated: {new Date(userLocation.timestamp).toLocaleString()}
                </div>
              )}

              {locationError && (
                <div style={{
                  padding: "8px 12px",
                  background: "rgba(220, 53, 69, 0.1)",
                  border: "1px solid var(--error)",
                  borderRadius: "var(--border-radius-sm)",
                  color: "var(--error)",
                  fontSize: "14px",
                  marginTop: "12px"
                }}>
                  {locationError}
                </div>
              )}
            </div>

            {/* Map Card */}
            <div className="card" style={{ padding: "0" }}>
              <div style={{
                padding: "16px",
                borderBottom: "1px solid var(--border-color)"
              }}>
                <h4 style={{ margin: 0 }}>🗺️ Location Map</h4>
              </div>
              <div style={{ height: "400px" }}>
                <LiveMap
                  location={userLocation}
                  destination={null}
                  useLiveLocation={useLiveLocation}
                  onLocationUpdate={handleLocationUpdate}
                />
              </div>
            </div>
          </div>

          {/* Location Benefits */}
          <div className="card" style={{ marginTop: "24px" }}>
            <h4 style={{ marginBottom: "16px" }}>💡 Why Share Your Location?</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "24px" }}>🚚</span>
                <div>
                  <strong>Faster Deliveries</strong>
                  <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "var(--text-secondary)" }}>
                    Customers can find you easily for quick product delivery
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "24px" }}>🎯</span>
                <div>
                  <strong>Local Visibility</strong>
                  <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "var(--text-secondary)" }}>
                    Appear in local searches when buyers look for nearby products
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "24px" }}>📈</span>
                <div>
                  <strong>Better Analytics</strong>
                  <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "var(--text-secondary)" }}>
                    Track customer locations and optimize your business strategy
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "24px" }}>🤝</span>
                <div>
                  <strong>Trust Building</strong>
                  <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "var(--text-secondary)" }}>
                  Customers feel more confident buying from verified local sellers
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div>
          <h3 style={{ marginBottom: "24px" }}>📈 Analytics</h3>
          <div className="card">
            <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px" }}>
              Advanced analytics coming soon...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
