const fs = require("fs");
const env = require("../../config/env");

function resolvePublicOrigin(req) {
  const configured = String(process.env.BACKEND_URL || env.backendUrl || "").trim();
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  const protocol = forwardedProto || req.protocol || "http";
  const fallbackOrigin = `${protocol}://${req.get("host")}`;
  const source = configured || fallbackOrigin;

  // Some environments set BACKEND_URL to */api*; uploads are served from root.
  return source.replace(/\/+$/g, "").replace(/\/api$/i, "");
}

function uploadImage(req, res) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: "No file uploaded. Please select an image file (JPEG, JPG, PNG, or WebP).",
    });
  }

  try {
    const origin = resolvePublicOrigin(req);
    const filename = req.file.filename;
    const relativePath = `/uploads/${filename}`;
    const fileUrl = `${origin}${relativePath}`;

    if (!fs.existsSync(req.file.path)) {
      throw new Error(`File not found on disk: ${req.file.path}`);
    }

    return res.status(200).json({
      success: true,
      data: {
        url: fileUrl,
        path: relativePath,
        filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
      // Keep top-level mirrors for any existing consumers.
      url: fileUrl,
      path: relativePath,
      message: "Image uploaded successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to process image upload",
      details: error.message,
    });
  }
}

module.exports = {
  uploadImage,
};
