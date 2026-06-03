const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/staffController');

router.get('/', authenticate, ctrl.getAll);
router.post('/', authenticate, authorize('Admin'), ctrl.create);
router.get('/roles', authenticate, ctrl.getRoles);
router.get('/schedules', authenticate, ctrl.getSchedules);
router.post('/schedules', authenticate, authorize('Admin'), ctrl.saveSchedule);
router.get('/attendance', authenticate, ctrl.getAttendance);
router.post('/attendance', authenticate, ctrl.markAttendance);
router.get('/head-of-staff', authenticate, ctrl.getHeadOfStaff);
router.post('/head-of-staff', authenticate, authorize('Admin'), ctrl.assignHeadOfStaff);
router.get('/:id', authenticate, ctrl.getById);
router.put('/:id', authenticate, authorize('Admin'), ctrl.update);
router.delete('/:id', authenticate, authorize('Admin'), ctrl.remove);

module.exports = router;
