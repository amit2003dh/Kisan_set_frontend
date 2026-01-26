import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api/api";

export default function CropSalesDetails() {
  const navigate = useNavigate();
  const { cropId } = useParams();
  const [crop, setCrop] = useState(null);
  const [salesOrders, setSalesOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (cropId) {
      fetchCropDetails();
      fetchSalesOrders();
    }
  }, [cropId]);

  const fetchCropDetails = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const response = await API.get(`/crops/${cropId}`);
      const cropData = response.data;
      
      // Verify this crop belongs to the current farmer
      if (cropData.sellerId !== user._id) {
        console.error("❌ This crop does not belong to the current farmer");
        setCrop(null);
        return;
      }
      
      setCrop(cropData);
      console.log("🌾 Crop details:", cropData);
    } catch (error) {
      console.error("❌ Error fetching crop details:", error);
      setCrop(null);
    }
  };

  const fetchSalesOrders = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const response = await API.get("/orders/farmer");
      const allOrders = response.data?.sales || [];
      
      console.log("🔍 All farmer orders:", allOrders);
      
      // Filter orders for this specific crop AND ensure they are sales (not purchases)
      const cropOrders = allOrders.filter(order => {
        // Check if this order contains our crop
        const hasCropItem = order.items && order.items.some(item => 
          item.itemId === cropId && item.itemType === "crop"
        );
        
        // Ensure this is a sale (farmer is the seller)
        const isSale = order.sellerId === user._id;
        
        console.log("🔍 Order check:", {
          orderId: order._id,
          hasCropItem,
          isSale,
          sellerId: order.sellerId,
          userId: user._id
        });
        
        return hasCropItem && isSale;
      });
      
      console.log("📊 Filtered crop sales orders:", cropOrders);
      setSalesOrders(cropOrders);
    } catch (error) {
      console.error("❌ Error fetching sales orders:", error);
      setSalesOrders([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        minHeight: "100vh",
        flexDirection: "column"
      }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🌾</div>
        <h2>Loading Crop Sales Details...</h2>
      </div>
    );
  }

  if (!crop) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        minHeight: "100vh",
        flexDirection: "column"
      }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>❌</div>
        <h2>Crop not found</h2>
        <button
          onClick={() => navigate("/revenue-details")}
          style={{
            marginTop: "16px",
            padding: "10px 20px",
            backgroundColor: "#2e7d32",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer"
          }}
        >
          Back to Revenue Details
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "30px",
        flexWrap: "wrap",
        gap: "16px"
      }}>
        <div>
          <h1 style={{ margin: "0", color: "#2e7d32", fontSize: "28px" }}>
            🌾 {crop.name} - Sales Details
          </h1>
          <p style={{ margin: "8px 0 0 0", color: "#666" }}>
            Complete sales history and analytics
          </p>
        </div>
        <button
          onClick={() => navigate("/revenue-details")}
          style={{
            padding: "10px 20px",
            backgroundColor: "#2e7d32",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px"
          }}
        >
          ← Back to Revenue
        </button>
      </div>

      {/* Crop Summary */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: "20px",
        marginBottom: "30px"
      }}>
        <div style={{
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          padding: "20px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {crop.image && (
              <img 
                src={crop.image} 
                alt={crop.name}
                style={{ 
                  width: "60px", 
                  height: "60px", 
                  objectFit: "cover", 
                  borderRadius: "8px"
                }}
              />
            )}
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: "0 0 8px 0", color: "#333" }}>{crop.name}</h3>
              <p style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#666" }}>
                {crop.category}
              </p>
              <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>
                {crop.location?.city}, {crop.location?.state}
              </p>
            </div>
          </div>
        </div>

        <div style={{
          background: "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)",
          color: "white",
          borderRadius: "12px",
          padding: "20px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>📊</div>
          <div style={{ fontSize: "24px", fontWeight: "700", marginBottom: "4px" }}>
            {crop.salesStats?.totalSold || 0}
          </div>
          <div style={{ fontSize: "14px", opacity: 0.9 }}>Total Units Sold</div>
        </div>

        <div style={{
          background: "linear-gradient(135deg, #ff9800 0%, #f57c00 100%)",
          color: "white",
          borderRadius: "12px",
          padding: "20px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>💰</div>
          <div style={{ fontSize: "24px", fontWeight: "700", marginBottom: "4px" }}>
            ₹{(crop.salesStats?.totalRevenue || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: "14px", opacity: 0.9 }}>Total Revenue</div>
        </div>

        <div style={{
          background: "linear-gradient(135deg, #f44336 0%, #d32f2f 100%)",
          color: "white",
          borderRadius: "12px",
          padding: "20px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>📦</div>
          <div style={{ fontSize: "24px", fontWeight: "700", marginBottom: "4px" }}>
            {crop.quantity || 0}
          </div>
          <div style={{ fontSize: "14px", opacity: 0.9 }}>Remaining Stock</div>
        </div>
      </div>

      {/* Sales Orders Table */}
      <div style={{
        background: "white",
        borderRadius: "12px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        overflow: "hidden"
      }}>
        <div style={{
          background: "linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)",
          color: "white",
          padding: "20px",
          fontSize: "18px",
          fontWeight: "600"
        }}>
          📋 Sales Orders History
        </div>

        {salesOrders.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f5f5f5" }}>
                  <th style={{ padding: "16px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Order ID</th>
                  <th style={{ padding: "16px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Buyer</th>
                  <th style={{ padding: "16px", textAlign: "center", borderBottom: "1px solid #ddd" }}>Quantity</th>
                  <th style={{ padding: "16px", textAlign: "center", borderBottom: "1px solid #ddd" }}>Price/Unit</th>
                  <th style={{ padding: "16px", textAlign: "center", borderBottom: "1px solid #ddd" }}>Total</th>
                  <th style={{ padding: "16px", textAlign: "center", borderBottom: "1px solid #ddd" }}>Date</th>
                  <th style={{ padding: "16px", textAlign: "center", borderBottom: "1px solid #ddd" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {salesOrders.map((order, index) => {
                  const cropItem = order.items.find(item => item.itemId === cropId);
                  return (
                    <tr key={order._id} style={{ 
                      borderBottom: "1px solid #eee",
                      backgroundColor: index % 2 === 0 ? "#fafafa" : "white"
                    }}>
                      <td style={{ padding: "16px" }}>
                        <div style={{ fontFamily: "monospace", fontSize: "12px", color: "#666" }}>
                          {order._id.slice(-8)}
                        </div>
                      </td>
                      <td style={{ padding: "16px" }}>
                        <div>
                          <div style={{ fontWeight: "600", color: "#333" }}>
                            {order.buyerId?.name || "Unknown Buyer"}
                          </div>
                          <div style={{ fontSize: "12px", color: "#666" }}>
                            {order.buyerId?.email || "No email"}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "16px", textAlign: "center" }}>
                        {cropItem?.quantity || 0} units
                      </td>
                      <td style={{ padding: "16px", textAlign: "center" }}>
                        ₹{(cropItem?.price || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: "16px", textAlign: "center", fontWeight: "600", color: "#2e7d32" }}>
                        ₹{order.total?.toLocaleString() || 0}
                      </td>
                      <td style={{ padding: "16px", textAlign: "center" }}>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "16px", textAlign: "center" }}>
                        <span style={{
                          padding: "4px 12px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "600",
                          backgroundColor: getStatusColor(order.status).bg,
                          color: getStatusColor(order.status).text
                        }}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: "#f5f5f5", fontWeight: "700" }}>
                  <td colSpan="4" style={{ padding: "16px", textAlign: "right" }}>
                    Total Summary:
                  </td>
                  <td style={{ padding: "16px", textAlign: "center", color: "#2e7d32", fontSize: "16px" }}>
                    ₹{salesOrders.reduce((sum, order) => sum + (order.total || 0), 0).toLocaleString()}
                  </td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
            <h4>No Sales Orders Found</h4>
            <p>This crop hasn't been sold yet</p>
          </div>
        )}
      </div>

      {/* Additional Analytics */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "20px",
        marginTop: "30px"
      }}>
        <div style={{
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          padding: "20px"
        }}>
          <h3 style={{ margin: "0 0 16px 0", color: "#333", fontSize: "16px" }}>
            📈 Sales Performance
          </h3>
          <div style={{ display: "grid", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#666" }}>Average Order Value:</span>
              <strong style={{ color: "#2e7d32" }}>
                ₹{salesOrders.length > 0 
                  ? Math.round(salesOrders.reduce((sum, order) => sum + (order.total || 0), 0) / salesOrders.length).toLocaleString()
                  : 0
                }
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#666" }}>Total Orders:</span>
              <strong style={{ color: "#2e7d32" }}>{salesOrders.length}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#666" }}>Stock Status:</span>
              <strong style={{ 
                color: crop.quantity === 0 ? "#f44336" : "#2e7d32" 
              }}>
                {crop.quantity === 0 ? "Out of Stock" : "In Stock"}
              </strong>
            </div>
          </div>
        </div>

        <div style={{
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          padding: "20px"
        }}>
          <h3 style={{ margin: "0 0 16px 0", color: "#333", fontSize: "16px" }}>
            🌾 Crop Information
          </h3>
          <div style={{ display: "grid", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#666" }}>Current Price:</span>
              <strong style={{ color: "#2e7d32" }}>₹{crop.price?.toLocaleString() || 0}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#666" }}>Original Quantity:</span>
              <strong style={{ color: "#2e7d32" }}>
                {(crop.salesStats?.totalSold || 0) + (crop.quantity || 0)} units
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#666" }}>Sold Percentage:</span>
              <strong style={{ color: "#2e7d32" }}>
                {((crop.salesStats?.totalSold || 0) / ((crop.salesStats?.totalSold || 0) + (crop.quantity || 0)) * 100).toFixed(1)}%
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function for status colors
function getStatusColor(status) {
  const colors = {
    "Confirmed": { bg: "#e8f5e8", text: "#2e7d32" },
    "Picked Up": { bg: "#e3f2fd", text: "#1976d2" },
    "In Transit": { bg: "#fff3e0", text: "#f57c00" },
    "Delivered": { bg: "#e8f5e8", text: "#2e7d32" },
    "Cancelled": { bg: "#ffebee", text: "#d32f2f" },
    "Pending": { bg: "#f5f5f5", text: "#666" }
  };
  return colors[status] || { bg: "#f5f5f5", text: "#666" };
}
