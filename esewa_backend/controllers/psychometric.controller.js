// controllers/psychometric.controller.js
const Merchant = require('../models/merchant.model');
const Transaction = require('../models/transaction.model');
const BehavioralAnalysis = require('../services/behavioralAnalysis');

// ---------------------------------------------------------------------
// GET /api/psychometric/questions – (optional, kept for reference)
// Returns sample questions (not used for scoring)
// ---------------------------------------------------------------------
exports.getQuestions = (req, res) => {
  const questions = [
    { id: 'C1', text: 'I complete my work tasks on time without reminders.', dimension: 'conscientiousness' },
    { id: 'C2', text: 'I keep my shop organized and plan my daily activities.', dimension: 'conscientiousness' },
    { id: 'C3', text: 'I prefer stable, predictable income over high-risk opportunities.', dimension: 'conscientiousness' },
    { id: 'C4', text: 'I save a portion of my earnings every month.', dimension: 'conscientiousness' },
    { id: 'C5', text: 'I follow through on promises I make to customers and suppliers.', dimension: 'conscientiousness' },
    { id: 'R1', text: 'I would take a loan even if the repayment period is uncertain.', dimension: 'risk_aversion', reverse: true },
    { id: 'R2', text: 'I prefer to keep cash at home rather than in a bank.', dimension: 'risk_aversion', reverse: true },
    { id: 'R3', text: 'I am willing to try new business ideas even if they might fail.', dimension: 'risk_aversion', reverse: true },
    { id: 'R4', text: 'I worry about taking loans because of possible income loss.', dimension: 'risk_aversion' },
    { id: 'R5', text: 'I would rather invest in safe assets than high-return risky assets.', dimension: 'risk_aversion' }
  ];
  res.json({ questions });
};

// ---------------------------------------------------------------------
// GET /api/psychometric/profile
// Returns psychometric scores inferred from transaction behavior (no answers stored)
// ---------------------------------------------------------------------
exports.getProfile = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user_id: req.user.userId });
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    // Get last 6 months of transactions
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const transactions = await Transaction.find({
      merchant_id: merchant._id,
      date: { $gte: sixMonthsAgo }
    }).sort({ date: 1 });

    // Infer psychometric scores directly from transaction patterns
    const inferred = BehavioralAnalysis.inferPsychometricFromBehavior(transactions, merchant);

    res.json({
      exists: true,
      psychometric_score: inferred.psychometric_score,
      conscientiousness: inferred.conscientiousness,
      risk_tolerance: inferred.risk_tolerance,
      future_orientation: inferred.future_orientation,
      impulsivity_control: inferred.impulsivity_control,
      method: "inferred from transaction behavior (no questionnaire)",
      last_6_months_transactions_used: transactions.length
    });
  } catch (error) {
    console.error('❌ Psychometric profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ---------------------------------------------------------------------
// POST /api/psychometric/submit – DEPRECATED (kept for compatibility, but does nothing)
// Now scores are inferred automatically; this endpoint returns a message.
// ---------------------------------------------------------------------
exports.submitAnswers = async (req, res) => {
  res.status(200).json({
    message: "Psychometric scores are now inferred automatically from transaction behavior. No manual submission needed.",
    note: "Your profile is already computed based on your last 6 months of transactions."
  });
};