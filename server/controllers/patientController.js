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

const bulkCreate = async (req, res, next) => {
  try {
    const { patients } = req.body;
    if (!patients || !Array.isArray(patients) || patients.length === 0) {
      return res.status(400).json({ success: false, message: 'No patient data provided.' });
    }
    let inserted = 0;
    const batchSize = 50;
    for (let i = 0; i < patients.length; i += batchSize) {
      const batch = patients.slice(i, i + batchSize);
      const values = [];
      for (const row of batch) {
        const name = String(row['Name'] || '').trim();
        if (!name) continue;
        const nameParts = name.split(/\s+/);
        const fname = nameParts[0] || '';
        const lname = nameParts.slice(1).join(' ') || '';
        let age = parseInt(row['Age']);
        if (isNaN(age) || age < 0 || age > 120) age = 0;
        const gender = String(row['Sex'] || row['gender'] || '').trim();
        const phone = String(row['Phone'] || row['contact'] || '').split(/[,/\s]+/)[0].trim().slice(0, 20);
        const address = [String(row[' House Name'] || row['address'] || '').trim(), String(row['Place'] || '').trim()].filter(Boolean).join(', ');
        let lastVisit = null;
        if (row['Date']) {
          const parts = String(row['Date']).split('-');
          if (parts.length === 3) lastVisit = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        let notesArr = [];
        for (const key of ['Remarks', 'Remark ', 'Diabetic Dtls', 'Allergy', 'BP', 'Temprature', 'Doctor', 'Hosp. OP No', 'Relation']) {
          if (row[key]) notesArr.push(`${key}: ${row[key]}`);
        }
        values.push([fname, lname, phone, '', 'General', 'Outpatient', '', age || null, gender, address, lastVisit, 'Active', null, req.user.id, notesArr.join('\n')]);
      }
      if (values.length === 0) continue;
      const placeholders = values.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
      await pool.query(
        `INSERT INTO patients (fname,lname,contact,email,department,patient_type,blood_group,age,gender,address,last_visit,status,doctor_id,created_by,notes) VALUES ${placeholders}`,
        values.flat()
      );
      inserted += values.length;
    }
    await logAuditEvent(req.user.id, 'BULK_IMPORT_PATIENTS', 'patient', null, { count: inserted }, req.ip);
    res.json({ success: true, message: `Imported ${inserted} patients.`, data: { imported: inserted } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, create, update, remove, bulkCreate };
