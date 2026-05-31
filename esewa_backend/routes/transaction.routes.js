const express = require('express');
const router = express.Router();
const { transactionController } = require('../controllers');
const { protect } = require('../middleware/auth');

// All transaction routes require authentication
router.use(protect);

// Transaction CRUD
router.get('/', transactionController.getTransactions);
router.post('/', transactionController.createTransaction);
router.get('/summary', transactionController.getTransactionSummary);

module.exports = router;