const mongoose = require('mongoose');

const merchantSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  business_name: { type: String, required: true },
  citizen_id: { type: String, required: true, unique: true },
  trust_score: { type: Number, default: 0, min: 0, max: 100 },
  tier: { type: String, enum: ['bronze', 'silver', 'gold'], default: 'bronze' },
  assets_value: { type: Number, default: 0 },   // in NPR
  vat_filing_rate: { type: Number, default: 0, min: 0, max: 100 },
  metadata: {
    total_credit: { type: Number, default: 0 },
    total_debit: { type: Number, default: 0 },
    loan_count: { type: Number, default: 0 }
  }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// ------------------------------------------------------------
// Method: calculateFinalScore – accepts loan amount & duration
// ------------------------------------------------------------
merchantSchema.methods.calculateFinalScore = async function(loanAmount = 50000, loanDurationMonths = 3) {
  const Reference = require('./reference.model');
  const Transaction = require('./transaction.model');
  const BehavioralAnalysis = require('../services/behavioralAnalysis');
  
  // 1. Social boost
  const { socialBoost } = await Reference.getSocialBoost(this._id);
  
  // 2. Get last 6 months transactions
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const transactions = await Transaction.find({
    merchant_id: this._id,
    date: { $gte: sixMonthsAgo }
  }).sort({ date: 1 });
  
  // 3. Behavioral score (4 components)
  const behavioralResult = await BehavioralAnalysis.computeBehavioralScore(this, transactions);
  const behavioralScore = behavioralResult.behavioral_score;
  
  // 4. Psychometric score (inferred from behavior)
  const psychometricInferred = BehavioralAnalysis.inferPsychometricFromBehavior(transactions, this);
  const psychometricScore = psychometricInferred.psychometric_score;
  
  // 5. Sliding window empirical score – using dynamic loan parameters
  const empiricalScore = BehavioralAnalysis.calculateEmpiricalScore(transactions, loanAmount, loanDurationMonths);
  
  // 6. Assets score: months of expenses covered by assets (capped at 12 months)
  const totalExpenses = transactions.filter(tx => tx.type === 'debit').reduce((sum, tx) => sum + tx.amount, 0);
  const monthlyExpense = (totalExpenses / 6) || 1;
  const assetsScore = Math.min((this.assets_value / monthlyExpense / 12) * 100, 100);
  
  // 7. VAT score (direct from merchant field)
  const vatScore = this.vat_filing_rate || 0;
  
  // 8. Payment history score (using on‑time rate from behavioral components)
  const onTimeRate = (behavioralResult.components.payment_timing / 100) || 0;
  const paymentHistoryScore = onTimeRate * 100;
  
  // Weights (per document)
  const finalScore = (empiricalScore * 0.30) +
                     (behavioralScore * 0.25) +
                     (psychometricScore * 0.15) +
                     (assetsScore * 0.10) +
                     (vatScore * 0.10) +
                     (paymentHistoryScore * 0.10) +
                     socialBoost;
  
  const cappedScore = Math.min(Math.round(finalScore), 100);
  
  return {
    final_score: cappedScore,
    components: {
      empirical_score: Math.round(empiricalScore),
      behavioral_score: behavioralScore,
      psychometric_score: psychometricScore,
      assets_score: Math.round(assetsScore),
      vat_score: Math.round(vatScore),
      payment_history_score: Math.round(paymentHistoryScore),
      social_boost: socialBoost
    },
    vouch_count: await Reference.countDocuments({
      toMerchantId: this._id,
      status: 'active',
      expiresAt: { $gt: new Date() }
    })
  };
};

// ------------------------------------------------------------
// Method: updateTier – uses final_score from calculateFinalScore
// ------------------------------------------------------------
merchantSchema.methods.updateTier = async function(loanAmount, loanDurationMonths) {
  const { final_score } = await this.calculateFinalScore(loanAmount, loanDurationMonths);
  if (final_score >= 75) this.tier = 'gold';
  else if (final_score >= 50) this.tier = 'silver';
  else this.tier = 'bronze';
  return this;
};

module.exports = mongoose.model('Merchant', merchantSchema);