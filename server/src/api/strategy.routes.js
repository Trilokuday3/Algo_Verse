const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const strategyController = require('../controllers/strategy.controller');

// Get all strategies
router.get('/', authMiddleware, strategyController.getAllStrategies);

// Create new strategy
router.post('/', authMiddleware, strategyController.createStrategy);

// Get single strategy
router.get('/:strategyId', authMiddleware, strategyController.getStrategy);

// Update strategy
router.put('/:strategyId', authMiddleware, strategyController.updateStrategy);

// Delete strategy
router.delete('/:strategyId', authMiddleware, strategyController.deleteStrategy);

// Start strategy
router.post('/:strategyId/start', authMiddleware, strategyController.startStrategy);

// Stop strategy
router.post('/:strategyId/stop', authMiddleware, strategyController.stopStrategy);

// Pause strategy
router.post('/:strategyId/pause', authMiddleware, strategyController.pauseStrategy);

// Resume strategy
router.post('/:strategyId/resume', authMiddleware, strategyController.resumeStrategy);

module.exports = router;
