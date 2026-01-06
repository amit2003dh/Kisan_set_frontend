import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API, { apiCall } from "../api/api";

export default function ManageProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setError("");
    
    const { data, error: err } = await apiCall(() =>
      API.get("/products/my-products")
    );
    
    if (err) {
      setError(err);
    } else {
      setProducts(data || []);
    }
    
    setLoading(false);
  };

  const handleEditProduct = (product) => {
    setEditingProduct({
      ...product,
      stock: product.stock.toString(),
      price: product.price.toString()
    });
    setShowEditModal(true);
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    
    const updateData = {
      name: editingProduct.name,
      stock: parseFloat(editingProduct.stock),
      price: parseFloat(editingProduct.price),
      description: editingProduct.description,
      brand: editingProduct.brand,
      type: editingProduct.type,
      crop: editingProduct.crop,
      specifications: editingProduct.specifications,
      minimumOrder: parseInt(editingProduct.minimumOrder) || 1,
      deliveryOptions: editingProduct.deliveryOptions,
      contactInfo: editingProduct.contactInfo,
      location: editingProduct.location
    };

    const { data, error: err } = await apiCall(() =>
      API.put(`/products/${editingProduct._id}`, updateData)
    );
    
    if (err) {
      setError(err);
    } else {
      setShowEditModal(false);
      setEditingProduct(null);
      fetchProducts(); // Refresh the list
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Are you sure you want to delete this product?")) {
      return;
    }

    const { data, error: err } = await apiCall(() =>
      API.delete(`/products/${productId}`)
    );
    
    if (err) {
      setError(err);
    } else {
      fetchProducts(); // Refresh the list
    }
  };

  const handleStatusChange = async (productId, verified) => {
    const { data, error: err } = await apiCall(() =>
      API.put(`/products/${productId}/status`, { verified })
    );
    
    if (err) {
      setError(err);
    } else {
      fetchProducts(); // Refresh the list
    }
  };

  const filteredProducts = products.filter(product => {
    if (activeTab === "all") return true;
    if (activeTab === "available") return product.stock > 0;
    if (activeTab === "out_of_stock") return product.stock === 0;
    if (activeTab === "verified") return product.verified;
    return true;
  });

  const getStatusColor = (stock, verified) => {
    if (stock === 0) return "#f44336"; // Red for out of stock
    if (verified) return "#4caf50"; // Green for verified
    return "#ff9800"; // Orange for not verified
  };

  const getStatusText = (stock, verified) => {
    if (stock === 0) return "Out of Stock";
    return verified ? "Verified" : "Not Verified";
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <div className="loading-spinner"></div>
        <p style={{ textAlign: "center", color: "var(--text-secondary)" }}>Loading your products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
      <div className="page-header">
        <h1>🛒 Manage Your Products</h1>
        <p>Track, update, and manage your product listings</p>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: "flex", 
        gap: "8px", 
        marginBottom: "32px",
        borderBottom: "1px solid var(--border-color)",
        paddingBottom: "16px"
      }}>
        {[
          { id: "all", label: "All Products", count: products.length },
          { id: "available", label: "Available", count: products.filter(p => p.stock > 0).length },
          { id: "out_of_stock", label: "Out of Stock", count: products.filter(p => p.stock === 0).length },
          { id: "verified", label: "Verified", count: products.filter(p => p.verified).length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`btn ${activeTab === tab.id ? "btn-primary" : "btn-outline"}`}
            style={{ 
              borderRadius: "var(--border-radius-sm)",
              fontSize: "14px",
              position: "relative"
            }}
          >
            {tab.label}
            <span style={{
              background: activeTab === tab.id ? "white" : "var(--primary-blue)",
              color: activeTab === tab.id ? "var(--primary-blue)" : "white",
              padding: "2px 6px",
              borderRadius: "10px",
              fontSize: "12px",
              marginLeft: "8px"
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Add New Product Button */}
      <div style={{ marginBottom: "24px" }}>
        <Link to="/add-product" className="btn btn-primary">
          ➕ Add New Product
        </Link>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="card">
          <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px" }}>
            {activeTab === "all" ? "No products found. Add your first product!" : `No products in ${activeTab} category.`}
          </p>
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "20px" }}>
          {filteredProducts.map((product) => (
            <div key={product._id} className="card">
              {/* Product Image */}
              {product.image && (
                <img
                  src={product.image.startsWith("http") ? product.image : `${API_BASE_URL}${product.image}`}
                  alt={product.name}
                  style={{
                    width: "100%",
                    height: "200px",
                    objectFit: "cover",
                    borderRadius: "var(--border-radius-sm) var(--border-radius-sm) 0 0"
                  }}
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/350x200/2196f3/ffffff?text=🛒+Product+Image";
                  }}
                />
              )}
              {!product.image && (
                <div style={{
                  width: "100%",
                  height: "200px",
                  background: "linear-gradient(135deg, #2196f3, #64b5f6)",
                  borderRadius: "var(--border-radius-sm) var(--border-radius-sm) 0 0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "48px"
                }}>
                  🛒
                </div>
              )}

              <div style={{ padding: "20px" }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px 0" }}>{product.name}</h3>
                    <p style={{ margin: 0, fontSize: "14px", color: "var(--text-secondary)" }}>
                      {product.type} • {product.brand}
                    </p>
                  </div>
                  <span style={{
                    background: getStatusColor(product.stock, product.verified),
                    color: "white",
                    padding: "4px 8px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "500"
                  }}>
                    {getStatusText(product.stock, product.verified)}
                  </span>
                </div>

                {/* Details */}
                <div style={{ marginBottom: "16px" }}>
                  <p style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "600" }}>
                    ₹{product.price}
                  </p>
                  <p style={{ margin: "0 0 4px 0", fontSize: "14px" }}>
                    <strong>Stock:</strong> {product.stock} units
                  </p>
                  <p style={{ margin: "0 0 4px 0", fontSize: "14px" }}>
                    <strong>Min Order:</strong> {product.minimumOrder || 1} units
                  </p>
                  {product.crop && (
                    <p style={{ margin: "0 0 4px 0", fontSize: "14px" }}>
                      <strong>Crop Type:</strong> {product.crop}
                    </p>
                  )}
                  {product.location && (
                    <p style={{ margin: "0", fontSize: "12px", color: "var(--text-secondary)" }}>
                      📍 {product.location.city}, {product.location.state}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => handleEditProduct(product)}
                    className="btn btn-outline"
                    style={{ fontSize: "14px", padding: "8px 12px" }}
                  >
                    ✏️ Edit
                  </button>
                  
                  {!product.verified && (
                    <button
                      onClick={() => handleStatusChange(product._id, true)}
                      className="btn btn-secondary"
                      style={{ fontSize: "14px", padding: "8px 12px" }}
                    >
                      ✅ Verify
                    </button>
                  )}
                  
                  {product.verified && (
                    <button
                      onClick={() => handleStatusChange(product._id, false)}
                      className="btn btn-secondary"
                      style={{ fontSize: "14px", padding: "8px 12px" }}
                    >
                      ❌ Unverify
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDeleteProduct(product._id)}
                    className="btn btn-danger"
                    style={{ fontSize: "14px", padding: "8px 12px" }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingProduct && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div style={{
            background: "white",
            borderRadius: "var(--border-radius-md)",
            padding: "24px",
            maxWidth: "500px",
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto"
          }}>
            <h3 style={{ margin: "0 0 20px 0" }}>Edit Product</h3>
            
            <form onSubmit={handleUpdateProduct}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>
                  Product Name
                </label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>
                    Stock (units)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={editingProduct.stock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>
                  Description
                </label>
                <textarea
                  value={editingProduct.description || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>

              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingProduct(null);
                  }}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
