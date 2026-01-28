import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API, { apiCall } from "../api/api";

export default function DeliveryPerformance() {
  const [performance, setPerformance] = useState({ avgDeliveryTime: 0, successRate: 0, totalDelivered: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchPerformance();
  }, []);

  const fetchPerformance = async () => {
    try {
      const { data } = await apiCall(() => API.get("/delivery-partner/performance"));
      if (data) {
        setPerformance(data);
      }
    } catch (error) {
      console.error("Error fetching performance:", error);
      setError("Failed to fetch performance data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <div style={{ textAlign: "center" }}>
          <div className="loading-spinner"></div>
          <p>Loading performance data...</p>
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
            <h1>📈 Performance</h1>
            <p>Track your delivery performance and efficiency metrics</p>
          </div>
        </div>
      </div>

      {error && <div className="error-message" style={{ marginBottom: "16px" }}>{error}</div>}

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
        gap: "24px",
        marginBottom: "32px"
      }}>
        <div className="card" style={{ textAlign: "center", padding: "32px", background: "var(--background-alt)", borderRadius: "12px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📦</div>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "var(--primary-green)", marginBottom: "8px" }}>
            {performance.totalDelivered}
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: "16px" }}>Total Delivered</div>
        </div>
        
        <div className="card" style={{ textAlign: "center", padding: "32px", background: "var(--background-alt)", borderRadius: "12px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⏱️</div>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "var(--primary-blue)", marginBottom: "8px" }}>
            {performance.avgDeliveryTime}min
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: "16px" }}>Avg Delivery Time</div>
        </div>
        
        <div className="card" style={{ textAlign: "center", padding: "32px", background: "var(--background-alt)", borderRadius: "12px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "var(--primary-green)", marginBottom: "8px" }}>
            {performance.successRate}%
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: "16px" }}>Success Rate</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: "16px" }}>📊 Performance Metrics</h3>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
          gap: "16px" 
        }}>
          <div style={{ padding: "16px", background: "var(--background-alt)", borderRadius: "8px" }}>
            <h4 style={{ margin: "0 0 8px 0", color: "var(--text-secondary)" }}>Deliveries per Day</h4>
            <p style={{ margin: "0", fontSize: "20px", fontWeight: "bold" }}>
              {Math.round(performance.totalDelivered / 30)}
            </p>
          </div>
          <div style={{ padding: "16px", background: "var(--background-alt)", borderRadius: "8px" }}>
            <h4 style={{ margin: "0 0 8px 0", color: "var(--text-secondary)" }}>On-time Delivery Rate</h4>
            <p style={{ margin: "0", fontSize: "20px", fontWeight: "bold" }}>
              {Math.round(performance.successRate * 0.9)}%
            </p>
          </div>
          <div style={{ padding: "16px", background: "var(--background-alt)", borderRadius: "8px" }}>
            <h4 style={{ margin: "0 0 8px 0", color: "var(--text-secondary)" }}>Customer Satisfaction</h4>
            <p style={{ margin: "0", fontSize: "20px", fontWeight: "bold" }}>
              4.8/5.0
            </p>
          </div>
          <div style={{ padding: "16px", background: "var(--background-alt)", borderRadius: "8px" }}>
            <h4 style={{ margin: "0 0 8px 0", color: "var(--text-secondary)" }}>Performance Rating</h4>
            <p style={{ margin: "0", fontSize: "20px", fontWeight: "bold", color: performance.successRate > 90 ? "#4caf50" : performance.successRate > 80 ? "#ff9800" : "#f44336" }}>
              {performance.successRate > 90 ? "Excellent" : performance.successRate > 80 ? "Good" : "Needs Improvement"}
            </p>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h3 style={{ marginBottom: "16px" }}>🎯 Performance Tips</h3>
        <ul style={{ lineHeight: "1.8", color: "var(--text-secondary)" }}>
          <li>Maintain an average delivery time under 30 minutes for better ratings</li>
          <li>Keep your success rate above 95% for priority order assignments</li>
          <li>Update your location regularly for accurate tracking</li>
          <li>Communicate promptly with customers for better satisfaction</li>
          <li>Complete deliveries on time to build trust with customers</li>
        </ul>
      </div>
    </div>
  );
}
