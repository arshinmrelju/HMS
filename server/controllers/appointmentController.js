const pool = require('../config/db');
const { logAuditEvent } = require('../services/auditService');

const getAll = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const date = req.query.date || '';
    const status = req.query.status || '';
    const doctorId = req.query.doctor_id || '';

    let where = 'WHERE 1=1';
    const params = [];
    if (date) { where += ' AND a.appointment_date = ?'; params.push(date); }
    if (status) { where += ' AND a.status = ?'; params.push(status); }
    if (doctorId) { where += ' AND a.doctor_id = ?'; params.push(doctorId); }
    if (req.user.role === 'Doctor') {
      where += ' AND a.doctor_id = ?';
      params.push(req.user.id);
    }

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM appointments a ${where}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT a.*, 
              CONCAT(p.fname, ' ', p.lname) AS patient_name, p.contact AS patient_contact,
              u.name AS doctor_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       LEFT JOIN users u ON a.doctor_id = u.id
       ${where}
       ORDER BY a.appointment_date DESC, a.appointment_time ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({ success: true, data: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, CONCAT(p.fname, ' ', p.lname) AS patient_name, u.name AS doctor_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       LEFT JOIN users u ON a.doctor_id = u.id
       WHERE a.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Appointment not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { patient_id, doctor_id, appointment_date, appointment_time, type, status, reason, notes } = req.body;
    if (!patient_id || !appointment_date) {
      return res.status(400).json({ success: false, message: 'Patient ID and appointment date are required.' });
    }

    const validStatuses = ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'waiting'];
    const finalStatus = status && validStatuses.includes(status) ? status : 'scheduled';
    const validTypes = ['scheduled', 'spot visit', 'follow-up', 'OPD'];
    const finalType = type && validTypes.includes(type) ? type : 'scheduled';

    const [result] = await pool.query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, type, status, reason, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [patient_id, doctor_id || null, appointment_date, appointment_time || null, finalType, finalStatus, reason || null, notes || null, req.user.id]
    );

    await logAuditEvent(req.user.id, 'CREATE_APPOINTMENT', 'appointment', result.insertId, { patient_id, date: appointment_date }, req.ip);
    const [newAppt] = await pool.query('SELECT * FROM appointments WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Appointment created successfully.', data: newAppt[0] });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { patient_id, doctor_id, appointment_date, appointment_time, type, status, reason, notes } = req.body;
    const [existing] = await pool.query('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Appointment not found.' });

    const validStatuses = ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'waiting'];
    const finalStatus = status && validStatuses.includes(status) ? status : existing[0].status;

    await pool.query(
      `UPDATE appointments SET patient_id=?, doctor_id=?, appointment_date=?, appointment_time=?, type=?, status=?, reason=?, notes=?
       WHERE id=?`,
      [
        patient_id || existing[0].patient_id,
        doctor_id ?? existing[0].doctor_id,
        appointment_date || existing[0].appointment_date,
        appointment_time ?? existing[0].appointment_time,
        type || existing[0].type,
        finalStatus,
        reason ?? existing[0].reason,
        notes ?? existing[0].notes,
        req.params.id
      ]
    );

    await logAuditEvent(req.user.id, 'UPDATE_APPOINTMENT', 'appointment', req.params.id, { status: finalStatus }, req.ip);
    const [updated] = await pool.query('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Appointment updated successfully.', data: updated[0] });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const [existing] = await pool.query('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Appointment not found.' });
    await pool.query('DELETE FROM appointments WHERE id = ?', [req.params.id]);
    await logAuditEvent(req.user.id, 'DELETE_APPOINTMENT', 'appointment', req.params.id, null, req.ip);
    res.json({ success: true, message: 'Appointment deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, create, update, remove };
