const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const uploadsDir = require("../bootstrap/database").uploadsDir;
const { uploadImage } = require("../controllers/upload/uploadController");
const authMiddleware = require("../middleware/authMiddleware");
const roleGuard = require("../middleware/roleGuard");

const router = express.Router();

// Ensure uploads directory exists with error handling
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o777 });
    console.log(`📁 Created uploads directory: ${uploadsDir}`);
  } else {
    // Verify directory is writable
    fs.accessSync(uploadsDir, fs.constants.W_OK);
    console.log(`✅ Uploads directory verified: ${uploadsDir}`);
  }
} catch (err) {
  console.error(`❌ Error with uploads directory: ${err.message}`);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Verify directory exists and is writable before saving
    try {
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      fs.accessSync(uploadsDir, fs.constants.W_OK);
      cb(null, uploadsDir);
    } catch (err) {
      console.error(`❌ Destination error: ${err.message}`);
      cb(new Error(`Upload directory not writable: ${err.message}`));
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    const newFilename = `room-${uniqueSuffix}${ext}`;
    console.log(`📤 Generating filename for upload: ${newFilename}`);
    cb(null, newFilename);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    console.log(`📥 File filter check: ${file.originalname}`);
    console.log(`   MIME Type: ${file.mimetype}`);
    
    // Validate file type - fixed to handle proper MIME types
    const allowedMimeTypes = /image\/(jpeg|jpg|png|webp)/i;
    const allowedExtensions = /\.(jpeg|jpg|png|webp)$/i;
    
    const hasMimeType = allowedMimeTypes.test(file.mimetype);
    const hasExtension = allowedExtensions.test(file.originalname);

    if (hasMimeType && hasExtension) {
      console.log(`✅ File validation passed: ${file.originalname} (MIME: ${file.mimetype})`);
      return cb(null, true);
    } else {
      const errorMsg = `Only images allowed (JPEG/PNG/WebP). Got: ${file.mimetype}`;
      console.error(`❌ File rejected: ${file.originalname} - ${errorMsg}`);
      cb(new Error(errorMsg));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.post("/image", authMiddleware, roleGuard(["admin", "receptionist"]), upload.single("image"), uploadImage);

// Error handling middleware for multer errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "File size exceeds 5MB limit"
      });
    }
  }
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.message || "Upload failed"
    });
  }
  next();
});

module.exports = router;
