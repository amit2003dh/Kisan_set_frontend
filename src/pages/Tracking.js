import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import API, { apiCall } from "../api/api";
import LiveMap from "../components/LiveMap";
import ChatBox from "../components/ChatBox";
import useDeliverySocket from "../hooks/useDeliverySocket";
import { estimateETA } from "../utils/eta";

export default function Tracking() {
  const [searchParams] = useSearchParams();
  const deliveryId = searchParams.get("deliveryId");

  const [location, setLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [deliveryStatus, setDeliveryStatus] = useState("In Transit");
  const [eta, setEta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [customerInfo, setCustomerInfo] = useState(null);
  const [providerInfo, setProviderInfo] = useState(null);

  // 🔄 Real-time socket updates
  useDeliverySocket(deliveryId, (data) => {
    setLocation({ lat: data.lat, lng: data.lng });
    setDeliveryStatus(data.status || "In Transit");

    if (destination) {
      setEta(estimateETA(data, destination));
    }
  });

  // Initial fetch (fallback + destination)
  useEffect(() => {
    if (!deliveryId) {
      setError("No delivery ID provided");
      setLoading(false);
      return;
    }

    const fetchTrackingData = async () => {
      const { data, error: err } = await apiCall(() =>
        API.get(`/delivery/tracking/${deliveryId}`)
      );

      if (err) {
        setError(err);
        setLoading(false);
        return;
      }

      /*
        Expected backend response:
        {
          currentLocation: { lat, lng, status },
          destination: { lat, lng, address }
        }
      */

      setLocation(data.currentLocation);
      setDestination(data.destination);
      setDeliveryStatus(data.deliveryStatus || data.currentLocation?.status || "In Transit");
      setCustomerInfo(data.customerInfo);
      setProviderInfo(data.providerInfo);

      if (data.destination) {
        setEta(estimateETA(data.currentLocation, data.destination));
      }

      setLoading(false);
    };

    fetchTrackingData();
  }, [deliveryId]);

  return (
    <div className="container" style={{ padding: "40px 0" }}>
      <div className="page-header">
        <h1>📍 Live Delivery Tracking</h1>
        <p>Track your order in real-time</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div
        className="grid"
        style={{ gridTemplateColumns: "1fr 1fr", gap: "32px" }}
      >
        {/* MAP */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ height: "420px" }}>
            {loading ? (
              <div className="loading-spinner" />
            ) : (
              <LiveMap
                location={location}
                destination={destination}
              />
            )}
          </div>
        </div>

        {/* STATUS & INFO */}
        <div>
          <div className="card">
            <h2>Delivery Status</h2>

            <div style={{ textAlign: "center", padding: "20px" }}>
              <div style={{ fontSize: "48px" }}>
                {deliveryStatus === "Delivered"
                  ? "✅"
                  : deliveryStatus === "Out for Delivery"
                  ? "🚚"
                  : "🚛"}
              </div>

              <h3>{deliveryStatus}</h3>

              {eta && (
                <p style={{ marginTop: "12px" }}>
                  ⏱ Estimated Arrival: <strong>{eta} mins</strong>
                </p>
              )}

              {destination?.address && (
                <p style={{ fontSize: "14px", marginTop: "12px" }}>
                  🏠 {destination.address}
                </p>
              )}
            </div>
          </div>

          {/* Provider Information */}
          {providerInfo && (
            <div className="card" style={{ marginTop: "16px" }}>
              <h3>🚚 Delivery Partner</h3>
              <div style={{ fontSize: "14px" }}>
                <p><strong>Name:</strong> {providerInfo.name}</p>
                {providerInfo.phone && (
                  <p><strong>Phone:</strong> {providerInfo.phone}</p>
                )}
                {providerInfo.address && (
                  <p><strong>Location:</strong> {
                    typeof providerInfo.address === 'string' 
                      ? providerInfo.address 
                      : providerInfo.address.address || "Location not available"
                  }</p>
                )}
              </div>
            </div>
          )}

          {/* Customer Information */}
          {customerInfo && (
            <div className="card" style={{ marginTop: "16px" }}>
              <h3>👤 Customer</h3>
              <div style={{ fontSize: "14px" }}>
                <p><strong>Name:</strong> {customerInfo.name}</p>
                {customerInfo.phone && (
                  <p><strong>Phone:</strong> {customerInfo.phone}</p>
                )}
                {customerInfo.address && (
                  <p><strong>Address:</strong> {
                    typeof customerInfo.address === 'string' 
                      ? customerInfo.address 
                      : customerInfo.address.address || "Address not available"
                  }</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CHAT */}
      <div className="card" style={{ marginTop: "32px" }}>
        <h2>💬 Chat with Delivery Partner</h2>
        <ChatBox />
      </div>
    </div>
  );
}
