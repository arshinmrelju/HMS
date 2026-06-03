const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/labController');

router.get('/tests', authenticate, ctrl.getTests);
router.post('/tests', authenticate, authorize('Admin'), ctrl.createTest);
router.get('/orders', authenticate, ctrl.getOrders);
router.post('/orders', authenticate, ctrl.createOrder);
router.put('/orders/:id/status', authenticate, ctrl.updateOrderStatus);
router.put('/orders/:id/results', authenticate, ctrl.saveResults);
router.get('/orders/:id/results', authenticate, ctrl.getResults);

module.exports = router;
