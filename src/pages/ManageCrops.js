import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API, { apiCall } from "../api/api";

export default function ManageCrops() {
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [editingCrop, setEditingCrop] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [currentUser, setCurrentUser] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const STATIC_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // Mobile and orientation detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    checkMobile();
    
    const handleResize = () => {
      checkMobile();
    };

    const handleOrientationChange = () => {
      setTimeout(checkMobile, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  useEffect(() => {
    console.log('ManageCrops component mounted');
    
    // Get current user from localStorage
    const user = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    
    if (!user || !token) {
      console.log('No user or token found');
      setError("Please log in to manage your crops");
      setLoading(false);
      return;
    }
    
    try {
      setCurrentUser(JSON.parse(user));
      console.log('User found:', JSON.parse(user).name);
    } catch (e) {
      console.error("Error parsing user:", e);
      setError("Invalid user data");
      setLoading(false);
      return;
    }

    fetchCrops();
  }, []);

  const fetchCrops = async () => {
    try {
      console.log('Fetching crops...');
      const response = await API.get("/crops/my-crops");
      console.log('Crops response:', response.data);
      setCrops(response.data || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching crops:', err);
      setError("Failed to load crops: " + (err.response?.data?.message || err.message));
      setLoading(false);
    }
  };

  const handleEditCrop = (crop) => {
    console.log("🔍 Opening edit modal for crop:", crop);
    console.log("🔍 Crop primaryImageIndex:", crop.primaryImageIndex);
    const editingCropState = {
      ...crop,
      quantity: crop.quantity.toString(),
      price: crop.price.toString(),
      primaryImageIndex: crop.primaryImageIndex || 0
    };
    console.log("🔍 Setting editingCrop state:", editingCropState);
    setEditingCrop(editingCropState);
    setShowEditModal(true);
  };

  const handleUpdateCrop = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setError("");
    setFieldErrors({});
    
    try {
      let response;
      
      if (editingCrop.newImageFile) {
        // If there's a new image, use FormData
        const formData = new FormData();
        
        // Add all crop fields
        formData.append('name', editingCrop.name);
        formData.append('quantity', parseFloat(editingCrop.quantity));
        formData.append('price', parseFloat(editingCrop.price));
        formData.append('description', editingCrop.description || '');
        formData.append('category', editingCrop.category || '');
        formData.append('qualityGrade', editingCrop.qualityGrade || '');
        formData.append('minimumOrder', parseInt(editingCrop.minimumOrder) || 1);
        formData.append('availableUntil', editingCrop.availableUntil || '');
        formData.append('contactInfo', JSON.stringify(editingCrop.contactInfo || {}));
        formData.append('location', JSON.stringify(editingCrop.location || {}));
        
        // Add images array and primary image index
        formData.append('images', JSON.stringify(editingCrop.images || []));
        formData.append('primaryImageIndex', editingCrop.primaryImageIndex || 0);
        
        // Add the new image
        formData.append('image', editingCrop.newImageFile);
        
        response = await API.put(`/crops/${editingCrop._id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // If no new image, use regular JSON
        const updateData = {
          name: editingCrop.name,
          quantity: parseFloat(editingCrop.quantity),
          price: parseFloat(editingCrop.price),
          description: editingCrop.description,
          category: editingCrop.category,
          qualityGrade: editingCrop.qualityGrade,
          minimumOrder: parseInt(editingCrop.minimumOrder) || 1,
          availableUntil: editingCrop.availableUntil || null,
          contactInfo: editingCrop.contactInfo || {},
          location: editingCrop.location || {},
          images: editingCrop.images || [],
          primaryImageIndex: editingCrop.primaryImageIndex || 0
        };
        
        response = await API.put(`/crops/${editingCrop._id}`, updateData);
      }
      
      // Success
      setShowEditModal(false);
      setEditingCrop(null);
      fetchCrops(); // Refresh the list
    } catch (error) {
      console.error("Update error:", error);
      const errorMessage = error.response?.data?.error || "Failed to update crop";
      
      // Handle field-specific errors from backend
      if (errorMessage.includes('name')) {
        setFieldErrors({ name: errorMessage });
      } else if (errorMessage.includes('price')) {
        setFieldErrors({ price: errorMessage });
      } else if (errorMessage.includes('quantity')) {
        setFieldErrors({ quantity: errorMessage });
      } else {
        setError(errorMessage);
      }
    }
  };

  const handleDeleteCrop = async (cropId) => {
    if (!window.confirm("Are you sure you want to delete this crop?")) {
      return;
    }
    
    try {
      await API.delete(`/crops/${cropId}`);
      fetchCrops(); // Refresh the list
    } catch (error) {
      console.error("Delete error:", error);
      setError("Failed to delete crop");
    }
  };

  const handleStatusChange = async (cropId, type, value) => {
    let endpoint, payload;
    
    if (type === 'approval') {
      endpoint = `/crops/${cropId}/status`;
      payload = { isApproved: value };
    } else if (type === 'availability') {
      endpoint = `/crops/${cropId}/status`;
      payload = { status: value };
    } else {
      // Legacy support for old format
      endpoint = `/crops/${cropId}/status`;
      payload = { isApproved: value };
    }
    
    try {
      const response = await API.put(endpoint, payload);
      if (response.data) {
        fetchCrops(); // Refresh the list
      }
    } catch (error) {
      console.error("Status change error:", error);
      setError("Failed to update crop status");
    }
  };

  const filteredCrops = crops.filter(crop => {
    if (activeTab === "all") return true;
    if (activeTab === "available") return crop.quantity > 0 && crop.status === "Available";
    if (activeTab === "out_of_stock") return crop.quantity === 0;
    if (activeTab === "approved") return crop.isApproved;
    if (activeTab === "reserved") return crop.status === "Reserved";
    return true;
  });

  const getStatusColor = (quantity, isApproved, status) => {
    if (quantity === 0) return "#f44336"; // Red for out of stock
    if (status === "Reserved") return "#ff9800"; // Orange for reserved
    if (isApproved) return "#4caf50"; // Green for approved
    return "#2196f3"; // Blue for available but not approved
  };

  const getStatusText = (quantity, isApproved, status) => {
    if (quantity === 0) return "Out of Stock";
    if (status === "Reserved") return "Reserved";
    return isApproved ? "Approved" : "Available";
  };

  console.log('ManageCrops render - loading:', loading, 'error:', error, 'crops count:', crops.length);

  if (loading) {
    return (
      <div className="container" style={{ padding: "40px 20px", textAlign: "center" }}>
        <div className="loading-spinner"></div>
        <p style={{ marginTop: "20px", color: "var(--text-secondary)" }}>
          Loading your crops...
        </p>
        <button
          onClick={() => {
            console.log('Manual stop');
            setLoading(false);
            setError("Manually stopped");
          }}
          style={{
            marginTop: "20px",
            padding: "8px 16px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Stop Loading
        </button>
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
          to="/add-crop"
          style={{
            display: "inline-block",
            padding: "12px 24px",
            background: "var(--primary-blue)",
            color: "white",
            textDecoration: "none",
            borderRadius: "4px"
          }}
        >
          Add New Crop
        </Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ 
      padding: isMobile ? "20px 16px" : "40px 20px",
      maxWidth: isMobile ? "100%" : "1200px",
      margin: "0 auto"
    }}>
      <div style={{ marginBottom: isMobile ? "20px" : "30px" }}>
        <h1 style={{ 
          fontSize: isMobile ? "24px" : "32px",
          marginBottom: isMobile ? "8px" : "12px"
        }}>
          🌾 Manage Your Crops
        </h1>
        <p style={{ 
          color: "var(--text-secondary)",
          fontSize: isMobile ? "14px" : "16px"
        }}>
          Welcome back! {currentUser?.name || "Farmer"}
        </p>
      </div>

      <div style={{ marginBottom: isMobile ? "20px" : "30px" }}>
        <Link 
          to="/add-crop"
          style={{
            display: "inline-block",
            padding: isMobile ? "12px 20px" : "12px 24px",
            background: "var(--primary-blue)",
            color: "darkblue",
            textDecoration: "none",
            borderRadius: "4px",
            marginRight: "10px",
            fontSize: isMobile ? "14px" : "16px",
            width: isMobile ? "100%" : "auto",
            textAlign: "center"
          }}
        >
          ➕ Add New Crop
        </Link>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: "flex", 
        gap: "8px", 
        marginBottom: isMobile ? "20px" : "32px",
        borderBottom: "1px solid var(--border-color)",
        paddingBottom: isMobile ? "12px" : "16px",
        overflowX: "auto",
        overflowY: "hidden",
        WebkitOverflowScrolling: "touch"
      }}>
        {[
          { id: "all", label: "All Crops", count: crops.length },
          { id: "available", label: "Available", count: crops.filter(c => c.quantity > 0 && c.status === "Available").length },
          { id: "reserved", label: "Reserved", count: crops.filter(c => c.status === "Reserved").length },
          { id: "out_of_stock", label: "Out of Stock", count: crops.filter(c => c.quantity === 0).length },
          { id: "approved", label: "Approved", count: crops.filter(c => c.isApproved).length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`btn ${activeTab === tab.id ? "btn-primary" : "btn-outline"}`}
            style={{ 
              borderRadius: "var(--border-radius-sm)",
              fontSize: isMobile ? "12px" : "14px",
              position: "relative",
              minWidth: isMobile ? "auto" : "120px",
              padding: isMobile ? "8px 12px" : "8px 16px",
              whiteSpace: "nowrap",
              flexShrink: 0
            }}
          >
            <span style={{ display: isMobile ? "none" : "inline" }}>
              {tab.label}
            </span>
            <span style={{ display: isMobile ? "inline" : "none", fontSize: "10px" }}>
              {tab.label.split(' ')[0]}
            </span>
            <span style={{
              background: activeTab === tab.id ? "white" : "var(--primary-blue)",
              color: activeTab === tab.id ? "var(--primary-blue)" : "white",
              padding: "2px 6px",
              borderRadius: "10px",
              fontSize: "10px",
              marginLeft: "6px",
              fontWeight: "600"
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "20px", backgroundColor: "#f8d7da", borderColor: "#f5c6cb" }}>
          <p style={{ color: "#721c24", margin: 0 }}>{error}</p>
        </div>
      )}

      {filteredCrops.length === 0 ? (
        <div className="card">
          <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px" }}>
            {activeTab === "all" ? "No crops found. Add your first crop!" : `No crops in ${activeTab} category.`}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", 
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(350px, 1fr))", 
          gap: isMobile ? "16px" : "20px" }}>
          {filteredCrops.map((crop) => (
            <div key={crop._id} className="card" style={{ 
              padding: isMobile ? "16px" : "20px",
              overflow: "hidden"
            }}>
              {/* Crop Image */}
              {crop.images && crop.images.length > 0 && (
                <img
                  src={
                    crop.images[crop.primaryImageIndex || 0].startsWith("http") 
                      ? crop.images[crop.primaryImageIndex || 0] 
                      : `${STATIC_BASE_URL}${crop.images[crop.primaryImageIndex || 0]}`
                  }
                  alt={crop.name}
                  style={{
                    width: "100%",
                    height: isMobile ? "160px" : "200px",
                    objectFit: "cover",
                    borderRadius: "var(--border-radius-sm)",
                    marginBottom: isMobile ? "12px" : "16px"
                  }}
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/350x200/4caf50/ffffff?text=🌾+Crop+Image";
                  }}
                />
              )}
              {!crop.images || crop.images.length === 0 && (
                <div style={{
                  width: "100%",
                  height: isMobile ? "160px" : "200px",
                  background: "linear-gradient(135deg, #4caf50, #81c784)",
                  borderRadius: "var(--border-radius-sm)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: isMobile ? "36px" : "48px",
                  marginBottom: isMobile ? "12px" : "16px"
                }}>
                  🌾
                </div>
              )}

              <div style={{ padding: isMobile ? "0" : "0" }}>
                {/* Header */}
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "start", 
                  marginBottom: isMobile ? "8px" : "12px",
                  flexDirection: isMobile && isPortrait ? "column" : "row",
                  gap: isMobile && isPortrait ? "8px" : "0"
                }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 
                      margin: "0 0 4px 0", 
                      fontSize: isMobile ? "16px" : "18px",
                      lineHeight: "1.2"
                    }}>{crop.name}</h3>
                    <p style={{ 
                      margin: 0, 
                      fontSize: isMobile ? "12px" : "14px", 
                      color: "var(--text-secondary)"
                    }}>
                      {crop.category || "General"} • {crop.qualityGrade || "Standard"}
                    </p>
                  </div>
                  <span style={{
                    background: getStatusColor(crop.quantity, crop.isApproved, crop.status),
                    color: "white",
                    padding: "4px 8px",
                    borderRadius: "12px",
                    fontSize: isMobile ? "10px" : "12px",
                    fontWeight: "500",
                    whiteSpace: "nowrap"
                  }}>
                    {getStatusText(crop.quantity, crop.isApproved, crop.status)}
                  </span>
                </div>

                {/* Details */}
                <div style={{ marginBottom: isMobile ? "12px" : "16px" }}>
                  <p style={{ 
                    margin: "0 0 8px 0", 
                    fontSize: isMobile ? "18px" : "16px", 
                    fontWeight: "600"
                  }}>
                    ₹{crop.price}/kg
                  </p>
                  <p style={{ 
                    margin: "0 0 4px 0", 
                    fontSize: isMobile ? "13px" : "14px"
                  }}>
                    <strong>Stock:</strong> {crop.quantity} kg
                  </p>
                  <p style={{ 
                    margin: "0 0 4px 0", 
                    fontSize: isMobile ? "13px" : "14px"
                  }}>
                    <strong>Min Order:</strong> {crop.minimumOrder || 1} kg
                  </p>
                  {crop.description && (
                    <p style={{ 
                      margin: "0 0 4px 0", 
                      fontSize: isMobile ? "12px" : "14px", 
                      color: "var(--text-secondary)"
                    }}>
                      {crop.description.length > (isMobile ? 40 : 60) ? crop.description.substring(0, isMobile ? 40 : 60) + "..." : crop.description}
                    </p>
                  )}
                  {crop.location && (
                    <p style={{ 
                      margin: "0", 
                      fontSize: isMobile ? "11px" : "12px", 
                      color: "var(--text-secondary)"
                    }}>
                      📍 {crop.location.city || "Location"}, {crop.location.state || "State"}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ 
                  display: "flex", 
                  gap: "8px", 
                  flexWrap: "wrap",
                  flexDirection: isMobile && isPortrait ? "column" : "row"
                }}>
                  <button
                    onClick={() => handleEditCrop(crop)}
                    className="btn btn-outline"
                    style={{ 
                      fontSize: isMobile ? "12px" : "14px", 
                      padding: isMobile ? "10px 16px" : "8px 12px",
                      width: isMobile && isPortrait ? "100%" : "auto",
                      textAlign: "center"
                    }}
                  >
                    ✏️ Edit
                  </button>
                  
                  {/* Reserve/Available buttons */}
                  {crop.quantity > 0 && crop.status === "Available" && (
                    <button
                      onClick={() => handleStatusChange(crop._id, 'availability', "Reserved")}
                      className="btn btn-secondary"
                      style={{ 
                        fontSize: isMobile ? "12px" : "14px", 
                        padding: isMobile ? "10px 16px" : "8px 12px",
                        width: isMobile && isPortrait ? "100%" : "auto",
                        textAlign: "center"
                      }}
                    >
                      ⏸️ Reserve
                    </button>
                  )}
                  
                  {crop.status === "Reserved" && (
                    <button
                      onClick={() => handleStatusChange(crop._id, 'availability', "Available")}
                      className="btn btn-secondary"
                      style={{ 
                        fontSize: isMobile ? "12px" : "14px", 
                        padding: isMobile ? "10px 16px" : "8px 12px",
                        width: isMobile && isPortrait ? "100%" : "auto",
                        textAlign: "center"
                      }}
                    >
                      ✅ Available
                    </button>
                  )}
                  
                  {/* Approval buttons - only for admins */}
                  {currentUser && currentUser.role === "admin" && (
                    <>
                      {!crop.isApproved && (
                        <button
                          onClick={() => handleStatusChange(crop._id, 'approval', true)}
                          className="btn btn-secondary"
                          style={{ 
                            fontSize: isMobile ? "12px" : "14px", 
                            padding: isMobile ? "10px 16px" : "8px 12px",
                            width: isMobile && isPortrait ? "100%" : "auto",
                            textAlign: "center"
                          }}
                        >
                          ✅ Approve
                        </button>
                      )}
                    </>
                  )}
                  
                  <button
                    onClick={() => handleDeleteCrop(crop._id)}
                    className="btn btn-danger"
                    style={{ 
                      fontSize: isMobile ? "12px" : "14px", 
                      padding: isMobile ? "10px 16px" : "8px 12px",
                      width: isMobile && isPortrait ? "100%" : "auto",
                      textAlign: "center"
                    }}
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
      {showEditModal && editingCrop && (
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
            <h3 style={{ margin: "0 0 20px 0" }}>Edit Crop</h3>
            
            <form onSubmit={handleUpdateCrop}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>
                  Crop Name
                </label>
                <input
                  type="text"
                  value={editingCrop.name}
                  onChange={(e) => {
                    setEditingCrop({ ...editingCrop, name: e.target.value });
                    // Clear field error when user starts typing
                    if (fieldErrors.name) {
                      setFieldErrors({ ...fieldErrors, name: "" });
                    }
                  }}
                  className={`input ${fieldErrors.name ? "input-error" : ""}`}
                  required
                  style={{
                    borderColor: fieldErrors.name ? "var(--error)" : undefined,
                    borderWidth: fieldErrors.name ? "2px" : undefined
                  }}
                />
                {fieldErrors.name && (
                  <div style={{
                    color: "var(--error)",
                    fontSize: "12px",
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>
                    Quantity (kg)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={editingCrop.quantity}
                    onChange={(e) => {
                      setEditingCrop({ ...editingCrop, quantity: e.target.value });
                      // Clear field error when user starts typing
                      if (fieldErrors.quantity) {
                        setFieldErrors({ ...fieldErrors, quantity: "" });
                      }
                    }}
                    className={`input ${fieldErrors.quantity ? "input-error" : ""}`}
                    required
                    style={{
                      borderColor: fieldErrors.quantity ? "var(--error)" : undefined,
                      borderWidth: fieldErrors.quantity ? "2px" : undefined
                    }}
                  />
                  {fieldErrors.quantity && (
                    <div style={{
                      color: "var(--error)",
                      fontSize: "12px",
                      marginTop: "4px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}>
                      <span style={{ fontSize: "14px" }}>⚠️</span>
                      {fieldErrors.quantity}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>
                    Price (₹/kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingCrop.price}
                    onChange={(e) => {
                      setEditingCrop({ ...editingCrop, price: e.target.value });
                      // Clear field error when user starts typing
                      if (fieldErrors.price) {
                        setFieldErrors({ ...fieldErrors, price: "" });
                      }
                    }}
                    className={`input ${fieldErrors.price ? "input-error" : ""}`}
                    required
                    style={{
                      borderColor: fieldErrors.price ? "var(--error)" : undefined,
                      borderWidth: fieldErrors.price ? "2px" : undefined
                    }}
                  />
                  {fieldErrors.price && (
                    <div style={{
                      color: "var(--error)",
                      fontSize: "12px",
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>
                    Category
                  </label>
                  <input
                    type="text"
                    value={editingCrop.category || ""}
                    onChange={(e) => setEditingCrop({ ...editingCrop, category: e.target.value })}
                    className="input"
                    placeholder="e.g., Vegetables, Fruits, Grains"
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>
                    Quality Grade
                  </label>
                  <input
                    type="text"
                    value={editingCrop.qualityGrade || ""}
                    onChange={(e) => setEditingCrop({ ...editingCrop, qualityGrade: e.target.value })}
                    className="input"
                    placeholder="e.g., A, B, Premium"
                  />
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>
                  Minimum Order (kg)
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={editingCrop.minimumOrder || 1}
                  onChange={(e) => setEditingCrop({ ...editingCrop, minimumOrder: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>
                  Available Until
                </label>
                <input
                  type="date"
                  value={editingCrop.availableUntil || ""}
                  onChange={(e) => setEditingCrop({ ...editingCrop, availableUntil: e.target.value })}
                  className="input"
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>
                  Description
                </label>
                <textarea
                  value={editingCrop.description || ""}
                  onChange={(e) => setEditingCrop({ ...editingCrop, description: e.target.value })}
                  className="input"
                  rows={3}
                  placeholder="Describe your crop, growing conditions, etc."
                />
              </div>

              {/* Image Upload Section */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>
                  Crop Images
                  <span style={{ color: "var(--text-secondary)", fontWeight: "400", fontSize: "12px", marginLeft: "4px" }}>
                    (Max size: 5MB)
                  </span>
                </label>
                
                {/* Current Images Preview */}
                {editingCrop.images && editingCrop.images.length > 0 && (
                  <div style={{ marginBottom: "12px" }}>
                    <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                      Current Images:
                    </p>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {editingCrop.images.map((image, index) => {
                        const imageUrl = image.startsWith("http") ? image : `${STATIC_BASE_URL}${image}`;
                        const isPrimary = editingCrop.primaryImageIndex === index;
                        return (
                          <div key={`crop-image-${index}-${isPrimary}`} style={{ position: "relative" }}>
                            <img
                              src={imageUrl}
                              alt={`Crop image ${index + 1}`}
                              style={{
                                width: "80px",
                                height: "80px",
                                objectFit: "cover",
                                borderRadius: "var(--border-radius-sm)",
                                border: isPrimary ? "2px solid var(--primary-green)" : "2px solid var(--border)",
                                opacity: isPrimary ? 1 : 0.8,
                                transition: "none" // Remove transition to prevent blinking
                              }}
                              onError={(e) => {
                                e.target.src = "https://via.placeholder.com/80x80/4caf50/ffffff?text=🌾";
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
                                  const newImages = editingCrop.images.filter((_, i) => i !== index);
                                  const newPrimaryIndex = editingCrop.primaryImageIndex === index ? 0 : 
                                    editingCrop.primaryImageIndex > index ? editingCrop.primaryImageIndex - 1 : editingCrop.primaryImageIndex;
                                  setEditingCrop({
                                    ...editingCrop,
                                    images: newImages,
                                    primaryImageIndex: newPrimaryIndex
                                  });
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
                                  justifyContent: "center",
                                  transition: "none" // Remove transition to prevent blinking
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.background = "rgba(244, 67, 54, 1)";
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.background = "rgba(244, 67, 54, 0.9)";
                                }}
                                title="Delete image"
                              >
                                ×
                              </button>
                              {!isPrimary && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCrop({
                                      ...editingCrop,
                                      primaryImageIndex: index
                                    });
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
                                    justifyContent: "center",
                                    transition: "none" // Remove transition to prevent blinking
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.background = "rgba(76, 175, 80, 1)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.background = "rgba(76, 175, 80, 0.9)";
                                  }}
                                  title="Set as primary image"
                                >
                                  ★
                                </button>
                              )}
                            </div>
                            {isPrimary && (
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
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* New Image Upload */}
                <div style={{ border: "2px dashed var(--border)", borderRadius: "var(--border-radius-sm)", padding: "20px", textAlign: "center" }}>
                  <input
                    type="file"
                    id="crop-image-upload"
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
                          setEditingCrop({
                            ...editingCrop,
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
                  {editingCrop.newImagePreview ? (
                    <div>
                      <img
                        src={editingCrop.newImagePreview}
                        alt="New crop image"
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
                            setEditingCrop({
                              ...editingCrop,
                              newImagePreview: null,
                              newImageFile: null
                            });
                            document.getElementById('crop-image-upload').value = '';
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
                          htmlFor="crop-image-upload"
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
                        Click to add a new crop image
                      </p>
                      <label
                        htmlFor="crop-image-upload"
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
                    setEditingCrop(null);
                    setFieldErrors({});
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
