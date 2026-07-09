const cloudinary = require("../config/cloudinary");

function uploadBufferToCloudinary(file, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type,
          bytes: result.bytes,
          format: result.format,
        });
      }
    );

    stream.end(file.buffer);
  });
}

module.exports = { uploadBufferToCloudinary };
