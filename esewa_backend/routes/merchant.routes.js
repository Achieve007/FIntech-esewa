const express = require('express');
const router = express.Router();
const { merchantController } = require('../controllers');
const { protect } = require('../middleware/auth');

// All merchant routes require authentication
router.use(protect);

// Profile management
router.get('/profile', merchantController.getProfile);
router.put('/profile', merchantController.updateProfile);
router.get('/dashboard', merchantController.getDashboard);

// Additional merchant endpoints
router.get('/stats', merchantController.getDashboard); // Alias for dashboard

module.exports = router;