const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const authController = require('../controllers/auth.controller');

// Combined register/login endpoint
router.post('/authenticate', authController.authenticate);

// Separate register endpoint
router.post('/register', authController.register);

// Separate login endpoint
router.post('/login', authController.login);

// Verify JWT token
router.get('/verify', authMiddleware, authController.verifyToken);

module.exports = router;
