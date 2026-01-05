const router = require("express").Router();
const multer = require("multer");
const { exec } = require("child_process");

const upload = multer({ dest: "uploads/" });

router.post("/crop-doctor", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: "No image provided",
      message: "Please upload an image file"
    });
  }

  const imagePath = req.file.path;
  const pythonCommand = process.platform === "win32" ? "python" : "python3";

  exec(`${pythonCommand} ai/predict.py ${imagePath}`, { timeout: 30000 }, (err, stdout, stderr) => {
    if (err) {
      console.error("Crop doctor error:", err);
      console.error("Stderr:", stderr);
      
      // Clean up uploaded file on error
      const fs = require("fs");
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }

      // Provide helpful error messages
      if (err.code === "ENOENT") {
        return res.status(503).json({
          error: "Python not found",
          message: "Python is not installed or not in PATH. Please install Python to use Crop Doctor.",
          disease: "Unable to analyze",
          solution: "Please ensure Python is installed and the AI model files are available."
        });
      }

      if (err.killed) {
        return res.status(504).json({
          error: "Analysis timeout",
          message: "Image analysis took too long. Please try with a smaller image.",
          disease: "Analysis timeout",
          solution: "Please try uploading a smaller image or contact support."
        });
      }

      return res.status(500).json({
        error: "Analysis failed",
        message: err.message || "Failed to analyze image. Please try again.",
        disease: "Analysis error",
        solution: "Please try uploading a different image or contact support if the problem persists."
      });
    }

    // Clean up uploaded file after successful processing
    const fs = require("fs");
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    const disease = stdout.trim() || "Unknown";
    
    // Provide better solution based on disease
    let solution = "Recommended pesticide will appear here";
    if (disease.toLowerCase().includes("healthy") || disease.toLowerCase().includes("normal")) {
      solution = "Your crop appears to be healthy! Continue with regular care and monitoring.";
    } else if (disease.toLowerCase().includes("leaf") || disease.toLowerCase().includes("spot")) {
      solution = "Apply fungicide spray and ensure proper air circulation. Remove affected leaves if possible.";
    } else if (disease.toLowerCase().includes("rust") || disease.toLowerCase().includes("blight")) {
      solution = "Apply appropriate fungicide immediately. Isolate affected plants and improve drainage.";
    } else {
      solution = "Please consult with an agricultural expert for specific treatment recommendations. You can also browse our pesticide store for treatment options.";
    }

    res.json({
      disease: disease,
      solution: solution
    });
  });
});

module.exports = router;
