const router = require("express").Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini AI only if API key is available
let genAI = null;
try {
  if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log("✅ Gemini AI initialized successfully");
  } else {
    console.warn("⚠️ GEMINI_API_KEY not found in environment variables");
  }
} catch (error) {
  console.error("❌ Gemini AI initialization error:", error.message);
}

router.post("/voice-intent", async (req, res) => {
  try {
    // Check if Gemini is initialized
    if (!genAI) {
      return res.status(503).json({
        error: "Gemini API not configured",
        message: "Please set GEMINI_API_KEY in your environment variables",
        fallback: true
      });
    }

    const { text } = req.body;

    // Validate input
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({
        error: "Invalid input",
        message: "Text is required and must be a non-empty string"
      });
    }

    // Enhanced prompt for better intent recognition
    const prompt = `You are an AI assistant for KisanSetu, an agricultural platform. 
A farmer just said: "${text.trim()}"

Analyze this query and identify the user's intent. Possible intents include:
- Adding a new crop
- Viewing crops
- Checking orders
- Buying seeds or pesticides
- Using crop doctor
- Tracking delivery
- General question about farming

Respond with a clear, helpful intent description in the same language as the query. Keep it concise (1-2 sentences).`;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 200,
      }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const intentText = response.text();

    res.json({
      success: true,
      intent: intentText.trim(),
      originalText: text.trim()
    });

  } catch (error) {
    console.error("Gemini API Error:", error);
    
    // Handle specific Gemini API errors
    if (error.message?.includes("API_KEY_INVALID")) {
      return res.status(401).json({
        error: "Invalid API Key",
        message: "The Gemini API key is invalid. Please check your GEMINI_API_KEY in .env file"
      });
    }

    if (error.message?.includes("quota") || error.message?.includes("limit")) {
      return res.status(429).json({
        error: "API Quota Exceeded",
        message: "Gemini API quota has been exceeded. Please try again later."
      });
    }

    // Generic error response
    res.status(500).json({
      error: "Gemini API Error",
      message: error.message || "Failed to process request with Gemini API",
      fallback: true
    });
  }
});

module.exports = router;
