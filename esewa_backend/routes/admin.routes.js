const express = require('express');
const router = express.Router();
const { adminController } = require('../controllers');
const behavioralController = require('../controllers/behavioral.controller');
const { protect, adminOnly } = require('../middleware/auth');

// All admin routes require authentication AND admin role
router.use(protect);
router.use(adminOnly);

// Merchant management
router.get('/merchants', adminController.getAllMerchants);
router.put('/merchants/:id/trust-score', adminController.updateTrustScore);

// Loan management
router.put('/loans/:id/:action', adminController.reviewLoan);

// Analytics
router.get('/analytics', adminController.getAnalytics);

// Dashboard overview
router.get('/dashboard', adminController.getAnalytics);

 //Behavioral & Gemini AI routes
router.post('/analyze/:merchantId', behavioralController.analyzeMerchant);
router.post('/analyze/batch', behavioralController.batchAnalyze);
router.get('/alerts', behavioralController.getRiskAlerts);


module.exports = router;