import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API, { apiCall } from "../api/api";
import { useCart } from "../context/CartContext";

export default function ProductStore() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [currentUser, setCurrentUser] = useState(null);
  const { addToCart } = useCart();
  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  useEffect(() => {
    fetchProducts();
    const user = localStorage.getItem("user");
    if (user) {
      try {
        setCurrentUser(JSON.parse(user));
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setError("");
    
    const { data, error: err } = await apiCall(() => API.get("/products"));
    console.log("Fetched products:", data);
    if (err) {
      setError(err);
    } else {
      const productsData = data || [];
      console.log("Fetched products:", productsData);
      // Log image paths for debugging
      productsData.forEach(product => {
        if (product.image) {
          const imageUrl = product.image.startsWith("http") ? product.image : `${API_BASE_URL}${product.image}`;
          console.log(`Product "${product.name}" image path:`, product.image, "Full URL:", imageUrl);
        } else {
          console.log(`Product "${product.name}" has no image`);
        }
      });
      setProducts(productsData);
    }
    
    setLoading(false);
  };

  const canBuyProducts = () => {
    if (!currentUser) return false;
    // Farmers, Buyers can buy products. Sellers cannot.
    return currentUser.role === "farmer" || currentUser.role === "buyer";
  };

  const filteredProducts = filter === "all" 
    ? products 
    : products.filter(p => p.type === filter);

  const handleAddToCart = (product) => {
    if (!canBuyProducts()) {
      alert("Sellers cannot buy products. You can only add and sell your own products.");
      return;
    }
    addToCart(product);
  };

  const getProductIcon = (type) => {
    return type === "seed" ? "🌱" : "🧪";
  };

  const getProductColor = (type) => {
    return type === "seed" ? "#4caf50" : "#ff9800";
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <div className="loading-spinner"></div>
        <p style={{ textAlign: "center", color: "var(--text-secondary)" }}>Loading products...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
      <div className="page-header">
        <h1>🛒 Product Store</h1>
        <p>Browse seeds and pesticides for your crops</p>
      </div>

      {error && <div className="error-message">{error}</div>}

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
          All Products
        </button>
        <button
          onClick={() => setFilter("seed")}
          className={`btn ${filter === "seed" ? "btn-primary" : "btn-secondary"}`}
          style={{ fontSize: "14px", padding: "10px 20px" }}
        >
          🌱 Seeds
        </button>
        <button
          onClick={() => setFilter("pesticide")}
          className={`btn ${filter === "pesticide" ? "btn-primary" : "btn-secondary"}`}
          style={{ fontSize: "14px", padding: "10px 20px" }}
        >
          🧪 Pesticides
        </button>
      </div>
{console.log("Filtered products:", filteredProducts)}
      {filteredProducts.length === 0 ? (
        <div className="empty-state card">
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>🛒</div>
          <h3 style={{ marginBottom: "8px", color: "var(--text-primary)" }}>No products available</h3>
          <p style={{ color: "var(--text-secondary)" }}>Check back later for new products</p>
        </div>
      ) : (
        <div className="grid grid-3">
          {filteredProducts.map((product) => {
            const color = getProductColor(product.type);
            return (
              <div key={product._id} className="card" style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: "320px"
              }}>
                <div>
                  <div style={{
                    width: "100%",
                    height: "180px",
                    borderRadius: "var(--border-radius-sm)",
                    marginBottom: "16px",
                    overflow: "hidden",
                    background: "var(--background)",
                    border: "1px solid var(--border)",
                    position: "relative"
                  }}>
                    {product.image && product.image.trim() ? (
                      <img 
                        src={product.image.startsWith("http") ? product.image : `${API_BASE_URL}${product.image}`} 
                        alt={product.name || "Product"} 
                        style={{ 
                          width: "100%", 
                          height: "100%", 
                          objectFit: "cover",
                          display: "block"
                        }}
                        onError={(e) => {
                          console.error("Failed to load product image:", product.image, "Full URL:", `${API_BASE_URL}${product.image}`);
                          // Hide the broken image and show fallback
                          e.target.style.display = "none";
                          const parent = e.target.parentElement;
                          if (parent && !parent.querySelector(".product-fallback")) {
                            const fallback = document.createElement("div");
                            fallback.className = "product-fallback";
                            const icon = product.type === "seed" ? "🌱" : "🧪";
                            const bgColor = product.type === "seed" 
                              ? "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)"
                              : "linear-gradient(135deg, #ff9800 0%, #f57c00 100%)";
                            fallback.style.cssText = `width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: ${bgColor}; font-size: 64px; position: absolute; top: 0; left: 0;`;
                            fallback.textContent = icon;
                            parent.appendChild(fallback);
                          }
                        }}
                        onLoad={() => {
                          console.log("Product image loaded successfully:", product.image);
                        }}
                      />
                    ) : (
                      <div style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: color === "#4caf50" 
                          ? "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)"
                          : "linear-gradient(135deg, #ff9800 0%, #f57c00 100%)",
                        fontSize: "64px"
                      }}>
                        {getProductIcon(product.type)}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
                    <span style={{
                      display: "inline-block",
                      padding: "4px 12px",
                      background: color === "#4caf50" ? "#e8f5e9" : "#fff3e0",
                      color: color,
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "600"
                    }}>
                      {product.type === "seed" ? "Seed" : "Pesticide"}
                    </span>
                    {product.verified && (
                      <span style={{
                        display: "inline-block",
                        padding: "4px 12px",
                        background: "#e8f5e9",
                        color: "var(--primary-green)",
                        borderRadius: "20px",
                        fontSize: "11px",
                        fontWeight: "700",
                        marginLeft: "8px"
                      }}>
                        ✓ Verified
                      </span>
                    )}
                  </div>

                  <h3 style={{
                    marginBottom: "8px",
                    fontSize: "20px",
                    color: "var(--text-primary)",
                    fontWeight: "600"
                  }}>
                    {product.name}
                  </h3>

                  {product.crop && (
                    <p style={{
                      color: "var(--text-secondary)",
                      fontSize: "14px",
                      marginBottom: "12px"
                    }}>
                      For: <strong>{product.crop}</strong>
                    </p>
                  )}

                  <div style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                    <div>
                      <strong>Stock:</strong> {product.stock || 0} units
                      {product.initialStock && (
                        <span style={{ fontSize: "12px", color: "#666", marginLeft: "8px" }}>
                          (Initial: {product.initialStock})
                        </span>
                      )}
                    </div>
                    {product.salesStats && (
                      <div style={{ marginTop: "8px" }}>
                        <div style={{ fontSize: "12px", color: "#666" }}>
                          <strong>Total Sold:</strong> {product.salesStats.totalSold || 0} units
                        </div>
                        <div style={{ fontSize: "12px", color: "#666" }}>
                          <strong>Revenue:</strong> ₹{(product.salesStats.totalRevenue || 0).toLocaleString('en-IN')}
                        </div>
                        {product.salesStats.averageRating && (
                          <div style={{ fontSize: "12px", color: "#666" }}>
                            <strong>Rating:</strong> ⭐ {product.salesStats.averageRating.toFixed(1)} ({product.salesStats.reviewCount || 0} reviews)
                          </div>
                        )}
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
                    <div style={{ fontSize: "24px", fontWeight: "700", color: color }}>
                      ₹{product.price || 0}
                    </div>
                  </div>
                  {currentUser && product.sellerId && currentUser._id === product.sellerId.toString() ? (
                    <span style={{
                      padding: "10px 20px",
                      fontSize: "14px",
                      color: "var(--text-secondary)",
                      fontStyle: "italic"
                    }}>
                      Your Product
                    </span>
                  ) : currentUser && currentUser.role === "buyer" ? (
                    <button
                      onClick={() => addToCart({ ...product, type: product.type })}
                      className="btn btn-primary"
                      disabled={product.stock !== undefined && product.stock !== null && product.stock <= 0}
                      style={{ 
                        padding: "10px 20px", 
                        fontSize: "14px",
                        opacity: (product.stock !== undefined && product.stock !== null && product.stock <= 0) ? 0.6 : 1,
                        cursor: (product.stock !== undefined && product.stock !== null && product.stock <= 0) ? "not-allowed" : "pointer"
                      }}
                    >
                      {(product.stock !== undefined && product.stock !== null && product.stock <= 0) ? "Out of Stock" : "Add to Cart"}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        addToCart({ ...product, type: product.type });
                        // Optionally show a success message or navigate to cart
                        // You can uncomment the line below if you want to navigate to cart after adding
                        // navigate("/cart");
                      }}
                      className="btn btn-primary"
                      disabled={product.stock !== undefined && product.stock !== null && product.stock <= 0}
                      style={{ 
                        padding: "10px 20px", 
                        fontSize: "14px",
                        opacity: (product.stock !== undefined && product.stock !== null && product.stock <= 0) ? 0.6 : 1,
                        cursor: (product.stock !== undefined && product.stock !== null && product.stock <= 0) ? "not-allowed" : "pointer"
                      }}
                    >
                      {(product.stock !== undefined && product.stock !== null && product.stock <= 0) ? "Out of Stock" : "Add to Cart"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
