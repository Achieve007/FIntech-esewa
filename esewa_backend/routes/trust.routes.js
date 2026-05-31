const express = require('express');
const router = express.Router();
const { trustController } = require('../controllers');
const { protect, adminOnly } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Trust relationship management
router.post('/add-guarantor', trustController.addGuarantor);
router.get('/my-guarantors', trustController.getMyGuarantors);
router.get('/my-guarantees', trustController.getMyGuarantees);
router.put('/update/:id', trustController.updateRelationshipTrust);
router.delete('/remove/:id', trustController.removeGuarantor);

// Admin only
router.get('/admin/network', adminOnly, trustController.getTrustNetwork);

module.exports = router;