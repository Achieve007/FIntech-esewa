const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  merchant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['credit', 'debit'], required: true },
  status: { type: String, enum: ['pending', 'complete', 'failed'], default: 'pending' },
  category: { type: String, enum: ['utility', 'retail', 'loan_repayment', 'inventory', 'salary', 'other'], default: 'other' },
  date: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);