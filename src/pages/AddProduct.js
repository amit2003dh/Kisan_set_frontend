import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import { apiCall } from "../api/api";
import LiveMap from "../components/LiveMap";

export default function AddProduct() {
  const navigate = useNavigate();
  const [product, setProduct] = useState({ 
    name: "", 
    type: "pesticide", 
    crop: "",
    price: "",
    stock: "",
    location: {
      address: "",
      city: "",
      state: "",
      pincode: "",
      lat: 0,
      lng: 0,
      landmark: ""
    },
    contactInfo: {
      phone: "",
      email: "",
      preferredContact: "phone"
    }
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [originalAddress, setOriginalAddress] = useState(""); // Store original address

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProduct({ ...product, [name]: value });
    setError("");
  };

  const handleLocationChange = (e) => {
    const { name, value } = e.target;
    setProduct(prev => ({
      ...prev,
      location: { ...prev.location, [name]: value } 
    }));
    setError("");
  };

  const handleLocationUpdate = (updatedLocation) => {
    setProduct(prev => ({
      ...prev,
      location: {
        ...prev.location, // Preserve existing location data (address, city, etc.)
        lat: updatedLocation.lat,
        lng: updatedLocation.lng
      }
    }));
  };

  const handleContactChange = (e) => {
    const { name, value } = e.target;
    setProduct(prev => ({
      ...prev,
      contactInfo: { ...prev.contactInfo, [name]: value }
    }));
    setError("");
  };

  const predictCoordinatesFromAddress = async () => {
    // Use current address if user has entered one, otherwise use saved address
    const addressToUse = product.location.address && product.location.address.trim() !== "" 
      ? product.location.address 
      : originalAddress;
    
    if (!addressToUse) {
      setError("Please enter an address first or use Test Address");
      return;
    }

    console.log("Predicting coordinates for address:", addressToUse);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressToUse)}&limit=1`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch coordinates");
      }

      const data = await response.json();
      
      if (data && data.length > 0) {
        const coords = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
        
        console.log("Parsed coordinates:", coords);
        console.log("Address data:", data[0].address);
        
        setProduct(prev => {
          const updatedProduct = {
            ...prev,
            location: {
              ...prev.location,
              lat: coords.lat,
              lng: coords.lng,
              city: data[0].address?.city || data[0].address?.town || prev.location.city,
              state: data[0].address?.state || prev.location.state,
              pincode: data[0].address?.postcode || prev.location.pincode
            }
          };
          console.log("Updated product:", updatedProduct);
          return updatedProduct;
        });
        
        // Only save if user manually entered the address
        if (product.location.address && product.location.address.trim() !== "") {
          setOriginalAddress(addressToUse);
        }
        
        setSuccess("✅ Coordinates predicted successfully!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        console.log("No results found for address");
        setError("Could not find coordinates for this address. Please try a more specific address.");
      }
    } catch (error) {
      console.error("Error predicting coordinates:", error);
      setError("Failed to predict coordinates. Please try again.");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFieldErrors({ image: "Image size must be less than 5MB" });
        return;
      }
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      // Clear image field error when valid file is selected
      if (fieldErrors.image) {
        setFieldErrors({ ...fieldErrors, image: "" });
      }
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
    if (!product.location.address.trim()) {
      setError("Please enter pickup address");
      return;
    }
    if (!product.contactInfo.phone.trim()) {
      setError("Please enter contact phone number");
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
      
      // Send complete location object
      formData.append("location", JSON.stringify(product.location));
      
      // Send contact info
      formData.append("contactInfo", JSON.stringify(product.contactInfo));
      
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
console.log(data, err);
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

          <div style={{ marginBottom: "24px" }}>
            <label style={{
              display: "block",
              marginBottom: "8px",
              color: "var(--text-primary)",
              fontWeight: "600",
              fontSize: "14px"
            }}>
              Pickup Address *
            </label>
            <textarea
              className="input"
              name="address"
              placeholder="Enter pickup address where buyers can collect the product"
              value={product.location.address}
              onChange={handleLocationChange}
              disabled={loading}
              required
              rows={3}
              style={{
                resize: "vertical",
                minHeight: "80px"
              }}
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
              City
            </label>
            <input
              className="input"
              name="city"
              placeholder="Enter city"
              value={product.location.city}
              onChange={handleLocationChange}
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
              State
            </label>
            <input
              className="input"
              name="state"
              placeholder="Enter state"
              value={product.location.state}
              onChange={handleLocationChange}
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
              Pincode
            </label>
            <input
              className="input"
              name="pincode"
              placeholder="Enter pincode"
              value={product.location.pincode}
              onChange={handleLocationChange}
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
              Landmark (Optional)
            </label>
            <input
              className="input"
              name="landmark"
              placeholder="Enter nearby landmark"
              value={product.location.landmark}
              onChange={handleLocationChange}
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
              Location Options
            </label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={predictCoordinatesFromAddress}
                disabled={loading || !product.location.address}
                style={{
                  padding: "8px 16px",
                  background: loading || !product.location.address ? "var(--border-color)" : "var(--primary-blue)",
                  color: loading || !product.location.address ? "var(--text-secondary)" : "white",
                  border: "none",
                  borderRadius: "var(--border-radius-sm)",
                  cursor: loading || !product.location.address ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500"
                }}
              >
                🎯 Predict from Address
              </button>
              <button
                type="button"
                onClick={() => setUseCurrentLocation(!useCurrentLocation)}
                disabled={loading}
                style={{
                  padding: "8px 16px",
                  background: useCurrentLocation ? "var(--success)" : "var(--primary-green)",
                  color: "white",
                  border: "none",
                  borderRadius: "var(--border-radius-sm)",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "500"
                }}
              >
                {useCurrentLocation ? "📍 Using Current Location" : "📍 Use Current Location"}
              </button>
            </div>
          </div>

          {useCurrentLocation && (
            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                color: "var(--text-primary)",
                fontWeight: "600",
                fontSize: "14px"
              }}>
                Select Pickup Location on Map
              </label>
              <div style={{ height: "300px", border: "1px solid var(--border-color)", borderRadius: "var(--border-radius-sm)" }}>
                <LiveMap
                  location={product.location}
                  destination={null}
                  useLiveLocation={useCurrentLocation}
                  onLocationUpdate={handleLocationUpdate}
                />
              </div>
            </div>
          )}

          <div style={{ marginBottom: "24px" }}>
            <label style={{
              display: "block",
              marginBottom: "8px",
              color: "var(--text-primary)",
              fontWeight: "600",
              fontSize: "14px"
            }}>
              Coordinates
            </label>
            <div style={{ 
              display: "flex", 
              gap: "16px", 
              fontSize: "14px",
              color: "var(--text-secondary)"
            }}>
              <div>
                <strong>Latitude:</strong> {product.location.lat.toFixed(6)}
              </div>
              <div>
                <strong>Longitude:</strong> {product.location.lng.toFixed(6)}
              </div>
            </div>
            {product.location.lat === 0 && product.location.lng === 0 && (
              <p style={{ 
                fontSize: "12px", 
                color: "#ff9800", 
                marginTop: "4px",
                fontStyle: "italic"
              }}>
                💡 Enter an address and click "Predict from Address" to get coordinates
              </p>
            )}
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{
              display: "block",
              marginBottom: "8px",
              color: "var(--text-primary)",
              fontWeight: "600",
              fontSize: "14px"
            }}>
              Contact Information *
            </label>
            <div style={{ display: "flex", gap: "16px", flexDirection: "column" }}>
              <div>
                <label style={{
                  display: "block",
                  marginBottom: "4px",
                  color: "var(--text-secondary)",
                  fontSize: "12px"
                }}>
                  Phone Number *
                </label>
                <input
                  className="input"
                  name="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={product.contactInfo.phone}
                  onChange={handleContactChange}
                  disabled={loading}
                  required
                />
              </div>
              <div>
                <label style={{
                  display: "block",
                  marginBottom: "4px",
                  color: "var(--text-secondary)",
                  fontSize: "12px"
                }}>
                  Email (Optional)
                </label>
                <input
                  className="input"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={product.contactInfo.email}
                  onChange={handleContactChange}
                  disabled={loading}
                />
              </div>
              <div>
                <label style={{
                  display: "block",
                  marginBottom: "4px",
                  color: "var(--text-secondary)",
                  fontSize: "12px"
                }}>
                  Preferred Contact Method
                </label>
                <select
                  className="select"
                  name="preferredContact"
                  value={product.contactInfo.preferredContact}
                  onChange={handleContactChange}
                  disabled={loading}
                >
                  <option value="phone">📞 Phone</option>
                  <option value="email">📧 Email</option>
                  <option value="whatsapp">💬 WhatsApp</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: "32px" }}>
            <label style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "600",
              fontSize: "14px"
            }}>
              Product Image
              <span style={{ color: "var(--text-secondary)", fontWeight: "400", fontSize: "12px", marginLeft: "4px" }}>
                (Max size: 5MB)
              </span>
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
                      // Clear image field error when user removes image
                      if (fieldErrors.image) {
                        setFieldErrors({ ...fieldErrors, image: "" });
                      }
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
                  {fieldErrors.image && (
                    <div style={{
                      color: "var(--error)",
                      fontSize: "12px",
                      marginTop: "8px",
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

