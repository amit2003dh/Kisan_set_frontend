import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import API, { apiCall } from "../api/api";

export default function DeliveryQueue() {
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyDeliveries();
  }, []);

  const fetchMyDeliveries = async () => {
    try {
      const { data } = await apiCall(() => API.get("/delivery-partner/my-deliveries"));
      if (data) {
        setMyDeliveries(data.deliveries || []);
      }
    } catch (error) {
      console.error("Error fetching my deliveries:", error);
      setError("Failed to fetch deliveries");
    } finally {
      setLoading(false);
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
        setSuccess("Delivery started successfully!");
        fetchMyDeliveries(); // Refresh delivery queue
      }
    } catch (error) {
      console.error("❌ Exception in handleStartDelivery:", error);
      setError("Failed to start delivery");
    }
  };

  const completeDelivery = async (deliveryId) => {
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
      }
    } catch (error) {
      console.error("❌ Exception in completeDelivery:", error);
      setError("Failed to complete delivery");
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <div style={{ textAlign: "center" }}>
          <div className="loading-spinner"></div>
          <p>Loading delivery queue...</p>
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
            <h1>📦 Delivery Queue</h1>
            <p>Manage your assigned deliveries</p>
          </div>
        </div>
      </div>

      {error && <div className="error-message" style={{ marginBottom: "16px" }}>{error}</div>}
      {success && <div className="success-message" style={{ marginBottom: "16px" }}>{success}</div>}

      <div className="card">
        <h3 style={{ marginBottom: "16px" }}>📦 My Delivery Queue</h3>
        {myDeliveries.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📦</div>
            <p>No active deliveries</p>
            <p style={{ fontSize: "14px" }}>Accept orders from the Overview tab to see them here</p>
            <Link
              to="/delivery-partner"
              className="btn btn-primary"
              style={{ fontSize: "14px", padding: "8px 16px" }}
            >
              📊 Go to Overview
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {myDeliveries.map((delivery) => (
              <div key={delivery._id} style={{
                border: "1px solid var(--border-color)",
                borderRadius: "var(--border-radius-sm)",
                padding: "16px",
                background: "var(--background)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h4 style={{ margin: "0 0 8px 0" }}>
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
                    <p style={{ margin: "0 0 4px 0", fontSize: "12px", color: "var(--text-secondary)" }}>
                      Assigned: {new Date(delivery.assignedAt).toLocaleString()}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <Link
                      to={`/delivery/${delivery._id}`}
                      className="btn btn-primary"
                      style={{ fontSize: "12px", padding: "6px 12px" }}
                    >
                      📋 View Details
                    </Link>
                    {delivery.status === "Assigned" && (
                      <button
                        onClick={() => handleStartDelivery(delivery._id)}
                        className="btn btn-success"
                        style={{ fontSize: "12px", padding: "6px 12px" }}
                      >
                        🚚 Start Delivery
                      </button>
                    )}
                    {delivery.status === "In Transit" && (
                      <button
                        onClick={() => completeDelivery(delivery._id)}
                        className="btn btn-primary"
                        style={{ fontSize: "12px", padding: "6px 12px" }}
                      >
                        ✅ Complete
                      </button>
                    )}
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

      {/* Queue Statistics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginTop: "24px" }}>
        <div className="card" style={{ textAlign: "center", padding: "20px" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>📦</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "var(--primary-blue)" }}>
            {myDeliveries.length}
          </div>
          <div style={{ color: "var(--text-secondary)" }}>Total Deliveries</div>
        </div>
        
        <div className="card" style={{ textAlign: "center", padding: "20px" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>⏳</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#ff9800" }}>
            {myDeliveries.filter(d => d.status === "Assigned").length}
          </div>
          <div style={{ color: "var(--text-secondary)" }}>Pending</div>
        </div>
        
        <div className="card" style={{ textAlign: "center", padding: "20px" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>🚚</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#2196f3" }}>
            {myDeliveries.filter(d => d.status === "In Transit").length}
          </div>
          <div style={{ color: "var(--text-secondary)" }}>In Transit</div>
        </div>
        
        <div className="card" style={{ textAlign: "center", padding: "20px" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>✅</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#4caf50" }}>
            {myDeliveries.filter(d => d.status === "Delivered").length}
          </div>
          <div style={{ color: "var(--text-secondary)" }}>Completed</div>
        </div>
      </div>
    </div>
  );
}
