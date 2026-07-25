import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/api";
import { apiCall } from "../api/api";
import {
  Sprout,
  PlusCircle,
  Package,
  ShoppingCart,
  ShoppingBag,
  Stethoscope,
  Mic,
  TrendingUp,
  IndianRupee,
  Inbox
} from "lucide-react";

export default function FarmerDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const navigate = useNavigate();
  const [stats, setStats] = useState({ crops: 0, orders: 0, revenue: 0, products: 0 });
  const [loading, setLoading] = useState(true);
  const [listening, setListening] = useState(false);
  const [voiceResult, setVoiceResult] = useState("");
  const [recentProducts, setRecentProducts] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
  const fetchStats = async () => {
    try {
      const [myCropsRes, myOrdersRes, productsRes] = await Promise.all([
        // Crops listed by this farmer (seller role)
        API.get("/crops").catch(() => ({ data: [] })),

        // Orders where this farmer is either buyer OR seller
        API.get("/orders/farmer").catch(() => ({ data: { sales: [], purchases: [] } })),
        
        // Available products for farmers to buy
        API.get("/products").catch((err) => {
          console.error("❌ Products API error:", err);
          return { data: [] };
        })
      ]);

      const myCrops = myCropsRes.data.filter(
        (crop) => crop.sellerId === user._id
      );
      const othersCrops=myCropsRes.data.filter(
        (crop) => crop.sellerId !== user._id
      );
      console.log("Others Crops:", othersCrops);
      console.log("My Crops:", myCrops);
      
      // Get orders from the farmer endpoint response
      const sales = myOrdersRes.data.sales || [];
      const purchases = myOrdersRes.data.purchases || [];
      const allOrders = [...sales, ...purchases];

      // Get available products
      const availableProducts = productsRes.data || [];
      console.log("📦 Products API Response:", productsRes);
      console.log("📦 Available Products:", availableProducts);
      console.log("📦 Products count:", availableProducts.length);

      console.log("📊 Farmer Dashboard Debug");
      console.log("My Crops:", myCrops.length);
      console.log("Sales (Crop Sales):", sales.length);
      console.log("Purchases (All Types):", purchases.length);
      console.log("Purchases - Crop Purchases:", purchases.filter(o => o.orderType === "crop_purchase").length);
      console.log("Purchases - Product Purchases:", purchases.filter(o => o.orderType === "product_purchase").length);
      console.log("Available Products:", availableProducts.length);
      console.log("Total Related Orders:", allOrders.length);
console.log("Logged in user:", user);
      
      // 🧠 SEPARATION BASED ON orderType + ROLE
      const sellerOrders = sales.filter(
        (order) =>
          order.orderType === "crop_sale" &&
          order.sellerId === user._id
      );

      const buyerOrders = purchases.filter(
        (order) =>
          (order.orderType === "product_purchase" || order.orderType === "crop_purchase") &&
          order.buyerId === user._id
      );

      console.log("🧾 Seller Orders (Crop Sales):", sellerOrders.length);
      console.log("🛒 Buyer Orders (All Purchases):", buyerOrders.length);
      console.log("🛒 Buyer Orders - Crop Purchases:", purchases.filter(o => o.orderType === "crop_purchase" && o.buyerId === user._id).length);
      console.log("🛒 Buyer Orders - Product Purchases:", purchases.filter(o => o.orderType === "product_purchase" && o.buyerId === user._id).length);

      // 💰 Revenue ONLY from crop sales
      const cropRevenue = sellerOrders.reduce(
        (sum, order) => sum + (order.total || 0),
        0
      );

      setStats({
        crops: myCrops.length,              // crops listed
        orders: sellerOrders.length,         // crop sales count
        revenue: cropRevenue,                // earnings from sales
        purchaseOrders: buyerOrders.length,   // items bought
        products: availableProducts.length   // available products
      });

      // Store recent products for display
      setRecentProducts(availableProducts.slice(0, 4)); // Show only 4 recent products

    } catch (error) {
      console.error("❌ Error fetching farmer stats:", error);
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

          // Enhanced prompt for better farming assistance
          const enhancedPrompt = `
You are an expert agriculture assistant for KisanSetu platform, specifically designed to help Indian farmers with practical farming advice.

A farmer said: "${transcript.trim()}"

Your task:
- Provide SPECIFIC, ACTIONABLE advice for farmers
- Respond in the SAME language as the query (Hindi or English)
- Keep responses concise, clear, and complete (2-3 full sentences)
- ALWAYS COMPLETE EVERY SENTENCE FULLY. Never stop or cut off mid-sentence.
- Be professional yet friendly like a farming expert
- Always give practical, implementable solutions
- NO PHOTO REQUESTS - This is voice-only assistance

Farmer-Specific Response Guidelines:
- For crop health: Ask for crop name and symptoms. Suggest specific treatments.
- For market prices: Ask for crop name and location. Give current market trends.
- For orders: Direct to dashboard with specific steps.
- For pesticides: Ask for crop and pest type. Recommend safe, approved options.
- For fertilizers: Ask for soil type and crop. Suggest NPK ratios.
- For weather: Ask for location. Give 7-day forecast and farming advice.
- For irrigation: Ask for crop and soil moisture. Give water-saving tips.
- For seeds: Ask for crop and season. Recommend high-yield varieties.

Example responses:
- "मेरी फसल पीली है" → "आपकी फसल की पीली बीमारी के लिए नीम का तेल 5ml प्रति लीटर पानी में मिलाकर छिड़काव करें। फसल का नाम बताएं ताकि सटीक इलाज बताया जा सके।"
- "गेहूं का भाव" → "आज गेहूं का मंडी भाव ₹2500 से ₹2800 प्रति क्विंटल है। अच्छी गुणवत्ता की फसल के लिए अपनी निकटतम मंडी समिति में संपर्क करें।"
- "मेरा ऑर्डर कहाँ है" → "अपने ऑर्डर की लाइव स्थिति देखने के लिए डैशबोर्ड पर 'ऑर्डर' सेक्शन में जाएं। वहां आपको डिलीवरी पार्टनर की लाइव लोकेशन दिखेगी।"

IMPORTANT: Always provide complete, actionable advice that farmers can implement immediately. Never leave a sentence unfinished.
`;

          console.log("🎤 Making API call to Gemini with transcript:", transcript);
          
          const { data, error: err } = await apiCall(() => 
            API.post("/gemini/voice-intent", { 
              text: transcript,
              prompt: enhancedPrompt 
            })
          );
          
          console.log("🤖 Gemini API Response:", { data, error: err });
          
          // Extract the actual data from the apiCall wrapper
          const responseData = data?.data || data;
          
          if (err) {
            console.error("❌ API Error:", err);
            const errorMessage = err?.message || err || "Unknown error occurred";
            setVoiceResult(`✅ You said: "${transcript}"\n\n❌ AI Error: ${errorMessage}\n\n💡 कृपया बाद में फिर से कोशिश करें।`);
            speakResponse("AI सेवा अस्थायी रूप से उपलब्ध नहीं है। कृपया बाद में फिर से कोशिश करें।");
          } else if (responseData?.success && responseData?.intent) {
            // Success - AI provided response
            console.log("✅ Success - AI Response:", responseData.intent);
            setVoiceResult(`✅ You said: "${transcript}"\n\n💡 ${responseData.intent}`);
            speakResponse(responseData.intent);
          } else {
            // Gemini AI not available - no fallback
            console.log("❌ Gemini AI not available:", responseData);
            setVoiceResult(`✅ You said: "${transcript}"\n\n❌ AI सेवा अस्थायी रूप से उपलब्ध नहीं है।\n\n💡 कृपया कुछ देर बाद फिर से प्रयास करें।`);
            speakResponse("AI सेवा अस्थायी रूप से उपलब्ध नहीं है। कृपया बाद में फिर से कोशिश करें।");
          }
        } catch (error) {
          console.error("❌ Voice intent error:", error);
          setVoiceResult(`✅ You said: "${transcript}"\n\n❌ Network Error: ${error.message}\n\n💡 कृपया अपना इंटरनेट कनेक्शन जांचें और फिर से कोशिश करें।`);
          speakResponse("नेटवर्क समस्या आई है। कृपया इंटरनेट कनेक्शन जांचें।");
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
    { path: "/manage-crops", label: "Manage Crops", Icon: Sprout, color: "#2e7d32" },
    { path: "/add-crop", label: "Add New Crop", Icon: PlusCircle, color: "#388e3c" },
    { path: "/seller-orders", label: "My Crop Sales", Icon: Package, color: "#1976d2" },
    { path: "/orders", label: "My Purchase Orders", Icon: ShoppingCart, color: "#f57c00" },
    { path: "/products", label: "Buy Products", Icon: ShoppingBag, color: "#f57c00" },
    { path: "/cart", label: "My Cart", Icon: ShoppingCart, color: "#7b1fa2" },
    { path: "/crop-doctor", label: "Crop Doctor", Icon: Stethoscope, color: "#d32f2f" }
  ];

  return (
    <div className="container" style={{ 
      paddingTop: isMobile ? "20px" : "40px", 
      paddingBottom: isMobile ? "20px" : "40px",
      padding: isMobile ? "20px 16px" : "40px 20px"
    }}>
      <div className="page-header" style={{ marginBottom: isMobile ? "24px" : "32px" }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: isMobile ? "flex-start" : "center",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? "16px" : "0"
        }}>
          <div>
            <h1 style={{ 
              fontSize: isMobile ? "24px" : "32px",
              marginBottom: isMobile ? "8px" : "16px",
              display: "flex",
              alignItems: "center",
              gap: "12px"
            }}>
              <Sprout size={32} color="#2e7d32" />
              <span>Farmer Dashboard</span>
            </h1>
            <p style={{ 
              fontSize: isMobile ? "14px" : "16px",
              color: "var(--text-secondary)",
              margin: 0
            }}>
              Manage your crops, orders, and grow your business
            </p>
          </div>
          <div style={{ 
            display: "flex", 
            gap: isMobile ? "8px" : "12px",
            flexDirection: isMobile ? "column" : "row",
            width: isMobile ? "100%" : "auto"
          }}>
            <Link 
              to="/seller-orders" 
              className="btn btn-primary" 
              style={{ 
                fontSize: isMobile ? "13px" : "14px", 
                padding: isMobile ? "12px 16px" : "10px 20px",
                width: isMobile ? "100%" : "auto",
                textAlign: "center",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
            >
              <Package size={18} />
              <span>Crop Sales</span>
            </Link>
            <Link 
              to="/orders" 
              className="btn btn-secondary" 
              style={{ 
                fontSize: isMobile ? "13px" : "14px", 
                padding: isMobile ? "12px 16px" : "10px 20px",
                width: isMobile ? "100%" : "auto",
                textAlign: "center",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
            >
              <ShoppingCart size={18} />
              <span>My Purchases</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid" style={{ 
        gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
        gap: isMobile ? "16px" : "20px",
        marginBottom: isMobile ? "32px" : "40px"
      }}>
        <div className="card" style={{ 
          background: "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)",
          color: "white",
          border: "none",
          padding: isMobile ? "20px 16px" : "24px",
          cursor: "pointer",
          transition: "transform 0.2s, box-shadow 0.2s"
        }}
        onClick={() => navigate("/manage-crops")}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 8px 25px rgba(25, 118, 210, 0.3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}
        >
          <div style={{ marginBottom: isMobile ? "10px" : "12px" }}>
            <Sprout size={isMobile ? 28 : 32} color="#ffffff" />
          </div>
          <div style={{ fontSize: isMobile ? "28px" : "36px", fontWeight: "700", marginBottom: "4px" }}>
            {loading ? "..." : stats.crops}
          </div>
          <div style={{ fontSize: isMobile ? "12px" : "14px", opacity: 0.9 }}>My Crops</div>
        </div>
        <div className="card" style={{ 
          background: "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)",
          color: "white",
          border: "none",
          padding: isMobile ? "20px 16px" : "24px",
          cursor: "pointer",
          transition: "transform 0.2s, box-shadow 0.2s"
        }}
        onClick={() => navigate("/seller-orders")}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 8px 25px rgba(25, 118, 210, 0.3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}
        >
          <div style={{ marginBottom: isMobile ? "10px" : "12px" }}>
            <Package size={isMobile ? 28 : 32} color="#ffffff" />
          </div>
          <div style={{ fontSize: isMobile ? "28px" : "36px", fontWeight: "700", marginBottom: "4px" }}>
            {loading ? "..." : stats.orders}
          </div>
          <div style={{ fontSize: isMobile ? "12px" : "14px", opacity: 0.9 }}>Crop Sales</div>
        </div>
        <div className="card" style={{ 
          background: "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)", 
          color: "white", 
          padding: isMobile ? "20px 16px" : "24px", 
          borderRadius: "12px", 
          textAlign: "center",
          cursor: "pointer",
          transition: "transform 0.2s, box-shadow 0.2s"
        }}
        onClick={() => navigate("/revenue-details")}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 8px 25px rgba(46, 125, 50, 0.3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}>
          <div style={{ marginBottom: isMobile ? "10px" : "12px" }}>
            <IndianRupee size={isMobile ? 28 : 32} color="#ffffff" />
          </div>
          <div style={{ fontSize: isMobile ? "28px" : "36px", fontWeight: "700", marginBottom: "4px" }}>
            {loading ? "..." : `₹${stats.revenue.toLocaleString()}`}
          </div>
          <div style={{ fontSize: isMobile ? "12px" : "14px", opacity: 0.9 }}>Crop Revenue</div>
        </div>
        <div className="card" style={{ 
          background: "linear-gradient(135deg, #ff9800 0%, #f57c00 100%)", 
          color: "white", 
          padding: isMobile ? "20px 16px" : "24px", 
          borderRadius: "12px", 
          textAlign: "center",
          cursor: "pointer",
          transition: "transform 0.2s, box-shadow 0.2s"
        }}
        onClick={() => navigate("/orders")}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 8px 25px rgba(245, 124, 0, 0.3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}>
          <div style={{ marginBottom: isMobile ? "10px" : "12px" }}>
            <ShoppingCart size={isMobile ? 28 : 32} color="#ffffff" />
          </div>
          <div style={{ fontSize: isMobile ? "28px" : "36px", fontWeight: "700", marginBottom: "4px" }}>
            {loading ? "..." : stats.purchaseOrders || 0}
          </div>
          <div style={{ fontSize: isMobile ? "12px" : "14px", opacity: 0.9 }}>Purchase Orders</div>
        </div>
      </div>

      {/* Products Section */}
      <div className="card" style={{ marginBottom: "40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "20px", color: "#2e7d32", display: "flex", alignItems: "center", gap: "8px" }}>
              <ShoppingBag size={22} color="#2e7d32" />
              <span>Available Products</span>
            </h3>
            <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>Browse products for your farming needs</p>
          </div>
          <Link to="/products" className="btn btn-primary" style={{ fontSize: "14px", padding: "8px 16px" }}>
            View All Products
          </Link>
        </div>
        
        {recentProducts.length > 0 ? (
          <div className="grid grid-4" style={{ gap: "16px" }}>
            {recentProducts.map((product) => (
              <div key={product._id} className="card" style={{ 
                padding: "16px", 
                textAlign: "center",
                border: "1px solid #e0e0e0",
                transition: "transform 0.2s, box-shadow 0.2s"
              }}>
                {product.image && (
                  <img 
                    src={product.image} 
                    alt={product.name}
                    style={{ 
                      width: "100%", 
                      height: "120px", 
                      objectFit: "cover", 
                      borderRadius: "8px",
                      marginBottom: "12px"
                    }}
                  />
                )}
                <h4 style={{ margin: "0 0 8px 0", fontSize: "16px", color: "#333" }}>
                  {product.name}
                </h4>
                <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#666" }}>
                  {product.type}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontSize: "18px", fontWeight: "bold", color: "#2e7d32" }}>
                    ₹{product.price}
                  </span>
                  <span style={{ fontSize: "12px", color: "#666" }}>
                    Stock: {product.stock}
                  </span>
                </div>
                <Link 
                  to={`/products/${product._id}`} 
                  className="btn btn-primary" 
                  style={{ 
                    fontSize: "12px", 
                    padding: "6px 12px", 
                    width: "100%",
                    textDecoration: "none"
                  }}
                >
                  View Details
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#666" }}>
            <div style={{ marginBottom: "16px", display: "flex", justifyContent: "center" }}>
              <Inbox size={48} color="#999" />
            </div>
            <h4 style={{ margin: "0 0 8px 0", color: "#333" }}>No Products Available</h4>
            <p style={{ margin: 0, fontSize: "14px" }}>
              Check back later for new farming products and supplies
            </p>
          </div>
        )}
      </div>

      {/* Voice Assistant */}
      <div className="card" style={{ marginBottom: "40px", background: "linear-gradient(135deg, #7b1fa2 0%, #4a148c 100%)", color: "white", border: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
          <div style={{ padding: "10px", background: "rgba(255,255,255,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Mic size={28} color="white" />
          </div>
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
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px"
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
            <>
              <Mic size={22} color="#7b1fa2" />
              <span>Tap to Speak</span>
            </>
          )}
        </button>
        {voiceResult && (
          <div style={{
            marginTop: "16px",
            padding: "12px 16px",
            background: "rgba(255,255,255,0.2)",
            borderRadius: "var(--border-radius-sm)",
            fontSize: "14px",
            whiteSpace: "pre-line",
            lineHeight: "1.5"
          }}>
            {voiceResult}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: isMobile ? "32px" : "40px" }}>
        <h2 style={{ 
          marginBottom: isMobile ? "20px" : "24px", 
          fontSize: isMobile ? "20px" : "24px", 
          color: "var(--text-primary)" 
        }}>
          Quick Actions
        </h2>
        <div className="grid" style={{
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
          gap: isMobile ? "16px" : "20px"
        }}>
          {quickActions.map((action) => {
            const IconComponent = action.Icon;
            return (
              <Link
                key={action.path}
                to={action.path}
                style={{ textDecoration: "none" }}
              >
                <div className="card" style={{
                  cursor: "pointer",
                  borderLeft: `4px solid ${action.color}`,
                  transition: "all 0.3s",
                  padding: isMobile ? "20px 16px" : "24px",
                  textAlign: "center"
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
                    marginBottom: isMobile ? "10px" : "12px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "12px",
                    background: `${action.color}15`,
                    borderRadius: "var(--border-radius-sm)"
                  }}>
                    {IconComponent && <IconComponent size={isMobile ? 28 : 32} color={action.color} />}
                  </div>
                  <h3 style={{ 
                    margin: 0, 
                    color: "var(--text-primary)",
                    fontSize: isMobile ? "14px" : "16px",
                    fontWeight: "600"
                  }}>
                    {action.label}
                  </h3>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
