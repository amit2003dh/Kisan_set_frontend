import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API, { apiCall } from "../api/api";

export default function DeliveryEarnings() {
  const [earnings, setEarnings] = useState({ total: 0, today: 0, thisWeek: 0, thisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    try {
      const { data } = await apiCall(() => API.get("/delivery-partner/earnings"));
      if (data) {
        setEarnings(data);
      }
    } catch (error) {
      console.error("Error fetching earnings:", error);
      setError("Failed to fetch earnings data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <div style={{ textAlign: "center" }}>
          <div className="loading-spinner"></div>
          <p>Loading earnings data...</p>
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
            <h1>💰 Earnings</h1>
            <p>Track your delivery earnings and financial performance</p>
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
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>💰</div>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "var(--primary-green)", marginBottom: "8px" }}>
            ₹{earnings.total}
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: "16px" }}>Total Earnings</div>
        </div>
        
        <div className="card" style={{ textAlign: "center", padding: "32px", background: "var(--background-alt)", borderRadius: "12px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📅</div>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "var(--primary-blue)", marginBottom: "8px" }}>
            ₹{earnings.today}
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: "16px" }}>Today</div>
        </div>
        
        <div className="card" style={{ textAlign: "center", padding: "32px", background: "var(--background-alt)", borderRadius: "12px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📊</div>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "var(--primary-orange)", marginBottom: "8px" }}>
            ₹{earnings.thisWeek}
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: "16px" }}>This Week</div>
        </div>
        
        <div className="card" style={{ textAlign: "center", padding: "32px", background: "var(--background-alt)", borderRadius: "12px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📈</div>
          <div style={{ fontSize: "32px", fontWeight: "bold", color: "var(--primary-purple)", marginBottom: "8px" }}>
            ₹{earnings.thisMonth}
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: "16px" }}>This Month</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: "16px" }}>📊 Earnings Summary</h3>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
          gap: "16px" 
        }}>
          <div style={{ padding: "16px", background: "var(--background-alt)", borderRadius: "8px" }}>
            <h4 style={{ margin: "0 0 8px 0", color: "var(--text-secondary)" }}>Average per Day</h4>
            <p style={{ margin: "0", fontSize: "20px", fontWeight: "bold" }}>
              ₹{Math.round(earnings.thisMonth / 30)}
            </p>
          </div>
          <div style={{ padding: "16px", background: "var(--background-alt)", borderRadius: "8px" }}>
            <h4 style={{ margin: "0 0 8px 0", color: "var(--text-secondary)" }}>Weekly Average</h4>
            <p style={{ margin: "0", fontSize: "20px", fontWeight: "bold" }}>
              ₹{Math.round(earnings.thisMonth / 4)}
            </p>
          </div>
          <div style={{ padding: "16px", background: "var(--background-alt)", borderRadius: "8px" }}>
            <h4 style={{ margin: "0 0 8px 0", color: "var(--text-secondary)" }}>Monthly Goal Progress</h4>
            <p style={{ margin: "0", fontSize: "20px", fontWeight: "bold" }}>
              {Math.round((earnings.thisMonth / 20000) * 100)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
