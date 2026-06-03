const pool = require('../config/db');
const { logAuditEvent } = require('../services/auditService');

const getTests = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM lab_tests WHERE is_active = 1 ORDER BY name ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

const createTest = async (req, res, next) => {
  try {
    const { name, category, normal_range, unit, price } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Test name is required.' });
    const [result] = await pool.query(
      'INSERT INTO lab_tests (name, category, normal_range, unit, price) VALUES (?, ?, ?, ?, ?)',
      [name, category || '', normal_range || '', unit || '', price || 0]
    );
    res.status(201).json({ success: true, message: 'Lab test created.', data: { id: result.insertId } });
  } catch (err) {
    next(err);
  }
};

const getOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const status = req.query.status || '';

    let where = 'WHERE 1=1';
    const params = [];
    if (status) { where += ' AND lo.status = ?'; params.push(status); }

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM lab_orders lo ${where}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT lo.*, CONCAT(p.fname, ' ', p.lname) AS patient_name, p.contact AS patient_contact,
              u.name AS doctor_name, proc.name AS processed_by_name
       FROM lab_orders lo
       JOIN patients p ON lo.patient_id = p.id
       LEFT JOIN users u ON lo.doctor_id = u.id
       LEFT JOIN users proc ON lo.processed_by = proc.id
       ${where}
       ORDER BY lo.ordered_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    res.json({ success: true, data: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
};

const createOrder = async (req, res, next) => {
  try {
    const { patient_id, doctor_id, test_id, test_name, priority, notes } = req.body;
    if (!patient_id || !test_name) return res.status(400).json({ success: false, message: 'Patient ID and test name are required.' });
    const [result] = await pool.query(
      `INSERT INTO lab_orders (patient_id, doctor_id, test_id, test_name, priority, notes, ordered_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [patient_id, doctor_id || null, test_id || null, test_name, priority || 'normal', notes || null, req.user.id]
    );
    await logAuditEvent(req.user.id, 'CREATE_LAB_ORDER', 'lab_order', result.insertId, { patient_id, test_name }, req.ip);
    res.status(201).json({ success: true, message: 'Lab order created.', data: { id: result.insertId } });
  } catch (err) {
    next(err);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['ordered', 'processing', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) return res.status(400).json({ success: false, message: `Status must be one of: ${validStatuses.join(', ')}` });
    const updateData = { status };
    if (status === 'processing') { updateData.processed_by = req.user.id; updateData.processed_at = new Date(); }
    if (status === 'completed') { updateData.completed_at = new Date(); }
    await pool.query('UPDATE lab_orders SET status = ?, processed_by = ?, processed_at = ?, completed_at = ? WHERE id = ?',
      [status, updateData.processed_by || null, updateData.processed_at || null, updateData.completed_at || null, req.params.id]
    );
    await logAuditEvent(req.user.id, 'UPDATE_LAB_STATUS', 'lab_order', req.params.id, { status }, req.ip);
    res.json({ success: true, message: `Lab order ${status}.` });
  } catch (err) {
    next(err);
  }
};

const saveResults = async (req, res, next) => {
  try {
    const { results } = req.body;
    if (!results || !Array.isArray(results) || !results.length) return res.status(400).json({ success: false, message: 'Results array is required.' });
    await pool.query('DELETE FROM lab_results WHERE lab_order_id = ?', [req.params.id]);
    for (const r of results) {
      await pool.query(
        `INSERT INTO lab_results (lab_order_id, parameter, value, normal_range, unit, remarks) VALUES (?, ?, ?, ?, ?, ?)`,
        [req.params.id, r.parameter, r.value || '', r.normal_range || '', r.unit || '', r.remarks || null]
      );
    }
    await pool.query('UPDATE lab_orders SET status = ?, completed_at = NOW() WHERE id = ?', ['completed', req.params.id]);
    await logAuditEvent(req.user.id, 'SAVE_LAB_RESULTS', 'lab_order', req.params.id, null, req.ip);
    res.json({ success: true, message: 'Lab results saved.' });
  } catch (err) {
    next(err);
  }
};

const getResults = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM lab_results WHERE lab_order_id = ?', [req.params.id]);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

module.exports = { getTests, createTest, getOrders, createOrder, updateOrderStatus, saveResults, getResults };
