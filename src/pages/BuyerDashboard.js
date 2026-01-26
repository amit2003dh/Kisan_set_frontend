import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API, { apiCall } from "../api/api";
import LiveMap from "../components/LiveMap";

export default function BuyerDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [userLocation, setUserLocation] = useState({ lat: 0, lng: 0, address: "" });
  const [useLiveLocation, setUseLiveLocation] = useState(false);
  const [locationError, setLocationError] = useState("");

  // Load saved location on component mount
  useEffect(() => {
    const savedLocation = localStorage.getItem("buyerLocation");
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
    localStorage.setItem("buyerLocation", JSON.stringify(updatedLocation));
    setLocationError("");
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    
    const { data, error: err } = await apiCall(() =>
      API.get("/orders/buyer")
    );
    
    if (err) {
      setError(err);
    } else {
      setOrders(data || []);
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

  const stats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter(o => o.status === "pending").length,
    confirmedOrders: orders.filter(o => o.status === "confirmed").length,
    deliveredOrders: orders.filter(o => o.status === "delivered").length,
    totalSpent: orders.reduce((sum, o) => sum + (o.total || 0), 0)
  };

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
      <div className="page-header">
        <h1>🛒 Buyer Dashboard</h1>
        <p>Track your orders and manage your shopping</p>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: "flex", 
        gap: "8px", 
        marginBottom: "32px",
        borderBottom: "1px solid var(--border-color)",
        paddingBottom: "16px"
      }}>
        {["overview", "orders", "location"].map((tab) => (
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
            {tab === "orders" && "📦 Orders"}
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
              <h3 style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "8px" }}>Total Orders</h3>
              <p style={{ fontSize: "32px", fontWeight: "700", color: "var(--primary-blue)" }}>{stats.totalOrders}</p>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>All time</p>
            </div>
            <div className="card">
              <h3 style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "8px" }}>Pending</h3>
              <p style={{ fontSize: "32px", fontWeight: "700", color: "var(--warning)" }}>{stats.pendingOrders}</p>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Awaiting confirmation</p>
            </div>
            <div className="card">
              <h3 style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "8px" }}>Confirmed</h3>
              <p style={{ fontSize: "32px", fontWeight: "700", color: "var(--success)" }}>{stats.confirmedOrders}</p>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Being processed</p>
            </div>
            <div className="card">
              <h3 style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "8px" }}>Delivered</h3>
              <p style={{ fontSize: "32px", fontWeight: "700", color: "var(--primary-green)" }}>{stats.deliveredOrders}</p>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Completed</p>
            </div>
            <div className="card">
              <h3 style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "8px" }}>Total Spent</h3>
              <p style={{ fontSize: "32px", fontWeight: "700", color: "var(--primary-green)" }}>₹{stats.totalSpent}</p>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>All purchases</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card" style={{ marginBottom: "32px" }}>
            <h3 style={{ marginBottom: "20px" }}>🚀 Quick Actions</h3>
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
              <Link to="/crops" className="btn btn-primary" style={{ display: "block", textAlign: "center" }}>
                🌾 Browse Crops
              </Link>
              <Link to="/products" className="btn btn-primary" style={{ display: "block", textAlign: "center" }}>
                🛒 Browse Products
              </Link>
              <Link to="/cart" className="btn btn-outline" style={{ display: "block", textAlign: "center" }}>
                🛒 View Cart
              </Link>
              <Link to="/orders" className="btn btn-outline" style={{ display: "block", textAlign: "center" }}>
                📦 View Orders
              </Link>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="card">
            <h3 style={{ marginBottom: "20px" }}>📦 Recent Orders</h3>
            {orders.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px" }}>
                No orders yet. Start shopping to see your orders here!
              </p>
            ) : (
              <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                {orders.slice(0, 5).map((order) => (
                  <div key={order._id} style={{
                    padding: "12px",
                    borderBottom: "1px solid var(--border-color)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: "500" }}>
                        {order.itemType === "crop" ? "🌾 Crop" : "🛒 Product"} Order
                      </p>
                      <p style={{ margin: 0, fontSize: "14px", color: "var(--text-secondary)" }}>
                        {order.itemId?.name || "Item"} - ₹{order.total}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        background: order.status === "delivered" ? "var(--success)" : 
                                     order.status === "confirmed" ? "var(--primary-blue)" : "var(--warning)",
                        color: "white"
                      }}>
                        {order.status}
                      </span>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === "orders" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <h3>📦 Your Orders</h3>
            <Link to="/orders" className="btn btn-primary">
              View All Orders
            </Link>
          </div>
          <div className="card">
            <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px" }}>
              Detailed order management coming soon...
            </p>
          </div>
        </div>
      )}

      {/* Location Tab */}
      {activeTab === "location" && (
        <div>
          <h3 style={{ marginBottom: "24px" }}>📍 Your Location</h3>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            {/* Location Info Card */}
            <div className="card">
              <h4 style={{ marginBottom: "16px" }}>📍 Delivery Location Details</h4>
              
              <div style={{ marginBottom: "16px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  color: "var(--text-primary)",
                  fontWeight: "600",
                  fontSize: "14px"
                }}>
                  📍 Delivery Address
                </label>
                <input
                  type="text"
                  value={userLocation.address || ""}
                  onChange={(e) => setUserLocation(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter your delivery address"
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
                    localStorage.removeItem("buyerLocation");
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
                <h4 style={{ margin: 0 }}>🗺️ Delivery Location Map</h4>
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
                    Sellers can deliver to your location more quickly
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "24px" }}>🎯</span>
                <div>
                  <strong>Local Products</strong>
                  <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "var(--text-secondary)" }}>
                    Find products available near your location
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "24px" }}>📈</span>
                <div>
                  <strong>Better Recommendations</strong>
                  <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "var(--text-secondary)" }}>
                    Get personalized product suggestions based on your area
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "24px" }}>🤝</span>
                <div>
                  <strong>Trust & Safety</strong>
                  <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "var(--text-secondary)" }}>
                  Verified location helps ensure secure transactions
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
