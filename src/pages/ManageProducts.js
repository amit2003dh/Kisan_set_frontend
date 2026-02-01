import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API, { apiCall } from "../api/api";

export default function ManageProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [editingProduct, setEditingProduct] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [currentUser, setCurrentUser] = useState(null);
  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const STATIC_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  
  // Mobile detection states
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(true);

  // Mobile detection and responsive handling
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

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
    console.log("🔍 Opening edit modal for product:", product);
    console.log("🔍 Product primaryImageIndex:", product.primaryImageIndex);
    const editingProductState = {
      ...product,
      stock: product.stock.toString(),
      price: product.price.toString(),
      primaryImageIndex: product.primaryImageIndex || 0
    };
    console.log("🔍 Setting editingProduct state:", editingProductState);
    setEditingProduct(editingProductState);
    setShowEditModal(true);
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setError("");
    setFieldErrors({});
    
    try {
      let response;
      
      if (editingProduct.newImageFile) {
        // If there's a new image, use FormData
        const formData = new FormData();
        
        // Add all product fields
        formData.append('name', editingProduct.name);
        formData.append('type', editingProduct.type);
        formData.append('price', parseFloat(editingProduct.price));
        formData.append('stock', parseFloat(editingProduct.stock));
        formData.append('description', editingProduct.description || '');
        formData.append('usageInstructions', editingProduct.usageInstructions || '');
        formData.append('suitableCrops', JSON.stringify(editingProduct.suitableCrops || []));
        formData.append('composition', editingProduct.composition || '');
        formData.append('expiryDate', editingProduct.expiryDate || '');
        formData.append('batchNumber', editingProduct.batchNumber || '');
        formData.append('category', editingProduct.category || '');
        formData.append('brand', editingProduct.brand || '');
        formData.append('minimumOrder', parseInt(editingProduct.minimumOrder) || 1);
        formData.append('contactInfo', JSON.stringify(editingProduct.contactInfo || {}));
        formData.append('location', JSON.stringify(editingProduct.location || {}));
        
        // Add images array and primary image index
        formData.append('images', JSON.stringify(editingProduct.images || []));
        formData.append('primaryImageIndex', editingProduct.primaryImageIndex || 0);
        
        // Add the new image
        formData.append('image', editingProduct.newImageFile);
        
        response = await API.put(`/products/${editingProduct._id}/with-image`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // If no new image, use regular JSON
        const updateData = {
          name: editingProduct.name,
          type: editingProduct.type,
          price: parseFloat(editingProduct.price),
          stock: parseFloat(editingProduct.stock),
          description: editingProduct.description,
          usageInstructions: editingProduct.usageInstructions,
          suitableCrops: editingProduct.suitableCrops,
          composition: editingProduct.composition,
          expiryDate: editingProduct.expiryDate,
          batchNumber: editingProduct.batchNumber,
          category: editingProduct.category,
          brand: editingProduct.brand,
          minimumOrder: parseInt(editingProduct.minimumOrder) || 1,
          contactInfo: editingProduct.contactInfo,
          location: editingProduct.location,
          images: editingProduct.images,
          primaryImageIndex: editingProduct.primaryImageIndex || 0
        };

        console.log("🔍 Frontend sending JSON update data:", updateData);
        console.log("🔍 Images being sent:", updateData.images);
        console.log("🔍 PrimaryImageIndex being sent:", updateData.primaryImageIndex);

        const { data, error: err } = await apiCall(() =>
          API.put(`/products/${editingProduct._id}`, updateData)
        );
        
        if (err) {
          // Handle field-specific errors
          if (err.includes('name')) {
            setFieldErrors({ name: err });
          } else if (err.includes('price')) {
            setFieldErrors({ price: err });
          } else if (err.includes('stock')) {
            setFieldErrors({ stock: err });
          } else {
            setError(err);
          }
          return;
        }
        
        response = { data };
      }
      
      // Success
      setShowEditModal(false);
      setEditingProduct(null);
      fetchProducts(); // Refresh the list
    } catch (error) {
      console.error("Update error:", error);
      const errorMessage = error.response?.data?.error || "Failed to update product";
      
      // Handle field-specific errors from backend
      if (errorMessage.includes('name')) {
        setFieldErrors({ name: errorMessage });
      } else if (errorMessage.includes('price')) {
        setFieldErrors({ price: errorMessage });
      } else if (errorMessage.includes('stock')) {
        setFieldErrors({ stock: errorMessage });
      } else if (errorMessage.includes('image')) {
        setFieldErrors({ image: errorMessage });
      } else {
        setError(errorMessage);
      }
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

  const handleStatusChange = async (productId, type, value) => {
    let endpoint, payload;
    
    if (type === 'verification') {
      endpoint = `/products/${productId}/status`;
      payload = { verified: value };
    } else if (type === 'availability') {
      endpoint = `/products/${productId}/status`;
      payload = { status: value };
    } else {
      // Legacy support for old format
      endpoint = `/products/${productId}/status`;
      payload = { verified: value };
    }
    
    const { data, error: err } = await apiCall(() =>
      API.put(endpoint, payload)
    );
    
    if (err) {
      setError(err);
    } else {
      fetchProducts(); // Refresh the list
    }
  };

  const filteredProducts = products.filter(product => {
    if (activeTab === "all") return true;
    if (activeTab === "available") return product.stock > 0 && product.status === "Available";
    if (activeTab === "out_of_stock") return product.stock === 0;
    if (activeTab === "verified") return product.verified;
    if (activeTab === "reserved") return product.status === "Reserved";
    return true;
  });

  const getStatusColor = (stock, verified, status) => {
    if (stock === 0) return "#f44336"; // Red for out of stock
    if (status === "Reserved") return "#ff9800"; // Orange for reserved
    if (verified) return "#4caf50"; // Green for verified
    return "#2196f3"; // Blue for available but not verified
  };

  const getStatusText = (stock, verified, status) => {
    if (stock === 0) return "Out of Stock";
    if (status === "Reserved") return "Reserved";
    return verified ? "Verified" : "Available";
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
    <div className="container" style={{ 
      paddingTop: isMobile ? "20px" : "40px", 
      paddingBottom: isMobile ? "20px" : "40px",
      paddingLeft: isMobile ? "16px" : "20px",
      paddingRight: isMobile ? "16px" : "20px",
      minHeight: "100vh",
      background: isMobile 
        ? "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)"
        : "var(--background)"
    }}>
      <div className="page-header">
        <h1 style={{ 
          fontSize: isMobile ? "24px" : "32px",
          marginBottom: isMobile ? "8px" : "0"
        }}>🛒 Manage Your Products</h1>
        <p style={{ 
          fontSize: isMobile ? "14px" : "16px",
          color: "var(--text-secondary)",
          margin: 0
        }}>Track, update, and manage your product listings</p>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: "flex", 
        gap: isMobile ? "4px" : "8px", 
        marginBottom: isMobile ? "24px" : "32px",
        borderBottom: "1px solid var(--border-color)",
        paddingBottom: "16px",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch"
      }}>
        {[
          { id: "all", label: "All", icon: "📦" },
          { id: "available", label: "Available", icon: "✅" },
          { id: "reserved", label: "Reserved", icon: "⏸️" },
          { id: "out_of_stock", label: "Out of Stock", icon: "❌" },
          { id: "verified", label: "Verified", icon: "✨" }
        ].map((tab) => {
          const count = tab.id === "all" ? products.length :
                      tab.id === "available" ? products.filter(p => p.stock > 0 && p.status === "Available").length :
                      tab.id === "reserved" ? products.filter(p => p.status === "Reserved").length :
                      tab.id === "out_of_stock" ? products.filter(p => p.stock === 0).length :
                      products.filter(p => p.verified).length;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`btn ${activeTab === tab.id ? "btn-primary" : "btn-outline"}`}
              style={{ 
                borderRadius: "var(--border-radius-sm)",
                fontSize: isMobile ? "12px" : "14px",
                position: "relative",
                padding: isMobile ? "8px 12px" : "8px 16px",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: isMobile ? "4px" : "8px",
                transition: "all 0.3s ease",
                transform: "translateY(0)",
                boxShadow: isMobile ? "0 2px 4px rgba(0,0,0,0.1)" : "none"
              }}
            >
              <span>{isMobile ? tab.icon : tab.label}</span>
              {!isMobile && (
                <span style={{
                  background: activeTab === tab.id ? "white" : "var(--primary-blue)",
                  color: activeTab === tab.id ? "var(--primary-blue)" : "white",
                  padding: "2px 6px",
                  borderRadius: "10px",
                  fontSize: "12px",
                  marginLeft: "8px"
                }}>
                  {count}
                </span>
              )}
              {isMobile && count > 0 && (
                <span style={{
                  background: "var(--error)",
                  color: "white",
                  padding: "2px 6px",
                  borderRadius: "10px",
                  fontSize: "10px",
                  minWidth: "16px",
                  height: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Add New Product Button */}
      <div style={{ marginBottom: isMobile ? "20px" : "24px" }}>
        <Link 
          to="/add-product" 
          className="btn btn-primary"
          style={{ 
            fontSize: isMobile ? "14px" : "16px",
            padding: isMobile ? "14px 20px" : "12px 24px",
            width: isMobile ? "100%" : "auto",
            display: isMobile ? "block" : "inline-block",
            textAlign: "center",
            minHeight: isMobile ? "48px" : "auto",
            boxShadow: isMobile ? "0 4px 12px rgba(33, 150, 243, 0.3)" : "none",
            transition: "all 0.3s ease"
          }}
        >
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
        <div className="grid" style={{ 
          gridTemplateColumns: isMobile 
            ? (isPortrait ? "1fr" : "repeat(2, 1fr)")
            : "repeat(auto-fill, minmax(350px, 1fr))", 
          gap: isMobile ? "16px" : "20px" 
        }}>
          {filteredProducts.map((product) => (
            <div key={product._id} className="card" style={{
              transition: "all 0.3s ease",
              transform: "translateY(0)",
              boxShadow: isMobile 
                ? "0 2px 8px rgba(0,0,0,0.1)" 
                : "0 4px 6px rgba(0,0,0,0.1)",
              ":hover": {
                transform: isMobile ? "translateY(-2px)" : "translateY(-4px)",
                boxShadow: isMobile 
                  ? "0 4px 12px rgba(0,0,0,0.15)" 
                  : "0 8px 15px rgba(0,0,0,0.2)"
              }
            }}>
              {/* Product Image */}
              {product.images && product.images.length > 0 && (
                <img
                  src={
                    product.images[product.primaryImageIndex || 0].startsWith("http") 
                      ? product.images[product.primaryImageIndex || 0] 
                      : `${STATIC_BASE_URL}${product.images[product.primaryImageIndex || 0]}`
                  }
                  alt={product.name}
                  style={{
                    width: "100%",
                    height: isMobile ? "160px" : "200px",
                    objectFit: "cover",
                    borderRadius: "var(--border-radius-sm) var(--border-radius-sm) 0 0"
                  }}
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/350x200/2196f3/ffffff?text=🛒+Product+Image";
                  }}
                />
              )}
              {!product.images || product.images.length === 0 && (
                <div style={{
                  width: "100%",
                  height: isMobile ? "160px" : "200px",
                  background: "linear-gradient(135deg, #2196f3, #64b5f6)",
                  borderRadius: "var(--border-radius-sm) var(--border-radius-sm) 0 0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: isMobile ? "36px" : "48px"
                }}>
                  🛒
                </div>
              )}

              <div style={{ padding: isMobile ? "16px" : "20px" }}>
                {/* Header */}
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: isMobile ? "flex-start" : "start", 
                  marginBottom: "12px",
                  flexDirection: isMobile ? "column" : "row",
                  gap: isMobile ? "8px" : "0"
                }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 
                      margin: "0 0 4px 0", 
                      fontSize: isMobile ? "16px" : "18px",
                      lineHeight: isMobile ? "1.2" : "1.4"
                    }}>{product.name}</h3>
                    <p style={{ 
                      margin: 0, 
                      fontSize: isMobile ? "12px" : "14px", 
                      color: "var(--text-secondary)" 
                    }}>
                      {product.type} • {product.brand}
                    </p>
                  </div>
                  <span style={{
                    background: getStatusColor(product.stock, product.verified, product.status),
                    color: "white",
                    padding: isMobile ? "6px 10px" : "4px 8px",
                    borderRadius: "12px",
                    fontSize: isMobile ? "11px" : "12px",
                    fontWeight: "500",
                    whiteSpace: "nowrap"
                  }}>
                    {getStatusText(product.stock, product.verified, product.status)}
                  </span>
                </div>

                {/* Details */}
                <div style={{ marginBottom: isMobile ? "12px" : "16px" }}>
                  <p style={{ 
                    margin: "0 0 8px 0", 
                    fontSize: isMobile ? "18px" : "16px", 
                    fontWeight: "600",
                    color: "var(--primary-green)"
                  }}>
                    ₹{product.price}
                  </p>
                  <p style={{ 
                    margin: "0 0 4px 0", 
                    fontSize: isMobile ? "13px" : "14px" 
                  }}>
                    <strong>Stock:</strong> {product.stock} units
                  </p>
                  <p style={{ 
                    margin: "0 0 4px 0", 
                    fontSize: isMobile ? "13px" : "14px" 
                  }}>
                    <strong>Min Order:</strong> {product.minimumOrder || 1} units
                  </p>
                  {product.crop && (
                    <p style={{ 
                      margin: "0 0 4px 0", 
                      fontSize: isMobile ? "13px" : "14px" 
                    }}>
                      <strong>Crop Type:</strong> {product.crop}
                    </p>
                  )}
                  {product.location && (
                    <p style={{ 
                      margin: "0", 
                      fontSize: isMobile ? "11px" : "12px", 
                      color: "var(--text-secondary)",
                      lineHeight: "1.3"
                    }}>
                      📍 {product.location.city}, {product.location.state}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ 
                  display: "flex", 
                  gap: isMobile ? "6px" : "8px", 
                  flexWrap: isMobile ? "wrap" : "nowrap",
                  flexDirection: isMobile ? "column" : "row"
                }}>
                  <button
                    onClick={() => handleEditProduct(product)}
                    className="btn btn-outline"
                    style={{ 
                      fontSize: isMobile ? "13px" : "14px", 
                      padding: isMobile ? "10px 16px" : "8px 12px",
                      minHeight: isMobile ? "40px" : "auto",
                      flex: isMobile ? "1" : "auto"
                    }}
                  >
                    ✏️ Edit
                  </button>
                   
                  {/* Verification buttons - only for admins */}
                  {currentUser && currentUser.role === "admin" && (
                    <>
                      {!product.verified && (
                        <button
                          onClick={() => handleStatusChange(product._id, 'verification', true)}
                          className="btn btn-secondary"
                          style={{ fontSize: "14px", padding: "8px 12px" }}
                        >
                          ✅ Verify
                        </button>
                      )}
                      
                      {product.verified && (
                        <button
                          onClick={() => handleStatusChange(product._id, 'verification', false)}
                          className="btn btn-secondary"
                          style={{ fontSize: "14px", padding: "8px 12px" }}
                        >
                          ❌ Unverify
                        </button>
                      )}
                    </>
                  )}
                  
                  {/* Reserve/Available buttons */}
                  {product.stock > 0 && product.status === "Available" && (
                    <button
                      onClick={() => handleStatusChange(product._id, 'availability', "Reserved")}
                      className="btn btn-secondary"
                      style={{ fontSize: "14px", padding: "8px 12px" }}
                    >
                      ⏸️ Reserve
                    </button>
                  )}
                  
                  {product.status === "Reserved" && (
                    <button
                      onClick={() => handleStatusChange(product._id, 'availability', "Available")}
                      className="btn btn-secondary"
                      style={{ fontSize: "14px", padding: "8px 12px" }}
                    >
                      ▶️ Available
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
          padding: isMobile ? "16px" : "20px"
        }}>
          <div style={{
            background: "white",
            borderRadius: "var(--border-radius-md)",
            padding: isMobile ? "20px" : "24px",
            maxWidth: isMobile ? "95%" : "500px",
            width: "100%",
            maxHeight: isMobile ? "95vh" : "90vh",
            overflowY: "auto",
            boxShadow: isMobile 
              ? "0 4px 20px rgba(0,0,0,0.2)" 
              : "0 8px 32px rgba(0,0,0,0.15)"
          }}>
            <h3 style={{ 
              margin: "0 0 " + (isMobile ? "16px" : "20px") + " 0", 
              fontSize: isMobile ? "20px" : "24px",
              color: "var(--text-primary)"
            }}>Edit Product</h3>
            
            <form onSubmit={handleUpdateProduct}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ 
                  display: "block", 
                  marginBottom: "8px", 
                  fontWeight: "600",
                  fontSize: isMobile ? "14px" : "14px"
                }}>
                  Product Name
                </label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => {
                    setEditingProduct({ ...editingProduct, name: e.target.value });
                    // Clear field error when user starts typing
                    if (fieldErrors.name) {
                      setFieldErrors({ ...fieldErrors, name: "" });
                    }
                  }}
                  className={`input ${fieldErrors.name ? "input-error" : ""}`}
                  required
                  style={{
                    fontSize: isMobile ? "16px" : "14px", // iOS zoom prevention
                    padding: isMobile ? "12px 16px" : "10px 12px",
                    borderColor: fieldErrors.name ? "var(--error)" : undefined,
                    borderWidth: fieldErrors.name ? "2px" : undefined
                  }}
                />
                {fieldErrors.name && (
                  <div style={{
                    color: "var(--error)",
                    fontSize: isMobile ? "13px" : "12px",
                    marginTop: "4px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                    <span style={{ fontSize: "14px" }}>⚠️</span>
                    {fieldErrors.name}
                  </div>
                )}
              </div>

              <div style={{ 
                display: "grid", 
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", 
                gap: "16px", 
                marginBottom: "16px" 
              }}>
                <div>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "8px", 
                    fontWeight: "600",
                    fontSize: isMobile ? "14px" : "14px"
                  }}>
                    Stock (units)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={editingProduct.stock}
                    onChange={(e) => {
                      setEditingProduct({ ...editingProduct, stock: e.target.value });
                      // Clear field error when user starts typing
                      if (fieldErrors.stock) {
                        setFieldErrors({ ...fieldErrors, stock: "" });
                      }
                    }}
                    className={`input ${fieldErrors.stock ? "input-error" : ""}`}
                    required
                    style={{
                      fontSize: isMobile ? "16px" : "14px", // iOS zoom prevention
                      padding: isMobile ? "12px 16px" : "10px 12px"
                    }}
                  />
                  {fieldErrors.stock && (
                    <div style={{
                      color: "var(--error)",
                      fontSize: isMobile ? "13px" : "12px",
                      marginTop: "4px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}>
                      <span style={{ fontSize: "14px" }}>⚠️</span>
                      {fieldErrors.stock}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "8px", 
                    fontWeight: "600",
                    fontSize: isMobile ? "14px" : "14px"
                  }}>
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingProduct.price}
                    onChange={(e) => {
                      setEditingProduct({ ...editingProduct, price: e.target.value });
                      // Clear field error when user starts typing
                      if (fieldErrors.price) {
                        setFieldErrors({ ...fieldErrors, price: "" });
                      }
                    }}
                    className={`input ${fieldErrors.price ? "input-error" : ""}`}
                    required
                    style={{
                      fontSize: isMobile ? "16px" : "14px", // iOS zoom prevention
                      padding: isMobile ? "12px 16px" : "10px 12px"
                    }}
                  />
                  {fieldErrors.price && (
                    <div style={{
                      color: "var(--error)",
                      fontSize: isMobile ? "13px" : "12px",
                      marginTop: "4px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}>
                      <span style={{ fontSize: "14px" }}>⚠️</span>
                      {fieldErrors.price}
                    </div>
                  )}
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

              {/* Image Upload Section */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>
                  Product Images
                  <span style={{ color: "var(--text-secondary)", fontWeight: "400", fontSize: "12px", marginLeft: "4px" }}>
                    (Max size: 5MB)
                  </span>
                </label>
                
                {/* Current Images Preview */}
                {editingProduct.images && editingProduct.images.length > 0 && (
                  <div style={{ marginBottom: "12px" }}>
                    <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                      Current Images:
                    </p>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {editingProduct.images.map((image, index) => (
                        <div key={index} style={{ position: "relative" }}>
                          <img
                            src={image.startsWith("http") ? image : `${STATIC_BASE_URL}${image}`}
                            alt={`Product image ${index + 1}`}
                            style={{
                              width: "80px",
                              height: "80px",
                              objectFit: "cover",
                              borderRadius: "var(--border-radius-sm)",
                              border: editingProduct.primaryImageIndex === index ? "2px solid var(--primary-green)" : "2px solid var(--border)",
                              opacity: editingProduct.primaryImageIndex === index ? 1 : 0.8
                            }}
                            onError={(e) => {
                              e.target.src = "https://via.placeholder.com/80x80/ff9800/ffffff?text=🛒";
                            }}
                          />
                          <div style={{ 
                            position: "absolute", 
                            top: "2px", 
                            right: "2px", 
                            display: "flex", 
                            gap: "2px" 
                          }}>
                            <button
                              type="button"
                              onClick={() => {
                                console.log("🔍 Removing image at index:", index);
                                console.log("🔍 Current primaryImageIndex:", editingProduct.primaryImageIndex);
                                const newImages = editingProduct.images.filter((_, i) => i !== index);
                                const newPrimaryIndex = editingProduct.primaryImageIndex === index ? 0 : 
                                  editingProduct.primaryImageIndex > index ? editingProduct.primaryImageIndex - 1 : editingProduct.primaryImageIndex;
                                console.log("🔍 New images array:", newImages);
                                console.log("🔍 New primaryImageIndex:", newPrimaryIndex);
                                const newEditingProduct = {
                                  ...editingProduct,
                                  images: newImages,
                                  primaryImageIndex: newPrimaryIndex
                                };
                                console.log("🔍 Updated editingProduct:", newEditingProduct);
                                setEditingProduct(newEditingProduct);
                              }}
                              style={{
                                background: "rgba(244, 67, 54, 0.9)",
                                color: "white",
                                border: "none",
                                borderRadius: "50%",
                                width: "20px",
                                height: "20px",
                                fontSize: "12px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                              title="Delete image"
                            >
                              ×
                            </button>
                            {editingProduct.primaryImageIndex !== index && (
                              <button
                                type="button"
                                onClick={() => {
                                  console.log("🔍 Changing primary image from", editingProduct.primaryImageIndex, "to", index);
                                  const newEditingProduct = {
                                    ...editingProduct,
                                    primaryImageIndex: index
                                  };
                                  console.log("🔍 New editingProduct state:", newEditingProduct);
                                  setEditingProduct(newEditingProduct);
                                }}
                                style={{
                                  background: "rgba(76, 175, 80, 0.9)",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "50%",
                                  width: "20px",
                                  height: "20px",
                                  fontSize: "12px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}
                                title="Set as primary image"
                              >
                                ★
                              </button>
                            )}
                          </div>
                          {editingProduct.primaryImageIndex === index && (
                            <div style={{
                              position: "absolute",
                              bottom: "2px",
                              left: "2px",
                              background: "var(--primary-green)",
                              color: "white",
                              fontSize: "10px",
                              padding: "2px 4px",
                              borderRadius: "2px",
                              fontWeight: "600"
                            }}>
                              Primary
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* New Image Upload */}
                <div style={{ border: "2px dashed var(--border)", borderRadius: "var(--border-radius-sm)", padding: "20px", textAlign: "center" }}>
                  <input
                    type="file"
                    id="product-image-upload"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        // Validate file size (5MB limit)
                        if (file.size > 5 * 1024 * 1024) {
                          setFieldErrors({ image: "Image size must be less than 5MB" });
                          return;
                        }
                        
                        // Clear image field error when user selects a valid file
                        if (fieldErrors.image) {
                          setFieldErrors({ ...fieldErrors, image: "" });
                        }
                        
                        // Create preview
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditingProduct({
                            ...editingProduct,
                            newImagePreview: reader.result,
                            newImageFile: file
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    style={{ display: "none" }}
                  />
                  
                  {/* New Image Preview */}
                  {editingProduct.newImagePreview ? (
                    <div>
                      <img
                        src={editingProduct.newImagePreview}
                        alt="New product image"
                        style={{
                          width: "120px",
                          height: "120px",
                          objectFit: "cover",
                          borderRadius: "var(--border-radius-sm)",
                          marginBottom: "12px",
                          border: "2px solid var(--primary-green)"
                        }}
                      />
                      <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct({
                              ...editingProduct,
                              newImagePreview: null,
                              newImageFile: null
                            });
                            document.getElementById('product-image-upload').value = '';
                            // Clear image field error when user removes image
                            if (fieldErrors.image) {
                              setFieldErrors({ ...fieldErrors, image: "" });
                            }
                          }}
                          className="btn btn-outline"
                          style={{ fontSize: "12px", padding: "6px 12px" }}
                        >
                          Remove
                        </button>
                        <label
                          htmlFor="product-image-upload"
                          className="btn btn-secondary"
                          style={{ fontSize: "12px", padding: "6px 12px", cursor: "pointer", margin: 0 }}
                        >
                          Change
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: "48px", marginBottom: "12px", color: "var(--text-secondary)" }}>
                        📷
                      </div>
                      <p style={{ margin: "0 0 12px 0", color: "var(--text-secondary)" }}>
                        Click to add a new product image
                      </p>
                      <label
                        htmlFor="product-image-upload"
                        className="btn btn-outline"
                        style={{ cursor: "pointer", margin: 0 }}
                      >
                        Choose Image
                      </label>
                      {fieldErrors.image && (
                        <div style={{
                          color: "var(--error)",
                          fontSize: "12px",
                          marginTop: "4px",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}>
                          <span style={{ fontSize: "14px" }}>⚠️</span>
                          {fieldErrors.image}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* General Error Message */}
              {error && (
                <div style={{
                  backgroundColor: "#fee",
                  border: "1px solid var(--error)",
                  borderRadius: "var(--border-radius-sm)",
                  padding: "12px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <span style={{ fontSize: "16px", color: "var(--error)" }}>⚠️</span>
                  <span style={{ color: "var(--error)", fontSize: "14px" }}>{error}</span>
                </div>
              )}

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
