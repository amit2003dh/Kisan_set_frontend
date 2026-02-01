import { useEffect, useState } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import API, { apiCall } from "../api/api";
import LiveMap from "../components/LiveMap";
import OrderChat from "../components/OrderChat";
import useDeliverySocket from "../hooks/useDeliverySocket";
import { estimateETA } from "../utils/eta";

export default function Tracking() {
  const [searchParams] = useSearchParams();
  const params = useParams();
  
  // Get delivery ID from either URL params or search params (for backward compatibility)
  const deliveryId = params.deliveryId || searchParams.get("deliveryId");

  const [location, setLocation] = useState(null);
  const [pickupLocation, setPickupLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [deliveryStatus, setDeliveryStatus] = useState("In Transit");
  const [eta, setEta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [customerInfo, setCustomerInfo] = useState(null);
  const [providerInfo, setProviderInfo] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      setPickupLocation(data.pickupLocation);
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
    <div className="container" style={{ 
      padding: isMobile ? "20px 16px" : "40px 0",
      maxWidth: isMobile ? "100%" : "1200px",
      margin: "0 auto"
    }}>
      <div className="page-header" style={{ textAlign: isMobile ? "center" : "left", marginBottom: isMobile ? "24px" : "32px" }}>
        <h1 style={{ 
          fontSize: isMobile ? "24px" : "32px", 
          marginBottom: isMobile ? "8px" : "16px" 
        }}>
          📍 Live Delivery Tracking
        </h1>
        <p style={{ 
          fontSize: isMobile ? "14px" : "16px", 
          color: "var(--text-secondary)",
          margin: 0 
        }}>
          Track your order in real-time
        </p>
      </div>

      {error && <div className="error-message" style={{ marginBottom: isMobile ? "20px" : "24px" }}>{error}</div>}

      <div
        className="grid"
        style={{ 
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", 
          gap: isMobile ? "20px" : "32px" 
        }}
      >
        {/* MAP */}
        <div className="card" style={{ 
          padding: 0,
          order: isMobile ? 2 : 1 // On mobile, show map below status
        }}>
          <div style={{ 
            height: isMobile ? "300px" : "420px",
            borderRadius: "var(--border-radius-sm)",
            overflow: "hidden"
          }}>
            {loading ? (
              <div className="loading-spinner" />
            ) : (
              <LiveMap
                location={location}
                destination={destination}
                pickupLocation={pickupLocation}
              />
            )}
          </div>
        </div>

        {/* STATUS & INFO */}
        <div style={{ order: isMobile ? 1 : 2 }}>
          <div className="card" style={{ padding: isMobile ? "20px" : "24px" }}>
            <h2 style={{ 
              fontSize: isMobile ? "18px" : "20px", 
              marginBottom: isMobile ? "16px" : "20px" 
            }}>
              Delivery Status
            </h2>

            <div style={{ textAlign: "center", padding: isMobile ? "16px" : "20px" }}>
              <div style={{ 
                fontSize: isMobile ? "36px" : "48px",
                marginBottom: isMobile ? "12px" : "16px"
              }}>
                {deliveryStatus === "Delivered"
                  ? "✅"
                  : deliveryStatus === "Out for Delivery"
                  ? "🚚"
                  : "🚛"}
              </div>

              <h3 style={{ 
                fontSize: isMobile ? "16px" : "18px",
                marginBottom: isMobile ? "12px" : "16px"
              }}>
                {deliveryStatus}
              </h3>

              {eta && (
                <p style={{ 
                  marginTop: "12px",
                  fontSize: isMobile ? "14px" : "16px"
                }}>
                  ⏱ Estimated Arrival: <strong>{eta} mins</strong>
                </p>
              )}

              {destination?.address && (
                <p style={{ 
                  fontSize: isMobile ? "12px" : "14px", 
                  marginTop: isMobile ? "12px" : "16px",
                  color: "var(--text-secondary)",
                  lineHeight: "1.4"
                }}>
                  🏠 {destination.address}
                </p>
              )}
            </div>
          </div>

          {/* Provider Information */}
          {providerInfo && (
            <div className="card" style={{ 
              marginTop: "16px",
              padding: isMobile ? "16px" : "20px"
            }}>
              <h3 style={{ 
                fontSize: isMobile ? "16px" : "18px",
                marginBottom: isMobile ? "12px" : "16px"
              }}>
                🚚 Delivery Partner
              </h3>
              <div style={{ fontSize: isMobile ? "13px" : "14px" }}>
                <p style={{ marginBottom: isMobile ? "8px" : "12px" }}>
                  <strong>Name:</strong> {providerInfo.name}
                </p>
                {providerInfo.phone && (
                  <p style={{ marginBottom: isMobile ? "8px" : "12px" }}>
                    <strong>Phone:</strong> {providerInfo.phone}
                  </p>
                )}
                {providerInfo.address && (
                  <p style={{ marginBottom: 0 }}>
                    <strong>Location:</strong> {
                      typeof providerInfo.address === 'string' 
                        ? providerInfo.address 
                        : providerInfo.address.address || "Location not available"
                    }
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Customer Information */}
          {customerInfo && (
            <div className="card" style={{ 
              marginTop: "16px",
              padding: isMobile ? "16px" : "20px"
            }}>
              <h3 style={{ 
                fontSize: isMobile ? "16px" : "18px",
                marginBottom: isMobile ? "12px" : "16px"
              }}>
                👤 Customer
              </h3>
              <div style={{ fontSize: isMobile ? "13px" : "14px" }}>
                <p style={{ marginBottom: isMobile ? "8px" : "12px" }}>
                  <strong>Name:</strong> {customerInfo.name}
                </p>
                {customerInfo.phone && (
                  <p style={{ marginBottom: isMobile ? "8px" : "12px" }}>
                    <strong>Phone:</strong> {customerInfo.phone}
                  </p>
                )}
                {customerInfo.address && (
                  <p style={{ marginBottom: 0 }}>
                    <strong>Address:</strong> {
                      typeof customerInfo.address === 'string' 
                        ? customerInfo.address 
                        : customerInfo.address.address || "Address not available"
                    }
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CHAT */}
      <div className="card" style={{ 
        marginTop: isMobile ? "24px" : "32px",
        padding: isMobile ? "20px" : "24px"
      }}>
        <h2 style={{ 
          fontSize: isMobile ? "18px" : "20px",
          marginBottom: isMobile ? "12px" : "16px"
        }}>
          💬 Order Communication
        </h2>
        <p style={{ 
          color: "var(--text-secondary)", 
          marginBottom: isMobile ? "16px" : "16px",
          fontSize: isMobile ? "14px" : "16px"
        }}>
          Communicate about this order. Messages are routed based on delivery status.
        </p>
        <OrderChat orderId={deliveryId} />
      </div>
    </div>
  );
}
