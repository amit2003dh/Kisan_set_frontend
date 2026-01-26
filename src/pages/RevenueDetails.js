import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";

export default function RevenueDetails() {
  const navigate = useNavigate();
  const [revenueData, setRevenueData] = useState([]);
  const [outOfStockCrops, setOutOfStockCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    if (!userData) {
      navigate("/login");
      return;
    }
    setUser(userData);
    fetchRevenueDetails(userData._id);
  }, [navigate]);

  const fetchRevenueDetails = async (userId) => {
    try {
      setLoading(true);
      
      // Fetch farmer's crops with sales stats
      const cropsRes = await API.get(`/crops?sellerId=${userId}`);
      const crops = cropsRes.data || [];
      
      console.log("🌾 Farmer's crops:", crops);
      
      // Calculate revenue for each crop
      const cropRevenueData = crops.map(crop => ({
        _id: crop._id,
        name: crop.name,
        price: crop.price,
        quantity: crop.quantity,
        totalSold: crop.salesStats?.totalSold || 0,
        totalRevenue: crop.salesStats?.totalRevenue || 0,
        status: crop.status,
        image: crop.image
      }));

      // Filter out of stock crops (only farmer's crops)
      const outOfStock = crops.filter(crop => 
        crop.quantity === 0 && (crop.salesStats?.totalSold || 0) > 0
      );

      setRevenueData(cropRevenueData);
      setOutOfStockCrops(outOfStock);
      console.log("💰 Revenue data:", cropRevenueData);
      console.log("📦 Out of stock crops:", outOfStock);
      
    } catch (error) {
      console.error("❌ Error fetching revenue details:", error);
      setRevenueData([]);
      setOutOfStockCrops([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateSubtotal = () => {
    return revenueData.reduce((sum, crop) => sum + crop.totalRevenue, 0);
  };

  const handleOutOfStockClick = (cropId) => {
    navigate(`/crop-sales/${cropId}`);
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
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>💰</div>
        <h2>Loading Revenue Details...</h2>
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
            💰 Revenue Details
          </h1>
          <p style={{ margin: "8px 0 0 0", color: "#666" }}>
            Detailed revenue breakdown by crop
          </p>
        </div>
        <button
          onClick={() => navigate("/farmer")}
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
          ← Back to Dashboard
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
        gap: "20px", 
        marginBottom: "30px" 
      }}>
        <div style={{
          background: "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)",
          color: "white",
          padding: "24px",
          borderRadius: "12px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>🌾</div>
          <div style={{ fontSize: "24px", fontWeight: "700", marginBottom: "4px" }}>
            {revenueData.length}
          </div>
          <div style={{ fontSize: "14px", opacity: 0.9 }}>Total Crops</div>
        </div>

        <div style={{
          background: "linear-gradient(135deg, #ff9800 0%, #f57c00 100%)",
          color: "white",
          padding: "24px",
          borderRadius: "12px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>📦</div>
          <div style={{ fontSize: "24px", fontWeight: "700", marginBottom: "4px" }}>
            {outOfStockCrops.length}
          </div>
          <div style={{ fontSize: "14px", opacity: 0.9 }}>Out of Stock</div>
        </div>

        <div style={{
          background: "linear-gradient(135deg, #2196f3 0%, #1976d2 100%)",
          color: "white",
          padding: "24px",
          borderRadius: "12px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>💵</div>
          <div style={{ fontSize: "24px", fontWeight: "700", marginBottom: "4px" }}>
            ₹{calculateSubtotal().toLocaleString()}
          </div>
          <div style={{ fontSize: "14px", opacity: 0.9 }}>Total Revenue</div>
        </div>
      </div>

      {/* Revenue Table */}
      <div style={{
        background: "white",
        borderRadius: "12px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        overflow: "hidden",
        marginBottom: "30px"
      }}>
        <div style={{
          background: "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)",
          color: "white",
          padding: "20px",
          fontSize: "18px",
          fontWeight: "600"
        }}>
          📊 Revenue by Crop
        </div>
        
        {revenueData.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f5f5f5" }}>
                  <th style={{ padding: "16px", textAlign: "left", borderBottom: "1px solid #ddd" }}>Crop</th>
                  <th style={{ padding: "16px", textAlign: "center", borderBottom: "1px solid #ddd" }}>Price/Unit</th>
                  <th style={{ padding: "16px", textAlign: "center", borderBottom: "1px solid #ddd" }}>Quantity Sold</th>
                  <th style={{ padding: "16px", textAlign: "center", borderBottom: "1px solid #ddd" }}>Revenue</th>
                  <th style={{ padding: "16px", textAlign: "center", borderBottom: "1px solid #ddd" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {revenueData.map((crop, index) => (
                  <tr key={crop._id} style={{ 
                    borderBottom: "1px solid #eee",
                    backgroundColor: index % 2 === 0 ? "#fafafa" : "white"
                  }}>
                    <td style={{ padding: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {crop.image && (
                          <img 
                            src={crop.image} 
                            alt={crop.name}
                            style={{ 
                              width: "40px", 
                              height: "40px", 
                              objectFit: "cover", 
                              borderRadius: "8px"
                            }}
                          />
                        )}
                        <div>
                          <div style={{ fontWeight: "600", color: "#333" }}>{crop.name}</div>
                          <div style={{ fontSize: "12px", color: "#666" }}>
                            Available: {crop.quantity} units
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "16px", textAlign: "center" }}>
                      ₹{crop.price.toLocaleString()}
                    </td>
                    <td style={{ padding: "16px", textAlign: "center" }}>
                      {crop.totalSold}
                    </td>
                    <td style={{ padding: "16px", textAlign: "center", fontWeight: "600", color: "#2e7d32" }}>
                      ₹{crop.totalRevenue.toLocaleString()}
                    </td>
                    <td style={{ padding: "16px", textAlign: "center" }}>
                      <span style={{
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "600",
                        backgroundColor: crop.quantity === 0 ? "#ffebee" : "#e8f5e8",
                        color: crop.quantity === 0 ? "#c62828" : "#2e7d32"
                      }}>
                        {crop.quantity === 0 ? "Out of Stock" : "Available"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "#f5f5f5", fontWeight: "700" }}>
                  <td colSpan="3" style={{ padding: "16px", textAlign: "right" }}>
                    Subtotal:
                  </td>
                  <td style={{ padding: "16px", textAlign: "center", color: "#2e7d32", fontSize: "18px" }}>
                    ₹{calculateSubtotal().toLocaleString()}
                  </td>
                  <td></td>
                </tr>
                <tr style={{ background: "#2e7d32", color: "white", fontWeight: "700" }}>
                  <td colSpan="3" style={{ padding: "16px", textAlign: "right" }}>
                    Total Revenue:
                  </td>
                  <td style={{ padding: "16px", textAlign: "center", fontSize: "20px" }}>
                    ₹{calculateSubtotal().toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📊</div>
            <h4>No Revenue Data Available</h4>
            <p>Start selling crops to see revenue details here</p>
          </div>
        )}
      </div>

      {/* Out of Stock Crops Section */}
      {outOfStockCrops.length > 0 && (
        <div style={{
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          overflow: "hidden"
        }}>
          <div style={{
            background: "linear-gradient(135deg, #ff9800 0%, #f57c00 100%)",
            color: "white",
            padding: "20px",
            fontSize: "18px",
            fontWeight: "600"
          }}>
            📦 Out of Stock Crops (Click to view sales details)
          </div>
          
          <div style={{ padding: "20px" }}>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", 
              gap: "16px" 
            }}>
              {outOfStockCrops.map((crop) => (
                <div
                  key={crop._id}
                  onClick={() => handleOutOfStockClick(crop._id)}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "16px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    backgroundColor: "#fff"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                    {crop.image && (
                      <img 
                        src={crop.image} 
                        alt={crop.name}
                        style={{ 
                          width: "50px", 
                          height: "50px", 
                          objectFit: "cover", 
                          borderRadius: "8px"
                        }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: "0 0 4px 0", color: "#333" }}>{crop.name}</h4>
                      <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
                        Completely sold out
                      </p>
                    </div>
                  </div>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "14px" }}>
                    <div>
                      <span style={{ color: "#666" }}>Total Sold:</span>
                      <strong style={{ display: "block", color: "#2e7d32" }}>
                        {crop.salesStats?.totalSold || 0} units
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: "#666" }}>Revenue:</span>
                      <strong style={{ display: "block", color: "#2e7d32" }}>
                        ₹{(crop.salesStats?.totalRevenue || 0).toLocaleString()}
                      </strong>
                    </div>
                  </div>
                  
                  <div style={{
                    marginTop: "12px",
                    padding: "8px",
                    backgroundColor: "#fff3e0",
                    borderRadius: "4px",
                    textAlign: "center",
                    fontSize: "12px",
                    color: "#e65100",
                    fontWeight: "600"
                  }}>
                    👆 Click to view sales details
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
