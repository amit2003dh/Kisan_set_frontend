import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API, { apiCall } from "../api/api";
import LiveMap from "../components/LiveMap";
import {
  PlusCircle,
  MapPin,
  Navigation,
  Phone,
  Camera
} from "lucide-react";

export default function AddCrop() {
  const navigate = useNavigate();
  
  const [crop, setCrop] = useState({ 
    name: "", 
    quantity: "", 
    price: "",
    harvestDate: "",
    description: "",
    category: "",
    qualityGrade: "A",
    minimumOrder: "1",
    availableUntil: "",
    contactInfo: { phone: "", email: "", preferredContact: "phone" },
    location: { address: "", city: "", state: "", pincode: "", lat: 0, lng: 0, landmark: "" }
  });

  const [image, setImage] = useState(null);
  const [images, setImages] = useState([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);

  useEffect(() => {
    const savedAddress = localStorage.getItem("farmAddress");
    if (savedAddress) {
      setCrop(prev => ({
        ...prev,
        location: { ...prev.location, address: savedAddress }
      }));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setCrop(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: value } }));
    } else {
      setCrop(prev => ({ ...prev, [name]: value }));
    }
    setError("");
  };

  const handleLocationChange = (e) => {
    const { name, value } = e.target;
    setCrop(prev => ({
      ...prev,
      location: { ...prev.location, [name]: value }
    }));
    if (name === "address") {
      localStorage.setItem("farmAddress", value);
    }
    setError("");
  };

  const handleLocationUpdate = (updatedLocation) => {
    setCrop(prev => ({
      ...prev,
      location: { ...prev.location, lat: updatedLocation.lat, lng: updatedLocation.lng }
    }));
  };

  const predictCoordinatesFromAddress = async () => {
    const addressToUse = crop.location.address;
    if (!addressToUse) {
      setError("Please enter farm address first");
      return;
    }

    setError("");
    setSuccess("");

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressToUse)}&limit=1`);
      const data = await res.json();
      
      if (data && data.length > 0) {
        const item = data[0];
        setCrop(prev => ({
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
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFieldErrors({ image: "Image size must be less than 5MB" });
      return;
    }

    setImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      setImages([reader.result]);
      setPrimaryImageIndex(0);
      setFieldErrors({});
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!crop.name.trim()) return setError("Please enter crop name");
    if (!crop.quantity || parseFloat(crop.quantity) <= 0) return setError("Please enter a valid quantity in kg");
    if (!crop.price || parseFloat(crop.price) <= 0) return setError("Please enter a valid price");
    if (!crop.location.address.trim()) return setError("Please enter farm location address");
    if (!crop.contactInfo.phone.trim()) return setError("Please enter contact phone number");

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("name", crop.name.trim());
      formData.append("quantity", parseFloat(crop.quantity));
      formData.append("price", parseFloat(crop.price));
      formData.append("harvestDate", crop.harvestDate || new Date().toISOString());
      formData.append("status", "Available");
      formData.append("description", crop.description || "");
      formData.append("category", crop.category || "");
      formData.append("qualityGrade", crop.qualityGrade);
      formData.append("minimumOrder", parseInt(crop.minimumOrder) || 1);
      formData.append("availableUntil", crop.availableUntil || "");
      formData.append("contactInfo", JSON.stringify(crop.contactInfo));
      formData.append("location", JSON.stringify(crop.location));
      formData.append("images", JSON.stringify(images));
      formData.append("primaryImageIndex", primaryImageIndex || 0);

      if (image) formData.append("image", image);

      const { error: err } = await apiCall(() =>
        API.post("/crops/add", formData, { headers: { "Content-Type": "multipart/form-data" } })
      );

      if (err) {
        setError(err);
        setLoading(false);
      } else {
        setSuccess("Crop added successfully!");
        setTimeout(() => navigate("/crops"), 1200);
      }
    } catch (err) {
      setError(err.message || "Failed to add crop");
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: "48px 20px 60px", maxWidth: "650px", margin: "0 auto" }}>
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <h1 style={{ display: "inline-flex", alignItems: "center", gap: "12px" }}>
          <PlusCircle size={32} color="var(--primary-blue)" />
          <span>Add New Crop</span>
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "4px" }}>List your crop for sale on the marketplace</p>
      </div>

      <div className="card" style={{ padding: "24px" }}>
        <form onSubmit={submit}>
          {error && <div className="error-message" style={{ padding: "12px", marginBottom: "16px" }}>{error}</div>}
          {success && <div className="success-message" style={{ padding: "12px", marginBottom: "16px" }}>{success}</div>}

          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "600" }}>Crop Name *</label>
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "18px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "600" }}>Quantity (kg) *</label>
              <input
                className="input"
                name="quantity"
                type="number"
                min="1"
                step="0.1"
                placeholder="Quantity in kg"
                value={crop.quantity}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "600" }}>Price per kg (₹) *</label>
              <input
                className="input"
                name="price"
                type="number"
                min="0"
                step="0.01"
                placeholder="Price per kg"
                value={crop.price}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "600" }}>Harvest Date</label>
            <input
              className="input"
              name="harvestDate"
              type="date"
              value={crop.harvestDate}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: "24px", padding: "20px", background: "var(--background)", borderRadius: "var(--border-radius-sm)" }}>
            <h3 style={{ marginBottom: "14px", display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <MapPin size={20} color="var(--primary-blue)" />
              <span>Farm Location</span>
            </h3>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "600" }}>Farm Address *</label>
              <textarea
                className="input"
                name="address"
                placeholder="Enter your farm address"
                value={crop.location.address}
                onChange={handleLocationChange}
                disabled={loading}
                required
                rows="2"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "14px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "13px" }}>City</label>
                <input className="input" name="city" placeholder="City" value={crop.location.city} onChange={handleLocationChange} disabled={loading} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "13px" }}>State</label>
                <input className="input" name="state" placeholder="State" value={crop.location.state} onChange={handleLocationChange} disabled={loading} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "13px" }}>Pincode</label>
                <input className="input" name="pincode" placeholder="Pincode" value={crop.location.pincode} onChange={handleLocationChange} disabled={loading} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontWeight: "600", fontSize: "14px" }}>Map Coordinates</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={predictCoordinatesFromAddress}
                  disabled={loading || !crop.location.address}
                  className="btn btn-secondary"
                  style={{ fontSize: "12px", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <Navigation size={14} />
                  <span>Predict Coordinates</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUseCurrentLocation(!useCurrentLocation)}
                  disabled={loading}
                  className="btn btn-outline"
                  style={{ fontSize: "12px", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <MapPin size={14} />
                  <span>{useCurrentLocation ? "Live Location On" : "Use My Location"}</span>
                </button>
              </div>
            </div>

            <div style={{ height: "260px", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border-color)" }}>
              <LiveMap
                location={crop.location}
                destination={null}
                useLiveLocation={useCurrentLocation}
                onLocationUpdate={handleLocationUpdate}
              />
            </div>
          </div>

          <div style={{ marginBottom: "18px" }}>
            <h3 style={{ marginBottom: "12px", display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <Phone size={20} color="var(--primary-green)" />
              <span>Contact Details</span>
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "13px" }}>Phone *</label>
                <input className="input" name="contactInfo.phone" placeholder="Phone Number" value={crop.contactInfo.phone} onChange={handleChange} disabled={loading} required />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "13px" }}>Email</label>
                <input className="input" name="contactInfo.email" placeholder="Email (optional)" value={crop.contactInfo.email} onChange={handleChange} disabled={loading} />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "6px", fontWeight: "600" }}>
              <Camera size={18} color="var(--primary-blue)" />
              <span>Crop Photo</span>
            </label>
            <input type="file" accept="image/*" onChange={handleImageChange} disabled={loading} />
            {fieldErrors.image && <div style={{ color: "red", fontSize: "13px", marginTop: "4px" }}>{fieldErrors.image}</div>}
            {imagePreview && (
              <img src={imagePreview} alt="Preview" style={{ marginTop: "10px", width: "100%", maxHeight: "200px", objectFit: "cover", borderRadius: "8px" }} />
            )}
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "12px" }} disabled={loading}>
            {loading ? "Adding Crop..." : "Publish Crop Listing"}
          </button>
        </form>
      </div>
    </div>
  );
}
