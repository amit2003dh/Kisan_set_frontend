import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import { apiCall } from "../api/api";

export default function AddProduct() {
  const navigate = useNavigate();
  const [product, setProduct] = useState({ 
    name: "", 
    type: "pesticide", 
    crop: "",
    price: "",
    stock: ""
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProduct({ ...product, [name]: value });
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
    if (!product.name.trim()) {
      setError("Please enter product name");
      return;
    }
    if (!product.price || parseFloat(product.price) <= 0) {
      setError("Please enter a valid price");
      return;
    }
    if (!product.stock || parseInt(product.stock) <= 0) {
      setError("Please enter a valid stock quantity");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("name", product.name.trim());
      formData.append("type", product.type);
      formData.append("crop", product.crop.trim());
      formData.append("price", parseFloat(product.price));
      formData.append("stock", parseInt(product.stock));
      formData.append("verified", false);
      
      if (image) {
        formData.append("image", image);
      }

      const { data, error: err } = await apiCall(() =>
        API.post("/products/add", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
      );

      if (err) {
        setError(err);
        setLoading(false);
      } else {
        setSuccess("Product added successfully! 🎉");
        setTimeout(() => {
          navigate("/products");
        }, 1500);
      }
    } catch (err) {
      setError(err.message || "Failed to add product");
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px", maxWidth: "600px" }}>
      <div className="page-header">
        <h1>➕ Add Product (Seeds/Pesticides)</h1>
        <p>List your seeds or pesticides for sale</p>
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
              Product Name *
            </label>
            <input
              className="input"
              name="name"
              placeholder="e.g., Neem Oil, Wheat Seeds"
              value={product.name}
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
              Product Type *
            </label>
            <select
              className="select"
              name="type"
              value={product.type}
              onChange={handleChange}
              disabled={loading}
              required
            >
              <option value="pesticide">🧪 Pesticide</option>
              <option value="seed">🌱 Seed</option>
            </select>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{
              display: "block",
              marginBottom: "8px",
              color: "var(--text-primary)",
              fontWeight: "600",
              fontSize: "14px"
            }}>
              Suitable Crop
            </label>
            <input
              className="input"
              name="crop"
              placeholder="e.g., Wheat, Rice, Tomato"
              value={product.crop}
              onChange={handleChange}
              disabled={loading}
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
              Price (₹) *
            </label>
            <input
              className="input"
              name="price"
              type="number"
              min="1"
              step="0.01"
              placeholder="Enter price"
              value={product.price}
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
              Stock Quantity *
            </label>
            <input
              className="input"
              name="stock"
              type="number"
              min="1"
              placeholder="Enter stock quantity"
              value={product.stock}
              onChange={handleChange}
              disabled={loading}
              required
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
              Product Image
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
                    alt="Product preview"
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
                    Upload product image (optional)
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: "none" }}
                    id="product-image-upload"
                  />
                  <label
                    htmlFor="product-image-upload"
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
                "➕ Add Product"
              )}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate("/products")}
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

