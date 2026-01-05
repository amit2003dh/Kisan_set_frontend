import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/api";
import { apiCall } from "../api/api";
import { useCart } from "../context/CartContext";

export default function CropList() {
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const { addToCart } = useCart();

  useEffect(() => {
    // Get current user from localStorage
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
    
    // If user is a farmer, only show their crops
    // If user is a buyer or no user, show all crops
    let url = "/crops";
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const userData = JSON.parse(user);
        if (userData.role === "farmer" && userData._id) {
          url = `/crops?farmerId=${userData._id}`;
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    const { data, error: err } = await apiCall(() => API.get(url));
    
    if (err) {
      setError(err);
    } else {
      setCrops(data || []);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchCrops();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <h1>🌾 Available Crops</h1>
        <p>Browse and purchase fresh crops directly from farmers</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {crops.length === 0 ? (
        <div className="empty-state card">
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>🌾</div>
          <h3 style={{ marginBottom: "8px", color: "var(--text-primary)" }}>No crops available</h3>
          <p style={{ color: "var(--text-secondary)" }}>Check back later for fresh crops</p>
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
                  height: "180px",
                  background: "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)",
                  borderRadius: "var(--border-radius-sm)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "64px",
                  marginBottom: "16px"
                }}>
                  🌾
                </div>
                <h3 style={{
                  marginBottom: "8px",
                  fontSize: "20px",
                  color: "var(--text-primary)",
                  fontWeight: "600"
                }}>
                  {crop.name || "Crop"}
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
                    <strong>Quantity:</strong> {crop.quantity || 0} kg
                  </div>
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
                {currentUser && crop.farmerId && currentUser._id === crop.farmerId.toString() ? (
                  <span style={{
                    padding: "10px 20px",
                    fontSize: "14px",
                    color: "var(--text-secondary)",
                    fontStyle: "italic"
                  }}>
                    Your Crop
                  </span>
                ) : currentUser && currentUser.role === "buyer" ? (
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
                ) : (
                  <Link
                    to={`/payment?cropId=${crop._id}&amount=${crop.price || 0}`}
                    className="btn btn-primary"
                    style={{ padding: "10px 20px", fontSize: "14px" }}
                  >
                    Buy Now
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
