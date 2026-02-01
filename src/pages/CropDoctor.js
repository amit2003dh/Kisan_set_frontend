import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './CropDoctor.css';

export default function CropDoctor() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        if (file.size > 10 * 1024 * 1024) {
          setError('Image size should be less than 10MB');
          return;
        }
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

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        if (file.size > 10 * 1024 * 1024) {
          setError('Image size should be less than 10MB');
          return;
        }
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

  const analyzeCrop = async () => {
    if (!selectedImage) {
      setError('Please select an image first');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);

      // Call backend API for crop analysis
      const response = await fetch(`${API_BASE_URL}/crop-analysis`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.result) {
        setAnalysisResult(data.result);
        
        // Add to analysis history
        const historyItem = {
          id: Date.now(),
          timestamp: new Date().toLocaleString(),
          disease: data.result.disease,
          severity: data.result.severity,
          confidence: data.result.confidence,
          imagePreview: imagePreview
        };
        setAnalysisHistory(prev => [historyItem, ...prev].slice(0, 10));
        
      } else if (data.error) {
        setError(data.error);
      }
      
    } catch (err) {
      console.error('Analysis error:', err);
      if (err.message.includes('fetch')) {
        setError('Unable to connect to analysis server. Please ensure the backend server is running on localhost:5000');
      } else {
        setError('Failed to analyze the crop image. Please try again.');
      }
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

  const downloadPDFReport = async () => {
    console.log('PDF download attempted, analysisResult:', analysisResult);
    if (!analysisResult) {
      setError('No analysis result available for download');
      return;
    }

    try {
      console.log('Making PDF download request...');
      const response = await fetch('http://localhost:5000/api/crop-analysis/download-crop-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          result: analysisResult,
          image: imagePreview
        }),
      });

      console.log('PDF response status:', response.status);
      console.log('PDF response headers:', response.headers);

      if (response.ok) {
        const blob = await response.blob();
        console.log('PDF blob size:', blob.size);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Crop_Analysis_Report_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        console.log('PDF download completed');
      } else {
        const errorText = await response.text();
        console.error('PDF download failed:', response.status, errorText);
        setError('Failed to generate PDF report');
      }
    } catch (err) {
      console.error('PDF download error:', err);
      setError('Failed to download PDF report. Please try again.');
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

  const getSpreadRiskColor = (risk) => {
    switch (risk?.toLowerCase()) {
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#2196f3';
    }
  };

  return (
    <div className="crop-doctor-container">
      <div className="crop-doctor-header">
        <button 
          onClick={() => navigate(-1)}
          className="back-button"
        >
          ← Back
        </button>
        <h1>🌾 Crop Doctor</h1>
        <p>Advanced AI-powered crop disease detection and treatment recommendations</p>
      </div>

      <div className="crop-doctor-content">
        <div className="upload-section">
          <div className="upload-area" 
               onDragEnter={handleDrag}
               onDragLeave={handleDrag}
               onDragOver={handleDrag}
               onDrop={handleDrop}>
            {imagePreview ? (
              <div className="image-preview">
                <img src={imagePreview} alt="Crop for analysis" />
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
                <h3>Upload Crop Image</h3>
                <p>Drag & drop or click to upload a clear photo of the affected crop</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  style={{ display: 'none' }}
                  id="crop-image-upload"
                />
                <label htmlFor="crop-image-upload" className="upload-button">
                  Choose Image
                </label>
              </div>
            )}
          </div>

          {imagePreview && (
            <div className="analysis-controls">
              <button
                onClick={analyzeCrop}
                disabled={isAnalyzing}
                className="analyze-button"
              >
                {isAnalyzing ? 'Analyzing...' : '🔍 Analyze Crop'}
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
            <div className="results-header">
              <h2>Analysis Results</h2>
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className="history-toggle-btn"
              >
                📊 {showHistory ? 'Hide' : 'Show'} History
              </button>
            </div>
            
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
              <h3>🔬 Disease Information</h3>
              <div className="disease-info">
                <h4>{analysisResult.disease}</h4>
                <div className="disease-meta">
                  <div className="meta-item">
                    <span>Crop Type:</span>
                    <strong>{analysisResult.cropType}</strong>
                  </div>
                  <div className="meta-item">
                    <span>Severity:</span>
                    <span 
                      className="severity-badge"
                      style={{ backgroundColor: getSeverityColor(analysisResult.severity) }}
                    >
                      {analysisResult.severity}
                    </span>
                  </div>
                  <div className="meta-item">
                    <span>Affected Area:</span>
                    <strong>{analysisResult.affectedArea}</strong>
                  </div>
                  <div className="meta-item">
                    <span>Spread Risk:</span>
                    <span 
                      className="risk-badge"
                      style={{ backgroundColor: getSpreadRiskColor(analysisResult.spreadRisk) }}
                    >
                      {analysisResult.spreadRisk}
                    </span>
                  </div>
                  <div className="meta-item">
                    <span>Treatment Cost:</span>
                    <strong>{analysisResult.treatmentCost}</strong>
                  </div>
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

            <div className="prevention-tips">
              <h3>🛡️ Prevention Tips</h3>
              <ul>
                {analysisResult.preventionTips.map((tip, index) => (
                  <li key={index}>{tip}</li>
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
                onClick={() => navigate('/products')}
                className="shop-products-btn"
              >
                🛒 Shop Treatment Products
              </button>
              <button 
                onClick={() => navigate('/crops')}
                className="manage-crops-btn"
              >
                🌾 Manage Crops
              </button>
              <button 
                onClick={downloadPDFReport}
                className="download-pdf-btn"
              >
                📄 Download PDF Report
              </button>
            </div>
          </div>
        )}

        {showHistory && (
          <div className="history-section">
            <h3>📊 Analysis History</h3>
            {analysisHistory.length > 0 ? (
              <div className="history-list">
                {analysisHistory.map((item) => (
                  <div key={item.id} className="history-item">
                    <img src={item.imagePreview} alt="Previous analysis" />
                    <div className="history-info">
                      <div className="history-disease">{item.disease}</div>
                      <div className="history-meta">
                        <span className="history-severity" style={{ 
                          backgroundColor: getSeverityColor(item.severity) 
                        }}>
                          {item.severity}
                        </span>
                        <span className="history-confidence">
                          {(item.confidence * 100).toFixed(1)}%
                        </span>
                        <span className="history-time">{item.timestamp}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No analysis history yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
