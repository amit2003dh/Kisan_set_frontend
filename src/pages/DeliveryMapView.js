import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API, { apiCall } from "../api/api";
import LiveMap from "../components/LiveMap";

export default function DeliveryMapView() {
  const [currentLocation, setCurrentLocation] = useState({ lat: 0, lng: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recentOrder, setRecentOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCurrentLocation();
    fetchRecentOrder();
  }, []);

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

  const fetchRecentOrder = async () => {
    try {
      // Fetch delivery partner's assigned orders
      const { data } = await apiCall(() => API.get("/delivery-partner/orders"));
      if (data && data.orders) {
        setOrders(data.orders);
        
        // Find the most recently assigned order (status: "Assigned" or "In Transit")
        const activeOrders = data.orders.filter(order => 
          order.status === "Assigned" || order.status === "In Transit"
        );
        
        if (activeOrders.length > 0) {
          // Sort by assignment date (most recent first)
          const sortedOrders = activeOrders.sort((a, b) => 
            new Date(b.assignedAt || b.createdAt) - new Date(a.assignedAt || a.createdAt)
          );
          setRecentOrder(sortedOrders[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      setError("Failed to fetch delivery orders");
    } finally {
      setLoading(false);
    }
  };

  const updateLocation = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const { error } = await apiCall(() =>
              API.put("/delivery-partner/location", {
                lat: latitude,
                lng: longitude
              })
            );

            if (error) {
              setError(error);
            } else {
              setCurrentLocation({ lat: latitude, lng: longitude });
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
          <p>Loading delivery tracking...</p>
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
              onClick={() => navigate("/delivery-partner")}
              className="btn btn-outline"
              style={{ fontSize: "14px", padding: "8px 16px" }}
            >
              ← Back to Dashboard
            </button>
            <h1>🗺️ Live Order Tracking</h1>
            <p>
              {recentOrder ? 
                `Tracking order #${recentOrder._id?.slice(-6) || recentOrder.orderId?.slice(-6)}` : 
                "No active orders to track"
              }
            </p>
          </div>
        </div>
      </div>

      {error && <div className="error-message" style={{ marginBottom: "16px" }}>{error}</div>}

      {recentOrder ? (
        <div className="card" style={{ marginBottom: "24px" }}>
          <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3>📍 Live Order Tracking</h3>
              <p style={{ margin: "4px 0", color: "var(--text-secondary)" }}>
                <strong>Order ID:</strong> {recentOrder._id || recentOrder.orderId}
              </p>
              <p style={{ margin: "4px 0", color: "var(--text-secondary)" }}>
                <strong>Status:</strong> 
                <span style={{
                  marginLeft: "8px",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  background: recentOrder.status === "In Transit" ? "#2196f3" : "#ff9800",
                  color: "white",
                  fontSize: "12px"
                }}>
                  {recentOrder.status}
                </span>
              </p>
              <p style={{ margin: "4px 0", color: "var(--text-secondary)" }}>
                <strong>Customer:</strong> {recentOrder.customerName || "N/A"}
              </p>
            </div>
            <button
              onClick={updateLocation}
              className="btn btn-primary"
              style={{ fontSize: "14px", padding: "8px 16px" }}
            >
              📍 Update Location
            </button>
          </div>
          
          <div style={{ height: "400px", borderRadius: "8px", overflow: "hidden" }}>
            <LiveMap
              location={currentLocation}
              destination={recentOrder.deliveryInfo?.deliveryAddress ? {
                lat: recentOrder.deliveryInfo.deliveryAddress.lat || 0,
                lng: recentOrder.deliveryInfo.deliveryAddress.lng || 0,
                address: recentOrder.deliveryInfo.deliveryAddress.address
              } : null}
              useLiveLocation={true}
              onLocationUpdate={(location) => {
                console.log("📍 Location updated:", location);
                setCurrentLocation(location);
              }}
            />
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: "24px" }}>
          <div style={{ 
            height: "400px", 
            background: "var(--background-alt)", 
            borderRadius: "8px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            flexDirection: "column",
            border: "2px dashed var(--border-color)"
          }}>
            <div style={{ fontSize: "64px", marginBottom: "16px" }}>�</div>
            <h3 style={{ margin: "0 0 8px 0", color: "var(--text-primary)" }}>No Active Orders</h3>
            <p style={{ margin: "0 0 16px 0", color: "var(--text-secondary)", textAlign: "center" }}>
              You don't have any active orders to track
            </p>
            <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "var(--text-secondary)", textAlign: "center" }}>
              Active orders will appear here automatically
            </p>
            
            <div style={{ 
              background: "var(--background)", 
              padding: "16px", 
              borderRadius: "8px", 
              textAlign: "center",
              border: "1px solid var(--border-color)"
            }}>
              <h4 style={{ margin: "0 0 8px 0" }}>Current Location</h4>
              <p style={{ margin: "0 0 4px 0", fontSize: "14px" }}>
                <strong>Latitude:</strong> {currentLocation.lat.toFixed(6)}
              </p>
              <p style={{ margin: "0 0 4px 0", fontSize: "14px" }}>
                <strong>Longitude:</strong> {currentLocation.lng.toFixed(6)}
              </p>
              <p style={{ margin: "0", fontSize: "12px", color: "var(--text-secondary)" }}>
                Last updated: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", marginTop: "24px" }}>
        <div className="card">
          <h3 style={{ marginBottom: "16px" }}>📍 Location Features</h3>
          <ul style={{ lineHeight: "1.6", color: "var(--text-secondary)" }}>
            <li>Real-time GPS tracking</li>
            <li>Delivery route optimization</li>
            <li>Traffic-aware navigation</li>
            <li>Geofencing for delivery areas</li>
            <li>Location history tracking</li>
          </ul>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: "16px" }}>🗺️ Map Integration</h3>
          <ul style={{ lineHeight: "1.6", color: "var(--text-secondary)" }}>
            <li>Google Maps API</li>
            <li>OpenStreetMap support</li>
            <li>Offline map caching</li>
            <li>Multiple map layers</li>
            <li>Custom markers and routes</li>
          </ul>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: "16px" }}>🚚 Delivery Zones</h3>
          <ul style={{ lineHeight: "1.6", color: "var(--text-secondary)" }}>
            <li>Service area boundaries</li>
            <li>No-go zones</li>
            <li>Priority delivery areas</li>
            <li>Time-based zones</li>
            <li>Zone-based pricing</li>
          </ul>
        </div>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h3 style={{ marginBottom: "16px" }}>🛠️ Map Controls</h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button className="btn btn-secondary" style={{ fontSize: "14px" }}>
            📍 Center on My Location
          </button>
          <button className="btn btn-secondary" style={{ fontSize: "14px" }}>
            🗺️ Show All Deliveries
          </button>
          <button className="btn btn-secondary" style={{ fontSize: "14px" }}>
            🚚 Show Active Routes
          </button>
          <button className="btn btn-secondary" style={{ fontSize: "14px" }}>
            📊 Show Heatmap
          </button>
          <button className="btn btn-secondary" style={{ fontSize: "14px" }}>
            🎯 Show Service Areas
          </button>
        </div>
      </div>
    </div>
  );
}
