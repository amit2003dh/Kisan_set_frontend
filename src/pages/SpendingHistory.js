import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API, { apiCall } from "../api/api";

export default function SpendingHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    totalSpent: 0,
    totalOrders: 0,
    cropOrders: 0,
    productOrders: 0,
    averageOrderValue: 0
  });

  useEffect(() => {
    fetchSpendingHistory();
  }, []);

  const fetchSpendingHistory = async () => {
    setLoading(true);
    setError("");
    
    try {
      const { data, error: err } = await apiCall(() =>
        API.get("/orders/buyer")
      );
      
      console.log("🔍 SpendingHistory - Raw API response:", { data, error: err });
      
      if (err) {
        setError(err);
      } else {
        console.log("🔍 SpendingHistory - Total orders received:", data.length);
        console.log("🔍 SpendingHistory - Order statuses:", data.map(o => ({ id: o._id, status: o.status, total: o.total })));
        
        // Filter orders that are relevant for spending history (paid orders)
        const completedOrders = data.filter(order => 
          order.status === "Delivered" || 
          order.status === "Confirmed" || 
          order.status === "Picked Up" || 
          order.status === "In Transit"
        );
        
        console.log("🔍 SpendingHistory - Completed orders:", completedOrders.length);
        console.log("🔍 SpendingHistory - Completed orders details:", completedOrders.map(o => ({ id: o._id, status: o.status, total: o.total })));
        
        setOrders(completedOrders);
        
        // Calculate statistics
        const totalSpent = completedOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        const totalOrders = completedOrders.length;
        const cropOrders = completedOrders.filter(order => order.orderType === "crop_purchase").length;
        const productOrders = completedOrders.filter(order => order.orderType === "product_purchase").length;
        const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
        
        console.log("🔍 SpendingHistory - Calculated stats:", { totalSpent, totalOrders, cropOrders, productOrders, averageOrderValue });
        
        setStats({
          totalSpent,
          totalOrders,
          cropOrders,
          productOrders,
          averageOrderValue
        });
      }
    } catch (err) {
      setError("Failed to fetch spending history");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>💰</div>
          <p>Loading spending history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
      <div className="page-header">
        <Link to="/dashboard" style={{ color: "var(--text-secondary)", textDecoration: "none", marginBottom: "16px", display: "inline-block" }}>
          ← Back to Dashboard
        </Link>
        <h1>💰 Spending History</h1>
        <p>Track your purchases and spending patterns</p>
      </div>

      {error && (
        <div className="error-message" style={{ marginBottom: "24px" }}>
          {error}
        </div>
      )}

      {/* Spending Statistics */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "32px" }}>
        <div className="card">
          <h3 style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "8px" }}>Total Spent</h3>
          <p style={{ fontSize: "32px", fontWeight: "700", color: "var(--primary-green)" }}>₹{stats.totalSpent.toFixed(2)}</p>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>All paid purchases</p>
        </div>
        <div className="card">
          <h3 style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "8px" }}>Total Orders</h3>
          <p style={{ fontSize: "32px", fontWeight: "700", color: "var(--primary-blue)" }}>{stats.totalOrders}</p>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Paid purchases</p>
        </div>
        <div className="card">
          <h3 style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "8px" }}>Crop Orders</h3>
          <p style={{ fontSize: "32px", fontWeight: "700", color: "var(--primary-orange)" }}>{stats.cropOrders}</p>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Agricultural purchases</p>
        </div>
        <div className="card">
          <h3 style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "8px" }}>Product Orders</h3>
          <p style={{ fontSize: "32px", fontWeight: "700", color: "var(--primary-purple)" }}>{stats.productOrders}</p>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Equipment & supplies</p>
        </div>
        <div className="card">
          <h3 style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "8px" }}>Average Order</h3>
          <p style={{ fontSize: "32px", fontWeight: "700", color: "var(--primary-teal)" }}>₹{stats.averageOrderValue.toFixed(2)}</p>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Per order value</p>
        </div>
      </div>

      {/* Orders List */}
      <div className="card">
        <h3 style={{ marginBottom: "20px" }}>📋 Purchase History</h3>
        
        {orders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🛒</div>
            <p>No paid purchases yet</p>
            <Link to="/crops" className="btn btn-primary" style={{ marginTop: "16px" }}>
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid" style={{ gap: "16px" }}>
            {orders.map((order) => (
              <div key={order._id} className="card" style={{ border: "1px solid var(--border)", padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div>
                    <h4 style={{ margin: "0 0 4px 0", color: "var(--text-primary)" }}>
                      {order.items && order.items[0] ? order.items[0].name : "Unknown Item"}
                    </h4>
                    <p style={{ margin: "0", fontSize: "14px", color: "var(--text-secondary)" }}>
                      {order.orderType === "crop_purchase" ? "🌾 Crop" : "🛒 Product"}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: "0", fontSize: "20px", fontWeight: "600", color: "var(--primary-green)" }}>
                      ₹{order.total?.toFixed(2) || "0.00"}
                    </p>
                    <p style={{ margin: "0", fontSize: "12px", color: "var(--text-secondary)" }}>
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                </div>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px" }}>
                  <div>
                    <span style={{ color: "var(--text-secondary)" }}>Quantity: </span>
                    <span style={{ fontWeight: "600" }}>
                      {order.items && order.items[0] ? order.items[0].quantity : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span style={{ 
                      padding: "4px 8px", 
                      borderRadius: "4px", 
                      fontSize: "12px",
                      backgroundColor: order.status === "Delivered" ? "var(--success)" : "var(--warning)",
                      color: "white"
                    }}>
                      {order.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
