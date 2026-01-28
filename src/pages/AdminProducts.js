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

  useEffect(() => {
    fetchData();
  }, []);

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

  const fetchProducts = async () => {
    // Keep for backward compatibility
    await fetchData();
  };

  const handleVerification = async (itemId, isApproved, type) => {
    setError("");
    setSuccess("");
    
    try {
      const endpoint = type === "crop" ? `/crops/${itemId}/verify` : `/products/${itemId}/verify`;
      const { data, error: err } = await apiCall(() =>
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
      <div className="container" style={{ paddingTop: "40px", textAlign: "center" }}>
        <div className="loading-spinner"></div>
        <p>Loading products...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
      <div className="page-header">
        <h1>🔐 Admin - Verification Management</h1>
        <p>Manage product and crop verification status</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Tabs */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "16px", borderBottom: "1px solid var(--border)", paddingBottom: "16px" }}>
          <button
            onClick={() => setActiveTab("products")}
            className={`btn ${activeTab === "products" ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "8px 16px" }}
          >
            🛒 Products ({products.length})
          </button>
          <button
            onClick={() => setActiveTab("crops")}
            className={`btn ${activeTab === "crops" ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "8px 16px" }}
          >
            🌾 Crops ({crops.length})
          </button>
        </div>

        <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap", marginTop: "16px" }}>
          <span style={{ fontWeight: "600" }}>Filter:</span>
          <button
            onClick={() => setFilter("all")}
            className={`btn ${filter === "all" ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "8px 16px" }}
          >
            All ({activeTab === "products" ? products.length : crops.length})
          </button>
          <button
            onClick={() => setFilter("verified")}
            className={`btn ${filter === "verified" ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "8px 16px" }}
          >
            ✓ Verified ({activeTab === "products" ? products.filter(p => p.isApproved === 'approved').length : crops.filter(c => c.isApproved === 'approved').length})
          </button>
          <button
            onClick={() => setFilter("unverified")}
            className={`btn ${filter === "unverified" ? "btn-primary" : "btn-secondary"}`}
            style={{ padding: "8px 16px" }}
          >
            ⚠ Unverified ({activeTab === "products" ? products.filter(p => p.isApproved !== 'approved').length : crops.filter(c => c.isApproved !== 'approved').length})
          </button>
        </div>
      </div>

      {currentItems.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>
            {activeTab === "products" ? "📦" : "🌾"}
          </div>
          <h3>No {activeTab === "products" ? "products" : "crops"} found</h3>
          <p style={{ color: "var(--text-secondary)" }}>
            {filter === "verified" ? `No verified ${activeTab === "products" ? "products" : "crops"} yet.` : 
             filter === "unverified" ? `No unverified ${activeTab === "products" ? "products" : "crops"}.` : 
             `No ${activeTab === "products" ? "products" : "crops"} available.`}
          </p>
        </div>
      ) : (
        <div className="card">
          <div style={{ display: "grid", gap: "16px" }}>
            {currentItems.map((item) => (
              <div
                key={item._id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "var(--border-radius-sm)",
                  padding: "16px",
                  display: "flex",
                  gap: "16px",
                  alignItems: "center"
                }}
              >
                {item.image && (
                  <img
                    src={item.image.startsWith("http") ? item.image : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${item.image}`}
                    alt={item.name}
                    style={{
                      width: "80px",
                      height: "80px",
                      objectFit: "cover",
                      borderRadius: "var(--border-radius-sm)"
                    }}
                  />
                )}
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <h4 style={{ margin: 0, fontSize: "16px" }}>{item.name}</h4>
                    {item.isApproved === 'approved' && (
                      <span style={{
                        backgroundColor: "#4caf50",
                        color: "white",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "500"
                      }}>
                        ✓ Verified
                      </span>
                    )}
                  </div>
                  
                  <p style={{ margin: "4px 0", color: "var(--text-secondary)", fontSize: "14px" }}>
                    {activeTab === "products" ? 
                      `${item.type === "seed" ? "🌱 Seed" : "🧪 Pesticide"} • ${item.crop ? ` For: ${item.crop} • ` : ""}` : 
                      "🌾 Crop • "
                    }
                    Stock: {activeTab === "products" ? item.stock : item.quantity} • 
                    ₹{item.price}
                    {activeTab === "crops" && item.harvestDate && ` • Harvest: ${new Date(item.harvestDate).toLocaleDateString()}`}
                  </p>
                  
                  <p style={{ margin: "4px 0", color: "var(--text-light)", fontSize: "12px" }}>
                    Seller: {item.sellerId?.name || "Unknown"} • 
                    {item.location?.address && ` 📍 ${item.location.address}`}
                  </p>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    onClick={() => handleVerification(item._id, item.isApproved !== 'approved', activeTab === "crops" ? "crop" : "product")}
                    className={`btn ${item.isApproved === 'approved' ? "btn-secondary" : "btn-primary"}`}
                    style={{ padding: "8px 16px", fontSize: "14px" }}
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
