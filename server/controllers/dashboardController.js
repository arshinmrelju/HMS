const pool = require('../config/db');

const getStats = async (req, res, next) => {
  try {
    const dateFrom = req.query.date_from || '';
    const dateTo = req.query.date_to || '';
    let dateWhere = '';
    const params = [];
    if (dateFrom && dateTo) { dateWhere = 'WHERE DATE(created_at) BETWEEN ? AND ?'; params.push(dateFrom, dateTo); }

    const [patientCount] = await pool.query('SELECT COUNT(*) AS total FROM patients');
    const [apptCount] = await pool.query('SELECT COUNT(*) AS total FROM appointments');
    const [todayAppts] = await pool.query(
      'SELECT COUNT(*) AS total FROM appointments WHERE appointment_date = ?',
      [new Date().toISOString().slice(0, 10)]
    );
    const [staffCount] = await pool.query('SELECT COUNT(*) AS total FROM users WHERE is_active = 1');
    const [lowStock] = await pool.query('SELECT COUNT(*) AS total FROM inventory WHERE quantity <= reorder_level AND is_active = 1');
    const [pendingLab] = await pool.query("SELECT COUNT(*) AS total FROM lab_orders WHERE status IN ('ordered','processing')");
    const [revenue] = await pool.query("SELECT COALESCE(SUM(total), 0) AS total FROM transactions WHERE payment_status = 'paid'");
    const [pendingBills] = await pool.query("SELECT COUNT(*) AS total FROM transactions WHERE payment_status = 'pending'");

    let revenueTrend = [];
    if (dateFrom && dateTo) {
      [revenueTrend] = await pool.query(
        `SELECT DATE(created_at) AS date, COALESCE(SUM(total), 0) AS total
         FROM transactions WHERE payment_status = 'paid' AND DATE(created_at) BETWEEN ? AND ?
         GROUP BY DATE(created_at) ORDER BY date ASC`,
        [dateFrom, dateTo]
      );
    }

    const [appointmentsByStatus] = await pool.query(
      'SELECT status, COUNT(*) AS count FROM appointments GROUP BY status'
    );

    res.json({
      success: true,
      data: {
        totalPatients: patientCount[0].total,
        totalAppointments: apptCount[0].total,
        todayAppointments: todayAppts[0].total,
        totalStaff: staffCount[0].total,
        lowStockItems: lowStock[0].total,
        pendingLabOrders: pendingLab[0].total,
        totalRevenue: revenue[0].total,
        pendingBills: pendingBills[0].total,
        revenueTrend,
        appointmentsByStatus
      }
    });
  } catch (err) {
    next(err);
  }
};

const getRoleStats = async (req, res, next) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;
    const today = new Date().toISOString().slice(0, 10);

    if (role === 'Doctor') {
      const [myAppts] = await pool.query(
        'SELECT COUNT(*) AS total FROM appointments WHERE doctor_id = ? AND appointment_date = ?',
        [userId, today]
      );
      const [myPatients] = await pool.query(
        'SELECT COUNT(*) AS total, COUNT(DISTINCT id) AS distinct_patients FROM patients WHERE doctor_id = ?',
        [userId]
      );
      const [myRx] = await pool.query(
        'SELECT COUNT(*) AS total FROM prescriptions WHERE doctor_id = ? AND DATE(created_at) = ?',
        [userId, today]
      );
      res.json({ success: true, data: { todayAppointments: myAppts[0].total, totalPatients: myPatients[0].total, todayPrescriptions: myRx[0].total } });
    } else if (role === 'Pharmacist') {
      const [pendingRx] = await pool.query("SELECT COUNT(*) AS total FROM prescriptions WHERE status = 'active'");
      const [lowStock] = await pool.query('SELECT COUNT(*) AS total FROM inventory WHERE quantity <= reorder_level AND is_active = 1');
      const [totalItems] = await pool.query('SELECT COUNT(*) AS total FROM inventory WHERE is_active = 1');
      const [todayDispensed] = await pool.query("SELECT COUNT(*) AS total FROM prescriptions WHERE status = 'dispensed' AND DATE(updated_at) = ?", [today]);
      res.json({ success: true, data: { pendingPrescriptions: pendingRx[0].total, lowStockItems: lowStock[0].total, totalInventory: totalItems[0].total, todayDispensed: todayDispensed[0].total } });
    } else {
      const [patientCount] = await pool.query('SELECT COUNT(*) AS total FROM patients');
      const [apptCount] = await pool.query('SELECT COUNT(*) AS total FROM appointments WHERE appointment_date = ?', [today]);
      const [revenue] = await pool.query("SELECT COALESCE(SUM(total), 0) AS total FROM transactions WHERE payment_status = 'paid' AND DATE(created_at) = ?", [today]);
      res.json({ success: true, data: { totalPatients: patientCount[0].total, todayAppointments: apptCount[0].total, todayRevenue: revenue[0].total } });
    }
  } catch (err) {
    next(err);
  }
};

const getRecentActivity = async (req, res, next) => {
  try {
    const [patients] = await pool.query('SELECT id, fname, lname, created_at, "patient" AS type FROM patients ORDER BY created_at DESC LIMIT 5');
    const [appointments] = await pool.query('SELECT a.id, CONCAT(p.fname, " ", p.lname) AS name, a.created_at, "appointment" AS type FROM appointments a JOIN patients p ON a.patient_id = p.id ORDER BY a.created_at DESC LIMIT 5');
    const [transactions] = await pool.query('SELECT id, invoice_no AS name, created_at, "transaction" AS type FROM transactions ORDER BY created_at DESC LIMIT 5');
    res.json({ success: true, data: { patients, appointments, transactions } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStats, getRoleStats, getRecentActivity };
