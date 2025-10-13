const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const credentialsController = require('../controllers/credentials.controller');

// Save or update broker credentials
router.post('/', authMiddleware, credentialsController.saveCredentials);

// Get all broker credentials
router.get('/', authMiddleware, credentialsController.getCredentials);

// Get credentials for specific broker
router.get('/:broker', authMiddleware, credentialsController.getBrokerCredentials);

// Delete specific broker credentials
router.delete('/:broker', authMiddleware, credentialsController.deleteCredentials);

module.exports = router;
