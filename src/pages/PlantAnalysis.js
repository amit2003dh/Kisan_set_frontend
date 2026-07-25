import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Leaf,
  Camera,
  Search,
  RefreshCw,
  AlertTriangle,
  ClipboardList,
  ShoppingBag,
  Package,
  X,
  ArrowLeft
} from 'lucide-react';
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
          { name: "Powdery Mildew", confidence: 0.12 },
          { name: "Rust", confidence: 0.03 }
        ]
      };

      setAnalysisResult(mockResults);
    } catch (err) {
      setError('Failed to analyze plant. Please try again.');
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
      default: return '#4caf50';
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
          onClick={() => navigate(-1)}
          className="back-button"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
        <h1 style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
          <Leaf size={32} color="#2e7d32" />
          <span>Plant Health Analysis</span>
        </h1>
        <p>Upload a photo of your crop to diagnose diseases and get treatment advice</p>
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
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="upload-placeholder">
                <div className="upload-icon" style={{ display: 'flex', justifyContent: 'center' }}>
                  <Camera size={48} color="#2e7d32" />
                </div>
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
                <label htmlFor="plant-image-upload" className="upload-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Camera size={18} />
                  <span>Choose Image</span>
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
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
              >
                <Search size={18} />
                <span>{isAnalyzing ? 'Analyzing...' : 'Analyze Plant'}</span>
              </button>
              <button
                onClick={resetAnalysis}
                className="reset-button"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
              >
                <RefreshCw size={18} />
                <span>Reset</span>
              </button>
            </div>
          )}

          {error && (
            <div className="error-message" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color="#d32f2f" />
              <span>{error}</span>
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
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardList size={20} color="#2e7d32" />
                <span>Treatment Recommendations</span>
              </h3>
              <ul>
                {analysisResult.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>

            {analysisResult.alternative_diseases && analysisResult.alternative_diseases.length > 0 && (
              <div className="alternatives">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Search size={20} color="#2e7d32" />
                  <span>Other Possible Conditions</span>
                </h3>
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
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
              >
                <ShoppingBag size={18} />
                <span>Shop Treatment Products</span>
              </button>
              <button 
                onClick={() => navigate('/seller/orders')}
                className="view-orders-btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
              >
                <Package size={18} />
                <span>View Orders</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlantAnalysis;
