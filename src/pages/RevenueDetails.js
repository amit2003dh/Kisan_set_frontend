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
    fetchRevenueDetails(userData._id, userData.role);
  }, [navigate]);

  const fetchRevenueDetails = async (userId, userRole) => {
    try {
      setLoading(true);
      
      let revenueData = [];
      let outOfStockItems = [];
      
      if (userRole === "farmer") {
        // Fetch farmer's crops with sales stats
        const cropsRes = await API.get(`/crops?sellerId=${userId}`);
        const crops = cropsRes.data || [];
        
        console.log("🌾 Farmer's crops:", crops);
        
        // Calculate revenue for each crop
        revenueData = crops.map(crop => ({
          _id: crop._id,
          name: crop.name,
          price: crop.price,
          quantity: crop.quantity,
          totalSold: crop.salesStats?.totalSold || 0,
          totalRevenue: crop.salesStats?.totalRevenue || 0,
          status: crop.status,
          images: crop.images || [crop.image], // Handle both crops (single image) and products (images array)
          type: "crop"
        }));

        // Filter out of stock crops
        outOfStockItems = crops.filter(crop => 
          crop.quantity === 0 && (crop.salesStats?.totalSold || 0) > 0
        );
        
      } else if (userRole === "seller") {
        // Fetch seller's products with sales stats
        const productsRes = await API.get(`/products?sellerId=${userId}`);
        const products = productsRes.data || [];
        
        console.log("📦 Seller's products:", products);
        
        // Calculate revenue for each product
        revenueData = products.map(product => ({
          _id: product._id,
          name: product.name,
          price: product.price,
          quantity: product.stock,
          totalSold: product.salesStats?.totalSold || 0,
          totalRevenue: product.salesStats?.totalRevenue || 0,
          status: product.status,
          image: product.image,
          type: "product",
          suitableCrops: product.suitableCrops || []
        }));

        // Filter out of stock products
        outOfStockItems = products.filter(product => 
          product.stock === 0 && (product.salesStats?.totalSold || 0) > 0
        );
      }

      setRevenueData(revenueData);
      setOutOfStockCrops(outOfStockItems);
      console.log("💰 Revenue data:", revenueData);
      console.log("📦 Out of stock items:", outOfStockItems);
      
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

  const handleOutOfStockClick = (itemId, itemType) => {
    if (itemType === "crop") {
      navigate(`/crop-sales/${itemId}`);
    } else if (itemType === "product") {
      // For products, we could navigate to product details or manage products
      navigate(`/manage-products`);
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
            Detailed revenue breakdown by {user?.role === "farmer" ? "crop" : "product"}
          </p>
        </div>
        <button
          onClick={() => navigate(user?.role === "farmer" ? "/farmer" : "/seller")}
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
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>
            {user?.role === "farmer" ? "🌾" : "📦"}
          </div>
          <div style={{ fontSize: "24px", fontWeight: "700", marginBottom: "4px" }}>
            {revenueData.length}
          </div>
          <div style={{ fontSize: "14px", opacity: 0.9 }}>
            Total {user?.role === "farmer" ? "Crops" : "Products"}
          </div>
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
          <div style={{ fontSize: "14px", opacity: 0.9 }}>
            Out of Stock {user?.role === "farmer" ? "Crops" : "Products"}
          </div>
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
          📊 Revenue by {user?.role === "farmer" ? "Crop" : "Product"}
        </div>
        
        {revenueData.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f5f5f5" }}>
                  <th style={{ padding: "16px", textAlign: "left", borderBottom: "1px solid #ddd" }}>
                    {user?.role === "farmer" ? "Crop" : "Product"}
                  </th>
                  <th style={{ padding: "16px", textAlign: "center", borderBottom: "1px solid #ddd" }}>Price/Unit</th>
                  <th style={{ padding: "16px", textAlign: "center", borderBottom: "1px solid #ddd" }}>Quantity Sold</th>
                  <th style={{ padding: "16px", textAlign: "center", borderBottom: "1px solid #ddd" }}>Revenue</th>
                  <th style={{ padding: "16px", textAlign: "center", borderBottom: "1px solid #ddd" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {revenueData.map((item, index) => (
                  <tr key={item._id} style={{ 
                    borderBottom: "1px solid #eee",
                    backgroundColor: index % 2 === 0 ? "#fafafa" : "white"
                  }}>
                    <td style={{ padding: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {item.images && item.images.length > 0 && (
                          <img 
                            src={item.images[0].startsWith("http") ? item.images[0] : `${process.env.REACT_APP_API_URL || "http://localhost:5000"}${item.images[0]}`} 
                            alt={item.name}
                            style={{ 
                              width: "40px", 
                              height: "40px", 
                              objectFit: "cover", 
                              borderRadius: "8px"
                            }}
                          />
                        )}
                        <div>
                          <div style={{ fontWeight: "600", color: "#333" }}>{item.name}</div>
                          <div style={{ fontSize: "12px", color: "#666" }}>
                            Available: {item.quantity} units
                            {item.type === "product" && item.suitableCrops && item.suitableCrops.length > 0 && (
                              <span> • For: {item.suitableCrops.join(", ")}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "16px", textAlign: "center" }}>
                      ₹{item.price.toLocaleString()}
                    </td>
                    <td style={{ padding: "16px", textAlign: "center" }}>
                      {item.totalSold}
                    </td>
                    <td style={{ padding: "16px", textAlign: "center", fontWeight: "600", color: "#2e7d32" }}>
                      ₹{item.totalRevenue.toLocaleString()}
                    </td>
                    <td style={{ padding: "16px", textAlign: "center" }}>
                      <span style={{
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "600",
                        backgroundColor: item.status === "Available" ? "#e8f5e9" : "#ffebee",
                        color: item.status === "Available" ? "#2e7d32" : "#c62828"
                      }}>
                        {item.status}
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
              {outOfStockCrops.map((item) => (
                <div
                  key={item._id}
                  onClick={() => handleOutOfStockClick(item._id, item.type)}
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
                    {item.images && item.images.length > 0 && item.images[0] && (
                      <img 
                        src={item.images[0].startsWith("http") ? item.images[0] : `${process.env.REACT_APP_API_URL || "http://localhost:5000"}${item.images[0]}`} 
                        alt={item.name}
                        style={{ 
                          width: "50px", 
                          height: "50px", 
                          objectFit: "cover", 
                          borderRadius: "8px"
                        }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: "0 0 4px 0", color: "#333" }}>{item.name}</h4>
                      <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
                        Completely sold out
                      </p>
                    </div>
                  </div>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "14px" }}>
                    <div>
                      <span style={{ color: "#666" }}>Total Sold:</span>
                      <strong style={{ display: "block", color: "#2e7d32" }}>
                        {item.type === "crop" ? (item.salesStats?.totalSold || 0) : (item.totalSold || 0)} units
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: "#666" }}>Revenue:</span>
                      <strong style={{ display: "block", color: "#2e7d32" }}>
                        ₹{item.type === "crop" ? (item.salesStats?.totalRevenue || 0) : (item.totalRevenue || 0).toLocaleString()}
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
