// src/controllers/uploadController.js
const streamifier = require('streamifier');
const cloudinary = require('../lib/cloudinary');
const fs = require('fs');
const path = require('path');

function uploadStream(buffer, folder = "") {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

// POST handler used by route
exports.uploadHandler = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const folder = `Med-ecom/image_slip/${yyyy}-${mm}-${dd}`;

    const result = await uploadStream(req.file.buffer, folder);
    console.log("uploadHandler: uploaded", req.file.originalname, "->", result && (result.secure_url || result.url));
    
    return res.json({ success: true, data: { url: result.secure_url || result.url, raw: result } });
  } catch (err) {
    console.error("uploadHandler error:", err);
    return res.status(500).json({ success: false, message: err.message || "Upload failed" });
  }
};
