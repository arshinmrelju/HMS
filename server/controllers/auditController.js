const pool = require('../config/db');

const getLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const action = req.query.action || '';

    let where = 'WHERE 1=1';
    const params = [];
    if (action) { where += ' AND al.action LIKE ?'; params.push(`%${action}%`); }

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM audit_logs al ${where}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.query(
      `SELECT al.*, u.name AS user_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    res.json({ success: true, data: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getLogs };
