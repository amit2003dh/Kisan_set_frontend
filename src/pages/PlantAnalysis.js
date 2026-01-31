import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './PlantAnalysis.css';

const PlantAnalysis = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setSelectedImage(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target.result);
        };
        reader.readAsDataURL(file);
        setAnalysisResult(null);
        setError(null);
      } else {
        setError('Please select a valid image file');
      }
    }
  };

  const analyzePlant = async () => {
    if (!selectedImage) {
      setError('Please select an image first');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);

      // Mock API call - replace with actual plant analysis API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock analysis results
      const mockResults = {
        disease: "Leaf Blight",
        confidence: 0.85,
        severity: "Moderate",
        recommendations: [
          "Remove affected leaves immediately",
          "Apply copper-based fungicide",
          "Improve air circulation around plants",
          "Water at the base of the plant, not on leaves"
        ],
        healthy: false,
        alternative_diseases: [
          { name: "Leaf Spot", confidence: 0.10 },
          { name: "Powdery Mildew", confidence: 0.05 }
        ]
      };

      setAnalysisResult(mockResults);
    } catch (err) {
      setError('Failed to analyze the plant image. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setAnalysisResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'severe': return '#f44336';
      case 'moderate': return '#ff9800';
      case 'mild': return '#ffc107';
      case 'healthy': return '#4caf50';
      default: return '#2196f3';
    }
  };

  const getHealthStatus = () => {
    if (!analysisResult) return null;
    return analysisResult.healthy ? 'Healthy' : 'Disease Detected';
  };

  return (
    <div className="plant-analysis-container">
      <div className="plant-analysis-header">
        <button 
          onClick={() => navigate('/seller')}
          className="back-button"
        >
          ← Back to Dashboard
        </button>
        <h1>🌿 Plant Analysis Tool</h1>
        <p>Upload a plant image to detect diseases and get treatment recommendations</p>
      </div>

      <div className="plant-analysis-content">
        <div className="upload-section">
          <div className="upload-area">
            {imagePreview ? (
              <div className="image-preview">
                <img src={imagePreview} alt="Plant for analysis" />
                <button 
                  onClick={resetAnalysis}
                  className="remove-image-btn"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="upload-placeholder">
                <div className="upload-icon">📸</div>
                <h3>Upload Plant Image</h3>
                <p>Take a clear photo of the affected plant part</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  style={{ display: 'none' }}
                  id="plant-image-upload"
                />
                <label htmlFor="plant-image-upload" className="upload-button">
                  Choose Image
                </label>
              </div>
            )}
          </div>

          {imagePreview && (
            <div className="analysis-controls">
              <button
                onClick={analyzePlant}
                disabled={isAnalyzing}
                className="analyze-button"
              >
                {isAnalyzing ? 'Analyzing...' : '🔍 Analyze Plant'}
              </button>
              <button
                onClick={resetAnalysis}
                className="reset-button"
              >
                🔄 Reset
              </button>
            </div>
          )}

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}
        </div>

        {analysisResult && (
          <div className="results-section">
            <h2>Analysis Results</h2>
            
            <div className="result-overview">
              <div className="status-badge" style={{ 
                backgroundColor: getSeverityColor(analysisResult.severity),
                color: 'white'
              }}>
                {getHealthStatus()}
              </div>
              <div className="confidence-score">
                Confidence: {(analysisResult.confidence * 100).toFixed(1)}%
              </div>
            </div>

            <div className="disease-details">
              <h3>Detected Disease</h3>
              <div className="disease-info">
                <h4>{analysisResult.disease}</h4>
                <div className="severity-indicator">
                  <span>Severity: </span>
                  <span 
                    className="severity-badge"
                    style={{ backgroundColor: getSeverityColor(analysisResult.severity) }}
                  >
                    {analysisResult.severity}
                  </span>
                </div>
              </div>
            </div>

            <div className="recommendations">
              <h3>📋 Treatment Recommendations</h3>
              <ul>
                {analysisResult.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>

            {analysisResult.alternative_diseases && analysisResult.alternative_diseases.length > 0 && (
              <div className="alternatives">
                <h3>🔍 Other Possible Conditions</h3>
                <div className="alternative-list">
                  {analysisResult.alternative_diseases.map((alt, index) => (
                    <div key={index} className="alternative-item">
                      <span>{alt.name}</span>
                      <span className="confidence">{(alt.confidence * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="action-buttons">
              <button 
                onClick={() => navigate('/seller/products')}
                className="shop-products-btn"
              >
                🛒 Shop Treatment Products
              </button>
              <button 
                onClick={() => navigate('/seller/orders')}
                className="view-orders-btn"
              >
                📦 View Orders
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlantAnalysis;
