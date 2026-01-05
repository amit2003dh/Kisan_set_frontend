import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import { apiCall } from "../api/api";

export default function AddCrop() {
  const navigate = useNavigate();
  const [crop, setCrop] = useState({ 
    name: "", 
    quantity: "", 
    price: "",
    harvestDate: ""
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCrop({ ...crop, [name]: value });
    setError("");
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB");
        return;
      }
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setError("");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!crop.name.trim()) {
      setError("Please enter crop name");
      return;
    }
    if (!crop.quantity || parseFloat(crop.quantity) <= 0) {
      setError("Please enter a valid quantity (in kg)");
      return;
    }
    if (!crop.price || parseFloat(crop.price) <= 0) {
      setError("Please enter a valid price");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("name", crop.name.trim());
      formData.append("quantity", parseFloat(crop.quantity));
      formData.append("price", parseFloat(crop.price));
      formData.append("harvestDate", crop.harvestDate || new Date());
      formData.append("status", "Available");
      
      if (image) {
        formData.append("image", image);
      }

      const { data, error: err } = await apiCall(() =>
        API.post("/crops/add", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
      );

      if (err) {
        setError(err);
        setLoading(false);
      } else {
        setSuccess("Crop added successfully! 🎉");
        setTimeout(() => {
          navigate("/crops");
        }, 1500);
      }
    } catch (err) {
      setError(err.message || "Failed to add crop");
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px", maxWidth: "600px" }}>
      <div className="page-header">
        <h1>➕ Add New Crop</h1>
        <p>List your crop for sale on the marketplace</p>
      </div>

      <div className="card">
        <form onSubmit={submit}>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div style={{ marginBottom: "24px" }}>
            <label style={{
              display: "block",
              marginBottom: "8px",
              color: "var(--text-primary)",
              fontWeight: "600",
              fontSize: "14px"
            }}>
              Crop Name *
            </label>
            <input
              className="input"
              name="name"
              placeholder="e.g., Wheat, Rice, Tomato"
              value={crop.name}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{
              display: "block",
              marginBottom: "8px",
              color: "var(--text-primary)",
              fontWeight: "600",
              fontSize: "14px"
            }}>
              Quantity (kg) *
            </label>
            <input
              className="input"
              name="quantity"
              type="number"
              min="1"
              step="0.1"
              placeholder="Enter quantity in kg"
              value={crop.quantity}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{
              display: "block",
              marginBottom: "8px",
              color: "var(--text-primary)",
              fontWeight: "600",
              fontSize: "14px"
            }}>
              Price per kg (₹) *
            </label>
            <input
              className="input"
              name="price"
              type="number"
              min="1"
              step="0.01"
              placeholder="Enter price per kg"
              value={crop.price}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{
              display: "block",
              marginBottom: "8px",
              color: "var(--text-primary)",
              fontWeight: "600",
              fontSize: "14px"
            }}>
              Harvest Date
            </label>
            <input
              className="input"
              name="harvestDate"
              type="date"
              value={crop.harvestDate}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: "32px" }}>
            <label style={{
              display: "block",
              marginBottom: "8px",
              color: "var(--text-primary)",
              fontWeight: "600",
              fontSize: "14px"
            }}>
              Crop Image
            </label>
            <div style={{
              border: "2px dashed var(--border)",
              borderRadius: "var(--border-radius-sm)",
              padding: "20px",
              textAlign: "center",
              background: imagePreview ? "transparent" : "var(--background)"
            }}>
              {imagePreview ? (
                <div>
                  <img
                    src={imagePreview}
                    alt="Crop preview"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "200px",
                      borderRadius: "var(--border-radius-sm)",
                      marginBottom: "12px",
                      objectFit: "contain"
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImage(null);
                      setImagePreview(null);
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: "14px" }}
                  >
                    Remove Image
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: "48px", marginBottom: "12px" }}>📷</div>
                  <p style={{ color: "var(--text-secondary)", marginBottom: "12px", fontSize: "14px" }}>
                    Upload crop image (optional)
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: "none" }}
                    id="crop-image-upload"
                  />
                  <label
                    htmlFor="crop-image-upload"
                    className="btn btn-secondary"
                    style={{ cursor: "pointer", display: "inline-block", fontSize: "14px" }}
                  >
                    Choose Image
                  </label>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: "16px" }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? (
                <>
                  <div className="loading-spinner" style={{
                    width: "20px",
                    height: "20px",
                    borderWidth: "2px",
                    margin: "0"
                  }}></div>
                  Adding...
                </>
              ) : (
                "➕ Add Crop"
              )}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate("/crops")}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
