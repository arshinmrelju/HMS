const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/auditController');

router.get('/', authenticate, authorize('Admin'), ctrl.getLogs);

module.exports = router;
