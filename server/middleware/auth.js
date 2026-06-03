const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.name, u.title, u.phone, u.is_active, r.name AS role
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? AND u.is_active = 1`,
      [decoded.id]
    );
    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid token: user not found or inactive.' });
    }
    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: insufficient permissions.' });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
