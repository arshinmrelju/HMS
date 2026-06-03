const express = require('express');
const router = express.Router();
const { login, getProfile, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/login', login);
router.get('/me', authenticate, getProfile);
router.put('/change-password', authenticate, changePassword);

module.exports = router;
