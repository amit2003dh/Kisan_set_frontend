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
  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const STATIC_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

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
    fetchCrops();
  }, []);

  const fetchCrops = async () => {
    setLoading(true);
    setError("");
    
    const { data, error: err } = await apiCall(() =>
      API.get("/crops/my-crops")
    );
    
    if (err) {
      setError(err);
    } else {
      setCrops(data || []);
    }
    
    setLoading(false);
  };

  const handleEditCrop = (crop) => {
    setEditingCrop({
      ...crop,
      quantity: crop.quantity.toString(),
      price: crop.price.toString(),
      primaryImageIndex: crop.primaryImageIndex || 0
    });
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
          contactInfo: editingCrop.contactInfo,
          location: editingCrop.location,
          images: editingCrop.images,
          primaryImageIndex: editingCrop.primaryImageIndex || 0
        };

        const { data, error: err } = await apiCall(() =>
          API.put(`/crops/${editingCrop._id}`, updateData)
        );
        
        if (err) {
          // Handle field-specific errors
          if (err.includes('name')) {
            setFieldErrors({ name: err });
          } else if (err.includes('price')) {
            setFieldErrors({ price: err });
          } else if (err.includes('quantity')) {
            setFieldErrors({ quantity: err });
          } else if (err.includes('image')) {
            setFieldErrors({ image: err });
          } else {
            setError(err);
          }
          return;
        }
        
        response = { data };
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
      } else if (errorMessage.includes('image')) {
        setFieldErrors({ image: errorMessage });
      } else {
        setError(errorMessage);
      }
    }
  };

  const handleDeleteCrop = async (cropId) => {
    if (!window.confirm("Are you sure you want to delete this crop?")) {
      return;
    }

    const { data, error: err } = await apiCall(() =>
      API.delete(`/crops/${cropId}`)
    );
    
    if (err) {
      setError(err);
    } else {
      fetchCrops(); // Refresh the list
    }
  };

  const handleStatusChange = async (cropId, newStatus) => {
    const { data, error: err } = await apiCall(() =>
      API.put(`/crops/${cropId}/status`, { status: newStatus })
    );
    
    if (err) {
      setError(err);
    } else {
      fetchCrops(); // Refresh the list
    }
  };

  const handleVerificationChange = async (cropId, verified) => {
    const { data, error: err } = await apiCall(() =>
      API.put(`/crops/${cropId}/verify`, { verified })
    );
    
    if (err) {
      setError(err);
    } else {
      fetchCrops(); // Refresh the list
    }
  };

  const filteredCrops = crops.filter(crop => {
    if (activeTab === "all") return true;
    if (activeTab === "available") return crop.status === "Available" && crop.quantity > 0;
    if (activeTab === "sold") return crop.status === "Sold";
    if (activeTab === "out_of_stock") return crop.quantity === 0;
    return true;
  });

  const getStatusColor = (status, quantity) => {
    if (quantity === 0) return "#f44336"; // Red for out of stock
    switch (status?.toLowerCase()) {
      case "available": return "#4caf50";
      case "sold": return "#2196f3";
      case "reserved": return "#ff9800";
      default: return "#757575";
    }
  };

  const getStatusText = (status, quantity) => {
    if (quantity === 0) return "Out of Stock";
    return status || "Unknown";
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <div className="loading-spinner"></div>
        <p style={{ textAlign: "center", color: "var(--text-secondary)" }}>Loading your crops...</p>
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
        <h1>🌾 Manage Your Crops</h1>
        <p>Track, update, and manage your crop listings</p>
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
          { id: "all", label: "All Crops", count: crops.length },
          { id: "available", label: "Available", count: crops.filter(c => c.status === "Available" && c.quantity > 0).length },
          { id: "sold", label: "Sold", count: crops.filter(c => c.status === "Sold").length },
          { id: "out_of_stock", label: "Out of Stock", count: crops.filter(c => c.quantity === 0).length }
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
              background: activeTab === tab.id ? "white" : "var(--primary-green)",
              color: activeTab === tab.id ? "var(--primary-green)" : "white",
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

      {/* Add New Crop Button */}
      <div style={{ marginBottom: "24px" }}>
        <Link to="/add-crop" className="btn btn-primary">
          ➕ Add New Crop
        </Link>
      </div>

      {/* Crops Grid */}
      {filteredCrops.length === 0 ? (
        <div className="card">
          <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px" }}>
            {activeTab === "all" ? "No crops found. Add your first crop!" : `No crops in ${activeTab} category.`}
          </p>
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "20px" }}>
          {filteredCrops.map((crop) => (
            <div key={crop._id} className="card">
              {/* Crop Image */}
              {crop.image && (
                <img
                  src={crop.image.startsWith("http") ? crop.image : `${STATIC_BASE_URL}${crop.image}`}
                  alt={crop.name}
                  style={{
                    width: "100%",
                    height: "200px",
                    objectFit: "cover",
                    borderRadius: "var(--border-radius-sm) var(--border-radius-sm) 0 0"
                  }}
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/350x200/4caf50/ffffff?text=🌾+Crop+Image";
                  }}
                />
              )}
              {!crop.image && (
                <div style={{
                  width: "100%",
                  height: "200px",
                  background: "linear-gradient(135deg, #4caf50, #8bc34a)",
                  borderRadius: "var(--border-radius-sm) var(--border-radius-sm) 0 0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "48px"
                }}>
                  🌾
                </div>
              )}

              <div style={{ padding: "20px" }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <h3 style={{ margin: 0 }}>{crop.name}</h3>
                      {crop.verified && (
                        <span style={{
                          backgroundColor: "#4caf50",
                          color: "white",
                          fontSize: "12px",
                          padding: "2px 6px",
                          borderRadius: "12px",
                          fontWeight: "500"
                        }}>
                          ✓ Verified
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: "14px", color: "var(--text-secondary)" }}>
                      {crop.category} • Grade {crop.qualityGrade}
                    </p>
                  </div>
                  <span style={{
                    background: getStatusColor(crop.status, crop.quantity),
                    color: "white",
                    padding: "4px 8px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "500"
                  }}>
                    {getStatusText(crop.status, crop.quantity)}
                  </span>
                </div>

                {/* Details */}
                <div style={{ marginBottom: "16px" }}>
                  <p style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: "600" }}>
                    ₹{crop.price}/kg
                  </p>
                  <p style={{ margin: "0 0 4px 0", fontSize: "14px" }}>
                    <strong>Available:</strong> {crop.quantity} kg
                  </p>
                  <p style={{ margin: "0 0 4px 0", fontSize: "14px" }}>
                    <strong>Min Order:</strong> {crop.minimumOrder || 1} kg
                  </p>
                  {crop.harvestDate && (
                    <p style={{ margin: "0 0 4px 0", fontSize: "14px" }}>
                      <strong>Harvested:</strong> {new Date(crop.harvestDate).toLocaleDateString()}
                    </p>
                  )}
                  {crop.location && (
                    <p style={{ margin: "0", fontSize: "12px", color: "var(--text-secondary)" }}>
                      📍 {crop.location.city}, {crop.location.state}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => handleEditCrop(crop)}
                    className="btn btn-outline"
                    style={{ fontSize: "14px", padding: "8px 12px" }}
                  >
                    ✏️ Edit
                  </button>
                  
                  {/* Verification buttons - only for admins */}
                  {currentUser && currentUser.role === "admin" && (
                    <>
                      {!crop.verified && (
                        <button
                          onClick={() => handleVerificationChange(crop._id, true)}
                          className="btn btn-secondary"
                          style={{ fontSize: "14px", padding: "8px 12px" }}
                        >
                          ✅ Verify
                        </button>
                      )}
                      
                      {crop.verified && (
                        <button
                          onClick={() => handleVerificationChange(crop._id, false)}
                          className="btn btn-secondary"
                          style={{ fontSize: "14px", padding: "8px 12px" }}
                        >
                          ❌ Unverify
                        </button>
                      )}
                    </>
                  )}
                  
                  {crop.quantity > 0 && crop.status === "Available" && (
                    <button
                      onClick={() => handleStatusChange(crop._id, "Reserved")}
                      className="btn btn-secondary"
                      style={{ fontSize: "14px", padding: "8px 12px" }}
                    >
                      ⏸️ Reserve
                    </button>
                  )}
                  
                  {crop.status === "Reserved" && (
                    <button
                      onClick={() => handleStatusChange(crop._id, "Available")}
                      className="btn btn-secondary"
                      style={{ fontSize: "14px", padding: "8px 12px" }}
                    >
                      ▶️ Available
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDeleteCrop(crop._id)}
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
                  onChange={(e) => setEditingCrop({ ...editingCrop, name: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>
                    Quantity (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editingCrop.quantity}
                    onChange={(e) => setEditingCrop({ ...editingCrop, quantity: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>
                    Price per kg (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingCrop.price}
                    onChange={(e) => setEditingCrop({ ...editingCrop, price: e.target.value })}
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
                  value={editingCrop.description || ""}
                  onChange={(e) => setEditingCrop({ ...editingCrop, description: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>

              {/* Image Upload Section */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "600" }}>
                  Crop Image
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
                      {editingCrop.images.map((image, index) => (
                        <div key={index} style={{ position: "relative" }}>
                          <img
                            src={image.startsWith("http") ? image : `${STATIC_BASE_URL}${image}`}
                            alt={`Crop image ${index + 1}`}
                            style={{
                              width: "80px",
                              height: "80px",
                              objectFit: "cover",
                              borderRadius: "var(--border-radius-sm)",
                              border: editingCrop.primaryImageIndex === index ? "2px solid var(--primary-green)" : "2px solid var(--border)",
                              opacity: editingCrop.primaryImageIndex === index ? 1 : 0.8
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
                                justifyContent: "center"
                              }}
                              title="Delete image"
                            >
                              ×
                            </button>
                            {editingCrop.primaryImageIndex !== index && (
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
                                  justifyContent: "center"
                                }}
                                title="Set as primary image"
                              >
                                ★
                              </button>
                            )}
                          </div>
                          {editingCrop.primaryImageIndex === index && (
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
                
                {/* Legacy single image support */}
                {!editingCrop.images && editingCrop.image && (
                  <div style={{ marginBottom: "12px" }}>
                    <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                      Current Image:
                    </p>
                    <img
                      src={editingCrop.image.startsWith("http") ? editingCrop.image : `${STATIC_BASE_URL}${editingCrop.image}`}
                      alt="Current crop image"
                      style={{
                        width: "80px",
                        height: "80px",
                        objectFit: "cover",
                        borderRadius: "var(--border-radius-sm)",
                        border: "2px solid var(--border)"
                      }}
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/80x80/4caf50/ffffff?text=🌾";
                      }}
                    />
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
