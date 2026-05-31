const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  merchant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
    required: true,
  },
  amount: {
    type: mongoose.Types.Decimal128,
    required: true,
  },
  duration_months: {
    type: Number,
    required: true,
  },
  interest_rate: {
    type: mongoose.Types.Decimal128,
    required: true,
  },
  purpose: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    maxlength: 20,
    enum: ['applied', 'approved', 'rejected', 'repaid', 'defaulted', 'moratorium'],
    default: 'applied',
  },
  applied_at: {
    type: Date,
    default: Date.now,
  },
  approved_at: {
    type: Date,
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  repaid_at: {
    type: Date,
  },
  rejection_reason: {
    type: String,
    trim: true,
  },
  total_payable: {
    type: mongoose.Types.Decimal128,
  },
  monthly_installment: {
    type: mongoose.Types.Decimal128,
  },
  moratorium_until: {
    type: Date,
  },
  moratorium_reason: {
    type: String,
    trim: true,
  },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

module.exports = mongoose.model('Loan', loanSchema);
