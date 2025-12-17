// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');

// สมัครสมาชิกใหม่
router.post('/register', authController.register);

// เข้าสู่ระบบ
router.post('/login', authController.login);

module.exports = router;
