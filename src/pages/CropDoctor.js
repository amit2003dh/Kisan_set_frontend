import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Stethoscope,
  Camera,
  Search,
  RefreshCw,
  AlertTriangle,
  BarChart3,
  Microscope,
  ClipboardList,
  ShieldCheck,
  ShoppingBag,
  Sprout,
  FileText,
  X
} from 'lucide-react';
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
        setError('Please drop a valid image file');
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

    const formData = new FormData();
    formData.append('image', selectedImage);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/ai/crop-doctor`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        const raw = data.data || data;
        const diseaseLower = (raw.disease || "").toLowerCase();
        const isNoCrop = diseaseLower.includes("no crop") || diseaseLower.includes("not a crop") || diseaseLower.includes("no plant") || diseaseLower.includes("unknown") || diseaseLower === "n/a";
        const isHealthy = diseaseLower.includes("healthy") || raw.healthy === true;

        let recommendations = [];
        if (isNoCrop) {
          recommendations = ["No crop or plant detected in the uploaded image. Please upload a clear, close-up photo of a plant leaf, stem, or crop."];
        } else if (isHealthy) {
          recommendations = ["Your crop appears healthy! Continue standard irrigation, balanced fertilization, and regular field monitoring."];
        } else if (Array.isArray(raw.recommendations) && raw.recommendations.length > 0 && !raw.recommendations.includes("N/A")) {
          recommendations = raw.recommendations;
        } else if (typeof raw.treatment === 'string' && raw.treatment.trim() && raw.treatment !== "N/A") {
          recommendations = raw.treatment.split(/[\n.]+/).map(s => s.trim()).filter(Boolean);
        } else if (Array.isArray(raw.treatment) && raw.treatment.length > 0) {
          recommendations = raw.treatment;
        } else {
          recommendations = ["Apply recommended agricultural treatments as advised by local expert."];
        }

        let preventionTips = [];
        if (isNoCrop) {
          preventionTips = ["To receive an accurate diagnosis, upload a focused, high-resolution photo showing the affected plant parts."];
        } else if (Array.isArray(raw.preventionTips) && raw.preventionTips.length > 0 && !raw.preventionTips.includes("N/A")) {
          preventionTips = raw.preventionTips;
        } else if (typeof raw.prevention === 'string' && raw.prevention.trim() && raw.prevention !== "N/A") {
          preventionTips = raw.prevention.split(/[\n.]+/).map(s => s.trim()).filter(Boolean);
        } else if (Array.isArray(raw.prevention) && raw.prevention.length > 0) {
          preventionTips = raw.prevention;
        } else {
          preventionTips = ["Ensure proper soil drainage, crop rotation, and regular monitoring."];
        }

        const normalized = {
          ...raw,
          isNoCrop,
          isHealthy,
          severity: isNoCrop ? "N/A" : isHealthy ? "Healthy" : (raw.severity || "Moderate"),
          spreadRisk: (isNoCrop || isHealthy) ? "N/A" : (raw.spreadRisk || "Medium"),
          treatmentCost: (isNoCrop || isHealthy) ? "N/A" : (raw.treatmentCost && raw.treatmentCost !== "N/A" ? raw.treatmentCost : "₹200 - ₹500"),
          recommendations,
          preventionTips
        };

        setAnalysisResult(normalized);
        const historyItem = {
          id: Date.now(),
          timestamp: new Date().toLocaleDateString(),
          imagePreview: imagePreview,
          disease: normalized.disease,
          severity: normalized.severity,
          confidence: normalized.confidence
        };
        setAnalysisHistory(prev => [historyItem, ...prev.slice(0, 4)]);
      } else {
        setError(data.message || 'Analysis failed. Please try again.');
      }
    } catch (err) {
      console.error('Crop analysis error:', err);
      setError('Failed to connect to analysis service. Please try again.');
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
    if (!analysisResult) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/crops/download-pdf-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          analysisData: analysisResult,
          imagePreview: imagePreview
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `CropDoctor_Report_${analysisResult.disease?.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        setError('Failed to generate PDF report');
      }
    } catch (err) {
      console.error('PDF download error:', err);
      setError('Failed to download PDF report. Please try again.');
    }
  };

  const getSeverityColor = (severity) => {
    if (analysisResult?.isNoCrop || severity === 'N/A') return '#ed6c02';
    if (analysisResult?.isHealthy || severity === 'Healthy') return '#2e7d32';
    switch (severity?.toLowerCase()) {
      case 'severe': case 'high': return '#d32f2f';
      case 'moderate': case 'medium': return '#ed6c02';
      case 'mild': case 'low': return '#0288d1';
      default: return '#64748b';
    }
  };

  const getHealthStatus = () => {
    if (!analysisResult) return null;
    if (analysisResult.isNoCrop) return 'No Crop Detected';
    if (analysisResult.isHealthy) return 'Healthy Crop';
    return 'Disease Detected';
  };

  const getSpreadRiskColor = (risk) => {
    if (analysisResult?.isNoCrop || risk === 'N/A') return '#64748b';
    if (analysisResult?.isHealthy) return '#2e7d32';
    switch (risk?.toLowerCase()) {
      case 'high': case 'severe': return '#d32f2f';
      case 'medium': case 'moderate': return '#ed6c02';
      case 'low': case 'mild': return '#2e7d32';
      default: return '#64748b';
    }
  };

  return (
    <div className="crop-doctor-container">
      <div className="crop-doctor-header">
        <button 
          onClick={() => navigate(-1)}
          className="back-button"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
        <h1 style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
          <Stethoscope size={36} color="#2e7d32" />
          <span>Crop Doctor</span>
        </h1>
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
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="upload-placeholder">
                <div className="upload-icon" style={{ display: 'flex', justifyContent: 'center' }}>
                  <Camera size={48} color="#2e7d32" />
                </div>
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
                <label htmlFor="crop-image-upload" className="upload-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Camera size={18} />
                  <span>Choose Image</span>
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
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
              >
                <Search size={18} />
                <span>{isAnalyzing ? 'Analyzing...' : 'Analyze Crop'}</span>
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
            <div className="results-header">
              <h2>Analysis Results</h2>
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className="history-toggle-btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <BarChart3 size={16} />
                <span>{showHistory ? 'Hide' : 'Show'} History</span>
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
                Confidence: {typeof analysisResult.confidence === 'number' ? (analysisResult.confidence * 100).toFixed(1) + '%' : analysisResult.confidence || 'High'}
              </div>
            </div>

            <div className="disease-details">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Microscope size={20} color="#2d6a4f" />
                <span>{analysisResult.isNoCrop ? "Image Diagnostics" : analysisResult.isHealthy ? "Health Assessment" : "Disease Information"}</span>
              </h3>
              <div className="disease-info" style={{ borderLeftColor: getSeverityColor(analysisResult.severity) }}>
                <h4>{analysisResult.disease}</h4>
                <div className="disease-meta">
                  {analysisResult.cropType && (
                    <div className="meta-item">
                      <span>Crop Type:</span>
                      <strong>{analysisResult.cropType}</strong>
                    </div>
                  )}
                  <div className="meta-item">
                    <span>Severity:</span>
                    <span 
                      className="severity-badge"
                      style={{ backgroundColor: getSeverityColor(analysisResult.severity) }}
                    >
                      {analysisResult.severity}
                    </span>
                  </div>
                  {analysisResult.affectedArea && (
                    <div className="meta-item">
                      <span>Affected Area:</span>
                      <strong>{analysisResult.affectedArea}</strong>
                    </div>
                  )}
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
                    <strong>{analysisResult.treatmentCost || "N/A"}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="recommendations">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardList size={20} color="#2e7d32" />
                <span>{analysisResult.isNoCrop ? "Detection Guidance" : analysisResult.isHealthy ? "Crop Care Advice" : "Treatment Recommendations"}</span>
              </h3>
              <ul>
                {(analysisResult.recommendations || []).map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>

            <div className="prevention-tips">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="#2e7d32" />
                <span>Prevention Tips</span>
              </h3>
              <ul>
                {(analysisResult.preventionTips || []).map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>

            {analysisResult.alternative_diseases && Array.isArray(analysisResult.alternative_diseases) && analysisResult.alternative_diseases.length > 0 && (
              <div className="alternatives">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Search size={20} color="#2e7d32" />
                  <span>Other Possible Conditions</span>
                </h3>
                <div className="alternative-list">
                  {(analysisResult.alternative_diseases || []).map((alt, index) => (
                    <div key={index} className="alternative-item">
                      <span>{alt.name || alt}</span>
                      {alt.confidence && <span className="confidence">{(alt.confidence * 100).toFixed(1)}%</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="action-buttons">
              <button 
                onClick={() => navigate('/products')}
                className="shop-products-btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
              >
                <ShoppingBag size={18} />
                <span>Shop Treatment Products</span>
              </button>
              <button 
                onClick={() => navigate('/crops')}
                className="manage-crops-btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
              >
                <Sprout size={18} />
                <span>Manage Crops</span>
              </button>
              <button 
                onClick={downloadPDFReport}
                className="download-pdf-btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
              >
                <FileText size={18} />
                <span>Download PDF Report</span>
              </button>
            </div>
          </div>
        )}

        {showHistory && (
          <div className="history-section">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={20} color="#2e7d32" />
              <span>Analysis History</span>
            </h3>
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
                          {typeof item.confidence === 'number' ? (item.confidence * 100).toFixed(1) + '%' : item.confidence || 'High'}
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
