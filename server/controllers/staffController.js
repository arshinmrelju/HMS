const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { logAuditEvent } = require('../services/auditService');

const getAll = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.name, u.title, u.phone, u.is_active, u.last_login, r.name AS role
       FROM users u JOIN roles r ON u.role_id = r.id
       ORDER BY u.name ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.name, u.title, u.phone, u.is_active, r.name AS role
       FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Staff member not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { email, password, name, title, phone, role } = req.body;
    if (!email || !password || !name || !role) return res.status(400).json({ success: false, message: 'Email, password, name, and role are required.' });
    if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });

    const validRoles = ['Admin', 'Doctor', 'Nurse', 'Receptionist', 'Pharmacist'];
    if (!validRoles.includes(role)) return res.status(400).json({ success: false, message: `Role must be one of: ${validRoles.join(', ')}` });

    const [roleRows] = await pool.query('SELECT id FROM roles WHERE name = ?', [role]);
    if (!roleRows.length) return res.status(400).json({ success: false, message: 'Invalid role.' });

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);
    const [result] = await pool.query(
      'INSERT INTO users (email, password_hash, name, title, phone, role_id) VALUES (?, ?, ?, ?, ?, ?)',
      [email, hash, name, title || '', phone || '', roleRows[0].id]
    );
    await logAuditEvent(req.user.id, 'CREATE_STAFF', 'user', result.insertId, { email, name, role }, req.ip);
    res.status(201).json({ success: true, message: 'Staff member created.', data: { id: result.insertId } });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Email already exists.' });
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { email, name, title, phone, is_active, role } = req.body;
    const [existing] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Staff member not found.' });

    if (role) {
      const [roleRows] = await pool.query('SELECT id FROM roles WHERE name = ?', [role]);
      if (!roleRows.length) return res.status(400).json({ success: false, message: 'Invalid role.' });
      await pool.query('UPDATE users SET role_id = ? WHERE id = ?', [roleRows[0].id, req.params.id]);
    }
    if (email !== undefined) await pool.query('UPDATE users SET email = ? WHERE id = ?', [email, req.params.id]);
    if (name !== undefined) await pool.query('UPDATE users SET name = ? WHERE id = ?', [name, req.params.id]);
    if (title !== undefined) await pool.query('UPDATE users SET title = ? WHERE id = ?', [title, req.params.id]);
    if (phone !== undefined) await pool.query('UPDATE users SET phone = ? WHERE id = ?', [phone, req.params.id]);
    if (is_active !== undefined) await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [is_active, req.params.id]);

    await logAuditEvent(req.user.id, 'UPDATE_STAFF', 'user', req.params.id, req.body, req.ip);
    res.json({ success: true, message: 'Staff member updated.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'Email already exists.' });
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await pool.query('UPDATE users SET is_active = 0 WHERE id = ?', [req.params.id]);
    await logAuditEvent(req.user.id, 'DEACTIVATE_STAFF', 'user', req.params.id, null, req.ip);
    res.json({ success: true, message: 'Staff member deactivated.' });
  } catch (err) {
    next(err);
  }
};

const getSchedules = async (req, res, next) => {
  try {
    const userId = req.query.user_id || '';
    let where = 'WHERE 1=1';
    const params = [];
    if (userId) { where += ' AND ss.user_id = ?'; params.push(userId); }
    const [rows] = await pool.query(
      `SELECT ss.*, u.name AS user_name
       FROM staff_schedules ss JOIN users u ON ss.user_id = u.id
       ${where} ORDER BY ss.user_id, ss.day_of_week`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

const saveSchedule = async (req, res, next) => {
  try {
    const { user_id, day_of_week, shift_start, shift_end, is_active } = req.body;
    if (user_id === undefined || day_of_week === undefined) return res.status(400).json({ success: false, message: 'User ID and day of week are required.' });
    const [existing] = await pool.query('SELECT id FROM staff_schedules WHERE user_id = ? AND day_of_week = ?', [user_id, day_of_week]);
    if (existing.length) {
      await pool.query('UPDATE staff_schedules SET shift_start = ?, shift_end = ?, is_active = ? WHERE id = ?',
        [shift_start || null, shift_end || null, is_active !== undefined ? is_active : 1, existing[0].id]);
    } else {
      await pool.query('INSERT INTO staff_schedules (user_id, day_of_week, shift_start, shift_end, is_active) VALUES (?, ?, ?, ?, ?)',
        [user_id, day_of_week, shift_start || null, shift_end || null, is_active !== undefined ? is_active : 1]);
    }
    res.json({ success: true, message: 'Schedule saved.' });
  } catch (err) {
    next(err);
  }
};

const getAttendance = async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const [rows] = await pool.query(
      `SELECT a.*, u.name AS user_name, u.title
       FROM attendance a JOIN users u ON a.user_id = u.id
       WHERE a.date = ? ORDER BY u.name ASC`,
      [date]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

const markAttendance = async (req, res, next) => {
  try {
    const { user_id, status, notes } = req.body;
    if (!user_id) return res.status(400).json({ success: false, message: 'User ID is required.' });
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const [existing] = await pool.query('SELECT id FROM attendance WHERE user_id = ? AND date = ?', [user_id, today]);
    if (existing.length) {
      await pool.query('UPDATE attendance SET check_out = ?, status = ?, notes = ? WHERE id = ?',
        [now, status || 'present', notes || null, existing[0].id]);
    } else {
      await pool.query('INSERT INTO attendance (user_id, date, check_in, status, notes) VALUES (?, ?, ?, ?, ?)',
        [user_id, today, now, status || 'present', notes || null]);
    }
    res.json({ success: true, message: 'Attendance marked.' });
  } catch (err) {
    next(err);
  }
};

const getHeadOfStaff = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT hos.*, u.name AS user_name, u.title
       FROM head_of_staff hos JOIN users u ON hos.user_id = u.id
       WHERE hos.is_current = 1 ORDER BY hos.assigned_date DESC LIMIT 1`
    );
    res.json({ success: true, data: rows.length ? rows[0] : null });
  } catch (err) {
    next(err);
  }
};

const assignHeadOfStaff = async (req, res, next) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ success: false, message: 'User ID is required.' });
    await pool.query('UPDATE head_of_staff SET is_current = 0 WHERE is_current = 1');
    const now = new Date();
    const day = now.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diffToMon);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const fmt = (d) => d.toISOString().slice(0, 10);
    await pool.query(
      'INSERT INTO head_of_staff (user_id, assigned_date, week_start, week_end, is_current) VALUES (?, ?, ?, ?, 1)',
      [user_id, fmt(now), fmt(weekStart), fmt(weekEnd)]
    );
    await logAuditEvent(req.user.id, 'ASSIGN_HEAD_OF_STAFF', 'head_of_staff', null, { user_id }, req.ip);
    res.json({ success: true, message: 'Head of Staff assigned.' });
  } catch (err) {
    next(err);
  }
};

const getRoles = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM roles ORDER BY name ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, create, update, remove, getSchedules, saveSchedule, getAttendance, markAttendance, getHeadOfStaff, assignHeadOfStaff, getRoles };
