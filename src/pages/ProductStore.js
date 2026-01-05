import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/api";
import { apiCall } from "../api/api";
import { useCart } from "../context/CartContext";

export default function ProductStore() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all"); // all, seed, pesticide
  const [currentUser, setCurrentUser] = useState(null);
  const { addToCart } = useCart();

  useEffect(() => {
    // Get current user from localStorage
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const userData = JSON.parse(user);
        setCurrentUser(userData);
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setError("");
    
    // If user is a seller, only show their products
    // If user is a buyer or no user, show all verified products
    let url = "/products";
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const userData = JSON.parse(user);
        if (userData.role === "seller" && userData._id) {
          url = `/products?sellerId=${userData._id}`;
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    const { data, error: err } = await apiCall(() => API.get(url));
    
    if (err) {
      setError(err);
    } else {
      setProducts(data || []);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?._id]);

  const filteredProducts = filter === "all" 
    ? products 
    : products.filter(p => p.type === filter);

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
                    background: color === "#4caf50" 
                      ? "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)"
                      : "linear-gradient(135deg, #ff9800 0%, #f57c00 100%)",
                    borderRadius: "var(--border-radius-sm)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "64px",
                    marginBottom: "16px"
                  }}>
                    {getProductIcon(product.type)}
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
                    </div>
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
                    <Link
                      to={`/payment?productId=${product._id}&amount=${product.price || 0}&type=product`}
                      className="btn btn-primary"
                      style={{ padding: "10px 20px", fontSize: "14px" }}
                    >
                      Buy Now
                    </Link>
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
