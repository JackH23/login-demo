const express = require("express");
const multer = require("multer");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

router.post("/", upload.single("file"), (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const mimeType = req.file.mimetype || "application/octet-stream";
  const base64 = req.file.buffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  return res.json({ dataUrl, name: req.file.originalname });
});

module.exports = router;
