import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/api";
import { apiCall } from "../api/api";
import { useCart } from "../context/CartContext";
import {
  Sprout,
  Lightbulb,
  PlusCircle,
  CheckCircle2,
  ShoppingCart
} from "lucide-react";

export default function CropList() {
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const { addToCart } = useCart();
  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const STATIC_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        setCurrentUser(JSON.parse(user));
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
  }, []);

  const fetchCrops = async () => {
    setLoading(true);
    setError("");
    
    const { data, error: err } = await apiCall(() => API.get("/crops"));
    
    if (err) {
      setError(err);
    } else {
      let filteredCrops = data || [];
      const user = localStorage.getItem("user");
      if (user) {
        try {
          const userData = JSON.parse(user);
          if (userData.role === "farmer" && userData._id) {
            filteredCrops = filteredCrops.filter(crop => 
              !crop.sellerId || crop.sellerId.toString() !== userData._id
            );
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
      setCrops(filteredCrops);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchCrops();
  }, [currentUser?._id]);

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <div className="loading-spinner"></div>
        <p style={{ textAlign: "center", color: "var(--text-secondary)" }}>Loading crops...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
      <div className="page-header">
        <h1 style={{ display: "inline-flex", alignItems: "center", gap: "12px" }}>
          <Sprout size={32} color="var(--primary-green)" />
          <span>Crop Marketplace</span>
        </h1>
        <p>Browse and purchase fresh crops from other farmers</p>
        {currentUser?.role === "farmer" && (
          <p style={{ fontSize: "14px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px", marginTop: "8px" }}>
            <Lightbulb size={16} color="#ffc107" />
            <span>Your own crops are managed in <Link to="/manage-crops" style={{ color: "var(--primary-green)", fontWeight: "600" }}>Manage Crops</Link></span>
          </p>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {crops.length === 0 ? (
        <div className="empty-state card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ marginBottom: "16px", display: "flex", justifyContent: "center" }}>
            <Sprout size={64} color="var(--primary-green)" />
          </div>
          <h3 style={{ marginBottom: "8px", color: "var(--text-primary)" }}>No crops available</h3>
          <p style={{ color: "var(--text-secondary)" }}>Check back later for fresh crops from farmers</p>
          {currentUser?.role === "farmer" && (
            <div style={{ marginTop: "20px", display: "flex", gap: "12px", justifyContent: "center", alignItems: "center" }}>
              <Link to="/add-crop" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <PlusCircle size={16} />
                <span>Add Your Crops</span>
              </Link>
              <span style={{ color: "var(--text-muted)" }}>or</span>
              <Link to="/manage-crops" className="btn btn-outline" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <Sprout size={16} />
                <span>Manage Your Crops</span>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-3">
          {crops.map((crop) => (
            <div key={crop._id} className="card" style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: "280px"
            }}>
              <div>
                <div style={{
                  width: "100%",
                  height: "190px",
                  borderRadius: "var(--border-radius-sm)",
                  marginBottom: "16px",
                  overflow: "hidden",
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  position: "relative"
                }}>
                  {(() => {
                    const imgUrl = (crop.images && crop.images.length > 0)
                      ? (crop.images[crop.primaryImageIndex || 0] || crop.images[0])
                      : crop.image;
                    const finalSrc = imgUrl ? (imgUrl.startsWith("http") ? imgUrl : `${STATIC_BASE_URL}${imgUrl}`) : null;

                    return finalSrc ? (
                      <img 
                        src={finalSrc} 
                        alt={crop.name || "Crop"} 
                        style={{ 
                          width: "100%", 
                          height: "100%", 
                          objectFit: "cover",
                          display: "block"
                        }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&auto=format&fit=crop";
                        }}
                      />
                    ) : (
                      <div style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)",
                        color: "white"
                      }}>
                        <Sprout size={48} color="white" />
                      </div>
                    );
                  })()}
                </div>
                <h3 style={{
                  margin: "0",
                  fontSize: "16px",
                  color: "var(--text-primary)",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  {crop.name || "Crop"}
                  {crop.verified && (
                    <span 
                      style={{
                        backgroundColor: "#4caf50",
                        color: "white",
                        fontSize: "12px",
                        padding: "2px 6px",
                        borderRadius: "12px",
                        fontWeight: "500",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                      title="Verified Crop"
                    >
                      <CheckCircle2 size={12} />
                      <span>Verified</span>
                    </span>
                  )}
                </h3>
                <div style={{ marginBottom: "12px" }}>
                  <span style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    background: "#e8f5e9",
                    color: "var(--primary-green)",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "600"
                  }}>
                    {crop.status || "Available"}
                  </span>
                </div>
                <div style={{ marginBottom: "16px", color: "var(--text-secondary)", fontSize: "14px" }}>
                  <div style={{ marginBottom: "4px" }}>
                    <strong>Quantity Available:</strong> {crop.quantity || 0} Quintals
                  </div>
                  {crop.location && (crop.location.address || crop.location.city) && (
                    <div style={{ marginBottom: "6px", display: "flex", alignItems: "flex-start", gap: "5px", fontSize: "13px", color: "#475569" }}>
                      <span style={{ fontSize: "14px" }}>📍</span>
                      <span style={{ lineHeight: "1.3" }}>
                        {crop.location.address ? crop.location.address : `${crop.location.city}, ${crop.location.state}`}
                      </span>
                    </div>
                  )}
                  {crop.harvestDate && (
                    <div>
                      <strong>Harvest Date:</strong> {new Date(crop.harvestDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{
                paddingTop: "16px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-light)", marginBottom: "4px" }}>Price</div>
                  <div style={{ fontSize: "24px", fontWeight: "700", color: "var(--primary-green)" }}>
                    ₹{crop.price || 0}
                  </div>
                </div>
                <button
                  onClick={() => addToCart({ ...crop, type: "crop" })}
                  className="btn btn-primary"
                  disabled={crop.quantity === undefined || crop.quantity === null || crop.quantity <= 0}
                  style={{ 
                    padding: "10px 20px", 
                    fontSize: "14px",
                    opacity: (crop.quantity === undefined || crop.quantity === null || crop.quantity <= 0) ? 0.6 : 1,
                    cursor: (crop.quantity === undefined || crop.quantity === null || crop.quantity <= 0) ? "not-allowed" : "pointer"
                  }}
                >
                  {(crop.quantity === undefined || crop.quantity === null || crop.quantity <= 0) ? "Out of Stock" : "Add to Cart"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
