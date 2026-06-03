const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const appointmentRoutes = require('./routes/appointments');
const doctorRoutes = require('./routes/doctors');
const pharmacyRoutes = require('./routes/pharmacy');
const labRoutes = require('./routes/lab');
const billingRoutes = require('./routes/billing');
const staffRoutes = require('./routes/staff');
const dashboardRoutes = require('./routes/dashboard');
const auditRoutes = require('./routes/audit');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '..', 'public')));

// Request logger for debugging
app.use('/api', (req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit', auditRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Wellness Medicals API is running.', timestamp: new Date().toISOString() });
});

// Catch-all 404 for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Wellness Medicals server running on http://localhost:${PORT}`);
});
