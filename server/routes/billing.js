const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/billingController');

router.get('/transactions', authenticate, ctrl.getAll);
router.post('/transactions', authenticate, ctrl.create);
router.get('/transactions/stats', authenticate, ctrl.getStats);
router.get('/transactions/:id', authenticate, ctrl.getById);
router.put('/transactions/:id/status', authenticate, ctrl.updatePaymentStatus);

module.exports = router;
