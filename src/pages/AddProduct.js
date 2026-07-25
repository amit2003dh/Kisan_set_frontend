import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API, { apiCall } from "../api/api";
import LiveMap from "../components/LiveMap";
import {
  Package,
  MapPin,
  Navigation,
  Camera
} from "lucide-react";

export default function AddProduct() {
  const navigate = useNavigate();

  const [product, setProduct] = useState({ 
    name: "", 
    type: "pesticide", 
    crop: "",
    price: "",
    stock: "",
    location: { address: "", city: "", state: "", pincode: "", lat: 0, lng: 0 }
  });

  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);

  const handleChange = (e) => {
    setProduct({ ...product, [e.target.name]: e.target.value });
    setError("");
  };

  const handleLocationChange = (e) => {
    setProduct({
      ...product,
      location: { ...product.location, [e.target.name]: e.target.value }
    });
    setError("");
  };

  const handleLocationUpdate = (updatedLocation) => {
    setProduct(prev => ({
      ...prev,
      location: { ...prev.location, lat: updatedLocation.lat, lng: updatedLocation.lng }
    }));
  };

  const predictCoordinatesFromAddress = async () => {
    const addressToUse = product.location.address;
    if (!addressToUse) {
      setError("Please enter seller address first");
      return;
    }

    setError("");
    setSuccess("");

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressToUse)}&limit=1`);
      const data = await res.json();
      
      if (data && data.length > 0) {
        const item = data[0];
        setProduct(prev => ({
          ...prev,
          location: {
            ...prev.location,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            city: item.address?.city || item.address?.town || prev.location.city,
            state: item.address?.state || prev.location.state,
            pincode: item.address?.postcode || prev.location.pincode
          }
        }));
        setSuccess("Coordinates predicted successfully!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError("Could not find coordinates for this address.");
      }
    } catch (err) {
      setError("Failed to geocode address");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!product.name) return setError("Please enter product name");
    if (!product.price || parseFloat(product.price) <= 0) return setError("Please enter a valid price");
    if (!product.stock || parseInt(product.stock) < 0) return setError("Please enter valid stock quantity");
    if (!product.location.address) return setError("Please enter location address");

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("name", product.name);
      formData.append("type", product.type);
      formData.append("price", parseFloat(product.price));
      formData.append("stock", parseInt(product.stock));
      formData.append("crop", product.crop || "");
      formData.append("location", JSON.stringify(product.location));

      if (image) formData.append("image", image);

      const { error: err } = await apiCall(() =>
        API.post("/products/add", formData, { headers: { "Content-Type": "multipart/form-data" } })
      );

      if (err) {
        setError(err);
        setLoading(false);
      } else {
        setSuccess("Product added successfully!");
        setTimeout(() => navigate("/manage-products"), 1200);
      }
    } catch (err) {
      setError(err.message || "Failed to add product");
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: "48px 20px 60px", maxWidth: "650px", margin: "0 auto" }}>
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <h1 style={{ display: "inline-flex", alignItems: "center", gap: "12px" }}>
          <Package size={32} color="var(--primary-blue)" />
          <span>Add New Product</span>
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "4px" }}>List agri-inputs (seeds, fertilizers, pesticides) for sale</p>
      </div>

      <div className="card" style={{ padding: "24px" }}>
        <form onSubmit={submit}>
          {error && <div className="error-message" style={{ padding: "12px", marginBottom: "16px" }}>{error}</div>}
          {success && <div className="success-message" style={{ padding: "12px", marginBottom: "16px" }}>{success}</div>}

          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "600" }}>Product Name *</label>
            <input className="input" name="name" placeholder="e.g., Organic Fertilizer NPK" value={product.name} onChange={handleChange} disabled={loading} required />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "18px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "600" }}>Category *</label>
              <select className="input" name="type" value={product.type} onChange={handleChange} disabled={loading}>
                <option value="pesticide">Pesticide</option>
                <option value="fertilizer">Fertilizer</option>
                <option value="seed">Seed</option>
                <option value="machinery">Machinery / Equipment</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "600" }}>Suitable Crop</label>
              <input className="input" name="crop" placeholder="e.g., Wheat, Rice" value={product.crop} onChange={handleChange} disabled={loading} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "18px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "600" }}>Price (₹) *</label>
              <input className="input" name="price" type="number" min="0" step="0.01" value={product.price} onChange={handleChange} disabled={loading} required />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "600" }}>Stock Quantity *</label>
              <input className="input" name="stock" type="number" min="0" value={product.stock} onChange={handleChange} disabled={loading} required />
            </div>
          </div>

          <div style={{ marginBottom: "24px", padding: "20px", background: "var(--background)", borderRadius: "8px" }}>
            <h3 style={{ marginBottom: "14px", display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <MapPin size={20} color="var(--primary-blue)" />
              <span>Seller Location</span>
            </h3>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "600" }}>Address *</label>
              <textarea className="input" name="address" placeholder="Address" value={product.location.address} onChange={handleLocationChange} disabled={loading} required rows="2" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "14px" }}>
              <input className="input" name="city" placeholder="City" value={product.location.city} onChange={handleLocationChange} disabled={loading} />
              <input className="input" name="state" placeholder="State" value={product.location.state} onChange={handleLocationChange} disabled={loading} />
              <input className="input" name="pincode" placeholder="Pincode" value={product.location.pincode} onChange={handleLocationChange} disabled={loading} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontWeight: "600", fontSize: "14px" }}>Location Map</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="button" onClick={predictCoordinatesFromAddress} disabled={loading || !product.location.address} className="btn btn-secondary" style={{ fontSize: "12px", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <Navigation size={14} />
                  <span>Predict</span>
                </button>
                <button type="button" onClick={() => setUseCurrentLocation(!useCurrentLocation)} disabled={loading} className="btn btn-outline" style={{ fontSize: "12px", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <MapPin size={14} />
                  <span>{useCurrentLocation ? "Live On" : "My Location"}</span>
                </button>
              </div>
            </div>

            <div style={{ height: "260px", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border-color)" }}>
              <LiveMap location={product.location} destination={null} useLiveLocation={useCurrentLocation} onLocationUpdate={handleLocationUpdate} />
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "6px", fontWeight: "600" }}>
              <Camera size={18} color="var(--primary-blue)" />
              <span>Product Image</span>
            </label>
            <input type="file" accept="image/*" onChange={handleImageChange} disabled={loading} />
            {imagePreview && <img src={imagePreview} alt="Preview" style={{ marginTop: "10px", width: "100%", maxHeight: "200px", objectFit: "cover", borderRadius: "8px" }} />}
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "12px" }} disabled={loading}>
            {loading ? "Adding Product..." : "Publish Product"}
          </button>
        </form>
      </div>
    </div>
  );
}
