// src/routes/uploadCloudinary.js
const express = require('express');
const multer = require('multer');
const uploadController = require('../controllers/uploadController');

const router = express.Router();

// use memory storage so we can stream directly to cloudinary
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/', upload.single('file'), uploadController.uploadHandler);

module.exports = router;
