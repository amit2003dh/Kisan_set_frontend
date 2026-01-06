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
    
    if (err) {
      setError(err);
    } else {
      setProducts(data || []);
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
        <p>
          {currentUser?.role === "seller" 
            ? "Browse products (you cannot buy products as a seller)"
            : currentUser?.role === "farmer"
            ? "Buy seeds, pesticides, and farming products"
            : "Browse and buy quality products"
          }
        </p>
        {currentUser?.role === "seller" && (
          <div style={{
            padding: "12px 16px",
            background: "#fff3e0",
            borderRadius: "8px",
            border: "1px solid #ffcc02",
            marginTop: "16px"
          }}>
            <strong>📢 Seller Notice:</strong> As a seller, you can only add and sell products. 
            To buy products, please use a buyer or farmer account.
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Filter Tabs */}
      <div style={{ 
        display: "flex", 
        gap: "8px", 
        marginBottom: "32px",
        borderBottom: "1px solid var(--border-color)",
        paddingBottom: "16px"
      }}>
        {["all", "seed", "pesticide"].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`btn ${filter === type ? "btn-primary" : "btn-outline"}`}
            style={{ 
              padding: "8px 16px",
              borderRadius: "var(--border-radius-sm)",
              fontSize: "14px",
              textTransform: "capitalize"
            }}
          >
            {type === "all" && "🛒 All Products"}
            {type === "seed" && "🌱 Seeds"}
            {type === "pesticide" && "🧪 Pesticides"}
          </button>
        ))}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="empty-state card">
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>🛒</div>
          <h3 style={{ marginBottom: "8px", color: "var(--text-primary)" }}>
            No {filter === "all" ? "" : filter} products available
          </h3>
          <p style={{ color: "var(--text-secondary)" }}>
            Check back later for new products
          </p>
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "24px" }}>
          {filteredProducts.map((product) => (
            <div key={product._id} className="card">
              <div style={{ height: "200px", overflow: "hidden", borderRadius: "var(--border-radius-sm)" }}>
                {product.image ? (
                  <img
                    src={product.image.startsWith("http") ? product.image : `${process.env.REACT_APP_API_URL || "http://localhost:5000"}${product.image}`}
                    alt={product.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover"
                    }}
                    onError={(e) => {
                      e.target.style.display = "none";
                      const parent = e.target.parentElement;
                      const fallback = document.createElement("div");
                      fallback.style.cssText = "width: 100%; height: 200px; display: flex; align-items: center; justify-content: center; background: var(--background); font-size: 48px; border-radius: var(--border-radius-sm);";
                      fallback.textContent = product.type === "seed" ? "🌱" : "🧪";
                      parent.appendChild(fallback);
                    }}
                  />
                ) : (
                  <div style={{
                    width: "100%",
                    height: "200px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--background)",
                    fontSize: "48px",
                    borderRadius: "var(--border-radius-sm)"
                  }}>
                    {product.type === "seed" ? "🌱" : "🧪"}
                  </div>
                )}
              </div>

              <div style={{ padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <h3 style={{ margin: "0", fontSize: "18px", color: "var(--text-primary)" }}>
                    {product.name}
                  </h3>
                  <span style={{
                    padding: "4px 8px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    background: product.type === "seed" ? "#4caf50" : "#ff9800",
                    color: "white"
                  }}>
                    {product.type === "seed" ? "🌱 Seed" : "🧪 Pesticide"}
                  </span>
                </div>

                {product.verified && (
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "4px",
                    marginBottom: "8px",
                    color: "#4caf50",
                    fontSize: "14px"
                  }}>
                    ✅ Verified Product
                  </div>
                )}

                <p style={{ 
                  margin: "0 0 16px 0", 
                  color: "var(--text-secondary)", 
                  fontSize: "14px",
                  lineHeight: "1.5"
                }}>
                  {product.description?.substring(0, 100)}
                  {product.description?.length > 100 && "..."}
                </p>

                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Stock:</span>
                    <span style={{ 
                      color: product.stock > 0 ? "var(--text-primary)" : "#f44336",
                      fontWeight: "600"
                    }}>
                      {product.stock || 0} units
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Price:</span>
                    <span style={{ 
                      fontSize: "18px", 
                      fontWeight: "bold", 
                      color: "var(--primary-green)" 
                    }}>
                      ₹{product.price?.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  {canBuyProducts() ? (
                    <>
                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={product.stock <= 0}
                        className={`btn ${product.stock > 0 ? "btn-primary" : "btn-secondary"}`}
                        style={{ flex: 1 }}
                      >
                        🛒 {product.stock > 0 ? "Add to Cart" : "Out of Stock"}
                      </button>
                      <Link
                        to={`/products/${product._id}`}
                        className="btn btn-outline"
                        style={{ padding: "10px 16px" }}
                      >
                        👁️ View
                      </Link>
                    </>
                  ) : (
                    <>
                      <button
                        disabled={true}
                        className="btn btn-secondary"
                        style={{ flex: 1, opacity: 0.6 }}
                        title="Sellers cannot buy products"
                      >
                        🚫 Cannot Buy
                      </button>
                      <Link
                        to={`/products/${product._id}`}
                        className="btn btn-outline"
                        style={{ padding: "10px 16px" }}
                      >
                        👁️ View
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cart Summary for eligible users */}
      {canBuyProducts() && (
        <div style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          background: "var(--primary-green)",
          color: "white",
          padding: "16px 20px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          cursor: "pointer",
          zIndex: 1000
        }}>
          <Link to="/cart" style={{ color: "white", textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
            🛒 View Cart
          </Link>
        </div>
      )}
    </div>
  );
}
