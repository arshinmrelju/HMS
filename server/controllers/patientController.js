const pool = require('../config/db');
const { logAuditEvent } = require('../services/auditService');

const getAll = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';

    let where = 'WHERE 1=1';
    const params = [];
    if (search) {
      where += ' AND (p.fname LIKE ? OR p.lname LIKE ? OR p.contact LIKE ?)';
      const q = `%${search}%`;
      params.push(q, q, q);
    }
    if (status) {
      where += ' AND p.status = ?';
      params.push(status);
    }
    if (req.user.role === 'Doctor') {
      where += ' AND (p.doctor_id = ? OR p.doctor_id IS NULL)';
      params.push(req.user.id);
    }

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM patients p ${where}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT p.*, u.name AS doctor_name
       FROM patients p
       LEFT JOIN users u ON p.doctor_id = u.id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, u.name AS doctor_name
       FROM patients p
       LEFT JOIN users u ON p.doctor_id = u.id
       WHERE p.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Patient not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { fname, lname, contact, email, department, patient_type, blood_group, dob, age, gender, address, status, doctor_id } = req.body;
    if (!fname || !lname) {
      return res.status(400).json({ success: false, message: 'First and last name are required.' });
    }

    const validStatuses = ['Active', 'Inactive', 'Discharged', 'Follow-up'];
    const finalStatus = status && validStatuses.includes(status) ? status : 'Active';

    const [result] = await pool.query(
      `INSERT INTO patients (fname, lname, contact, email, department, patient_type, blood_group, dob, age, gender, address, status, doctor_id, created_by, last_visit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [fname, lname, contact || '', email || '', department || '', patient_type || 'Outpatient', blood_group || '', dob || null, age || null, gender || '', address || '', finalStatus, doctor_id || null, req.user.id]
    );

    await logAuditEvent(req.user.id, 'CREATE_PATIENT', 'patient', result.insertId, { fname, lname }, req.ip);
    const [newPatient] = await pool.query('SELECT * FROM patients WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Patient created successfully.', data: newPatient[0] });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const { fname, lname, contact, email, department, patient_type, blood_group, dob, age, gender, address, status, doctor_id } = req.body;
    const [existing] = await pool.query('SELECT * FROM patients WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Patient not found.' });

    const validStatuses = ['Active', 'Inactive', 'Discharged', 'Follow-up'];
    const finalStatus = status && validStatuses.includes(status) ? status : existing[0].status;

    await pool.query(
      `UPDATE patients SET fname=?, lname=?, contact=?, email=?, department=?, patient_type=?, blood_group=?, dob=?, age=?, gender=?, address=?, status=?, doctor_id=?
       WHERE id=?`,
      [fname || existing[0].fname, lname || existing[0].lname, contact ?? existing[0].contact, email ?? existing[0].email, department ?? existing[0].department, patient_type || existing[0].patient_type, blood_group ?? existing[0].blood_group, dob ?? existing[0].dob, age ?? existing[0].age, gender ?? existing[0].gender, address ?? existing[0].address, finalStatus, doctor_id ?? existing[0].doctor_id, req.params.id]
    );

    await logAuditEvent(req.user.id, 'UPDATE_PATIENT', 'patient', req.params.id, { fname, lname }, req.ip);
    const [updated] = await pool.query('SELECT * FROM patients WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Patient updated successfully.', data: updated[0] });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const [existing] = await pool.query('SELECT * FROM patients WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Patient not found.' });
    await pool.query('DELETE FROM patients WHERE id = ?', [req.params.id]);
    await logAuditEvent(req.user.id, 'DELETE_PATIENT', 'patient', req.params.id, { name: `${existing[0].fname} ${existing[0].lname}` }, req.ip);
    res.json({ success: true, message: 'Patient deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, create, update, remove };
