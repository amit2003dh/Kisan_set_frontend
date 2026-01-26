import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API, { apiCall } from "../api/api";
import ChatBox from "../components/ChatBox";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
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

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
  const navigate = useNavigate();
  const user = localStorage.getItem("user");

  useEffect(() => {
    fetchOrders();

    if (user) {
      try {
        const userData = JSON.parse(user);
        setCurrentUser(userData);

        if (userData.role === "seller") {
          navigate("/seller-orders");
        }
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
  }, [navigate]);

  const fetchOrders = async () => {
    setLoading(true);
    setError("");

    if (!user) {
      setLoading(false);
      return;
    }

    const userData = JSON.parse(user);

    const { data, error: err } = await apiCall(() =>
      API.get(`/orders/${userData.role}`)
    );

    if (err) {
      setError(err);
      setOrders([]);
      setSalesOrders([]);
    } else {
      if (userData.role === "farmer") {
        const allOrders = data?.sales || [];
        const allPurchases = data?.purchases || [];
        
        // Filter orders based on current user's role
        const mySales = allOrders.filter(order => 
          order.sellerId && order.sellerId.toString() === userData._id
        );
        
        const myPurchases = allPurchases.filter(order => 
          order.buyerId && order.buyerId.toString() === userData._id
        );
        
        setSalesOrders(mySales);
        setOrders(myPurchases);
        calculateStats(myPurchases, mySales);
      } else {
        setOrders(data || []);
        setSalesOrders([]);
        calculateStats(data || [], []);
      }
    }

    setLoading(false);
  };

  const calculateStats = (ordersData, salesData = []) => {
    const allOrders = [...ordersData, ...salesData];
    const newStats = {
      total: allOrders.length,
      pending: allOrders.filter(o => o.status?.toLowerCase() === "pending").length,
      confirmed: allOrders.filter(o => o.status?.toLowerCase() === "confirmed").length,
      delivered: allOrders.filter(o => o.status?.toLowerCase() === "delivered").length,
      revenue: allOrders
        .filter(o => o.status?.toLowerCase() === "delivered")
        .reduce((sum, o) => sum + (o.total || 0), 0)
    };
    setStats(newStats);
  };

  const filteredOrders = filter === "all" 
    ? orders 
    : orders.filter(o => o.status?.toLowerCase() === filter);

  const filteredSalesOrders = filter === "all" 
    ? salesOrders 
    : salesOrders.filter(o => o.status?.toLowerCase() === filter);

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

  const getItemImage = (order) => {
    // Use new items array structure
    if (order.items && order.items.length > 0 && order.itemDetails) {
      if (order.itemDetails.images && order.itemDetails.images.length > 0) {
        const imageUrl = order.itemDetails.images[0];
        return imageUrl.startsWith("http") ? imageUrl : `${API_BASE_URL}${imageUrl}`;
      }
      if (order.itemDetails.image) {
        const imageUrl = order.itemDetails.image;
        return imageUrl.startsWith("http") ? imageUrl : `${API_BASE_URL}${imageUrl}`;
      }
    }
    // Fallback for old structure
    if (order.itemId?.image) {
      const imageUrl = order.itemId.image;
      return imageUrl.startsWith("http") ? imageUrl : `${API_BASE_URL}${imageUrl}`;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: "40px 0" }}>
        <div className="loading-spinner" />
        <p style={{ textAlign: "center" }}>Loading your orders...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: "40px 0" }}>
      <div className="page-header">
        <h1>
          {currentUser?.role === "farmer"
            ? "🛒 My Orders"
            : "📦 My Orders"}
        </h1>
        <p>
          {currentUser?.role === "farmer" 
            ? "Track your crop sales and purchase orders" 
            : "Track and manage your orders"
          }
        </p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Stats Dashboard */}
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

      {/* Filter Buttons */}
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

      {currentUser?.role === "farmer" ? (
        <div className="grid" style={{ gap: "32px" }}>
          {/* 🌾 SALES */}
          <div>
            <h2 style={{ marginBottom: "20px", color: "#2e7d32" }}>
              🌾 My Crop Sales 
              <span style={{ fontSize: "14px", color: "#666", fontWeight: "normal", marginLeft: "8px" }}>
                ({filteredSalesOrders.length} orders)
              </span>
            </h2>

            {filteredSalesOrders.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "40px" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🌾</div>
                <h4>No Crop Sales Yet</h4>
                <p style={{ color: "#666", marginBottom: "16px" }}>
                  Your crop sales will appear here when customers buy your crops
                </p>
                <Link to="/manage-crops" className="btn btn-primary">
                  Manage Crops
                </Link>
              </div>
            ) : (
              <div className="grid" style={{ gridTemplateColumns: "1fr", gap: "16px" }}>
                {filteredSalesOrders.map((order) => (
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
                              const icon = order.items?.[0]?.itemType === "crop" ? "🌾" : "🛒";
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
                            🌾
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
                            Sold to: {order.buyerId?.name || "Customer"}
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
                      </div>
                    </div>

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
                          <span style={{ color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Date:</span>
                          <strong style={{ color: "var(--text-primary)" }}>
                            {new Date(order.createdAt).toLocaleDateString()}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <Link 
                        to={`/orders/${order._id}/communication`}
                        className="btn btn-primary"
                        style={{ fontSize: "12px", padding: "6px 12px" }}
                      >
                        💬 Chat
                      </Link>
                      <Link 
                        to={`/tracking/${order._id}`}
                        className="btn btn-secondary"
                        style={{ fontSize: "12px", padding: "6px 12px" }}
                      >
                        📍 Track
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 🛒 PURCHASES */}
          <div>
            <h2 style={{ marginBottom: "20px", color: "#f57c00" }}>
              🛒 My Purchase Orders
              <span style={{ fontSize: "14px", color: "#666", fontWeight: "normal", marginLeft: "8px" }}>
                ({filteredOrders.length} orders)
              </span>
            </h2>

            {filteredOrders.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "40px" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🛒</div>
                <h4>No Purchase Orders Yet</h4>
                <p style={{ color: "#666", marginBottom: "16px" }}>
                  Your product purchases will appear here
                </p>
                <Link to="/products" className="btn btn-primary">
                  Browse Products
                </Link>
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
                            🛒
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
                            Bought from: {order.sellerId?.name || "Seller"}
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
                      </div>
                    </div>

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
                          <span style={{ color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Date:</span>
                          <strong style={{ color: "var(--text-primary)" }}>
                            {new Date(order.createdAt).toLocaleDateString()}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <Link 
                        to={`/orders/${order._id}/communication`}
                        className="btn btn-primary"
                        style={{ fontSize: "12px", padding: "6px 12px" }}
                      >
                        💬 Chat
                      </Link>
                      <Link 
                        to={`/tracking/${order._id}`}
                        className="btn btn-secondary"
                        style={{ fontSize: "12px", padding: "6px 12px" }}
                      >
                        📍 Track
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "2fr 1fr", gap: "32px" }}>
          <div>
            {filteredOrders.length === 0 ? (
              <div className="empty-state card">
                <div style={{ fontSize: "64px", marginBottom: "16px" }}>📦</div>
                <h3 style={{ marginBottom: "8px", color: "var(--text-primary)" }}>
                  No {filter === "all" ? "" : filter} orders yet
                </h3>
                <p style={{ color: "var(--text-secondary)" }}>
                  {filter === "all" 
                    ? "Start shopping to see your orders here" 
                    : `No ${filter} orders found`
                  }
                </p>
                <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "24px" }}>
                  <Link to="/crops" className="btn btn-primary">
                    Browse Crops
                  </Link>
                  <Link to="/products" className="btn btn-secondary">
                    Browse Products
                  </Link>
                </div>
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
                            📦
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
                            Seller: {order.sellerId?.name || "Farmer"}
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
                      </div>
                    </div>

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
                          <span style={{ color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Date:</span>
                          <strong style={{ color: "var(--text-primary)" }}>
                            {new Date(order.createdAt).toLocaleDateString()}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <Link 
                        to={`/orders/${order._id}/communication`}
                        className="btn btn-primary"
                        style={{ fontSize: "12px", padding: "6px 12px" }}
                      >
                        💬 Chat
                      </Link>
                      <Link 
                        to={`/tracking/${order._id}`}
                        className="btn btn-secondary"
                        style={{ fontSize: "12px", padding: "6px 12px" }}
                      >
                        📍 Track
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <ChatBox />
        </div>
      )}
    </div>
  );
}
