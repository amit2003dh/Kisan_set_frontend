import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import API, { apiCall } from "../api/api";

export default function SellerOrders() {
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [filter, setFilter] = useState("all"); // all, pending, confirmed, delivered
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    delivered: 0,
    revenue: 0
  });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    
    const { data, error: err } = await apiCall(() => API.get("/orders/seller"));
    
    if (err) {
      setError(err);
    } else {
      setOrders(data || []);
      calculateStats(data || []);
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        setCurrentUser(JSON.parse(user));
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
    fetchOrders();
  }, [fetchOrders]);

  const calculateStats = (ordersData) => {
    const newStats = {
      total: ordersData.length,
      pending: ordersData.filter(o => o.status === "Pending").length,
      confirmed: ordersData.filter(o => o.status === "Confirmed").length,
      delivered: ordersData.filter(o => o.status === "Delivered").length,
      revenue: ordersData
        .filter(o => o.status === "Delivered")
        .reduce((sum, o) => sum + (o.total || 0), 0)
    };
    setStats(newStats);
  };

  const filteredOrders = filter === "all" 
    ? orders 
    : orders.filter(o => o.status?.toLowerCase() === filter);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return "#4caf50";
      case "delivered":
        return "#4caf50";
      case "pending":
        return "#ff9800";
      case "cancelled":
        return "#f44336";
      case "out for delivery":
        return "#2196f3";
      default:
        return "#757575";
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return "✅";
      case "delivered":
        return "🎉";
      case "pending":
        return "⏳";
      case "cancelled":
        return "❌";
      case "out for delivery":
        return "🚚";
      default:
        return "📦";
    }
  };

  const getItemName = (order) => {
    // Use new items array structure
    if (order.items && order.items.length > 0) {
      return order.items[0].name || "Product Item";
    }
    // Fallback for old structure
    if (order.itemId?.name) {
      return order.itemId.name;
    }
    return order.itemType === "crop" ? "Crop Item" : "Product Item";
  };

  const getPaymentStatus = (order) => {
    const paymentMethod = order.paymentMethod || "COD";
    return paymentMethod === "ONLINE" ? "Payment Done" : "Payment Not Done";
  };

  const getPaymentStatusColor = (order) => {
    const paymentMethod = order.paymentMethod || "COD";
    return paymentMethod === "ONLINE" ? "var(--success)" : "var(--warning)";
  };

  const getPaymentStatusIcon = (order) => {
    const paymentMethod = order.paymentMethod || "COD";
    return paymentMethod === "ONLINE" ? "✅" : "⏳";
  };

  const getItemImage = (order) => {
    // Use new items array structure
    if (order.items && order.items.length > 0 && order.itemDetails) {
      if (order.itemDetails.images && order.itemDetails.images.length > 0) {
        const imageUrl = order.itemDetails.images[0];
        return imageUrl.startsWith("http") ? imageUrl : `${process.env.REACT_APP_API_URL || "http://localhost:5000"}${imageUrl}`;
      }
      if (order.itemDetails.image) {
        const imageUrl = order.itemDetails.image;
        return imageUrl.startsWith("http") ? imageUrl : `${process.env.REACT_APP_API_URL || "http://localhost:5000"}${imageUrl}`;
      }
    }
    // Fallback for old structure
    if (order.itemId?.image) {
      const imageUrl = order.itemId.image;
      return imageUrl.startsWith("http") ? imageUrl : `${process.env.REACT_APP_API_URL || "http://localhost:5000"}${imageUrl}`;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <div className="loading-spinner"></div>
        <p style={{ textAlign: "center", color: "var(--text-secondary)" }}>Loading your orders...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
      <div className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1>
              {currentUser?.role === "farmer" ? "🌾 My Crop Orders" : "📦 My Sales Orders"}
            </h1>
            <p>
              {currentUser?.role === "farmer" 
                ? "Track and manage your crop sales" 
                : "Track and manage your sales orders"
              }
            </p>
          </div>
          {/* <Link to="/seller-orders?view=analytics" className="btn btn-primary">
            📈 View Analytics
          </Link> */}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Analytics View */}
      {view === 'analytics' && (
        <div>
          <div className="page-header">
            <h1>📈 Sales Analytics</h1>
            <p>View your income, expenses, and sales performance</p>
          </div>
          
          {/* Enhanced Analytics Cards */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
            gap: "20px",
            marginBottom: "32px"
          }}>
            <div className="card" style={{ textAlign: "center", padding: "24px" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>💰</div>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: "var(--primary-green)" }}>
                ₹{stats.revenue.toLocaleString('en-IN')}
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: "16px" }}>Total Income</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "8px" }}>
                From {stats.delivered} delivered orders
              </div>
            </div>
            
            <div className="card" style={{ textAlign: "center", padding: "24px" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>📊</div>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: "var(--primary-blue)" }}>
                {stats.total}
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: "16px" }}>Total Orders</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "8px" }}>
                {stats.pending} pending, {stats.confirmed} confirmed
              </div>
            </div>
            
            <div className="card" style={{ textAlign: "center", padding: "24px" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>📈</div>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: "var(--primary-orange)" }}>
                ₹{stats.total > 0 ? Math.round(stats.revenue / stats.total).toLocaleString('en-IN') : 0}
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: "16px" }}>Average Order Value</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "8px" }}>
                Per order average
              </div>
            </div>
            
            <div className="card" style={{ textAlign: "center", padding: "24px" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>✅</div>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: "var(--success)" }}>
                {stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0}%
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: "16px" }}>Completion Rate</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "8px" }}>
                Delivered orders percentage
              </div>
            </div>
          </div>

          {/* Simple Revenue Chart */}
          <div className="card" style={{ padding: "24px", marginBottom: "32px" }}>
            <h3 style={{ marginBottom: "20px" }}>📊 Revenue Overview</h3>
            <div style={{ 
              height: "200px", 
              background: "linear-gradient(135deg, var(--primary-green) 0%, var(--primary-blue) 100%)",
              borderRadius: "var(--border-radius-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "24px",
              fontWeight: "bold"
            }}>
              💰 Total Revenue: ₹{stats.revenue.toLocaleString('en-IN')}
            </div>
          </div>

          {/* Order Status Breakdown */}
          <div className="card" style={{ padding: "24px" }}>
            <h3 style={{ marginBottom: "20px" }}>📈 Order Status Breakdown</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px" }}>
              <div style={{ textAlign: "center", padding: "16px", background: "#f0f8ff", borderRadius: "8px" }}>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#ff9800" }}>{stats.pending}</div>
                <div style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Pending</div>
              </div>
              <div style={{ textAlign: "center", padding: "16px", background: "#f0fff0", borderRadius: "8px" }}>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#4caf50" }}>{stats.confirmed}</div>
                <div style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Confirmed</div>
              </div>
              <div style={{ textAlign: "center", padding: "16px", background: "#f5f5f5", borderRadius: "8px" }}>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#2196f3" }}>{stats.delivered}</div>
                <div style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Delivered</div>
              </div>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: "32px" }}>
            <Link to="/seller-orders" className="btn btn-primary">
              📊 Back to Orders List
            </Link>
          </div>
        </div>
      )}

      {/* Regular Orders View */}
      {view !== 'analytics' && (
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
        gap: "16px",
        marginBottom: "32px"
      }}>
        <div className="card" style={{ textAlign: "center", padding: "20px" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>📊</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "var(--primary-green)" }}>
            {stats.total}
          </div>
          <div style={{ color: "var(--text-secondary)" }}>Total Orders</div>
        </div>
        
        <div className="card" style={{ textAlign: "center", padding: "20px" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>⏳</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#ff9800" }}>
            {stats.pending}
          </div>
          <div style={{ color: "var(--text-secondary)" }}>Pending</div>
        </div>
        
        <div className="card" style={{ textAlign: "center", padding: "20px" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>✅</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#4caf50" }}>
            {stats.confirmed}
          </div>
          <div style={{ color: "var(--text-secondary)" }}>Confirmed</div>
        </div>
        
        <div className="card" style={{ textAlign: "center", padding: "20px" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>💰</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "var(--primary-green)" }}>
            ₹{stats.revenue.toLocaleString('en-IN')}
          </div>
          <div style={{ color: "var(--text-secondary)" }}>Total Revenue</div>
        </div>
      </div>
)}
          <div style={{ 
        display: "flex", 
        gap: "12px", 
        marginBottom: "32px",
        flexWrap: "wrap"
      }}>
        <button
          onClick={() => setFilter("all")}
          className={`btn ${filter === "all" ? "btn-primary" : "btn-secondary"}`}
          style={{ fontSize: "14px", padding: "10px 20px" }}
        >
          All Orders ({stats.total})
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`btn ${filter === "pending" ? "btn-primary" : "btn-secondary"}`}
          style={{ fontSize: "14px", padding: "10px 20px" }}
        >
          ⏳ Pending ({stats.pending})
        </button>
        <button
          onClick={() => setFilter("confirmed")}
          className={`btn ${filter === "confirmed" ? "btn-primary" : "btn-secondary"}`}
          style={{ fontSize: "14px", padding: "10px 20px" }}
        >
          ✅ Confirmed ({stats.confirmed})
        </button>
        <button
          onClick={() => setFilter("delivered")}
          className={`btn ${filter === "delivered" ? "btn-primary" : "btn-secondary"}`}
          style={{ fontSize: "14px", padding: "10px 20px" }}
        >
          🎉 Delivered ({stats.delivered})
        </button>
      </div>
      
      {filteredOrders.length === 0 ? (
        <div className="empty-state card">
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>
            {currentUser?.role === "farmer" ? "🌾" : "📦"}
          </div>
          <h3 style={{ marginBottom: "8px", color: "var(--text-primary)" }}>
            No {filter === "all" ? "" : filter} orders yet
          </h3>
          <p style={{ color: "var(--text-secondary)" }}>
            {filter === "all" 
              ? (currentUser?.role === "farmer" 
                  ? "Start selling your crops to see orders here" 
                  : "Start selling to see your orders here"
                )
              : `No ${filter} orders found`
            }
          </p>
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "1fr", gap: "16px" }}>
          {filteredOrders.map((order) => (
            <div key={order._id} className="card">
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "16px"
              }}>
                <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                  {getItemImage(order) && (
                    <img
                      src={getItemImage(order)}
                      alt={getItemName(order)}
                      style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "var(--border-radius-sm)",
                        objectFit: "cover",
                        border: "1px solid var(--border-color)"
                      }}
                      onError={(e) => {
                        const icon = order.items?.[0]?.itemType === "crop" ? "🌾" : 
                                    order.items?.[0]?.itemType === "seed" ? "🌱" : 
                                    order.items?.[0]?.itemType === "pesticide" ? "🧪" : "🛒";
                        e.target.style.display = "none";
                        const parent = e.target.parentElement;
                        const fallback = document.createElement("div");
                        fallback.style.cssText = "width: 60px; height: 60px; border-radius: var(--border-radius-sm); display: flex; align-items: center; justify-content: center; background: var(--background); border: 1px solid var(--border-color); font-size: 24px;";
                        fallback.textContent = icon;
                        parent.replaceChild(fallback, e.target);
                      }}
                    />
                  )}
                  {!getItemImage(order) && (
                    <div style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "var(--border-radius-sm)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "var(--background)",
                      border: "1px solid var(--border-color)",
                      fontSize: "24px"
                    }}>
                      {order.items?.[0]?.itemType === "crop" ? "🌾" : 
                       order.items?.[0]?.itemType === "seed" ? "🌱" : 
                       order.items?.[0]?.itemType === "pesticide" ? "🧪" : "🛒"}
                    </div>
                  )}
                  <div>
                    <h3 style={{
                      margin: "0 0 8px 0",
                      fontSize: "18px",
                      color: "var(--text-primary)",
                      fontWeight: "600"
                    }}>
                      Order #{order._id?.slice(-8).toUpperCase()}
                    </h3>
                    <p style={{
                      margin: "0 0 4px 0",
                      color: "var(--text-primary)",
                      fontSize: "16px",
                      fontWeight: "500"
                    }}>
                      {getItemName(order)}
                    </p>
                    <p style={{
                      margin: 0,
                      color: "var(--text-secondary)",
                      fontSize: "14px"
                    }}>
                      {order.items?.[0]?.itemType === "crop" ? "🌾 Crop" : 
                       order.items?.[0]?.itemType === "seed" ? "🌱 Seed" : 
                       order.items?.[0]?.itemType === "pesticide" ? "🧪 Pesticide" : 
                       "🛒 Product"}
                    </p>
                  </div>
                </div>
                <div style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                  marginBottom: "12px"
                }}>
                  <span style={{
                    padding: "4px 12px",
                    background: getStatusColor(order.status),
                    color: "white",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "600"
                  }}>
                    {getStatusIcon(order.status)} {order.status}
                  </span>
                  <Link
                    to={`/orders/${order._id}/communication`}
                    className="btn btn-outline"
                    style={{ fontSize: "12px", padding: "6px 12px" }}
                  >
                    💬 Message Buyer
                  </Link>
                  {order.status === "Out for Delivery" && (
                    <Link
                      to={`/orders/${order._id}/delivery-chat`}
                      className="btn btn-primary"
                      style={{ fontSize: "12px", padding: "6px 12px" }}
                    >
                      🚚 Delivery Chat
                    </Link>
                  )}
                </div>
              </div>

              {/* Buyer Information */}
              {order.buyerId && (
                <div style={{
                  background: "#e3f2fd",
                  borderRadius: "var(--border-radius-sm)",
                  padding: "12px",
                  marginBottom: "16px"
                }}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#1976d2" }}>
                    🛒 {currentUser?.role === "farmer" ? "Customer Information" : "Buyer Information"}
                  </h4>
                  <div style={{ fontSize: "13px", color: "#666" }}>
                    <p style={{ margin: "4px 0" }}><strong>Name:</strong> {order.buyerId.name}</p>
                    <p style={{ margin: "4px 0" }}><strong>Phone:</strong> {order.buyerId.phone}</p>
                    <p style={{ margin: "4px 0" }}><strong>Email:</strong> {order.buyerId.email}</p>
                  </div>
                </div>
              )}

              <div style={{
                background: "var(--background)",
                borderRadius: "var(--border-radius-sm)",
                padding: "16px",
                marginBottom: "16px"
              }}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: "12px",
                  fontSize: "14px"
                }}>
                  <div>
                    <span style={{ color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Quantity:</span>
                    <strong style={{ color: "var(--text-primary)" }}>{order.items?.[0]?.quantity || order.quantity || 1}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Price:</span>
                    <strong style={{ color: "var(--text-primary)" }}>₹{order.items?.[0]?.price || order.price || 0}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Total:</span>
                    <strong style={{ color: "var(--primary-green)" }}>₹{order.total || (order.price * order.quantity) || 0}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Payment:</span>
                    <strong style={{ color: "var(--text-primary)" }}>{order.paymentMethod || "COD"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Payment Status:</span>
                    <strong style={{ color: getPaymentStatusColor(order) }}>
                      {getPaymentStatusIcon(order)} {getPaymentStatus(order)}
                    </strong>
                  </div>
                  {order.buyerId && (
                    <div>
                      <span style={{ color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Buyer:</span>
                      <strong style={{ color: "var(--text-primary)" }}>{order.buyerId.name}</strong>
                    </div>
                  )}
                  {order.sellerId && (
                    <div>
                      <span style={{ color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Seller:</span>
                      <strong style={{ color: "var(--text-primary)" }}>{order.sellerId.name}</strong>
                    </div>
                  )}
                  {order.createdAt && (
                    <div>
                      <span style={{ color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Date:</span>
                      <strong style={{ color: "var(--text-primary)" }}>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Information */}
              {order.delivery && (
                <div style={{
                  background: "#fff3e0",
                  borderRadius: "var(--border-radius-sm)",
                  padding: "12px",
                  marginBottom: "16px"
                }}>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#f57c00" }}>
                    🚚 Delivery Information
                  </h4>
                  <div style={{ fontSize: "13px", color: "#666" }}>
                    {order.delivery.partnerId && (
                      <p style={{ margin: "4px 0" }}>
                        <strong>Partner:</strong> {order.delivery.partnerId.name} ({order.delivery.partnerId.partnerId})
                      </p>
                    )}
                    <p style={{ margin: "4px 0" }}><strong>Status:</strong> {order.delivery.status}</p>
                    {order.delivery.assignedAt && (
                      <p style={{ margin: "4px 0" }}>
                        <strong>Assigned:</strong> {new Date(order.delivery.assignedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "8px" }}>
                {order.status?.toLowerCase() !== "delivered" && (
                  <Link
                    to={`/tracking?deliveryId=${order._id}`}
                    className="btn btn-secondary"
                    style={{ flex: 1, fontSize: "14px" }}
                  >
                    📍 Track Delivery
                  </Link>
                )}
                <button
                  className="btn btn-outline"
                  style={{ fontSize: "14px" }}
                  onClick={() => {
                    alert("Order details feature coming soon!");
                  }}
                >
                  📋 Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
