const pool = require('../config/db');
const { logAuditEvent } = require('../services/auditService');

const getInventory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const category = req.query.category || '';
    const lowStock = req.query.low_stock === 'true';

    let where = 'WHERE i.is_active = 1';
    const params = [];
    if (search) { where += ' AND (i.brand_name LIKE ? OR i.content LIKE ?)'; const q = `%${search}%`; params.push(q, q); }
    if (category) { where += ' AND i.category = ?'; params.push(category); }
    if (lowStock) { where += ' AND i.quantity <= i.reorder_level'; }

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM inventory i ${where}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT i.*, u.name AS created_by_name
       FROM inventory i
       LEFT JOIN users u ON i.created_by = u.id
       ${where}
       ORDER BY i.brand_name ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({ success: true, data: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
};

const getInventoryItem = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM inventory WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Inventory item not found.' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

const addInventory = async (req, res, next) => {
  try {
    const { brand_name, content, category, distributor, purchase_date, expiry_date, quantity, unit, cost_price, selling_price, mrp, reorder_level } = req.body;
    if (!brand_name || quantity === undefined) {
      return res.status(400).json({ success: false, message: 'Brand name and quantity are required.' });
    }
    const [result] = await pool.query(
      `INSERT INTO inventory (brand_name, content, category, distributor, purchase_date, expiry_date, quantity, unit, cost_price, selling_price, mrp, reorder_level, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [brand_name, content || '', category || '', distributor || '', purchase_date || null, expiry_date || null, quantity, unit || 'piece', cost_price || 0, selling_price || 0, mrp || 0, reorder_level || 10, req.user.id]
    );
    await logAuditEvent(req.user.id, 'ADD_INVENTORY', 'inventory', result.insertId, { brand_name, quantity }, req.ip);
    const [item] = await pool.query('SELECT * FROM inventory WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Inventory item added.', data: item[0] });
  } catch (err) {
    next(err);
  }
};

const updateInventory = async (req, res, next) => {
  try {
    const fields = ['brand_name', 'content', 'category', 'distributor', 'purchase_date', 'expiry_date', 'quantity', 'unit', 'cost_price', 'selling_price', 'mrp', 'reorder_level'];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); params.push(req.body[f]); }
    }
    if (!updates.length) return res.status(400).json({ success: false, message: 'No fields to update.' });
    params.push(req.params.id);
    await pool.query(`UPDATE inventory SET ${updates.join(', ')} WHERE id = ?`, params);
    await logAuditEvent(req.user.id, 'UPDATE_INVENTORY', 'inventory', req.params.id, req.body, req.ip);
    const [item] = await pool.query('SELECT * FROM inventory WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Inventory updated.', data: item[0] });
  } catch (err) {
    next(err);
  }
};

const deleteInventory = async (req, res, next) => {
  try {
    await pool.query('UPDATE inventory SET is_active = 0 WHERE id = ?', [req.params.id]);
    await logAuditEvent(req.user.id, 'DELETE_INVENTORY', 'inventory', req.params.id, null, req.ip);
    res.json({ success: true, message: 'Inventory item deactivated.' });
  } catch (err) {
    next(err);
  }
};

const getPrescriptions = async (req, res, next) => {
  try {
    const status = req.query.status || '';
    let where = 'WHERE 1=1';
    const params = [];
    if (status) { where += ' AND p.status = ?'; params.push(status); }
    const [rows] = await pool.query(
      `SELECT p.*, CONCAT(pt.fname, ' ', pt.lname) AS patient_name, u.name AS doctor_name
       FROM prescriptions p
       JOIN patients pt ON p.patient_id = pt.id
       JOIN users u ON p.doctor_id = u.id
       ${where}
       ORDER BY p.created_at DESC LIMIT 100`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

const fillPrescription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT * FROM prescriptions WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Prescription not found.' });

    await pool.query('UPDATE prescriptions SET status = ? WHERE id = ?', ['dispensed', id]);
    await logAuditEvent(req.user.id, 'FILL_PRESCRIPTION', 'prescription', id, null, req.ip);

    const [items] = await pool.query('SELECT * FROM prescription_items WHERE prescription_id = ?', [id]);
    for (const item of items) {
      await pool.query(
        `UPDATE inventory SET quantity = GREATEST(quantity - ?, 0) WHERE brand_name = ? AND is_active = 1 LIMIT 1`,
        [item.quantity, item.medicine_name]
      );
    }
    res.json({ success: true, message: 'Prescription dispensed.' });
  } catch (err) {
    next(err);
  }
};

const getRequisitions = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT pr.*, u.name AS created_by_name, a.name AS approved_by_name, i.brand_name AS inventory_name
       FROM purchase_requisitions pr
       LEFT JOIN users u ON pr.created_by = u.id
       LEFT JOIN users a ON pr.approved_by = a.id
       LEFT JOIN inventory i ON pr.inventory_id = i.id
       ORDER BY pr.created_at DESC LIMIT 100`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

const createRequisition = async (req, res, next) => {
  try {
    const { inventory_id, item_name, quantity_needed, notes } = req.body;
    if (!item_name || !quantity_needed) return res.status(400).json({ success: false, message: 'Item name and quantity needed are required.' });
    const [result] = await pool.query(
      `INSERT INTO purchase_requisitions (inventory_id, item_name, quantity_needed, notes, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [inventory_id || null, item_name, quantity_needed, notes || null, req.user.id]
    );
    await logAuditEvent(req.user.id, 'CREATE_REQUISITION', 'purchase_requisition', result.insertId, { item_name, quantity_needed }, req.ip);
    res.status(201).json({ success: true, message: 'Requisition created.', data: { id: result.insertId } });
  } catch (err) {
    next(err);
  }
};

const approveRequisition = async (req, res, next) => {
  try {
    await pool.query(
      'UPDATE purchase_requisitions SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?',
      ['approved', req.user.id, req.params.id]
    );
    await logAuditEvent(req.user.id, 'APPROVE_REQUISITION', 'purchase_requisition', req.params.id, null, req.ip);
    res.json({ success: true, message: 'Requisition approved.' });
  } catch (err) {
    next(err);
  }
};

const receiveRequisition = async (req, res, next) => {
  try {
    const [pr] = await pool.query('SELECT * FROM purchase_requisitions WHERE id = ?', [req.params.id]);
    if (!pr.length) return res.status(404).json({ success: false, message: 'Requisition not found.' });
    await pool.query('UPDATE purchase_requisitions SET status = ?, received_at = NOW() WHERE id = ?', ['received', req.params.id]);
    if (pr[0].inventory_id) {
      await pool.query('UPDATE inventory SET quantity = quantity + ? WHERE id = ?', [pr[0].quantity_needed, pr[0].inventory_id]);
    }
    await logAuditEvent(req.user.id, 'RECEIVE_REQUISITION', 'purchase_requisition', req.params.id, null, req.ip);
    res.json({ success: true, message: 'Stock received.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getInventory, getInventoryItem, addInventory, updateInventory, deleteInventory,
  getPrescriptions, fillPrescription,
  getRequisitions, createRequisition, approveRequisition, receiveRequisition
};
