const { Merchant, Transaction } = require('../models');
const BehavioralAnalysis = require('../services/behavioralAnalysis');
const GeminiAnalyzer = require('../services/geminiAnalyzer');

// @desc    Get behavioral analysis for a merchant (admin)
// @route   POST /api/admin/analyze/:merchantId
// @access  Private (Admin only)
const analyzeMerchant = async (req, res) => {
  try {
    const { merchantId } = req.params;
    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    // --- Read loan parameters from query or body ---
    const loanAmount = parseFloat(req.query.loanAmount) || parseFloat(req.body.loanAmount) || 50000;
    const loanDurationMonths = parseInt(req.query.loanDurationMonths) || parseInt(req.body.loanDurationMonths) || 3;

    // Get last 6 months of transactions
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const transactions = await Transaction.find({
      merchant_id: merchant._id,
      date: { $gte: sixMonthsAgo }
    }).sort({ date: 1 });

    // Compute behavioral score (4 components)
    const behavioralScore = await BehavioralAnalysis.computeBehavioralScore(merchant, transactions);

    // Compute unified score with dynamic loan parameters
    const unifiedScore = await merchant.calculateFinalScore(loanAmount, loanDurationMonths);

    // Gemini analysis (mock or real)
    const geminiInsights = await GeminiAnalyzer.analyzeMerchant(merchant, transactions, unifiedScore);

    // Transaction summary
    const totalCredit = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
    const totalDebit = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);

    res.json({
      merchant: {
        id: merchant._id,
        business_name: merchant.business_name,
        trust_score: merchant.trust_score,
        tier: merchant.tier
      },
      behavioral_score: behavioralScore,
      unified_score: unifiedScore,
      gemini_analysis: geminiInsights,
      transactions_summary: {
        total_credit: totalCredit,
        total_debit: totalDebit,
        count: transactions.length
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Batch analyze merchants (portfolio risk)
// @route   POST /api/admin/analyze/batch
// @access  Private (Admin only)
const batchAnalyze = async (req, res) => {
  try {
    const merchants = await Merchant.find().limit(20);
    const merchantsWithData = [];
    for (const merchant of merchants) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const transactions = await Transaction.find({
        merchant_id: merchant._id,
        date: { $gte: sixMonthsAgo }
      });
      const behavioralScore = await BehavioralAnalysis.computeBehavioralScore(merchant, transactions);
      merchantsWithData.push({
        business_name: merchant.business_name,
        behavioralScore: behavioralScore.behavioral_score,
        riskLevel: behavioralScore.behavioral_score >= 70 ? 'LOW' : behavioralScore.behavioral_score >= 40 ? 'MEDIUM' : 'HIGH'
      });
    }
    const batchReport = await GeminiAnalyzer.batchAnalyze(merchantsWithData);
    res.json(batchReport);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get risk alerts (high‑risk merchants)
// @route   GET /api/admin/alerts
// @access  Private (Admin only)
const getRiskAlerts = async (req, res) => {
  try {
    const merchants = await Merchant.find().limit(50);
    const alerts = [];
    for (const merchant of merchants) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const transactions = await Transaction.find({
        merchant_id: merchant._id,
        date: { $gte: sixMonthsAgo }
      });
      const behavioralScore = await BehavioralAnalysis.computeBehavioralScore(merchant, transactions);
      if (behavioralScore.behavioral_score < 40) {
        alerts.push({
          merchant_id: merchant._id,
          name: merchant.business_name,
          risk_level: 'HIGH',
          behavioral_score: behavioralScore.behavioral_score,
          reason: 'Poor expense discipline and payment timing'
        });
      } else if (behavioralScore.behavioral_score < 60) {
        alerts.push({
          merchant_id: merchant._id,
          name: merchant.business_name,
          risk_level: 'MEDIUM',
          behavioral_score: behavioralScore.behavioral_score,
          reason: 'Moderate risk, monitor closely'
        });
      }
    }
    res.json({
      total_alerts: alerts.length,
      alerts: alerts.slice(0, 10)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  analyzeMerchant,
  batchAnalyze,
  getRiskAlerts
};