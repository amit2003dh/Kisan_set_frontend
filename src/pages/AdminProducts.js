import { useState, useEffect } from "react";
import API from "../api/api";
import { apiCall } from "../api/api";

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState("all"); // all, verified, unverified
  const [activeTab, setActiveTab] = useState("products"); // products, crops
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    fetchData();
    checkDevice();
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);
    
    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  const checkDevice = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    setIsMobile(width < 768);
    setIsPortrait(height > width);
  };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    
    try {
      // Fetch both products and crops
      const [productsResponse, cropsResponse] = await Promise.all([
        apiCall(() => API.get("/products")),
        apiCall(() => API.get("/crops"))
      ]);
      
      if (productsResponse.error) {
        setError(productsResponse.error);
      } else {
        setProducts(productsResponse.data || []);
      }
      
      if (cropsResponse.error) {
        setError(cropsResponse.error);
      } else {
        setCrops(cropsResponse.data || []);
      }
    } catch (err) {
      setError("Failed to fetch data");
    }
    
    setLoading(false);
  };

  const handleVerification = async (itemId, isApproved, type) => {
    setError("");
    setSuccess("");
    
    try {
      const endpoint = type === "crop" ? `/crops/${itemId}/verify` : `/products/${itemId}/verify`;
      const { error: err } = await apiCall(() =>
        API.put(endpoint, { isApproved: isApproved ? 'approved' : 'pending' })
      );
      
      if (err) {
        setError(err);
      } else {
        setSuccess(`${type === "crop" ? "Crop" : "Product"} ${isApproved ? 'approved' : 'unapproved'} successfully!`);
        
        // Update the item in the appropriate list
        if (type === "crop") {
          setCrops(prev => prev.map(item => 
            item._id === itemId ? { ...item, isApproved: isApproved ? 'approved' : 'pending' } : item
          ));
        } else {
          setProducts(prev => prev.map(item => 
            item._id === itemId ? { ...item, isApproved: isApproved ? 'approved' : 'pending' } : item
          ));
        }
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      setError(`Failed to ${isApproved ? 'approve' : 'unapprove'} ${type}`);
    }
  };

  const filteredProducts = products.filter(product => {
    if (filter === "verified") return product.isApproved === 'approved';
    if (filter === "unverified") return product.isApproved !== 'approved';
    return true; // all
  });

  const filteredCrops = crops.filter(crop => {
    if (filter === "verified") return crop.isApproved === 'approved';
    if (filter === "unverified") return crop.isApproved !== 'approved';
    return true; // all
  });

  const currentItems = activeTab === "products" ? filteredProducts : filteredCrops;

  if (loading) {
    return (
      <div className="admin-container" style={{ 
        paddingTop: isMobile ? (isPortrait ? "20px" : "16px") : "40px", 
        textAlign: "center",
        minHeight: isMobile ? (isPortrait ? "60vh" : "50vh") : "60vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center"
      }}>
        <div className="loading-spinner"></div>
        <p style={{ 
          marginTop: "16px", 
          fontSize: isMobile ? (isPortrait ? "14px" : "13px") : "16px",
          color: "var(--text-secondary)"
        }}>
          Loading {activeTab === "products" ? "products" : "crops"}...
        </p>
      </div>
    );
  }

  return (
    <div className="admin-container" style={{ 
      paddingTop: isMobile ? (isPortrait ? "20px" : "16px") : "40px", 
      paddingBottom: isMobile ? (isPortrait ? "20px" : "16px") : "40px",
      maxWidth: isMobile ? "100%" : (isPortrait ? "100%" : "1320px"),
      margin: isMobile ? "0" : "0 auto",
      padding: isMobile ? (isPortrait ? "20px 16px" : "16px 12px") : "40px 20px"
    }}>
      <div className="admin-page-header">
        <h1 style={{ 
          fontSize: isMobile ? (isPortrait ? "24px" : "20px") : "32px",
          marginBottom: isMobile ? "8px" : "12px"
        }}>
          🔐 Admin - Verification Management
        </h1>
        <p style={{ 
          fontSize: isMobile ? (isPortrait ? "14px" : "13px") : "16px",
          color: "var(--text-secondary)"
        }}>
          Manage product and crop verification status
        </p>
      </div>

      {error && (
        <div className="admin-alert admin-alert-danger" style={{
          fontSize: isMobile ? (isPortrait ? "14px" : "13px") : "16px",
          padding: isMobile ? (isPortrait ? "12px 16px" : "10px 12px") : "16px",
          marginBottom: "16px"
        }}>
          {error}
        </div>
      )}
      {success && (
        <div className="admin-alert admin-alert-success" style={{
          fontSize: isMobile ? (isPortrait ? "14px" : "13px") : "16px",
          padding: isMobile ? (isPortrait ? "12px 16px" : "10px 12px") : "16px",
          marginBottom: "16px"
        }}>
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="admin-card" style={{ 
        marginBottom: isMobile ? (isPortrait ? "16px" : "12px") : "24px",
        padding: isMobile ? (isPortrait ? "20px 16px" : "16px 12px") : "24px"
      }}>
        {/* Tab Navigation */}
        <div style={{ 
          display: "flex", 
          gap: isMobile ? (isPortrait ? "8px" : "6px") : "16px", 
          borderBottom: "1px solid var(--border)", 
          paddingBottom: isMobile ? (isPortrait ? "12px" : "10px") : "16px",
          overflowX: "auto",
          flexWrap: isMobile ? "nowrap" : "wrap"
        }}>
          <button
            onClick={() => setActiveTab("products")}
            className={`admin-btn ${activeTab === "products" ? "admin-btn-primary" : "admin-btn-secondary"}`}
            style={{ 
              padding: isMobile ? (isPortrait ? "10px 14px" : "8px 12px") : "8px 16px",
              fontSize: isMobile ? (isPortrait ? "14px" : "12px") : "14px",
              whiteSpace: "nowrap",
              flexShrink: 0,
              minHeight: isMobile ? "44px" : "auto"
            }}
          >
            🛒 Products ({products.length})
          </button>
          <button
            onClick={() => setActiveTab("crops")}
            className={`admin-btn ${activeTab === "crops" ? "admin-btn-primary" : "admin-btn-secondary"}`}
            style={{ 
              padding: isMobile ? (isPortrait ? "10px 14px" : "8px 12px") : "8px 16px",
              fontSize: isMobile ? (isPortrait ? "14px" : "12px") : "14px",
              whiteSpace: "nowrap",
              flexShrink: 0,
              minHeight: isMobile ? "44px" : "auto"
            }}
          >
            🌾 Crops ({crops.length})
          </button>
        </div>

        {/* Filter Options */}
        <div style={{ 
          display: "flex", 
          gap: isMobile ? (isPortrait ? "6px" : "4px") : "16px", 
          alignItems: isMobile ? "flex-start" : "center", 
          flexWrap: "wrap", 
          marginTop: isMobile ? (isPortrait ? "12px" : "10px") : "16px"
        }}>
          <span className="admin-form-label" style={{ 
            fontWeight: "600", 
            fontSize: isMobile ? (isPortrait ? "14px" : "12px") : "14px",
            alignSelf: "center",
            marginBottom: isMobile ? "8px" : "0"
          }}>
            Filter:
          </span>
          <button
            onClick={() => setFilter("all")}
            className={`admin-btn ${filter === "all" ? "admin-btn-primary" : "admin-btn-secondary"}`}
            style={{ 
              padding: isMobile ? (isPortrait ? "8px 12px" : "6px 10px") : "8px 16px",
              fontSize: isMobile ? (isPortrait ? "13px" : "11px") : "14px",
              whiteSpace: "nowrap",
              minHeight: isMobile ? "40px" : "auto"
            }}
          >
            All ({activeTab === "products" ? products.length : crops.length})
          </button>
          <button
            onClick={() => setFilter("verified")}
            className={`admin-btn ${filter === "verified" ? "admin-btn-primary" : "admin-btn-secondary"}`}
            style={{ 
              padding: isMobile ? (isPortrait ? "8px 12px" : "6px 10px") : "8px 16px",
              fontSize: isMobile ? (isPortrait ? "13px" : "11px") : "14px",
              whiteSpace: "nowrap",
              minHeight: isMobile ? "40px" : "auto"
            }}
          >
            ✓ Verified ({activeTab === "products" ? products.filter(p => p.isApproved === 'approved').length : crops.filter(c => c.isApproved === 'approved').length})
          </button>
          <button
            onClick={() => setFilter("unverified")}
            className={`admin-btn ${filter === "unverified" ? "admin-btn-primary" : "admin-btn-secondary"}`}
            style={{ 
              padding: isMobile ? (isPortrait ? "8px 12px" : "6px 10px") : "8px 16px",
              fontSize: isMobile ? (isPortrait ? "13px" : "11px") : "14px",
              whiteSpace: "nowrap",
              minHeight: isMobile ? "40px" : "auto"
            }}
          >
            ⚠ Unverified ({activeTab === "products" ? products.filter(p => p.isApproved !== 'approved').length : crops.filter(c => c.isApproved !== 'approved').length})
          </button>
        </div>
      </div>

      {currentItems.length === 0 ? (
        <div className="admin-card" style={{ 
          textAlign: "center", 
          padding: isMobile ? (isPortrait ? "24px 16px" : "20px 12px") : "40px"
        }}>
          <div style={{ 
            fontSize: isMobile ? (isPortrait ? "36px" : "32px") : "48px", 
            marginBottom: isMobile ? (isPortrait ? "12px" : "10px") : "16px" 
          }}>
            {activeTab === "products" ? "📦" : "🌾"}
          </div>
          <h3 style={{ 
            margin: "0 0 8px 0",
            fontSize: isMobile ? (isPortrait ? "18px" : "16px") : "20px"
          }}>
            No {activeTab === "products" ? "products" : "crops"} found
          </h3>
          <p style={{ 
            margin: 0,
            color: "var(--text-secondary)",
            fontSize: isMobile ? (isPortrait ? "14px" : "13px") : "16px",
            lineHeight: 1.5
          }}>
            {filter === "verified" ? `No verified ${activeTab === "products" ? "products" : "crops"} yet.` : 
             filter === "unverified" ? `No unverified ${activeTab === "products" ? "products" : "crops"}.` : 
             `No ${activeTab === "products" ? "products" : "crops"} available.`}
          </p>
        </div>
      ) : (
        <div className="admin-card" style={{ 
          padding: isMobile ? (isPortrait ? "16px 12px" : "12px 8px") : "16px" 
        }}>
          <div style={{ display: "grid", gap: isMobile ? (isPortrait ? "16px" : "12px") : "16px" }}>
            {currentItems.map((item) => (
              <div
                key={item._id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "var(--border-radius-sm)",
                  padding: isMobile ? (isPortrait ? "16px 12px" : "12px 8px") : "16px",
                  display: isMobile ? "block" : "flex",
                  gap: isMobile ? "0" : "16px",
                  alignItems: isMobile ? "stretch" : "center",
                  transition: "all 0.2s ease"
                }}
              >
                {/* Image Section */}
                {item.image && (
                  <div style={{
                    display: isMobile ? "block" : "flex",
                    justifyContent: "center",
                    marginBottom: isMobile ? (isPortrait ? "16px" : "12px") : "0"
                  }}>
                    <img
                      src={item.image.startsWith("http") ? item.image : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${item.image}`}
                      alt={item.name}
                      style={{
                        width: isMobile ? "100%" : "80px",
                        height: isMobile ? (isPortrait ? "200px" : "150px") : "80px",
                        objectFit: "cover",
                        borderRadius: "var(--border-radius-sm)",
                        maxWidth: isMobile ? (isPortrait ? "300px" : "250px") : "none"
                      }}
                    />
                  </div>
                )}
                
                {/* Content Section */}
                <div style={{ 
                  flex: 1,
                  display: isMobile ? "block" : "flex",
                  flexDirection: "column",
                  gap: isMobile ? (isPortrait ? "10px" : "8px") : "4px"
                }}>
                  {/* Title and Status */}
                  <div style={{ 
                    display: "flex", 
                    alignItems: isMobile ? "flex-start" : "center", 
                    gap: "8px", 
                    marginBottom: "4px",
                    flexWrap: "wrap"
                  }}>
                    <h4 style={{ 
                      margin: 0, 
                      fontSize: isMobile ? (isPortrait ? "16px" : "14px") : "16px",
                      lineHeight: 1.3,
                      flex: 1
                    }}>
                      {item.name}
                    </h4>
                    {item.isApproved === 'approved' && (
                      <span className="admin-badge admin-badge-success" style={{
                        padding: isMobile ? (isPortrait ? "4px 8px" : "3px 6px") : "2px 8px",
                        fontSize: isMobile ? (isPortrait ? "11px" : "10px") : "12px",
                        fontWeight: "500",
                        whiteSpace: "nowrap",
                        flexShrink: 0
                      }}>
                        ✓ Verified
                      </span>
                    )}
                  </div>
                  
                  {/* Product/Crop Details */}
                  <p style={{ 
                    margin: "4px 0", 
                    color: "var(--text-secondary)", 
                    fontSize: isMobile ? (isPortrait ? "13px" : "12px") : "14px",
                    lineHeight: 1.4
                  }}>
                    {activeTab === "products" ? 
                      `${item.type === "seed" ? "🌱 Seed" : "🧪 Pesticide"} • ${item.crop ? ` For: ${item.crop} • ` : ""}` : 
                      "🌾 Crop • "
                    }
                    Stock: {activeTab === "products" ? item.stock : item.quantity} • 
                    ₹{item.price}
                    {activeTab === "crops" && item.harvestDate && ` • Harvest: ${new Date(item.harvestDate).toLocaleDateString()}`}
                  </p>
                  
                  {/* Seller Information */}
                  <p style={{ 
                    margin: "4px 0", 
                    color: "var(--text-light)", 
                    fontSize: isMobile ? (isPortrait ? "12px" : "11px") : "12px",
                    lineHeight: 1.3
                  }}>
                    Seller: {item.sellerId?.name || "Unknown"} • 
                    {item.location?.address && ` 📍 ${item.location.address}`}
                  </p>
                </div>
                
                {/* Action Button */}
                <div style={{ 
                  display: "flex", 
                  flexDirection: isMobile ? (isPortrait ? "row" : "column") : "column", 
                  gap: isMobile ? (isPortrait ? "10px" : "6px") : "8px",
                  marginTop: isMobile ? (isPortrait ? "16px" : "12px") : "0",
                  justifyContent: isMobile ? "center" : "flex-end"
                }}>
                  <button
                    onClick={() => handleVerification(item._id, item.isApproved !== 'approved', activeTab === "crops" ? "crop" : "product")}
                    className={`admin-btn ${item.isApproved === 'approved' ? "admin-btn-secondary" : "admin-btn-primary"}`}
                    style={{ 
                      padding: isMobile ? (isPortrait ? "10px 16px" : "8px 12px") : "8px 16px", 
                      fontSize: isMobile ? (isPortrait ? "14px" : "12px") : "14px",
                      minWidth: isMobile ? (isPortrait ? "120px" : "100px") : "auto",
                      minHeight: isMobile ? "44px" : "auto",
                      textAlign: "center"
                    }}
                  >
                    {item.isApproved === 'approved' ? "🚫 Unapprove" : "✅ Approve"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
