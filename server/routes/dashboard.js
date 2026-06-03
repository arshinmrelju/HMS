const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/dashboardController');

router.get('/stats', authenticate, ctrl.getStats);
router.get('/role-stats', authenticate, ctrl.getRoleStats);
router.get('/recent-activity', authenticate, ctrl.getRecentActivity);

module.exports = router;
