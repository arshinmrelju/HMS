const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/patientController');

router.get('/', authenticate, ctrl.getAll);
router.get('/:id', authenticate, ctrl.getById);
router.post('/', authenticate, ctrl.create);
router.post('/bulk', authenticate, authorize('Admin', 'Staff'), ctrl.bulkCreate);
router.put('/:id', authenticate, ctrl.update);
router.delete('/:id', authenticate, authorize('Admin'), ctrl.remove);

module.exports = router;
