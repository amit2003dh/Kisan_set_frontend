import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import { apiCall } from "../api/api";

export default function CropDoctor() {
  const navigate = useNavigate();
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setResult(null);
      setError("");
    }
  };

  const analyze = async () => {
    if (!image) {
      setError("Please select an image first");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("image", image);

    const { data, error: err } = await apiCall(() => 
      API.post("/ai/crop-doctor", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
    );

    if (err) {
      setError(err || "Failed to analyze image. Please try again.");
      setLoading(false);
    } else {
      setResult({
        disease: data.disease || "Unknown",
        solution: data.solution || "Please consult with an agricultural expert for treatment recommendations."
      });
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
      <div className="page-header">
        <h1>👨‍⚕️ AI Crop Doctor</h1>
        <p>Upload an image of your crop to detect diseases and get treatment suggestions</p>
      </div>

      <div className="grid" style={{ 
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", 
        gap: "32px"
      }}>
        {/* Image Upload Section */}
        <div className="card">
          <h2 style={{ marginBottom: "24px", fontSize: "20px", color: "var(--text-primary)" }}>
            Upload Crop Image
          </h2>

          {error && <div className="error-message">{error}</div>}

          <div style={{
            border: "2px dashed var(--border)",
            borderRadius: "var(--border-radius-sm)",
            padding: "40px",
            textAlign: "center",
            marginBottom: "24px",
            background: imagePreview ? "transparent" : "var(--background)",
            position: "relative",
            minHeight: "300px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center"
          }}>
            {imagePreview ? (
              <div style={{ width: "100%" }}>
                <img
                  src={imagePreview}
                  alt="Crop preview"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "300px",
                    borderRadius: "var(--border-radius-sm)",
                    objectFit: "contain"
                  }}
                />
                <button
                  onClick={() => {
                    setImage(null);
                    setImagePreview(null);
                    setResult(null);
                  }}
                  className="btn btn-secondary"
                  style={{ marginTop: "16px", fontSize: "14px" }}
                >
                  Remove Image
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: "64px", marginBottom: "16px" }}>📷</div>
                <p style={{ color: "var(--text-secondary)", marginBottom: "16px" }}>
                  Click to upload or drag and drop
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="btn btn-primary"
                  style={{ cursor: "pointer", display: "inline-block" }}
                >
                  Choose Image
                </label>
              </div>
            )}
          </div>

          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: "none" }}
              id="image-upload-hidden"
            />
            <label
              htmlFor="image-upload-hidden"
              className="btn btn-secondary"
              style={{ width: "100%", marginBottom: "16px", cursor: "pointer", display: "block", textAlign: "center" }}
            >
              {imagePreview ? "Change Image" : "Select Image"}
            </label>
          </div>

          <button
            onClick={analyze}
            className="btn btn-primary"
            disabled={!image || loading}
            style={{ width: "100%" }}
          >
            {loading ? (
              <>
                <div className="loading-spinner" style={{
                  width: "20px",
                  height: "20px",
                  borderWidth: "2px",
                  margin: "0"
                }}></div>
                Analyzing...
              </>
            ) : (
              "🔍 Analyze Crop"
            )}
          </button>
        </div>

        {/* Results Section */}
        <div className="card">
          <h2 style={{ marginBottom: "24px", fontSize: "20px", color: "var(--text-primary)" }}>
            Analysis Results
          </h2>

          {!result && !loading && (
            <div className="empty-state" style={{ padding: "60px 20px" }}>
              <div style={{ fontSize: "64px", marginBottom: "16px", opacity: 0.5 }}>🔬</div>
              <p style={{ color: "var(--text-secondary)" }}>
                Upload an image and click "Analyze Crop" to get results
              </p>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div className="loading-spinner"></div>
              <p style={{ color: "var(--text-secondary)", marginTop: "16px" }}>
                Analyzing your crop image...
              </p>
            </div>
          )}

          {result && (
            <div>
              <div style={{
                background: "#fff3e0",
                borderLeft: "4px solid #ff9800",
                padding: "20px",
                borderRadius: "var(--border-radius-sm)",
                marginBottom: "24px"
              }}>
                <div style={{
                  fontSize: "14px",
                  color: "#f57c00",
                  fontWeight: "600",
                  marginBottom: "8px",
                  textTransform: "uppercase"
                }}>
                  Detected Disease
                </div>
                <h3 style={{
                  fontSize: "24px",
                  color: "var(--text-primary)",
                  margin: 0,
                  fontWeight: "700"
                }}>
                  {result.disease}
                </h3>
              </div>

              <div style={{
                background: "#e8f5e9",
                borderLeft: "4px solid var(--primary-green)",
                padding: "20px",
                borderRadius: "var(--border-radius-sm)",
                marginBottom: "24px"
              }}>
                <div style={{
                  fontSize: "14px",
                  color: "var(--primary-green)",
                  fontWeight: "600",
                  marginBottom: "8px",
                  textTransform: "uppercase"
                }}>
                  Recommended Solution
                </div>
                <p style={{
                  fontSize: "16px",
                  color: "var(--text-primary)",
                  margin: 0,
                  lineHeight: "1.6"
                }}>
                  {result.solution}
                </p>
              </div>

              <button
                onClick={() => navigate("/products?type=pesticide")}
                className="btn btn-primary"
                style={{ width: "100%" }}
              >
                🛒 Buy Recommended Treatment
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
