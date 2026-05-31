console.log('✅ Psychometric routes loaded');
const express = require('express');
const router = express.Router();
const psychometricController = require('../controllers/psychometric.controller');
const { protect } = require('../middleware/auth');

// Public route (questions)
router.get('/questions', psychometricController.getQuestions);

// Protected routes (merchant only)
router.post('/submit', protect, psychometricController.submitAnswers);
router.get('/profile', protect, psychometricController.getProfile);



module.exports = router;