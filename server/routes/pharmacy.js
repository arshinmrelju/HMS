const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/pharmacyController');

router.get('/inventory', authenticate, ctrl.getInventory);
router.get('/inventory/:id', authenticate, ctrl.getInventoryItem);
router.post('/inventory', authenticate, ctrl.addInventory);
router.put('/inventory/:id', authenticate, ctrl.updateInventory);
router.delete('/inventory/:id', authenticate, authorize('Admin', 'Pharmacist'), ctrl.deleteInventory);
router.get('/prescriptions', authenticate, ctrl.getPrescriptions);
router.put('/prescriptions/:id/fill', authenticate, authorize('Pharmacist'), ctrl.fillPrescription);
router.get('/requisitions', authenticate, ctrl.getRequisitions);
router.post('/requisitions', authenticate, ctrl.createRequisition);
router.put('/requisitions/:id/approve', authenticate, authorize('Admin'), ctrl.approveRequisition);
router.put('/requisitions/:id/receive', authenticate, authorize('Admin', 'Pharmacist'), ctrl.receiveRequisition);

module.exports = router;
