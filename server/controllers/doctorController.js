const pool = require('../config/db');
const { logAuditEvent } = require('../services/auditService');

const getAll = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.name, u.title, u.phone, u.is_active, r.name AS role
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE r.name = 'Doctor' AND u.is_active = 1
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
      `SELECT u.id, u.email, u.name, u.title, u.phone, u.is_active
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? AND r.name = 'Doctor'`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Doctor not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

const getPatients = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, fname, lname, contact, email, department, patient_type, blood_group, dob, age, gender, status, last_visit
       FROM patients WHERE doctor_id = ? ORDER BY last_visit DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

const getAppointments = async (req, res, next) => {
  try {
    const date = req.query.date || '';
    let where = 'WHERE a.doctor_id = ?';
    const params = [req.params.id];
    if (date) { where += ' AND a.appointment_date = ?'; params.push(date); }
    const [rows] = await pool.query(
      `SELECT a.*, CONCAT(p.fname, ' ', p.lname) AS patient_name, p.contact AS patient_contact
       FROM appointments a JOIN patients p ON a.patient_id = p.id
       ${where} ORDER BY a.appointment_date DESC, a.appointment_time ASC`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

const createPrescription = async (req, res, next) => {
  try {
    const { patient_id, appointment_id, diagnosis, notes, items } = req.body;
    if (!patient_id || !items || !items.length) {
      return res.status(400).json({ success: false, message: 'Patient ID and prescription items are required.' });
    }

    const [rxResult] = await pool.query(
      `INSERT INTO prescriptions (patient_id, doctor_id, appointment_id, diagnosis, notes, status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [patient_id, req.user.id, appointment_id || null, diagnosis || null, notes || null]
    );
    const prescriptionId = rxResult.insertId;

    for (const item of items) {
      await pool.query(
        `INSERT INTO prescription_items (prescription_id, medicine_name, dosage, frequency, duration, quantity, instructions)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [prescriptionId, item.medicine_name, item.dosage || '', item.frequency || '', item.duration || '', item.quantity || 0, item.instructions || null]
      );
    }

    await logAuditEvent(req.user.id, 'CREATE_PRESCRIPTION', 'prescription', prescriptionId, { patient_id }, req.ip);
    res.status(201).json({ success: true, message: 'Prescription created successfully.', data: { id: prescriptionId } });
  } catch (err) {
    next(err);
  }
};

const getPrescriptions = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, CONCAT(pt.fname, ' ', pt.lname) AS patient_name
       FROM prescriptions p
       JOIN patients pt ON p.patient_id = pt.id
       WHERE p.doctor_id = ?
       ORDER BY p.created_at DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

const getTodayStats = async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [apptCount] = await pool.query(
      `SELECT COUNT(*) AS total FROM appointments WHERE doctor_id = ? AND appointment_date = ?`,
      [req.params.id, today]
    );
    const [patientCount] = await pool.query(
      `SELECT COUNT(*) AS total FROM patients WHERE doctor_id = ?`,
      [req.params.id]
    );
    const [rxCount] = await pool.query(
      `SELECT COUNT(*) AS total FROM prescriptions WHERE doctor_id = ? AND DATE(created_at) = ?`,
      [req.params.id, today]
    );
    res.json({ success: true, data: { todayAppointments: apptCount[0].total, totalPatients: patientCount[0].total, todayPrescriptions: rxCount[0].total } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, getPatients, getAppointments, createPrescription, getPrescriptions, getTodayStats };
