const router = require("express").Router();
const multer = require("multer");
const fetch = require("node-fetch");

const upload = multer({ dest: "uploads/" });

// Check API key availability
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (GEMINI_API_KEY) {
  console.log(" Gemini API key loaded for Crop Doctor");
} else {
  console.warn(" GEMINI_API_KEY not found in environment variables");
}

router.post("/crop-doctor", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: "No image provided",
      message: "Please upload an image file"
    });
  }

  try {
    // Convert image to base64
    const fs = require("fs");
    const imagePath = req.file.path;
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    // Clean up uploaded file
    fs.unlinkSync(imagePath);

    // Create prompt for Gemini AI
    const prompt = `
You are an expert agriculture scientist and crop disease specialist. Analyze this crop image and provide a comprehensive report.

Please analyze the image and provide:
1. Disease Name (if any disease is detected)
2. Severity Level (Low, Medium, High)
3. Symptoms Description
4. Detailed Treatment Recommendations
5. Prevention Tips
6. When to Consult an Expert

Format your response as a JSON object:
{
  "disease": "Disease Name or 'Healthy'",
  "severity": "Low|Medium|High",
  "symptoms": "Detailed symptoms description",
  "treatment": "Step-by-step treatment recommendations",
  "prevention": "Prevention tips",
  "expertAdvice": "When to consult an agricultural expert",
  "confidence": "High|Medium|Low"
}

If the crop appears healthy, respond with "Healthy" as the disease and provide general crop care advice.

Important: Be specific and practical in your recommendations. Use simple language that farmers can understand.
`;

    // Call Gemini Vision API
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
              parts: [
                {
                  text: prompt
                },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: base64Image
                  }
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      return res.status(500).json({
        error: "AI analysis failed",
        message: "Could not analyze the image. Please try again.",
        disease: "Analysis failed",
        solution: "Please try uploading the image again or contact support."
      });
    }

    const aiResponse = data.candidates[0].content.parts[0].text;
    
    // Try to parse JSON response
    let analysisResult;
    try {
      // Extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback if no JSON found
        analysisResult = {
          disease: "Unknown",
          severity: "Medium",
          symptoms: aiResponse,
          treatment: "Please consult with an agricultural expert for specific treatment recommendations.",
          prevention: "Regular crop monitoring and proper irrigation can help prevent diseases.",
          expertAdvice: "Consult with local agricultural expert if symptoms persist.",
          confidence: "Medium"
        };
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      analysisResult = {
        disease: "Analysis Error",
        severity: "Medium",
        symptoms: "Could not analyze the image properly.",
        treatment: "Please try uploading a clearer image or consult with an agricultural expert.",
        prevention: "Ensure good image quality and proper lighting for better analysis.",
        expertAdvice: "If the issue persists, please contact an agricultural expert.",
        confidence: "Low"
      };
    }

    res.json({
      success: true,
      ...analysisResult,
      aiResponse: aiResponse
    });

  } catch (error) {
    console.error("Crop doctor error:", error);
    
    // Clean up uploaded file on error
    const fs = require("fs");
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: "Analysis failed",
      message: error.message || "Failed to analyze image. Please try again.",
      disease: "Analysis failed",
      solution: "Please try uploading the image again or contact support."
    });
  }
});

// Voice assistance for crop doctor
router.post("/crop-doctor-voice", async (req, res) => {
  try {
    const { text, cropInfo, symptoms } = req.body;

    if (!text) {
      return res.status(400).json({
        error: "No text provided",
        message: "Please provide your crop issue description"
      });
    }

    if (!GEMINI_API_KEY) {
      return res.status(503).json({
        error: "AI service not available",
        message: "Voice assistance is currently unavailable. Please try again later."
      });
    }

    // Create enhanced prompt for crop doctor voice assistance
    const prompt = `
You are an expert agriculture scientist and crop disease specialist. A farmer is asking for help with their crop.

Farmer's Query: "${text}"
${cropInfo ? `Crop Information: ${cropInfo}` : ""}
${symptoms ? `Symptoms: ${symptoms}` : ""}

Please provide a comprehensive and helpful response in the same language as the query (Hindi or English). Include:

1. Possible diseases or issues based on the description
2. Immediate actions the farmer should take
3. Treatment recommendations (organic and chemical options)
4. Prevention measures
5. When to consult an expert
6. General crop care advice

Format your response as a JSON object:
{
  "analysis": "Detailed analysis of the issue",
  "possibleCauses": ["Cause 1", "Cause 2"],
  "immediateActions": ["Action 1", "Action 2"],
  "treatment": {
    "organic": "Organic treatment recommendations",
    "chemical": "Chemical treatment options"
  },
  "prevention": "Prevention measures",
  "expertAdvice": "When to consult an expert",
  "generalCare": "General crop care tips"
}

Be practical and specific in your recommendations. Use simple language that farmers can understand and implement.
`;

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

    if (!data.candidates || data.candidates.length === 0) {
      return res.status(500).json({
        error: "AI analysis failed",
        message: "Could not process your request. Please try again."
      });
    }

    const aiResponse = data.candidates[0].content.parts[0].text;
    
    // Try to parse JSON response
    let analysisResult;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback if no JSON found
        analysisResult = {
          analysis: aiResponse,
          possibleCauses: ["Could not determine specific causes"],
          immediateActions: ["Monitor your crop closely", "Take photos if symptoms worsen"],
          treatment: {
            organic: "Use neem oil spray as a preventive measure",
            chemical: "Consult with local agricultural expert for chemical options"
          },
          prevention: "Regular monitoring and proper irrigation",
          expertAdvice: "Consult expert if symptoms persist or worsen",
          generalCare: "Maintain proper irrigation and nutrient balance"
        };
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      analysisResult = {
        analysis: "Could not process the request properly",
        possibleCauses: ["Insufficient information"],
        immediateActions: ["Provide more details about the issue"],
        treatment: {
          organic: "Use organic pesticides as a first line of defense",
          chemical: "Consult with agricultural expert for chemical treatments"
        },
        prevention: "Regular crop monitoring",
        expertAdvice: "Please consult with local agricultural expert",
        generalCare: "Maintain proper crop care practices"
      };
    }

    res.json({
      success: true,
      ...analysisResult,
      aiResponse: aiResponse
    });

  } catch (error) {
    console.error("Crop doctor voice error:", error);
    res.status(500).json({
      error: "Voice analysis failed",
      message: error.message || "Failed to process your request. Please try again."
    });
  }
});

module.exports = router;
