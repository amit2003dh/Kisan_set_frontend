import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import { apiCall } from "../api/api";
import { User, Camera, Save, UploadCloud } from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    location: ""
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
  const STATIC_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const fetchUserProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    
    const { data, error: err } = await apiCall(() => API.get("/users/me"));
    
    if (err) {
      if (err.includes("Unauthorized") || err.includes("token")) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("userRole");
        navigate("/");
        return;
      }
      setError(err);
    } else {
      setUser(data);
      setFormData({
        name: data.name || "",
        phone: data.phone || "",
        location: data.location || ""
      });
      if (data.profilePhoto) {
        setPhotoPreview(`${STATIC_BASE_URL}${data.profilePhoto}`);
      } else {
        setPhotoPreview(null);
      }
    }
    
    setLoading(false);
  }, [STATIC_BASE_URL, navigate]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    
    setError("");
    setSuccess("");
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
      if (!validTypes.includes(file.type.toLowerCase())) {
        setError("Invalid file type. Only JPEG, PNG, GIF, and WEBP images are allowed.");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("File size too large. Maximum size is 5MB.");
        return;
      }

      setSelectedPhoto(file);
      setError("");

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = async () => {
    if (!selectedPhoto) return;

    setUploading(true);
    setError("");
    setSuccess("");

    const photoFormData = new FormData();
    photoFormData.append("profilePhoto", selectedPhoto);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/users/profile-photo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: photoFormData
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Profile photo updated successfully!");
        const updatedPhotoUrl = `${STATIC_BASE_URL}${data.profilePhoto}?t=${Date.now()}`;
        setPhotoPreview(updatedPhotoUrl);
        setSelectedPhoto(null);

        // Update local storage user data
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          userData.profilePhoto = data.profilePhoto;
          localStorage.setItem("user", JSON.stringify(userData));
        }

        setUser(prev => ({
          ...prev,
          profilePhoto: data.profilePhoto
        }));
      } else {
        setError(data.error || data.message || "Failed to upload profile photo");
      }
    } catch (err) {
      console.error("Photo upload error:", err);
      setError("Network error. Failed to upload photo.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    // Validate phone number
    if (formData.phone && formData.phone.length !== 10) {
      setError("Phone number must be exactly 10 digits");
      setSaving(false);
      return;
    }

    const { data, error: err } = await apiCall(() =>
      API.put("/users/profile", formData)
    );

    if (err) {
      setError(err);
    } else {
      setSuccess("Profile updated successfully!");
      
      // Update local storage
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        setUser(data.user);
      }
      
      setTimeout(() => setSuccess(""), 3000);
    }
    
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
        <div className="loading-spinner"></div>
        <p style={{ textAlign: "center", color: "var(--text-secondary)" }}>
          Loading profile...
        </p>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
      <div className="page-header">
        <h1 style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
          <User size={32} color="var(--primary-blue)" />
          <span>My Profile</span>
        </h1>
        <p>Manage your profile information and photo</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 2fr",
        gap: "24px"
      }} className="profile-grid">
        {/* Photo Section */}
        <div className="card">
          <h2 style={{
            fontSize: "20px",
            marginBottom: "20px",
            color: "var(--text-primary)"
          }}>
            Profile Photo
          </h2>
          
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px"
          }}>
            <div style={{
              width: "150px",
              height: "150px",
              borderRadius: "50%",
              overflow: "hidden",
              border: "4px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--background)"
            }}>
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Profile"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  }}
                  onError={(e) => {
                    console.error("Failed to load profile photo:", photoPreview);
                    // If it's a server URL that failed, try without timestamp
                    if (photoPreview.includes("?t=")) {
                      const baseUrl = photoPreview.split("?t=")[0];
                      e.target.src = baseUrl;
                    } else {
                      setPhotoPreview(null);
                    }
                  }}
                />
              ) : (
                <User size={64} color="var(--text-light)" />
              )}
            </div>

            <div style={{ width: "100%" }}>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handlePhotoChange}
                style={{ display: "none" }}
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="btn btn-secondary"
                style={{
                  width: "100%",
                  textAlign: "center",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px"
                }}
              >
                <Camera size={18} />
                <span>Choose Photo</span>
              </label>
            </div>

            {selectedPhoto && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePhotoUpload}
                disabled={uploading}
                style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                {uploading ? (
                  <>
                    <div className="loading-spinner" style={{
                      width: "16px",
                      height: "16px",
                      borderWidth: "2px",
                      margin: "0"
                    }}></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <UploadCloud size={18} />
                    <span>Upload Photo</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Profile Details Form */}
        <div className="card">
          <h2 style={{
            fontSize: "20px",
            marginBottom: "20px",
            color: "var(--text-primary)"
          }}>
            Profile Details
          </h2>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                color: "var(--text-primary)",
                fontWeight: "600"
              }}>
                Full Name *
              </label>
              <input
                className="input"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Enter your full name"
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                color: "var(--text-primary)",
                fontWeight: "600"
              }}>
                Email
              </label>
              <input
                className="input"
                type="email"
                value={user?.email || ""}
                disabled
                style={{
                  background: "var(--background)",
                  cursor: "not-allowed"
                }}
              />
              <p style={{
                fontSize: "12px",
                color: "var(--text-light)",
                marginTop: "4px"
              }}>
                Email cannot be changed
              </p>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                color: "var(--text-primary)",
                fontWeight: "600"
              }}>
                Phone Number (10 digits)
              </label>
              <input
                className="input"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Enter 10-digit phone number"
                maxLength="10"
              />
              {formData.phone && formData.phone.length !== 10 && (
                <p style={{
                  fontSize: "12px",
                  color: "var(--error)",
                  marginTop: "4px"
                }}>
                  Phone number must be exactly 10 digits
                </p>
              )}
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                color: "var(--text-primary)",
                fontWeight: "600"
              }}>
                Role
              </label>
              <input
                className="input"
                type="text"
                value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ""}
                disabled
                style={{
                  background: "var(--background)",
                  cursor: "not-allowed"
                }}
              />
              <p style={{
                fontSize: "12px",
                color: "var(--text-light)",
                marginTop: "4px"
              }}>
                Role cannot be changed
              </p>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                color: "var(--text-primary)",
                fontWeight: "600"
              }}>
                Location
              </label>
              <input
                className="input"
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Enter your location"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
            >
              {saving ? (
                <>
                  <div className="loading-spinner" style={{
                    width: "20px",
                    height: "20px",
                    borderWidth: "2px",
                    margin: "0"
                  }}></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
