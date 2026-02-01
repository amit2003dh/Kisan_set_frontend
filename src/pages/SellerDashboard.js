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
  
  // Mobile detection states
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(true);

  // Mobile detection and responsive handling
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  // Auto-redirect for products tab
  useEffect(() => {
    if (activeTab === "products") {
      // Immediate redirect without delay
      navigate("/manage-products");
    }
  }, [activeTab, navigate]);

  // Auto-redirect for analytics tab
  useEffect(() => {
    if (activeTab === "analytics") {
      // Immediate redirect without delay
      navigate("/seller-orders?view=analytics");
    }
  }, [activeTab, navigate]);

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
      API.get("/orders/seller")
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

  // Calculate dashboard stats from orders
  const calculateStats = (orders) => {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const productSales = orders.filter(order => order.orderType === "product_purchase").length;
    const deliveredOrders = orders.filter(order => order.status === "Delivered").length;
    const pendingOrders = orders.filter(order => order.status === "Confirmed").length;
    
    return {
      totalOrders,
      totalRevenue,
      productSales,
      deliveredOrders,
      pendingOrders
    };
  };

  const stats = calculateStats(dashboardData || []);

  return (
    <div className="container" style={{ 
      paddingTop: isMobile ? "20px" : "40px", 
      paddingBottom: isMobile ? "20px" : "40px",
      paddingLeft: isMobile ? "16px" : "20px",
      paddingRight: isMobile ? "16px" : "20px",
      minHeight: "100vh",
      background: isMobile 
        ? "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)"
        : "var(--background)"
    }}>
      <div className="page-header">
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: isMobile ? "flex-start" : "center",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? "16px" : "0"
        }}>
          <div>
            <h1 style={{ 
              fontSize: isMobile ? "24px" : "32px",
              marginBottom: isMobile ? "8px" : "0"
            }}>🏪 Seller Dashboard</h1>
            <p style={{ 
              fontSize: isMobile ? "14px" : "16px",
              color: "var(--text-secondary)",
              margin: 0
            }}>Manage your products and track sales performance</p>
          </div>
          <div style={{ 
            display: "flex", 
            gap: isMobile ? "8px" : "12px",
            flexDirection: isMobile ? "column" : "row",
            width: isMobile ? "100%" : "auto"
          }}>
            <Link 
              to="/seller-orders" 
              className="btn btn-primary" 
              style={{ 
                fontSize: isMobile ? "12px" : "14px", 
                padding: isMobile ? "12px 16px" : "10px 20px",
                width: isMobile ? "100%" : "auto",
                textAlign: "center",
                justifyContent: "center",
                alignItems: "center"
              }}
            >
              📦 View Orders
            </Link>
            <Link 
              to="/add-product" 
              className="btn btn-secondary" 
              style={{ 
                fontSize: isMobile ? "12px" : "14px", 
                padding: isMobile ? "12px 16px" : "10px 20px",
                width: isMobile ? "100%" : "auto",
                textAlign: "center",
                justifyContent: "center",
                alignItems: "center"
              }}
            >
              ➕ Add Product
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: "flex", 
        gap: isMobile ? "4px" : "8px", 
        marginBottom: isMobile ? "24px" : "32px",
        borderBottom: "1px solid var(--border-color)",
        paddingBottom: "16px",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch"
      }}>
        {["overview", "products", "analytics", "location"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`btn ${activeTab === tab ? "btn-primary" : "btn-outline"}`}
            style={{ 
              padding: isMobile ? "10px 12px" : "8px 16px",
              borderRadius: "var(--border-radius-sm)",
              fontSize: isMobile ? "12px" : "14px",
              textTransform: "capitalize",
              whiteSpace: "nowrap",
              minWidth: isMobile ? "auto" : "120px"
            }}
          >
            {isMobile ? (
              <>
                {tab === "overview" && "📊"}
                {tab === "products" && "🌾"}
                {tab === "analytics" && "📈"}
                {tab === "location" && "📍"}
              </>
            ) : (
              <>
                {tab === "overview" && "📊 Overview"}
                {tab === "products" && "🌾 Products"}
                {tab === "analytics" && "📈 Analytics"}
                {tab === "location" && "📍 Location"}
              </>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div>
          {/* Stats Cards */}
          <div className="grid" style={{ 
            gridTemplateColumns: isMobile 
              ? (isPortrait ? "repeat(2, 1fr)" : "repeat(2, 1fr)")
              : "repeat(auto-fit, minmax(200px, 1fr))", 
            gap: isMobile ? "12px" : "20px", 
            marginBottom: isMobile ? "24px" : "32px" 
          }}>
            <div className="card" style={{ 
              padding: isMobile ? "16px" : "20px",
              transition: "all 0.3s ease",
              transform: "translateY(0)",
              boxShadow: isMobile 
                ? "0 2px 8px rgba(0,0,0,0.1)" 
                : "0 4px 6px rgba(0,0,0,0.1)",
              ":hover": {
                transform: isMobile ? "translateY(-2px)" : "translateY(-4px)",
                boxShadow: isMobile 
                  ? "0 4px 12px rgba(0,0,0,0.15)" 
                  : "0 8px 15px rgba(0,0,0,0.2)"
              }
            }}>
              <h3 style={{ color: "var(--text-secondary)", fontSize: isMobile ? "12px" : "14px", marginBottom: "8px" }}>Total Orders</h3>
              <p style={{ fontSize: isMobile ? "24px" : "32px", fontWeight: "700", color: "var(--primary-green)" }}>{stats.totalOrders}</p>
              <p style={{ fontSize: isMobile ? "11px" : "12px", color: "var(--text-secondary)" }}>All time</p>
            </div>
            <div className="card" style={{ padding: isMobile ? "16px" : "20px" }}>
              <h3 style={{ color: "var(--text-secondary)", fontSize: isMobile ? "12px" : "14px", marginBottom: "8px" }}>Total Revenue</h3>
              <p style={{ fontSize: isMobile ? "24px" : "32px", fontWeight: "700", color: "var(--primary-blue)" }}>₹{stats.totalRevenue.toFixed(2)}</p>
              <p style={{ fontSize: isMobile ? "11px" : "12px", color: "var(--text-secondary)" }}>From sales</p>
            </div>
            <div className="card" style={{ padding: isMobile ? "16px" : "20px" }}>
              <h3 style={{ color: "var(--text-secondary)", fontSize: isMobile ? "12px" : "14px", marginBottom: "8px" }}>Product Sales</h3>
              <p style={{ fontSize: isMobile ? "24px" : "32px", fontWeight: "700", color: "var(--primary-purple)" }}>{stats.productSales}</p>
              <p style={{ fontSize: isMobile ? "11px" : "12px", color: "var(--text-secondary)" }}>🛒 Products sold</p>
            </div>
            <div className="card" style={{ padding: isMobile ? "16px" : "20px" }}>
              <h3 style={{ color: "var(--text-secondary)", fontSize: isMobile ? "12px" : "14px", marginBottom: "8px" }}>Delivered</h3>
              <p style={{ fontSize: isMobile ? "24px" : "32px", fontWeight: "700", color: "var(--success)" }}>{stats.deliveredOrders}</p>
              <p style={{ fontSize: isMobile ? "11px" : "12px", color: "var(--text-secondary)" }}>✅ Completed</p>
            </div>
            <div className="card" style={{ padding: isMobile ? "16px" : "20px" }}>
              <h3 style={{ color: "var(--text-secondary)", fontSize: isMobile ? "12px" : "14px", marginBottom: "8px" }}>Pending</h3>
              <p style={{ fontSize: isMobile ? "24px" : "32px", fontWeight: "700", color: "var(--warning)" }}>{stats.pendingOrders}</p>
              <p style={{ fontSize: isMobile ? "11px" : "12px", color: "var(--text-secondary)" }}>⏳ Processing</p>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="card" style={{ marginBottom: isMobile ? "24px" : "32px", padding: isMobile ? "16px" : "20px" }}>
            <h3 style={{ marginBottom: isMobile ? "16px" : "20px", fontSize: isMobile ? "18px" : "20px" }}>📦 Recent Orders</h3>
            <div style={{ maxHeight: isMobile ? "250px" : "300px", overflowY: "auto" }}>
              {dashboardData && dashboardData.length === 0 ? (
                <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: isMobile ? "16px" : "20px", fontSize: isMobile ? "14px" : "16px" }}>
                  No orders yet
                </p>
              ) : (
                dashboardData && dashboardData.slice(0, 5).map((order, index) => (
                  <div key={index} style={{
                    padding: isMobile ? "12px" : "12px",
                    borderBottom: "1px solid var(--border-color)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: isMobile ? "flex-start" : "center",
                    flexDirection: isMobile ? "column" : "row",
                    gap: isMobile ? "8px" : "0"
                  }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: "500", fontSize: isMobile ? "14px" : "16px" }}>
                        🛒 Product Sale
                      </p>
                      <p style={{ margin: "4px 0 0 0", fontSize: isMobile ? "12px" : "14px", color: "var(--text-secondary)" }}>
                        {order.items?.[0]?.name || "Product"} - ₹{order.total?.toFixed(2)}
                      </p>
                    </div>
                    <div style={{ 
                      textAlign: isMobile ? "left" : "right",
                      display: "flex",
                      flexDirection: isMobile ? "row" : "column",
                      alignItems: isMobile ? "center" : "flex-end",
                      gap: isMobile ? "8px" : "4px"
                    }}>
                      <span style={{
                        padding: isMobile ? "6px 10px" : "4px 8px",
                        borderRadius: "12px",
                        fontSize: isMobile ? "11px" : "12px",
                        background: order.status === "Delivered" ? "var(--success)" : 
                                     order.status === "Confirmed" ? "var(--primary-blue)" : "var(--warning)",
                        color: "white",
                        whiteSpace: "nowrap"
                      }}>
                        {order.status}
                      </span>
                      <div style={{ fontSize: isMobile ? "11px" : "12px", color: "var(--text-secondary)" }}>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
                      </div>
      )}

      {/* Products Tab - Auto Redirect */}
      {activeTab === "products" && null}

      {/* Analytics Tab - Auto Redirect */}
      {activeTab === "analytics" && null}

      {/* Location Tab */}
      {activeTab === "location" && (
        <div>
          <h3 style={{ marginBottom: isMobile ? "20px" : "24px", fontSize: isMobile ? "20px" : "24px" }}>📍 Your Location</h3>
          
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", 
            gap: isMobile ? "20px" : "24px" 
          }}>
            {/* Location Info Card */}
            <div className="card" style={{ padding: isMobile ? "16px" : "20px" }}>
              <h4 style={{ marginBottom: "16px", fontSize: isMobile ? "16px" : "18px" }}>📍 Location Details</h4>
              
              <div style={{ marginBottom: "16px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "8px",
                  color: "var(--text-primary)",
                  fontWeight: "600",
                  fontSize: isMobile ? "13px" : "14px"
                }}>
                  Address
                </label>
                <input
                  type="text"
                  value={userLocation.address}
                  onChange={(e) => setUserLocation(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter your business address"
                  style={{
                    width: "100%",
                    padding: isMobile ? "12px 16px" : "10px 12px",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--border-radius-sm)",
                    fontSize: isMobile ? "16px" : "14px" // iOS zoom prevention
                  }}
                />
              </div>
              
              <div style={{ 
                display: "flex", 
                gap: isMobile ? "8px" : "12px",
                flexDirection: isMobile ? "column" : "row"
              }}>
                <button
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          handleLocationUpdate({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                          });
                        },
                        (error) => {
                          setLocationError("Unable to get your location. Please enable location services.");
                        }
                      );
                    } else {
                      setLocationError("Geolocation is not supported by your browser.");
                    }
                  }}
                  className="btn btn-primary"
                  style={{ 
                    fontSize: isMobile ? "14px" : "14px",
                    padding: isMobile ? "14px 16px" : "10px 16px",
                    minHeight: isMobile ? "48px" : "auto" // Touch target size
                  }}
                >
                  📍 Use Current Location
                </button>
                
                <button
                  onClick={() => {
                    setUserLocation({ lat: 0, lng: 0, address: "" });
                    localStorage.removeItem("sellerLocation");
                    setLocationError("");
                  }}
                  className="btn btn-outline"
                  style={{ 
                    fontSize: isMobile ? "14px" : "14px",
                    padding: isMobile ? "14px 16px" : "10px 16px",
                    minHeight: isMobile ? "48px" : "auto" // Touch target size
                  }}
                >
                  🗑️ Clear
                </button>
              </div>
              
              {locationError && (
                <div style={{
                  marginTop: "12px",
                  padding: "12px",
                  backgroundColor: "var(--error)",
                  color: "white",
                  borderRadius: "var(--border-radius-sm)",
                  fontSize: isMobile ? "13px" : "12px"
                }}>
                  {locationError}
                </div>
              )}
              
              {userLocation.lat !== 0 && userLocation.lng !== 0 && (
                <div style={{
                  marginTop: "16px",
                  padding: "12px",
                  backgroundColor: "var(--background)",
                  borderRadius: "var(--border-radius-sm)",
                  fontSize: isMobile ? "12px" : "12px",
                  color: "var(--text-secondary)"
                }}>
                  📍 Coordinates: {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                </div>
              )}
            </div>
            
            {/* Map Card */}
            <div className="card" style={{ padding: isMobile ? "16px" : "20px" }}>
              <h4 style={{ marginBottom: "16px", fontSize: isMobile ? "16px" : "18px" }}>🗺️ Location Map</h4>
              <div style={{ 
                height: isMobile ? "250px" : "300px",
                borderRadius: "var(--border-radius-sm)",
                overflow: "hidden"
              }}>
                <LiveMap 
                  location={userLocation.lat !== 0 ? userLocation : null}
                  useLiveLocation={useLiveLocation}
                  onLocationUpdate={handleLocationUpdate}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
