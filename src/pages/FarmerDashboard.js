import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../api/api";
import { apiCall } from "../api/api";

export default function FarmerDashboard() {
  const [stats, setStats] = useState({ crops: 0, orders: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [listening, setListening] = useState(false);
  const [voiceResult, setVoiceResult] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [cropsRes, ordersRes] = await Promise.all([
          API.get("/crops").catch(() => ({ data: [] })),
          API.get("/orders").catch(() => ({ data: [] }))
        ]);
        
        const crops = cropsRes.data || [];
        const orders = ordersRes.data || [];
        
        setStats({
          crops: crops.length,
          orders: orders.length,
          revenue: orders.reduce((sum, o) => sum + (o.total || 0), 0)
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const startVoice = () => {
    // Check for speech recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setVoiceResult("⚠️ Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3; // Get multiple recognition results

    setListening(true);
    setVoiceResult("🎤 Listening... Speak clearly in Hindi or English");

    recognition.onstart = () => {
      console.log("Voice recognition started");
      setVoiceResult("🎤 Listening... Speak clearly in Hindi or English");
    };

    recognition.onspeechstart = () => {
      setVoiceResult("👂 Hearing you... Speak now!");
    };

    recognition.onspeechend = () => {
      setVoiceResult("🔄 Processing your voice...");
      setListening(false);
    };

    recognition.onresult = async (e) => {
      console.log("Speech recognition result:", e.results);
      
      // Get the best result with highest confidence
      let bestTranscript = "";
      let bestConfidence = 0;
      
      for (let i = 0; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          for (let j = 0; j < result.length; j++) {
            const alternative = result[j];
            if (alternative.confidence > bestConfidence) {
              bestConfidence = alternative.confidence;
              bestTranscript = alternative.transcript;
            }
          }
        }
      }

      // Fallback to first result if no confidence data
      if (!bestTranscript && e.results[0] && e.results[0][0]) {
        bestTranscript = e.results[0][0].transcript;
      }

      const transcript = bestTranscript.trim();
      console.log("Final transcript:", transcript, "Confidence:", bestConfidence);

      if (!transcript) {
        setVoiceResult("❌ Could not understand your speech. Please try again speaking clearly.");
        return;
      }

      setVoiceResult(`✅ You said: "${transcript}"\n🔄 Processing your request...`);

      try {
        // Only predefined greetings - everything else goes to Gemini AI
        const lowerTranscript = transcript.toLowerCase().trim();
        
        // Check for basic greetings only
        if (lowerTranscript.match(/^(नमस्ते|hello|hi|hey|good morning|good afternoon|good evening|namaste)/)) {
          const greetingResponse = "नमस्ते किसान भाई! मैं आपकी खेती मदद के लिए यहाँ हूं। कृपया अपनी समस्या बताएं।";
          setVoiceResult(`✅ You said: "${transcript}"\n\n💡 ${greetingResponse}`);
          speakResponse(greetingResponse);
          return;
        }
        
        // All other queries go directly to Gemini AI
        const enhancedPrompt = `
You are an expert agriculture assistant for KisanSetu platform, specifically designed to help Indian farmers with practical farming advice. A farmer said: "${transcript}"

Your task:
- Provide SPECIFIC, ACTIONABLE advice for farmers
- Respond in the SAME language as the query (Hindi or English)
- Keep responses concise but detailed (2-3 sentences maximum)
- Be professional yet friendly like a farming expert
- Always give practical, implementable solutions
- Include specific next steps when possible
- NO PHOTO REQUESTS - This is voice-only assistance

IMPORTANT: Always provide specific, actionable advice that farmers can implement immediately. If you need more information, ask specific questions. Avoid vague responses.

Example responses:
- "मेरी फसल पीली है" → "आपकी फसल की पीली रोग के लिए नीम तेल 5ml प्रति लीटर पानी में मिलाकर स्प्रे करें। फसल का नाम और पत्ते बताएं ताकि मैं उपचारित उपाय सुझा सकूं।"
- "गेहूं का भाव" → "आज गेहूं का भाव ₹2500-2800 प्रति क्विंटल है। अपनी फसल की गुणवत्ता के अनुसार बेहतर भाव पाएं। बाजार समिति के लिए सुबह 10 बजे पर जाएं।"
- "मेरा ऑर्डर कहाँ है" → "अपने ऑर्डर की स्थिति देखने के लिए डैशबोर्ड पर 'ऑर्डर' सेक्शन पर जाएं। आप वहां ट्रैकिंग नंबर से अपना ऑर्डर ट्रैक कर सकते हैं।"
`;

        const { data, error: err } = await apiCall(() => 
          API.post("/gemini/voice-intent", { 
            text: transcript,
            prompt: enhancedPrompt 
          })
        );
        
        if (err) {
          console.error("API Error:", err);
          setVoiceResult(`✅ You said: "${transcript}"\n\n💡 कृपया आपकी खेती मदद के लिए यहाँ समस्या का समाधान कर सकते हैं। कृपया अपनी समस्या स्पष्ट रूप से बताएं।`);
          speakResponse("कृपया आपकी खेती मदद के लिए यहाँ समस्या का समाधान कर सकते हैं।");
        } else if (data?.success && data?.intent) {
          // Success - AI provided response
          setVoiceResult(`✅ You said: "${transcript}"\n\n💡 ${data.intent}`);
          speakResponse(data.intent);
        } else if (data?.fallback) {
          // Gemini failed but provided fallback
          setVoiceResult(`✅ You said: "${transcript}"\n\n💡 AI सहायता अस्थायी रूप से उपलब्ध नहीं है। कृपया कुछ देर बाद फिर से प्रयास करें।`);
          speakResponse("AI सहायता अस्थायी रूप से उपलब्ध नहीं है। कृपया कुछ देर बाद फिर से प्रयास करें।");
        } else {
          // Gemini didn't provide a valid response
          setVoiceResult(`✅ You said: "${transcript}"\n\n💡 AI से कोई प्रतिक्रिया नहीं मिली। कृपया अपना प्रश्न फिर से बताएं।`);
          speakResponse("AI से कोई प्रतिक्रिया नहीं मिली। कृपया अपना प्रश्न फिर से बताएं।");
        }
      } catch (error) {
        console.error("Voice intent error:", error);
        setVoiceResult(`✅ You said: "${transcript}"\n\n💡 कृपया आपकी खेती मदद के लिए यहाँ समस्या का समाधान कर सकते हैं। कृपया अपनी समस्या स्पष्ट रूप से बताएं।`);
        speakResponse("कृपया आपकी खेती मदद के लिए यहाँ समस्या का समाधान कर सकते हैं।");
      }
    };

    recognition.onerror = (e) => {
      console.error("Speech recognition error:", e.error);
      setListening(false);
      
      let errorMessage = "❌ ";
      switch(e.error) {
        case 'no-speech':
          errorMessage = "❌ No speech detected. Please try again.";
          break;
        case 'audio-capture':
          errorMessage = "❌ Microphone not available. Please check your microphone permissions.";
          break;
        case 'not-allowed':
          errorMessage = "❌ Microphone access denied. Please allow microphone access in your browser.";
          break;
        case 'network':
          errorMessage = "❌ Network error. Please check your internet connection.";
          break;
        default:
          errorMessage = "❌ Voice recognition failed. Please try again.";
      }
      
      setVoiceResult(errorMessage);
    };

    recognition.onend = () => {
      console.log("Voice recognition ended");
      setListening(false);
    };

    // Start recognition
    try {
      recognition.start();
    } catch (error) {
      console.error("Failed to start recognition:", error);
      setVoiceResult("❌ Failed to start voice recognition. Please refresh and try again.");
      setListening(false);
    }
  };

  // Text-to-speech for responses
  const speakResponse = (text) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'hi-IN';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      utterance.onstart = () => {
        console.log("Speaking response...");
      };
      
      utterance.onend = () => {
        console.log("Speech completed");
      };
      
      utterance.onerror = (e) => {
        console.error("Speech error:", e);
      };
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const quickActions = [
    { path: "/manage-crops", label: "Manage Crops", icon: "🌾", color: "#2e7d32" },
    { path: "/add-crop", label: "Add New Crop", icon: "➕", color: "#388e3c" },
    { path: "/seller-orders", label: "My Crop Orders", icon: "📦", color: "#1976d2" },
    { path: "/products", label: "Buy Products", icon: "🛒", color: "#f57c00" },
    { path: "/cart", label: "My Cart", icon: "🛍️", color: "#7b1fa2" },
    { path: "/crop-doctor", label: "Crop Doctor", icon: "👨‍⚕️", color: "#d32f2f" },
    { path: "/tracking", label: "Track Delivery", icon: "📍", color: "#7b1fa2" },
  ];

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
      <div className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1>👨‍🌾 Farmer Dashboard</h1>
            <p>Manage your crops, orders, and grow your business</p>
          </div>
          <Link to="/seller-orders" className="btn btn-primary" style={{ fontSize: "14px", padding: "10px 20px" }}>
            📦 View Orders
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-3" style={{ marginBottom: "40px" }}>
        <div className="card" style={{ 
          background: "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)",
          color: "white",
          border: "none"
        }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>🌾</div>
          <div style={{ fontSize: "36px", fontWeight: "700", marginBottom: "4px" }}>
            {loading ? "..." : stats.crops}
          </div>
          <div style={{ fontSize: "14px", opacity: 0.9 }}>Active Crops</div>
        </div>

        <div className="card" style={{ 
          background: "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)",
          color: "white",
          border: "none"
        }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>📦</div>
          <div style={{ fontSize: "36px", fontWeight: "700", marginBottom: "4px" }}>
            {loading ? "..." : stats.orders}
          </div>
          <div style={{ fontSize: "14px", opacity: 0.9 }}>Total Orders</div>
        </div>

        <div className="card" style={{ 
          background: "linear-gradient(135deg, #ffc107 0%, #f57c00 100%)",
          color: "white",
          border: "none"
        }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>💰</div>
          <div style={{ fontSize: "36px", fontWeight: "700", marginBottom: "4px" }}>
            {loading ? "..." : `₹${stats.revenue.toLocaleString()}`}
          </div>
          <div style={{ fontSize: "14px", opacity: 0.9 }}>Total Revenue</div>
        </div>
      </div>

      {/* Voice Assistant */}
      <div className="card" style={{ marginBottom: "40px", background: "linear-gradient(135deg, #7b1fa2 0%, #4a148c 100%)", color: "white", border: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
          <div style={{ fontSize: "32px" }}>🎙️</div>
          <div>
            <h3 style={{ margin: 0, fontSize: "20px" }}>Voice Assistant</h3>
            <p style={{ margin: 0, opacity: 0.9, fontSize: "14px" }}>Speak in Hindi to interact with the platform</p>
          </div>
        </div>
        <button
          onClick={startVoice}
          disabled={listening}
          className="btn"
          style={{
            background: listening ? "rgba(255,255,255,0.3)" : "white",
            color: listening ? "white" : "#7b1fa2",
            width: "100%",
            fontSize: "18px",
            padding: "16px",
            fontWeight: "600"
          }}
        >
          {listening ? (
            <>
              <div className="loading-spinner" style={{ 
                width: "20px", 
                height: "20px", 
                borderWidth: "2px",
                borderTopColor: "white",
                borderColor: "rgba(255,255,255,0.3)",
                margin: "0"
              }}></div>
              Listening...
            </>
          ) : (
            "🎙️ Tap to Speak"
          )}
        </button>
        {voiceResult && (
          <div style={{
            marginTop: "16px",
            padding: "12px",
            background: "rgba(255,255,255,0.2)",
            borderRadius: "var(--border-radius-sm)",
            fontSize: "14px"
          }}>
            {voiceResult}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 style={{ marginBottom: "24px", fontSize: "24px", color: "var(--text-primary)" }}>
          Quick Actions
        </h2>
        <div className="grid grid-3">
          {quickActions.map((action) => (
            <Link
              key={action.path}
              to={action.path}
              style={{ textDecoration: "none" }}
            >
              <div className="card" style={{
                cursor: "pointer",
                borderLeft: `4px solid ${action.color}`,
                transition: "all 0.3s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "var(--shadow-lg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "var(--shadow-md)";
              }}
              >
                <div style={{ 
                  fontSize: "32px", 
                  marginBottom: "12px",
                  display: "inline-block",
                  padding: "12px",
                  background: `${action.color}15`,
                  borderRadius: "var(--border-radius-sm)"
                }}>
                  {action.icon}
                </div>
                <h3 style={{ 
                  margin: 0, 
                  color: "var(--text-primary)",
                  fontSize: "18px",
                  fontWeight: "600"
                }}>
                  {action.label}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
