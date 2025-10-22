const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const backtestController = require('../controllers/backtest.controller');

// Backtesting endpoints
router.post('/run', authMiddleware, backtestController.runBacktest);
router.get('/results/:backtestId', authMiddleware, backtestController.getBacktestResults);
router.get('/history', authMiddleware, backtestController.getBacktestHistory);

module.exports = router;
