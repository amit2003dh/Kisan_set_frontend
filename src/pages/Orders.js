import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API, { apiCall } from "../api/api";
import ChatBox from "../components/ChatBox";
import {
  Package,
  Clock,
  CheckCircle2,
  Truck,
  IndianRupee,
  ShoppingBag,
  ShoppingCart,
  Sprout,
  MessageSquare,
  MapPin,
  ClipboardList,
  XCircle,
  PartyPopper
} from "lucide-react";

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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
  const navigate = useNavigate();
  const user = localStorage.getItem("user");

  // Mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
  }, [user, navigate]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError("");

      const userData = user ? JSON.parse(user) : null;
      let endpoint = "/orders/my-orders";
      
      if (userData?.role === "farmer") {
        endpoint = "/orders/farmer";
      }

      const { data, error: err } = await apiCall(() => API.get(endpoint));
      
      if (err) {
        setError("Failed to load orders");
        setLoading(false);
        return;
      }

      let allOrders = [];
      let salesList = [];
      
      if (Array.isArray(data)) {
        allOrders = data;
      } else if (data && typeof data === "object") {
        const purchases = data.purchases || [];
        salesList = data.sales || [];
        allOrders = purchases;
        setSalesOrders(salesList);
      }

      setOrders(allOrders);
      calculateStats(allOrders, salesList);
    } catch (e) {
      console.error("Error in fetchOrders:", e);
      setError("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (purchaseList, salesList = []) => {
    const totalOrders = purchaseList.length;
    const pendingOrders = purchaseList.filter(o => o.status === "pending" || o.status === "processing").length;
    const confirmedOrders = purchaseList.filter(o => o.status === "confirmed" || o.status === "shipped").length;
    const deliveredOrders = purchaseList.filter(o => o.status === "delivered").length;
    
    const revenue = salesList.reduce((sum, order) => sum + (order.total || 0), 0);

    setStats({
      total: totalOrders,
      pending: pendingOrders,
      confirmed: confirmedOrders,
      delivered: deliveredOrders,
      revenue
    });
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
        return "#2e7d32";
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

  const renderStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return <CheckCircle2 size={14} />;
      case "delivered":
        return <PartyPopper size={14} />;
      case "pending":
        return <Clock size={14} />;
      case "cancelled":
        return <XCircle size={14} />;
      case "out for delivery":
        return <Truck size={14} />;
      default:
        return <Package size={14} />;
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
    <div className="container" style={{ 
      padding: isMobile ? "20px 16px" : "40px 0",
      maxWidth: isMobile ? "100%" : "1200px",
      margin: "0 auto"
    }}>
      <div className="page-header" style={{ marginBottom: isMobile ? "24px" : "32px" }}>
        <h1 style={{ 
          fontSize: isMobile ? "24px" : "32px",
          marginBottom: isMobile ? "8px" : "16px",
          display: 'inline-flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Package size={32} color="var(--primary-blue)" />
          <span>My Orders</span>
        </h1>
        <p style={{ 
          fontSize: isMobile ? "14px" : "16px",
          color: "var(--text-secondary)",
          margin: 0
        }}>
          {currentUser?.role === "farmer"
            ? "Track your crop sales and purchase orders"
            : "Track and manage your orders"
          }
        </p>
      </div>

      {error && <div className="error-message" style={{ marginBottom: isMobile ? "20px" : "24px" }}>{error}</div>}

      {/* Stats Dashboard */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(200px, 1fr))",
        gap: isMobile ? "16px" : "20px",
        marginBottom: isMobile ? "32px" : "40px"
      }}>
        <div className="card" style={{ 
          textAlign: "center", 
          padding: isMobile ? "20px 16px" : "20px",
          cursor: "pointer",
          transition: "transform 0.2s, box-shadow 0.2s"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 8px 25px rgba(0, 0, 0, 0.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}>
          <div style={{ fontSize: isMobile ? "28px" : "32px", marginBottom: "8px", display: "flex", justifyContent: "center" }}><Package size={isMobile ? 28 : 32} /></div>
          <div style={{ fontSize: isMobile ? "20px" : "24px", fontWeight: "bold", color: "var(--primary-green)" }}>
            {stats.total}
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: isMobile ? "12px" : "14px" }}>Total Orders</div>
        </div>

        <div className="card" style={{ 
          textAlign: "center", 
          padding: isMobile ? "20px 16px" : "20px",
          cursor: "pointer",
          transition: "transform 0.2s, box-shadow 0.2s"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 8px 25px rgba(255, 152, 0, 0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}>
          <div style={{ fontSize: isMobile ? "28px" : "32px", marginBottom: "8px", display: "flex", justifyContent: "center" }}><Clock size={isMobile ? 28 : 32} color="#ff9800" /></div>
          <div style={{ fontSize: isMobile ? "20px" : "24px", fontWeight: "bold", color: "#ff9800" }}>
            {stats.pending}
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: isMobile ? "12px" : "14px" }}>Pending</div>
        </div>

        <div className="card" style={{ 
          textAlign: "center", 
          padding: isMobile ? "20px 16px" : "20px",
          cursor: "pointer",
          transition: "transform 0.2s, box-shadow 0.2s"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 8px 25px rgba(76, 175, 80, 0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}>
          <div style={{ fontSize: isMobile ? "28px" : "32px", marginBottom: "8px", display: "flex", justifyContent: "center" }}><CheckCircle2 size={isMobile ? 28 : 32} color="#4caf50" /></div>
          <div style={{ fontSize: isMobile ? "20px" : "24px", fontWeight: "bold", color: "#4caf50" }}>
            {stats.confirmed}
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: isMobile ? "12px" : "14px" }}>Confirmed</div>
        </div>

        <div className="card" style={{ 
          textAlign: "center", 
          padding: isMobile ? "20px 16px" : "20px",
          cursor: "pointer",
          transition: "transform 0.2s, box-shadow 0.2s"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 8px 25px rgba(76, 175, 80, 0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}>
          <div style={{ fontSize: isMobile ? "28px" : "32px", marginBottom: "8px", display: "flex", justifyContent: "center" }}><Truck size={isMobile ? 28 : 32} color="#2196f3" /></div>
          <div style={{ fontSize: isMobile ? "20px" : "24px", fontWeight: "bold", color: "#2196f3" }}>
            {stats.delivered}
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: isMobile ? "12px" : "14px" }}>Delivered</div>
        </div>

        <div className="card" style={{ 
          textAlign: "center", 
          padding: isMobile ? "20px 16px" : "20px",
          cursor: "pointer",
          transition: "transform 0.2s, box-shadow 0.2s"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 8px 25px rgba(76, 175, 80, 0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}>
          <div style={{ fontSize: isMobile ? "28px" : "32px", marginBottom: "8px", display: "flex", justifyContent: "center" }}><IndianRupee size={isMobile ? 28 : 32} color="var(--primary-green)" /></div>
          <div style={{ fontSize: isMobile ? "20px" : "24px", fontWeight: "bold", color: "var(--primary-green)" }}>
            ₹{stats.revenue.toLocaleString('en-IN')}
          </div>
          <div style={{ color: "var(--text-secondary)" }}>Total Revenue</div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div style={{
        marginBottom: isMobile ? "24px" : "32px",
        display: "flex",
        gap: isMobile ? "8px" : "12px",
        flexWrap: "wrap"
      }}>
        <button
          onClick={() => setFilter("all")}
          className={`btn ${filter === "all" ? "btn-primary" : "btn-secondary"}`}
          style={{ 
            fontSize: isMobile ? "12px" : "14px", 
            padding: isMobile ? "8px 16px" : "10px 20px",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <ClipboardList size={16} />
          <span>All Orders</span>
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`btn ${filter === "pending" ? "btn-primary" : "btn-secondary"}`}
          style={{ 
            fontSize: isMobile ? "12px" : "14px", 
            padding: isMobile ? "8px 16px" : "10px 20px",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <Clock size={16} />
          <span>Pending</span>
        </button>
        <button
          onClick={() => setFilter("confirmed")}
          className={`btn ${filter === "confirmed" ? "btn-primary" : "btn-secondary"}`}
          style={{ 
            fontSize: isMobile ? "12px" : "14px", 
            padding: isMobile ? "8px 16px" : "10px 20px",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <CheckCircle2 size={16} />
          <span>Confirmed</span>
        </button>
        <button
          onClick={() => setFilter("delivered")}
          className={`btn ${filter === "delivered" ? "btn-primary" : "btn-secondary"}`}
          style={{ 
            fontSize: isMobile ? "12px" : "14px", 
            padding: isMobile ? "8px 16px" : "10px 20px",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <Truck size={16} />
          <span>Delivered</span>
        </button>
      </div>

      {currentUser?.role === "farmer" ? (
        <div className="grid" style={{ gap: "32px" }}>
          {/* SALES */}
          <div>
            <h2 style={{ marginBottom: "20px", color: "#2e7d32", display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <Sprout size={24} color="#2e7d32" />
              <span>My Crop Sales</span>
              <span style={{ fontSize: "14px", color: "#666", fontWeight: "normal", marginLeft: "8px" }}>
                ({filteredSalesOrders.length} orders)
              </span>
            </h2>

            {filteredSalesOrders.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "40px" }}>
                <div style={{ marginBottom: "16px", display: "flex", justifyContent: "center" }}>
                  <Sprout size={48} color="#2e7d32" />
                </div>
                <h4>No Crop Sales Yet</h4>
                <p style={{ color: "#666", marginBottom: "16px" }}>
                  Your crop sales will appear here when customers buy your crops
                </p>
                <Link to="/manage-crops" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <Sprout size={16} />
                  <span>Manage Crops</span>
                </Link>
              </div>
            ) : (
              <div className="grid" style={{ 
                gridTemplateColumns: "1fr", 
                gap: isMobile ? "20px" : "16px"
              }}>
                {filteredSalesOrders.map((order) => (
                  <div key={order._id} className="card" style={{
                    padding: isMobile ? "20px 16px" : "20px",
                    transition: "transform 0.2s, box-shadow 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: isMobile ? "flex-start" : "flex-start",
                      marginBottom: isMobile ? "20px" : "16px",
                      flexDirection: isMobile ? "column" : "row",
                      gap: isMobile ? "16px" : "0"
                    }}>
                      <div style={{ 
                        display: "flex", 
                        gap: isMobile ? "12px" : "16px", 
                        alignItems: "flex-start",
                        flex: 1
                      }}>
                        {getItemImage(order) && (
                          <img
                            src={getItemImage(order)}
                            alt={getItemName(order)}
                            style={{
                              width: isMobile ? "50px" : "60px",
                              height: isMobile ? "50px" : "60px",
                              borderRadius: "var(--border-radius-sm)",
                              objectFit: "cover",
                              border: "1px solid var(--border-color)"
                            }}
                            onError={(e) => {
                              const icon = order.items?.[0]?.itemType === "crop" ? "🌾" : "🛒";
                              e.target.style.display = "none";
                              const parent = e.target.parentElement;
                              const fallback = document.createElement("div");
                              fallback.style.cssText = `width: ${isMobile ? "50px" : "60px"}; height: ${isMobile ? "50px" : "60px"}; border-radius: var(--border-radius-sm); display: flex; align-items: center; justify-content: center; background: var(--background); border: 1px solid var(--border-color); font-size: ${isMobile ? "20px" : "24px"};`;
                              fallback.textContent = icon;
                              parent.replaceChild(fallback, e.target);
                            }}
                          />
                        )}
                        {!getItemImage(order) && (
                          <div style={{
                            width: isMobile ? "50px" : "60px",
                            height: isMobile ? "50px" : "60px",
                            borderRadius: "var(--border-radius-sm)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "var(--background)",
                            border: "1px solid var(--border-color)"
                          }}>
                            <Sprout size={isMobile ? 24 : 28} color="var(--primary-green)" />
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <h3 style={{
                            margin: "0 0 8px 0",
                            fontSize: isMobile ? "16px" : "18px",
                            color: "var(--text-primary)",
                            fontWeight: "600"
                          }}>
                            Order #{order._id?.slice(-8).toUpperCase()}
                          </h3>
                          <p style={{
                            margin: "0 0 4px 0",
                            color: "var(--text-primary)",
                            fontSize: isMobile ? "14px" : "16px",
                            fontWeight: "500"
                          }}>
                            {getItemName(order)}
                          </p>
                          <p style={{
                            margin: 0,
                            color: "var(--text-secondary)",
                            fontSize: isMobile ? "12px" : "14px"
                          }}>
                            Sold to: {order.buyerId?.name || "Customer"}
                          </p>
                        </div>
                      </div>
                      <div style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                        marginBottom: isMobile ? "12px" : "12px",
                        alignSelf: isMobile ? "flex-start" : "center"
                      }}>
                        <span style={{
                          padding: "4px 12px",
                          background: getStatusColor(order.status),
                          color: "white",
                          borderRadius: "12px",
                          fontSize: isMobile ? "10px" : "12px",
                          fontWeight: "600",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}>
                          {renderStatusIcon(order.status)} <span>{order.status}</span>
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
                          <span style={{ color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Payment:</span>
                          <strong style={{
                            color: order.paymentMethod === "ONLINE" ? "var(--success)" : "var(--warning)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}>
                            {order.paymentMethod === "ONLINE" ? <><CheckCircle2 size={14} /><span>Online</span></> : <><Clock size={14} /><span>COD</span></>}
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Payment Status:</span>
                          <strong style={{
                            color: order.paymentMethod === "ONLINE" ? "var(--success)" : "var(--warning)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}>
                            {order.paymentMethod === "ONLINE" ? <><CheckCircle2 size={14} /><span>Done</span></> : <><Clock size={14} /><span>Pending</span></>}
                          </strong>
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
                        style={{ fontSize: "12px", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                      >
                        <MessageSquare size={14} />
                        <span>Chat</span>
                      </Link>
                      <Link
                        to={`/tracking/${order._id}`}
                        className="btn btn-secondary"
                        style={{ fontSize: "12px", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                      >
                        <MapPin size={14} />
                        <span>Track</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PURCHASES */}
          <div>
            <h2 style={{ marginBottom: "20px", color: "#f57c00", display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <ShoppingCart size={24} color="#f57c00" />
              <span>My Purchase Orders</span>
              <span style={{ fontSize: "14px", color: "#666", fontWeight: "normal", marginLeft: "8px" }}>
                ({filteredOrders.length} orders)
              </span>
            </h2>

            {filteredOrders.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "40px" }}>
                <div style={{ marginBottom: "16px", display: "flex", justifyContent: "center" }}>
                  <ShoppingCart size={48} color="#f57c00" />
                </div>
                <h4>No Purchase Orders Yet</h4>
                <p style={{ color: "#666", marginBottom: "16px" }}>
                  Your product purchases will appear here
                </p>
                <Link to="/products" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <ShoppingBag size={16} />
                  <span>Browse Products</span>
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
                              e.target.style.display = "none";
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
                            border: "1px solid var(--border-color)"
                          }}>
                            <ShoppingCart size={28} color="var(--primary-blue)" />
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
                          fontWeight: "600",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}>
                          {renderStatusIcon(order.status)} <span>{order.status}</span>
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
                          <span style={{ color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Payment:</span>
                          <strong style={{
                            color: order.paymentMethod === "ONLINE" ? "var(--success)" : "var(--warning)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}>
                            {order.paymentMethod === "ONLINE" ? <><CheckCircle2 size={14} /><span>Online</span></> : <><Clock size={14} /><span>COD</span></>}
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Payment Status:</span>
                          <strong style={{
                            color: order.paymentMethod === "ONLINE" ? "var(--success)" : "var(--warning)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}>
                            {order.paymentMethod === "ONLINE" ? <><CheckCircle2 size={14} /><span>Done</span></> : <><Clock size={14} /><span>Pending</span></>}
                          </strong>
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
                        style={{ fontSize: "12px", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                      >
                        <MessageSquare size={14} />
                        <span>Chat</span>
                      </Link>
                      <Link
                        to={`/tracking/${order._id}`}
                        className="btn btn-secondary"
                        style={{ fontSize: "12px", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                      >
                        <MapPin size={14} />
                        <span>Track</span>
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
              <div className="empty-state card" style={{ textAlign: "center", padding: "40px" }}>
                <div style={{ marginBottom: "16px", display: "flex", justifyContent: "center" }}>
                  <Package size={64} color="#ccc" />
                </div>
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
                  <Link to="/crops" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <Sprout size={16} />
                    <span>Browse Crops</span>
                  </Link>
                  <Link to="/products" className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <ShoppingBag size={16} />
                    <span>Browse Products</span>
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
                              e.target.style.display = "none";
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
                            border: "1px solid var(--border-color)"
                          }}>
                            <Package size={28} color="var(--primary-blue)" />
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
                          fontWeight: "600",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}>
                          {renderStatusIcon(order.status)} <span>{order.status}</span>
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
                        style={{ fontSize: "12px", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                      >
                        <MessageSquare size={14} />
                        <span>Chat</span>
                      </Link>
                      <Link
                        to={`/tracking/${order._id}`}
                        className="btn btn-secondary"
                        style={{ fontSize: "12px", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                      >
                        <MapPin size={14} />
                        <span>Track</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
