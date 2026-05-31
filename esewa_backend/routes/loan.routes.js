const express = require('express');
const router = express.Router();
const { loanController } = require('../controllers');
const { protect } = require('../middleware/auth');

// All loan routes require authentication
router.use(protect);

// Loan management
router.post('/apply', loanController.applyForLoan);
router.get('/', loanController.getMyLoans);
router.get('/:id', loanController.getLoanDetails);
router.post('/:id/repay', loanController.repayLoan);

module.exports = router;