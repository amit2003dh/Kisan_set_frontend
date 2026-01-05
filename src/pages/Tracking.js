import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../api/api";
import { apiCall } from "../api/api";
import LiveMap from "../components/LiveMap";
import ChatBox from "../components/ChatBox";

export default function Tracking() {
  const [searchParams] = useSearchParams();
  const deliveryId = searchParams.get("deliveryId");
  const [location, setLocation] = useState({
    lat: 22.7196,
    lng: 75.8577
  });
  const [deliveryStatus, setDeliveryStatus] = useState("In Transit");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!deliveryId) {
      setError("No delivery ID provided");
      setLoading(false);
      return;
    }

    const fetchLocation = async () => {
      const { data, error: err } = await apiCall(() =>
        API.get(`/delivery/location/${deliveryId}`)
      );

      if (err) {
        setError(err);
        setLoading(false);
        return;
      }

      if (data) {
        setLocation(data);
        setDeliveryStatus(data.status || "In Transit");
      }
      setLoading(false);
    };

    // Initial fetch
    fetchLocation();

    // Poll every 5 seconds
    const interval = setInterval(fetchLocation, 5000);

    return () => clearInterval(interval);
  }, [deliveryId]);

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
      <div className="page-header">
        <h1>📍 Live Delivery Tracking</h1>
        <p>Track your order in real-time</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "32px", marginBottom: "32px" }}>
        {/* Map Section */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{
            background: "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)",
            color: "white",
            padding: "20px"
          }}>
            <h2 style={{ margin: 0, fontSize: "20px" }}>📍 Current Location</h2>
            <p style={{ margin: "8px 0 0 0", opacity: 0.9, fontSize: "14px" }}>
              Delivery Partner Location
            </p>
          </div>
          <div style={{ height: "400px", position: "relative" }}>
            {loading ? (
              <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center"
              }}>
                <div className="loading-spinner"></div>
                <p style={{ color: "var(--text-secondary)", marginTop: "16px" }}>
                  Loading location...
                </p>
              </div>
            ) : (
              <LiveMap location={location} />
            )}
          </div>
        </div>

        {/* Status Section */}
        <div className="card">
          <h2 style={{ marginBottom: "24px", fontSize: "20px", color: "var(--text-primary)" }}>
            Delivery Status
          </h2>

          <div style={{
            background: "var(--background)",
            borderRadius: "var(--border-radius-sm)",
            padding: "24px",
            marginBottom: "24px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>
              {deliveryStatus === "Delivered" ? "✅" : 
               deliveryStatus === "Out for Delivery" ? "🚚" : 
               deliveryStatus === "In Transit" ? "🚛" : "📦"}
            </div>
            <h3 style={{
              fontSize: "24px",
              fontWeight: "700",
              color: "var(--text-primary)",
              marginBottom: "8px"
            }}>
              {deliveryStatus}
            </h3>
            {deliveryId && (
              <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                Delivery ID: <strong>{deliveryId}</strong>
              </p>
            )}
          </div>

          <div style={{
            background: "#e3f2fd",
            borderLeft: "4px solid #1976d2",
            padding: "16px",
            borderRadius: "var(--border-radius-sm)",
            fontSize: "14px",
            color: "#1565c0"
          }}>
            <strong>ℹ️ Note:</strong> Location updates every 5 seconds. The delivery partner's current location is shown on the map.
          </div>
        </div>
      </div>

      {/* Chat Section */}
      <div className="card">
        <h2 style={{ marginBottom: "24px", fontSize: "20px", color: "var(--text-primary)" }}>
          💬 Chat with Delivery Partner
        </h2>
        <ChatBox />
      </div>
    </div>
  );
}
