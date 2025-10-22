const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const brokerController = require('../controllers/broker.controller');

// Portfolio endpoints
router.get('/portfolio/holdings', authMiddleware, brokerController.getHoldings);
router.get('/portfolio/positions', authMiddleware, brokerController.getPositions);
router.get('/portfolio/funds', authMiddleware, brokerController.getFunds);

// Order endpoints
router.get('/orders/pending', authMiddleware, brokerController.getPendingOrders);
router.get('/orders/history', authMiddleware, brokerController.getOrderHistory);
router.get('/orders/:orderId', authMiddleware, brokerController.getOrderDetails);

// Market data endpoints
router.get('/market/quote/:symbol', authMiddleware, brokerController.getQuote);
router.post('/market/quotes', authMiddleware, brokerController.getMultipleQuotes);

module.exports = router;
