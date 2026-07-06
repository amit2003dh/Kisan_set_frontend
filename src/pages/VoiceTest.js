import { useState } from "react";
import API from "../api/api";
import { apiCall } from "../api/api";

export default function VoiceTest() {
  const [testResult, setTestResult] = useState("");
  const [loading, setLoading] = useState(false);

  const testGeminiAPI = async () => {
    setLoading(true);
    setTestResult("Testing Gemini API...");
    
    try {    
      const { data, error } = await apiCall(() =>
        API.post("/gemini/voice-intent", { 
          text: "मेरी फसल पीली है क्या करूं?",
          prompt: "You are an expert agriculture assistant. Provide specific advice for farmers."
        })
      );
      
      if (error) {
        setTestResult(`❌ API Error: ${error}`);
      } else if (data?.success && data?.intent) {
        setTestResult(`✅ Gemini Working!\n\nQuery: "मेरी फसल पीली है क्या करूं?"\n\nResponse: ${data.intent}`);
      } else if (data?.fallback && data?.intent) {
        setTestResult(`⚠️ Gemini Fallback Working!\n\nQuery: "मेरी फसल पीली है क्या करूं?"\n\nResponse: ${data.intent}`);
      } else {
        setTestResult(`❌ Invalid Response: ${JSON.stringify(data, null, 2)}`);
      }
    } catch (error) {
      setTestResult(`❌ Network Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
      <div className="page-header">
        <h1>🎤 Voice Assistant Test</h1>
        <p>Test the voice assistant Gemini API integration</p>
      </div>

      <div className="card" style={{ maxWidth: "600px", margin: "0 auto" }}>
        <h2 style={{ marginBottom: "24px", fontSize: "20px" }}>API Test</h2>
        
        <button
          onClick={testGeminiAPI}
          disabled={loading}
          className="btn btn-primary"
          style={{ marginBottom: "24px", width: "100%" }}
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
              Testing...
            </>
          ) : (
            "🧪 Test Gemini API"
          )}
        </button>

        {testResult && (
          <div style={{
            padding: "16px",
            background: testResult.includes("✅") ? "#e8f5e9" : testResult.includes("⚠️") ? "#fff3e0" : "#ffebee",
            border: `1px solid ${testResult.includes("✅") ? "var(--primary-green)" : testResult.includes("⚠️") ? "#ff9800" : "var(--danger)"}`,
            borderRadius: "var(--border-radius-sm)",
            whiteSpace: "pre-wrap",
            fontSize: "14px",
            lineHeight: "1.5"
          }}>
            {testResult}
          </div>
        )}

        <div style={{ marginTop: "24px", padding: "16px", background: "#f0f9ff", borderRadius: "var(--border-radius-sm)" }}>
          <h3 style={{ fontSize: "16px", marginBottom: "12px" }}>🔍 Troubleshooting Tips:</h3>
          <ul style={{ fontSize: "14px", margin: 0, paddingLeft: "20px" }}>
            <li>Check if GEMINI_API_KEY is set in backend .env file</li>
            <li>Ensure backend server is running on port 5000</li>
            <li>Check browser console for network errors</li>
            <li>Verify internet connection for Gemini API calls</li>
            <li>If fallback works, Gemini API key might be invalid</li>
          </ul>
        </div>

        <div style={{ marginTop: "16px" }}>
          <button
            onClick={() => window.location.href = "/"}
            className="btn btn-secondary"
            style={{ width: "100%" }}
          >
            🏠 Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
