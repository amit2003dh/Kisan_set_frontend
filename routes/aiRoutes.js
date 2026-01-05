const router = require("express").Router();
const multer = require("multer");
const { exec } = require("child_process");

const upload = multer({ dest: "uploads/" });

router.post("/crop-doctor", upload.single("image"), (req, res) => {
  const imagePath = req.file.path;

  exec(`python ai/predict.py ${imagePath}`, (err, stdout) => {
    if (err) return res.status(500).send("ai error Error processing image");

    res.send({
      disease: stdout.trim(),
      solution: "Recommended pesticide will appear here"
    });
  });
});

module.exports = router;
