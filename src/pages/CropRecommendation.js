import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import { apiCall } from "../api/api";

export default function CropRecommendation() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Form state
  const [formData, setFormData] = useState({
    location: "",
    soilType: "",
    climate: "",
    season: "",
    landSize: "",
    waterSource: "",
    budget: "",
    experience: "",
    purpose: ""
  });

  const soilTypes = ["Sandy", "Clay", "Loamy", "Silty", "Peaty", "Chalky"];
  const climates = ["Tropical", "Temperate", "Arid", "Mediterranean", "Continental"];
  const seasons = ["Summer", "Winter", "Monsoon", "Spring", "Autumn"];
  const waterSources = ["Rain-fed", "Well", "Canal", "Drip Irrigation", "Sprinkler"];
  const purposes = ["Commercial", "Subsistence", "Mixed Farming", "Organic"];

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError("");
  };

  const getRecommendations = async () => {
    // Validate required fields
    const requiredFields = ['location', 'soilType', 'climate', 'season', 'purpose'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      setError(`Please fill in: ${missingFields.join(', ')}`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error: err } = await apiCall(() =>
        API.post("/ai/crop-recommendation", formData)
      );

      if (err) {
        setError(err || "Failed to get recommendations. Please try again.");
      } else {
        setRecommendations(data);
      }
    } catch (error) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      location: "",
      soilType: "",
      climate: "",
      season: "",
      landSize: "",
      waterSource: "",
      budget: "",
      experience: "",
      purpose: ""
    });
    setRecommendations(null);
    setError("");
  };

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
      <div className="page-header">
        <h1>🌾 AI Crop Recommendation</h1>
        <p>Get personalized crop suggestions based on your farm conditions and requirements</p>
      </div>

      <div className="grid" style={{ 
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", 
        gap: "32px"
      }}>
        {/* Input Form */}
        <div className="card">
          <h2 style={{ marginBottom: "24px", fontSize: "20px", color: "var(--text-primary)" }}>
            📋 Farm Information
          </h2>

          {error && (
            <div className="error-message" style={{ marginBottom: "16px" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Location */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-primary)" }}>
                📍 Location * <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>(City/District)</span>
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                placeholder="e.g., Pune, Maharashtra"
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--border-radius-sm)",
                  fontSize: "14px"
                }}
              />
            </div>

            {/* Soil Type */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-primary)" }}>
                🌱 Soil Type *
              </label>
              <select
                value={formData.soilType}
                onChange={(e) => handleInputChange("soilType", e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--border-radius-sm)",
                  fontSize: "14px",
                  background: "white"
                }}
              >
                <option value="">Select soil type</option>
                {soilTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Climate */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-primary)" }}>
                🌤️ Climate *
              </label>
              <select
                value={formData.climate}
                onChange={(e) => handleInputChange("climate", e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--border-radius-sm)",
                  fontSize: "14px",
                  background: "white"
                }}
              >
                <option value="">Select climate</option>
                {climates.map(climate => (
                  <option key={climate} value={climate}>{climate}</option>
                ))}
              </select>
            </div>

            {/* Season */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-primary)" }}>
                📅 Planting Season *
              </label>
              <select
                value={formData.season}
                onChange={(e) => handleInputChange("season", e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--border-radius-sm)",
                  fontSize: "14px",
                  background: "white"
                }}
              >
                <option value="">Select season</option>
                {seasons.map(season => (
                  <option key={season} value={season}>{season}</option>
                ))}
              </select>
            </div>

            {/* Land Size */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-primary)" }}>
                📏 Land Size <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>(in acres)</span>
              </label>
              <input
                type="number"
                value={formData.landSize}
                onChange={(e) => handleInputChange("landSize", e.target.value)}
                placeholder="e.g., 5"
                min="0.1"
                step="0.1"
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--border-radius-sm)",
                  fontSize: "14px"
                }}
              />
            </div>

            {/* Water Source */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-primary)" }}>
                💧 Water Source
              </label>
              <select
                value={formData.waterSource}
                onChange={(e) => handleInputChange("waterSource", e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--border-radius-sm)",
                  fontSize: "14px",
                  background: "white"
                }}
              >
                <option value="">Select water source</option>
                {waterSources.map(source => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </div>

            {/* Budget */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-primary)" }}>
                💰 Budget <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>(per acre in ₹)</span>
              </label>
              <input
                type="number"
                value={formData.budget}
                onChange={(e) => handleInputChange("budget", e.target.value)}
                placeholder="e.g., 10000"
                min="1000"
                step="1000"
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--border-radius-sm)",
                  fontSize: "14px"
                }}
              />
            </div>

            {/* Experience */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-primary)" }}>
                👨‍🌾 Farming Experience
              </label>
              <select
                value={formData.experience}
                onChange={(e) => handleInputChange("experience", e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--border-radius-sm)",
                  fontSize: "14px",
                  background: "white"
                }}
              >
                <option value="">Select experience level</option>
                <option value="Beginner">Beginner (0-2 years)</option>
                <option value="Intermediate">Intermediate (2-5 years)</option>
                <option value="Experienced">Experienced (5+ years)</option>
              </select>
            </div>

            {/* Purpose */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "var(--text-primary)" }}>
                🎯 Farming Purpose *
              </label>
              <select
                value={formData.purpose}
                onChange={(e) => handleInputChange("purpose", e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--border-radius-sm)",
                  fontSize: "14px",
                  background: "white"
                }}
              >
                <option value="">Select purpose</option>
                {purposes.map(purpose => (
                  <option key={purpose} value={purpose}>{purpose}</option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
              <button
                onClick={getRecommendations}
                disabled={loading}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                {loading ? (
                  <>
                    <div className="loading-spinner" style={{
                      width: "20px",
                      height: "20px",
                      borderWidth: "2px",
                      margin: "0",
                      marginRight: "8px"
                    }}></div>
                    Analyzing...
                  </>
                ) : (
                  "🌾 Get Recommendations"
                )}
              </button>
              <button
                onClick={resetForm}
                disabled={loading}
                className="btn btn-secondary"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="card">
          <h2 style={{ marginBottom: "24px", fontSize: "20px", color: "var(--text-primary)" }}>
            📊 AI Recommendations
          </h2>

          {!recommendations && !loading && (
            <div className="empty-state" style={{ padding: "60px 20px" }}>
              <div style={{ fontSize: "64px", marginBottom: "16px", opacity: 0.5 }}>🌾</div>
              <p style={{ color: "var(--text-secondary)" }}>
                Fill in your farm details and click "Get Recommendations" to see AI-suggested crops
              </p>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div className="loading-spinner"></div>
              <p style={{ color: "var(--text-secondary)", marginTop: "16px" }}>
                🤖 AI is analyzing your farm conditions...
              </p>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginTop: "8px" }}>
                This may take a few seconds
              </p>
            </div>
          )}

          {recommendations && (
            <div>
              {/* Top Recommendations */}
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ fontSize: "18px", marginBottom: "16px", color: "var(--primary-green)" }}>
                  🏆 Top Recommended Crops
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {recommendations.topCrops?.map((crop, index) => (
                    <div key={index} style={{
                      background: "#e8f5e9",
                      border: "1px solid var(--primary-green)",
                      borderRadius: "var(--border-radius-sm)",
                      padding: "16px"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>
                          {crop.name}
                        </h4>
                        <span style={{
                          background: "var(--primary-green)",
                          color: "white",
                          padding: "4px 12px",
                          borderRadius: "16px",
                          fontSize: "12px",
                          fontWeight: "600"
                        }}>
                          {crop.matchScore}% Match
                        </span>
                      </div>
                      <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "var(--text-secondary)" }}>
                        {crop.reason}
                      </p>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{
                          background: "white",
                          padding: "4px 8px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          border: "1px solid var(--border)"
                        }}>
                          📅 {crop.duration}
                        </span>
                        <span style={{
                          background: "white",
                          padding: "4px 8px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          border: "1px solid var(--border)"
                        }}>
                          💰 ₹{crop.estimatedCost}/acre
                        </span>
                        <span style={{
                          background: "white",
                          padding: "4px 8px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          border: "1px solid var(--border)"
                        }}>
                          📊 {crop.expectedYield}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alternative Options */}
              {recommendations.alternativeCrops && recommendations.alternativeCrops.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <h3 style={{ fontSize: "18px", marginBottom: "16px", color: "var(--primary-blue)" }}>
                    🔄 Alternative Options
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {recommendations.alternativeCrops.map((crop, index) => (
                      <div key={index} style={{
                        background: "#e3f2fd",
                        border: "1px solid var(--primary-blue)",
                        borderRadius: "var(--border-radius-sm)",
                        padding: "12px"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: "600", fontSize: "14px" }}>{crop.name}</span>
                          <span style={{
                            background: "var(--primary-blue)",
                            color: "white",
                            padding: "2px 8px",
                            borderRadius: "12px",
                            fontSize: "11px"
                          }}>
                            {crop.matchScore}%
                          </span>
                        </div>
                        <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--text-secondary)" }}>
                          {crop.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Farming Tips */}
              {recommendations.tips && (
                <div style={{ marginBottom: "24px" }}>
                  <h3 style={{ fontSize: "18px", marginBottom: "16px", color: "#ff9800" }}>
                    💡 Farming Tips for Your Conditions
                  </h3>
                  <div style={{ background: "#fff8e1", border: "1px solid #ffa000", borderRadius: "var(--border-radius-sm)", padding: "16px" }}>
                    <ul style={{ margin: 0, paddingLeft: "20px" }}>
                      {recommendations.tips.map((tip, index) => (
                        <li key={index} style={{ marginBottom: "8px", fontSize: "14px", color: "var(--text-primary)" }}>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={() => navigate("/crops")}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  🌾 Browse Available Crops
                </button>
                <button
                  onClick={() => navigate("/ai-chatbot")}
                  className="btn btn-secondary"
                >
                  💬 Ask AI Assistant
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
