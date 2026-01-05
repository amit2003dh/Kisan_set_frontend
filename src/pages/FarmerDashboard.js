import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../api/api";

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
    if (!("webkitSpeechRecognition" in window)) {
      alert("Voice recognition not supported in this browser");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    setListening(true);
    setVoiceResult("");

    recognition.onstart = () => {
      setVoiceResult("Listening... 👂");
    };

    recognition.onresult = async (e) => {
      const transcript = e.results[0][0].transcript;
      setListening(false);
      setVoiceResult(`You said: "${transcript}"`);

      try {
        const response = await API.post("/gemini/voice-intent", { text: transcript });
        
        if (response.data.success && response.data.intent) {
          setVoiceResult(`💡 ${response.data.intent}`);
        } else if (response.data.intent) {
          setVoiceResult(`💡 ${response.data.intent}`);
        } else {
          setVoiceResult(`Recognized: "${transcript}"`);
        }
      } catch (error) {
        console.error("Voice intent error:", error);
        
        // Show user-friendly error message
        if (error.response?.status === 503 || error.response?.status === 401) {
          setVoiceResult(`⚠️ ${error.response?.data?.message || "Gemini API not configured. Your query: \"" + transcript + "\""}`);
        } else if (error.response?.status === 429) {
          setVoiceResult(`⚠️ API limit reached. Your query: "${transcript}"`);
        } else {
          setVoiceResult(`Recognized: "${transcript}"\n(Intent analysis unavailable)`);
        }
      }
    };

    recognition.onerror = (e) => {
      setListening(false);
      setVoiceResult("Error: Could not recognize speech. Please try again.");
      console.error("Recognition error:", e.error);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  };

  const quickActions = [
    { path: "/add-crop", label: "Add New Crop", icon: "➕", color: "#4caf50" },
    { path: "/crops", label: "View All Crops", icon: "🌾", color: "#2e7d32" },
    { path: "/orders", label: "My Orders", icon: "📦", color: "#1976d2" },
    { path: "/products", label: "Buy Seeds/Pesticides", icon: "🛒", color: "#f57c00" },
    { path: "/crop-doctor", label: "Crop Doctor", icon: "👨‍⚕️", color: "#d32f2f" },
    { path: "/tracking", label: "Track Delivery", icon: "📍", color: "#7b1fa2" },
  ];

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "40px" }}>
      <div className="page-header">
        <h1>👨‍🌾 Farmer Dashboard</h1>
        <p>Manage your crops, orders, and grow your business</p>
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
