import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import API, { apiCall } from "../api/api";
import { useCart } from "../context/CartContext";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const { addToCart } = useCart();
  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    setError("");
    
    const { data, error: err } = await apiCall(() => API.get(`/products/${id}`));
    
    if (err) {
      setError(err);
    } else {
      setProduct(data);
    }
    setLoading(false);
  };

  const handleAddToCart = () => {
    if (product) {
      addToCart({
        ...product,
        quantity: quantity,
        type: 'product'
      });
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: "40px 20px", textAlign: "center" }}>
        <div className="loading-spinner"></div>
        <p style={{ marginTop: "20px", color: "var(--text-secondary)" }}>
          Loading product details...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ padding: "40px 20px", textAlign: "center" }}>
        <div style={{ 
          padding: "20px", 
          background: "#f8d7da", 
          color: "#721c24", 
          borderRadius: "8px",
          marginBottom: "20px"
        }}>
          <h3>Error</h3>
          <p>{error}</p>
        </div>
        <Link 
          to="/products"
          style={{
            display: "inline-block",
            padding: "12px 24px",
            background: "var(--primary-blue)",
            color: "white",
            textDecoration: "none",
            borderRadius: "4px"
          }}
        >
          Back to Products
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container" style={{ padding: "40px 20px", textAlign: "center" }}>
        <p>Product not found</p>
        <Link 
          to="/products"
          style={{
            display: "inline-block",
            padding: "12px 24px",
            background: "var(--primary-blue)",
            color: "white",
            textDecoration: "none",
            borderRadius: "4px",
            marginTop: "20px"
          }}
        >
          Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ 
      padding: isMobile ? "20px 16px" : "40px 20px", 
      maxWidth: "1200px", 
      margin: "0 auto" 
    }}>
      {/* Breadcrumb */}
      <nav style={{ marginBottom: isMobile ? "20px" : "30px" }}>
        <Link 
          to="/products" 
          style={{ 
            color: "var(--primary-blue)", 
            textDecoration: "none",
            fontSize: isMobile ? "13px" : "14px"
          }}
        >
          ← Back to Products
        </Link>
      </nav>

      <div style={{ 
        display: isMobile ? "block" : "grid", 
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", 
        gap: isMobile ? "24px" : "40px",
        alignItems: "start"
      }}>
        {/* Product Image */}
        <div>
          {product.image ? (
            <img
              src={
                product.image.startsWith("http") 
                  ? product.image 
                  : `${API_BASE_URL}${product.image}`
              }
              alt={product.name}
              style={{
                width: "100%",
                height: isMobile ? "250px" : "400px",
                objectFit: "cover",
                borderRadius: "var(--border-radius-md)",
                border: "1px solid var(--border-color)"
              }}
              onError={(e) => {
                e.target.src = "https://via.placeholder.com/400x400/4caf50/ffffff?text=🧪+Product";
              }}
            />
          ) : (
            <div style={{
              width: "100%",
              height: isMobile ? "250px" : "400px",
              background: "linear-gradient(135deg, #4caf50, #81c784)",
              borderRadius: "var(--border-radius-md)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: isMobile ? "48px" : "64px"
            }}>
              🧪
            </div>
          )}
        </div>

        {/* Product Details */}
        <div>
          <h1 style={{ 
            fontSize: isMobile ? "24px" : "32px", 
            margin: isMobile ? "0 0 12px 0" : "0 0 16px 0",
            color: "var(--text-primary)",
            lineHeight: isMobile ? "1.3" : "1.2"
          }}>
            {product.name}
          </h1>

          <div style={{ 
            fontSize: isMobile ? "20px" : "24px", 
            fontWeight: "600", 
            color: "var(--primary-green)",
            marginBottom: isMobile ? "12px" : "16px"
          }}>
            ₹{product.price}
          </div>

          {product.category && (
            <div style={{ 
              background: "var(--primary-blue)20",
              color: "var(--primary-blue)",
              padding: "4px 12px",
              borderRadius: "16px",
              fontSize: isMobile ? "12px" : "14px",
              fontWeight: "500",
              display: "inline-block",
              marginBottom: isMobile ? "16px" : "20px"
            }}>
              {product.category}
            </div>
          )}

          {product.description && (
            <div style={{ marginBottom: isMobile ? "20px" : "24px" }}>
              <h3 style={{ fontSize: isMobile ? "16px" : "18px", marginBottom: "8px" }}>Description</h3>
              <p style={{ 
                color: "var(--text-secondary)",
                lineHeight: "1.6",
                margin: 0,
                fontSize: isMobile ? "14px" : "15px"
              }}>
                {product.description}
              </p>
            </div>
          )}

          {product.features && product.features.length > 0 && (
            <div style={{ marginBottom: isMobile ? "20px" : "24px" }}>
              <h3 style={{ fontSize: isMobile ? "16px" : "18px", marginBottom: "8px" }}>Features</h3>
              <ul style={{ 
                color: "var(--text-secondary)",
                lineHeight: "1.6",
                paddingLeft: "20px",
                fontSize: isMobile ? "14px" : "15px",
                margin: 0
              }}>
                {product.features.map((feature, index) => (
                  <li key={index} style={{ marginBottom: "4px" }}>{feature}</li>
                ))}
              </ul>
            </div>
          )}

          {product.usage && (
            <div style={{ marginBottom: isMobile ? "20px" : "24px" }}>
              <h3 style={{ fontSize: isMobile ? "16px" : "18px", marginBottom: "8px" }}>Usage Instructions</h3>
              <p style={{ 
                color: "var(--text-secondary)",
                lineHeight: "1.6",
                margin: 0,
                fontSize: isMobile ? "14px" : "15px"
              }}>
                {product.usage}
              </p>
            </div>
          )}

          {product.stock !== undefined && (
            <div style={{ 
              background: product.stock > 0 ? "#d4edda" : "#f8d7da",
              color: product.stock > 0 ? "#155724" : "#721c24",
              padding: isMobile ? "10px 12px" : "12px 16px",
              borderRadius: "var(--border-radius-sm)",
              marginBottom: isMobile ? "20px" : "24px",
              fontSize: isMobile ? "13px" : "14px"
            }}>
              {product.stock > 0 ? `✅ In Stock (${product.stock} available)` : "❌ Out of Stock"}
            </div>
          )}

          {/* Quantity Selector and Add to Cart */}
          {product.stock > 0 && (
            <div style={{ 
              display: "flex", 
              gap: isMobile ? "12px" : "16px", 
              alignItems: "center",
              marginBottom: isMobile ? "20px" : "24px",
              flexDirection: isMobile ? "column" : "row"
            }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: isMobile ? "8px" : "12px",
                width: isMobile ? "100%" : "auto"
              }}>
                <label style={{ 
                  fontWeight: "600",
                  fontSize: isMobile ? "14px" : "15px"
                }}>Quantity:</label>
                <input
                  type="number"
                  min="1"
                  max={product.stock}
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (val >= 1 && val <= product.stock) {
                      setQuantity(val);
                    }
                  }}
                  style={{
                    width: isMobile ? "80px" : "80px",
                    padding: isMobile ? "8px 10px" : "8px 12px",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--border-radius-sm)",
                    fontSize: isMobile ? "16px" : "16px"
                  }}
                />
              </div>
              
              <button
                onClick={handleAddToCart}
                className="btn btn-primary"
                style={{
                  padding: isMobile ? "12px 20px" : "12px 24px",
                  fontSize: isMobile ? "15px" : "16px",
                  fontWeight: "600",
                  width: isMobile ? "100%" : "auto"
                }}
              >
                🛒 Add to Cart
              </button>
            </div>
          )}

          {/* Seller Info */}
          {product.seller && (
            <div style={{
              padding: isMobile ? "12px" : "16px",
              background: "#f8f9fa",
              borderRadius: "var(--border-radius-sm)",
              border: "1px solid var(--border-color)"
            }}>
              <h4 style={{ 
                margin: "0 0 6px 0", 
                fontSize: isMobile ? "15px" : "16px" 
              }}>Sold by</h4>
              <p style={{ 
                margin: 0, 
                color: "var(--text-secondary)",
                fontSize: isMobile ? "14px" : "15px"
              }}>
                {product.seller.name || product.seller}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
