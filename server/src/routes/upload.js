const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { uploadImage, uploadCloudinaryDocument, getSecurePhotoUrl } = require("../controllers/upload/uploadController");
const authMiddleware = require("../middleware/authMiddleware");
const roleGuard = require("../middleware/roleGuard");
const memoryUpload = require("../middleware/upload");
const { uploadsDir } = require("../bootstrap/database");

const router = express.Router();

function ensureUploadsDirectory() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o755 });
  }

  fs.accessSync(uploadsDir, fs.constants.W_OK);
}

function detectImageTypeFromMagicBytes(filePath) {
  const descriptor = fs.openSync(filePath, "r");
  const header = Buffer.alloc(12);

  try {
    fs.readSync(descriptor, header, 0, header.length, 0);
  } finally {
    fs.closeSync(descriptor);
  }

  const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  if (isJpeg) {
    return "image/jpeg";
  }

  const isPng =
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a;
  if (isPng) {
    return "image/png";
  }

  const isWebp =
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50;
  if (isWebp) {
    return "image/webp";
  }

  return null;
}

function deleteUploadedFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`Failed to delete invalid uploaded file: ${error.message}`);
  }
}

function validateImageSignature(req, res, next) {
  if (!req.file) {
    return next();
  }

  const detectedType = detectImageTypeFromMagicBytes(req.file.path);
  const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

  if (!detectedType || !allowedMimeTypes.has(detectedType)) {
    deleteUploadedFile(req.file.path);
    return res.status(400).json({
      success: false,
      error: "Invalid image file signature. Only JPEG, PNG, and WebP are allowed.",
    });
  }

  req.file.mimetype = detectedType;
  return next();
}

try {
  ensureUploadsDirectory();
} catch (error) {
  console.error(`Failed to initialize uploads directory: ${error.message}`);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      ensureUploadsDirectory();
      cb(null, uploadsDir);
    } catch (error) {
      cb(new Error(`Upload directory is not writable: ${error.message}`));
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `room-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = /^image\/(jpeg|jpg|png|webp)$/i;
    const allowedExtensions = /\.(jpeg|jpg|png|webp)$/i;
    const hasMimeType = allowedMimeTypes.test(file.mimetype || "");
    const hasExtension = allowedExtensions.test(file.originalname || "");

    if (!hasMimeType || !hasExtension) {
      return cb(new Error("Only JPEG, PNG, and WebP image files are allowed"));
    }

    return cb(null, true);
  },
});

router.post(
  "/image",
  authMiddleware,
  roleGuard(["admin", "receptionist"]),
  upload.single("image"),
  validateImageSignature,
  uploadImage
);

router.post(
  "/cloudinary",
  authMiddleware,
  roleGuard(["admin", "receptionist", "manager", "customer"]),
  memoryUpload.single("file"),
  uploadCloudinaryDocument
);

router.get(
  "/secure-photo-url",
  authMiddleware,
  roleGuard(["admin", "receptionist", "manager"]),
  getSecurePhotoUrl
);

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      error: "File size exceeds 5MB limit",
    });
  }

  if (error) {
    if (req.file?.path) {
      deleteUploadedFile(req.file.path);
    }

    return res.status(400).json({
      success: false,
      error: error.message || "Upload failed",
    });
  }

  return next();
});

module.exports = router;
