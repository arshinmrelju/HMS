const pool = require('../config/db');

const logAuditEvent = async (userId, action, resourceType, resourceId, details, ipAddress) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId || null, action, resourceType || '', resourceId ? String(resourceId) : '', details ? JSON.stringify(details) : '', ipAddress || '']
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

module.exports = { logAuditEvent };
