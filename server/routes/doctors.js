const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/doctorController');

router.get('/', authenticate, ctrl.getAll);
router.post('/prescriptions', authenticate, ctrl.createPrescription);
router.get('/:id/prescriptions', authenticate, ctrl.getPrescriptions);
router.get('/:id/appointments', authenticate, ctrl.getAppointments);
router.get('/:id/patients', authenticate, ctrl.getPatients);
router.get('/:id/stats', authenticate, ctrl.getTodayStats);
router.get('/:id', authenticate, ctrl.getById);

module.exports = router;
