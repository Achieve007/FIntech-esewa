const express = require('express');
const router = express.Router();
const referenceController = require('../controllers/reference.controller');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Vouch management
router.post('/vouch', referenceController.createVouch);
router.delete('/vouch/:id', referenceController.revokeVouch);

// Query routes
router.get('/incoming/:merchantId?', referenceController.getIncomingVouches);
router.get('/outgoing/:merchantId?', referenceController.getOutgoingVouches);
router.get('/network/:merchantId?', referenceController.getSocialNetwork);
router.get('/can-receive/:merchantId', referenceController.checkCanReceiveVouch);

// Admin only
router.post('/expire', referenceController.expireOldVouches);

module.exports = router;