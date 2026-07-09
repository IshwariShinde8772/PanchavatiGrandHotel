const fs = require("fs");
const env = require("../../config/env");
const { Customer, Staff } = require("../../../models");
const { uploadBufferToCloudinary } = require("../../utils/cloudinaryUpload");

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
  async getSecurePhotoUrl(req, res) {
    const type = String(req.query.type || "").trim();
    const id = Number(req.query.id);

    if (!id || !["customer-id", "customer-live", "staff-id"].includes(type)) {
      return res.status(400).json({ success: false, error: "Invalid photo reference" });
    }

    if (!["admin", "receptionist", "manager"].includes(req.user?.role)) {
      return res.status(403).json({ success: false, error: "You are not authorized to view this photo" });
    }

    let url = null;
    let publicId = null;

    if (type === "staff-id") {
      const staff = await Staff.findByPk(id, { attributes: ["id", "id_proof_url", "id_proof_public_id"] });
      url = staff?.id_proof_url;
      publicId = staff?.id_proof_public_id;
    } else {
      const customer = await Customer.findByPk(id, {
        attributes: ["id", "id_doc_url", "id_doc_public_id", "live_photo_url", "live_photo_public_id"],
      });
      url = type === "customer-live" ? customer?.live_photo_url : customer?.id_doc_url;
      publicId = type === "customer-live" ? customer?.live_photo_public_id : customer?.id_doc_public_id;
    }

    if (!url && !publicId) {
      return res.status(404).json({ success: false, error: "Photo not found" });
    }

    return res.json({
      success: true,
      data: {
        url,
        public_id: publicId,
      },
    });
  },
  async uploadCloudinaryDocument(req, res) {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    const purpose = String(req.body.purpose || "documents")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .slice(0, 40);
    const result = await uploadBufferToCloudinary(req.file, `panchavati-grand/${purpose}`);

    return res.status(201).json({
      success: true,
      data: result,
      message: "File uploaded successfully",
    });
  },
};
