const express = require('express');
const router = express.Router();
const { hardshipController } = require('../controllers');
const { protect, adminOnly } = require('../middleware/auth');

// Merchant routes (protected)
router.use(protect);

// Merchant endpoints
router.post('/submit', hardshipController.submitClaim);
router.get('/my-claims', hardshipController.getMyClaims);
router.get('/claim/:id', hardshipController.getClaimById);

// Admin only endpoints
router.get('/admin/all', adminOnly, hardshipController.getAllClaims);
router.put('/admin/verify/:id', adminOnly, hardshipController.verifyClaim);
router.get('/admin/stats', adminOnly, hardshipController.getHardshipStats);

module.exports = router;