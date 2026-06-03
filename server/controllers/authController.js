const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { logAuditEvent } = require('../services/auditService');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.password_hash, u.name, u.title, u.phone, u.is_active, r.name AS role
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.email = ?`,
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact admin.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    await logAuditEvent(user.id, 'LOGIN', 'auth', user.id, { email: user.email }, req.ip);

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          title: user.title,
          phone: user.phone,
          role: user.role
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

const getProfile = async (req, res, next) => {
  try {
    res.json({ success: true, data: req.user });
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(newPassword, salt);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);

    await logAuditEvent(req.user.id, 'CHANGE_PASSWORD', 'auth', req.user.id, null, req.ip);
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, getProfile, changePassword };
