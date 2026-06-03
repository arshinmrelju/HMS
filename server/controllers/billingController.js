const pool = require('../config/db');
const { logAuditEvent } = require('../services/auditService');

const getAll = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const status = req.query.status || '';
    const dateFrom = req.query.date_from || '';
    const dateTo = req.query.date_to || '';

    let where = 'WHERE 1=1';
    const params = [];
    if (status) { where += ' AND t.payment_status = ?'; params.push(status); }
    if (dateFrom) { where += ' AND DATE(t.created_at) >= ?'; params.push(dateFrom); }
    if (dateTo) { where += ' AND DATE(t.created_at) <= ?'; params.push(dateTo); }

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM transactions t ${where}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT t.*, CONCAT(p.fname, ' ', p.lname) AS patient_name, u.name AS created_by_name
       FROM transactions t
       LEFT JOIN patients p ON t.patient_id = p.id
       LEFT JOIN users u ON t.created_by = u.id
       ${where}
       ORDER BY t.created_at DESC
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
      `SELECT t.*, CONCAT(p.fname, ' ', p.lname) AS patient_name, u.name AS created_by_name
       FROM transactions t
       LEFT JOIN patients p ON t.patient_id = p.id
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Transaction not found.' });
    const [items] = await pool.query('SELECT * FROM transaction_items WHERE transaction_id = ?', [req.params.id]);
    res.json({ success: true, data: { ...rows[0], items } });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const { patient_id, type, description, amount, discount, tax, payment_method, items } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Valid amount is required.' });
    const discountVal = discount || 0;
    const taxVal = tax || 0;
    const total = parseFloat(amount) - parseFloat(discountVal) + parseFloat(taxVal);
    const invoiceNo = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const [result] = await pool.query(
      `INSERT INTO transactions (patient_id, invoice_no, type, description, amount, discount, tax, total, payment_method, payment_status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [patient_id || null, invoiceNo, type || 'consultation', description || null, amount, discountVal, taxVal, total, payment_method || 'cash', 'paid', req.user.id]
    );
    const txnId = result.insertId;

    if (items && items.length) {
      for (const item of items) {
        await pool.query(
          `INSERT INTO transaction_items (transaction_id, item_name, quantity, unit_price, total_price)
           VALUES (?, ?, ?, ?, ?)`,
          [txnId, item.item_name, item.quantity || 1, item.unit_price || 0, (item.quantity || 1) * (item.unit_price || 0)]
        );
      }
    }
    await logAuditEvent(req.user.id, 'CREATE_TRANSACTION', 'transaction', txnId, { invoiceNo, total }, req.ip);
    res.status(201).json({ success: true, message: 'Transaction created.', data: { id: txnId, invoice_no: invoiceNo } });
  } catch (err) {
    next(err);
  }
};

const updatePaymentStatus = async (req, res, next) => {
  try {
    const { payment_status, upi_transaction_id } = req.body;
    const validStatuses = ['pending', 'paid', 'refunded', 'cancelled'];
    if (!payment_status || !validStatuses.includes(payment_status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${validStatuses.join(', ')}` });
    }
    await pool.query('UPDATE transactions SET payment_status = ?, upi_transaction_id = ? WHERE id = ?',
      [payment_status, upi_transaction_id || null, req.params.id]
    );
    await logAuditEvent(req.user.id, 'UPDATE_PAYMENT_STATUS', 'transaction', req.params.id, { payment_status }, req.ip);
    res.json({ success: true, message: 'Payment status updated.' });
  } catch (err) {
    next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    const dateFrom = req.query.date_from || new Date().toISOString().slice(0, 10);
    const [todayTotal] = await pool.query(
      'SELECT COALESCE(SUM(total), 0) AS total FROM transactions WHERE DATE(created_at) = ? AND payment_status = ?',
      [dateFrom, 'paid']
    );
    const [pendingTotal] = await pool.query(
      'SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS count FROM transactions WHERE payment_status = ?',
      ['pending']
    );
    const [overall] = await pool.query(
      'SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS count FROM transactions WHERE payment_status = ?',
      ['paid']
    );
    res.json({
      success: true,
      data: {
        todayCollection: todayTotal[0].total,
        pendingAmount: pendingTotal[0].total,
        pendingCount: pendingTotal[0].count,
        totalRevenue: overall[0].total,
        totalTransactions: overall[0].count
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, create, updatePaymentStatus, getStats };
