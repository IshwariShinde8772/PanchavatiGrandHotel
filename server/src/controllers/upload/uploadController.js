function uploadImage(req, res) {
  if (!req.file) {
    console.warn(`⚠️ Upload attempted with no file`);
    return res.status(400).json({ 
      success: false, 
      error: "No file uploaded. Please select an image file (JPEG, JPG, PNG, or WebP)." 
    });
  }

  try {
    // Use a more reliable origin detection
    const origin = process.env.BACKEND_URL || 
                   (process.env.NODE_ENV === 'production' 
                     ? `https://${req.get("host")}` 
                     : `http://${req.get("host")}`);
    
    const filename = req.file.filename;
    const relativePath = `/uploads/${filename}`;
    const fileUrl = `${origin}${relativePath}`;

    // Validate file was actually saved
    const fs = require('fs');
    if (!fs.existsSync(req.file.path)) {
      throw new Error(`File not found on disk: ${req.file.path}`);
    }

    console.log(`✅ Image uploaded successfully`);
    console.log(`   Filename: ${filename}`);
    console.log(`   Size: ${(req.file.size / 1024).toFixed(2)}KB`);
    console.log(`   MIME: ${req.file.mimetype}`);
    console.log(`   URL: ${fileUrl}`);

    return res.status(200).json({
      success: true,
      data: {
        url: fileUrl,
        path: relativePath,
        filename: filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
      message: "Image uploaded successfully",
    });
  } catch (error) {
    console.error("❌ Error in uploadImage:", error.message);
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
