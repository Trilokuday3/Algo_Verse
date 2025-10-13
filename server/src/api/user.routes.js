const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const userController = require('../controllers/user.controller');

// Get user profile (with strategies and broker info)
router.get('/profile', authMiddleware, userController.getProfile);

// Update user profile information
router.put('/profile', authMiddleware, userController.updateProfile);

// Change password
router.post('/change-password', authMiddleware, userController.changePassword);

// Delete user account
router.delete('/delete', authMiddleware, userController.deleteAccount);

module.exports = router;
