const router = require("express").Router();
const fetch = require("node-fetch");

// Check API key availability once
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (GEMINI_API_KEY) {
  console.log("✅ Gemini API key loaded");
} else {
  console.warn("⚠️ GEMINI_API_KEY not found in environment variables");
}

router.post("/voice-intent", async (req, res) => {
  try {
    // API key check
    if (!GEMINI_API_KEY) {
      return res.status(503).json({
        success: false,
        error: "Gemini API not configured",
        message: "Please set GEMINI_API_KEY in environment variables",
        fallback: true
      });
    }

    const { text } = req.body;

    // Input validation
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid input",
        message: "Text is required and must be a non-empty string"
      });
    }

    // Intent-focused prompt (language-preserving)
    const prompt = `
You are an AI assistant for KisanSetu, an agriculture platform for farmers.

A farmer said:
"${text.trim()}"

Your task:
- Identify the farmer's intent
- Respond in the SAME language as the query
- Keep the response concise (1–2 sentences)
- Be helpful and farmer-friendly

Possible intents include:
- Crop health / disease (Crop Doctor)
- Selling crops
- Buying seeds or pesticides
- Tracking delivery
- Viewing orders
- General farming guidance
`;

    // Gemini REST v1 call (STABLE)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );

    const data = await response.json();

    // Handle Gemini-side errors
   // If Gemini blocked or returned no candidates
if (!data.candidates || data.candidates.length === 0) {
  console.warn("⚠️ Gemini returned no candidates:", JSON.stringify(data, null, 2));

  return res.json({
    success: true,
    intent: "आप अपनी फसल की स्थिति जानना चाहते हैं। बेहतर सलाह के लिए कृपया फसल का नाम, समस्या या उसकी फोटो साझा करें।",
    originalText: text.trim(),
    fallback: true
  });
}


    const intentText =
  data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
  "आप खेती से जुड़ी जानकारी चाहते हैं। कृपया थोड़ा और विवरण दें।";

    res.json({
      success: true,
      intent: intentText,
      originalText: text.trim()
    });

  } catch (error) {
    console.error("❌ Gemini REST API Error:", error);

    res.status(500).json({
      success: false,
      error: "Gemini API Error",
      message: error.message || "Failed to process Gemini request",
      fallback: true
    });
  }
});

module.exports = router;
