import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import { apiCall } from "../api/api";
import LiveMap from "../components/LiveMap";

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
    contactInfo: {
      phone: "",
      email: "",
      preferredContact: "phone"
    },
    location: {
      address: "",
      city: "",
      state: "",
      pincode: "",
      lat: 0,
      lng: 0,
      landmark: ""
    }
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [originalAddress, setOriginalAddress] = useState(""); // Store original address

  // Load saved address from localStorage on component mount
  useEffect(() => {
    const savedAddress = localStorage.getItem("farmAddress");
    if (savedAddress) {
      setCrop(prev => ({
        ...prev,
        location: {
          ...prev.location,
          address: savedAddress
        }
      }));
      setOriginalAddress(savedAddress);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setCrop({ ...crop, [parent]: { ...crop[parent], [child]: value } });
    } else {
      setCrop({ ...crop, [name]: value });
    }
    setError("");
  };

  const handleLocationChange = (e) => {
    const { name, value } = e.target;
    setCrop({ 
      ...crop, 
      location: { ...crop.location, [name]: value } 
    });
    
    // Save address to localStorage when user manually changes it
    if (name === 'address') {
      localStorage.setItem("farmAddress", value);
      setOriginalAddress(value);
    }
    
    setError("");
  };

  const handleLocationUpdate = (updatedLocation) => {
    console.log("Live location update received:", updatedLocation);
    setCrop(prev => ({
      ...prev,
      location: {
        ...prev.location, // Preserve existing location data (address, city, etc.)
        lat: updatedLocation.lat,
        lng: updatedLocation.lng
      }
    }));
  };

  const predictCoordinatesFromAddress = async () => {
    // Use current address if user has entered one, otherwise use saved address
    const addressToUse = crop.location.address && crop.location.address.trim() !== "" 
      ? crop.location.address 
      : originalAddress;
    
    if (!addressToUse) {
      setError("Please enter an address first or use Test Address (only works if farm address is empty)");
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Geocoding response:", data);
      
      if (data && data.length > 0) {
        const coords = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
        
        console.log("Parsed coordinates:", coords);
        console.log("Address data:", data[0].address);
        
        setCrop(prev => {
          const updatedCrop = {
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
          console.log("Updated crop:", updatedCrop);
          return updatedCrop;
        });
        
        // Only save if user manually entered the address
        if (crop.location.address && crop.location.address.trim() !== "") {
          localStorage.setItem("farmAddress", addressToUse);
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
      setError("Error predicting coordinates. Please check your internet connection and try again.");
    }
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
    if (!crop.location.address.trim()) {
      setError("Please enter farm location address");
      return;
    }
    if (crop.location.lat === 0 || crop.location.lng === 0) {
      setError("Please get your location coordinates or use current location");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const cropData = {
        name: crop.name.trim(),
        quantity: parseFloat(crop.quantity),
        price: parseFloat(crop.price),
        harvestDate: crop.harvestDate || new Date(),
        status: "Available",
        description: crop.description,
        category: crop.category,
        qualityGrade: crop.qualityGrade,
        minimumOrder: parseInt(crop.minimumOrder) || 1,
        availableUntil: crop.availableUntil || null,
        contactInfo: crop.contactInfo,
        location: crop.location
      };
      
      const { data, error: err } = await apiCall(() =>
        API.post("/crops/add", cropData)
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

          {/* Location Section */}
          <div style={{ marginBottom: "32px", padding: "20px", background: "var(--background)", borderRadius: "var(--border-radius-sm)" }}>
            <h3 style={{ marginBottom: "16px", color: "var(--text-primary)" }}>📍 Farm Location</h3>
            
            <div style={{ marginBottom: "16px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                color: "var(--text-primary)",
                fontWeight: "600",
                fontSize: "14px"
              }}>
                Farm Address *
              </label>
              <textarea
                className="input"
                name="address"
                placeholder="Enter your farm address"
                value={crop.location.address}
                onChange={handleLocationChange}
                disabled={loading}
                required
                rows={2}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div>
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
                  placeholder="City"
                  value={crop.location.city}
                  onChange={handleLocationChange}
                  disabled={loading}
                />
              </div>
              <div>
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
                  placeholder="State"
                  value={crop.location.state}
                  onChange={handleLocationChange}
                  disabled={loading}
                />
              </div>
              <div>
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
                  placeholder="Pincode"
                  value={crop.location.pincode}
                  onChange={handleLocationChange}
                  disabled={loading}
                />
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                color: "var(--text-primary)",
                fontWeight: "600",
                fontSize: "14px"
              }}>
                Landmark (Nearby location)
              </label>
              <input
                className="input"
                name="landmark"
                placeholder="Nearby landmark"
                value={crop.location.landmark}
                onChange={handleLocationChange}
                disabled={loading}
              />
            </div>

            {/* Location Map and Controls */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px"
              }}>
                <label style={{
                  color: "var(--text-primary)",
                  fontWeight: "600",
                  fontSize: "14px"
                }}>
                  📍 Location on Map
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={predictCoordinatesFromAddress}
                    disabled={loading || !crop.location.address}
                    style={{
                      padding: "6px 12px",
                      background: loading || !crop.location.address ? "var(--border-color)" : "var(--primary-blue)",
                      color: loading || !crop.location.address ? "var(--text-secondary)" : "white",
                      border: "none",
                      borderRadius: "var(--border-radius-sm)",
                      cursor: loading || !crop.location.address ? "not-allowed" : "pointer",
                      fontSize: "12px",
                      fontWeight: "500"
                    }}
                  >
                    🎯 Predict from Address
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Only fill if farm address is empty
                      if (!crop.location.address || crop.location.address.trim() === "") {
                        const testAddress = "Taj Mahal, Agra, Uttar Pradesh, India";
                        setCrop(prev => ({
                          ...prev,
                          location: {
                            ...prev.location,
                            address: testAddress
                          }
                        }));
                        setSuccess("🧪 Test address loaded! Click 'Predict from Address' to get coordinates.");
                        setTimeout(() => setSuccess(""), 3000);
                      } else {
                        setError("🚫 Farm address already filled. Clear it first to use test address.");
                        setTimeout(() => setError(""), 3000);
                      }
                    }}
                    disabled={loading}
                    style={{
                      padding: "6px 12px",
                      background: (!crop.location.address || crop.location.address.trim() === "") ? "var(--success)" : "var(--border-color)",
                      color: (!crop.location.address || crop.location.address.trim() === "") ? "white" : "var(--text-secondary)",
                      border: "none",
                      borderRadius: "var(--border-radius-sm)",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontSize: "12px",
                      fontWeight: "500"
                    }}
                  >
                    🧪 Test Address
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseCurrentLocation(!useCurrentLocation)}
                    disabled={loading}
                    style={{
                      padding: "6px 12px",
                      background: useCurrentLocation ? "var(--success)" : "var(--primary-blue)",
                      color: "white",
                      border: "none",
                      borderRadius: "var(--border-radius-sm)",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontSize: "12px",
                      fontWeight: "500"
                    }}
                  >
                    {useCurrentLocation ? "📍 Using Live Location" : "👤 Use My Location"}
                  </button>
                </div>
              </div>
              
              {/* Map Container */}
              <div style={{
                height: "300px",
                borderRadius: "var(--border-radius-sm)",
                overflow: "hidden",
                border: "1px solid var(--border-color)"
              }}>
                <LiveMap
                  location={crop.location}
                  destination={null}
                  useLiveLocation={useCurrentLocation}
                  onLocationUpdate={handleLocationUpdate}
                />
              </div>
              
              {/* Coordinates Display */}
              <div style={{
                display: "flex",
                gap: "16px",
                marginTop: "8px",
                fontSize: "12px",
                color: "var(--text-secondary)"
              }}>
                <span>Latitude: {crop.location.lat.toFixed(6) || "Not set"}</span>
                <span>Longitude: {crop.location.lng.toFixed(6) || "Not set"}</span>
              </div>
            </div>

            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              Coordinates: {crop.location.lat.toFixed(6)}, {crop.location.lng.toFixed(6)}
            </div>
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
