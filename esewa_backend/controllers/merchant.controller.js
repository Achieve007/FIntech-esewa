//Manages merchant profile and operations


const { Merchant, User, Transaction, Loan } = require('../models');

// @desc    Get merchant profile
// @route   GET /api/merchant/profile
// @access  Private (Merchant only)
const getProfile = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user_id: req.user.userId })
      .populate('user_id', 'name email');

    if (!merchant) {
      return res.status(404).json({ message: 'Merchant profile not found' });
    }

    // Get transaction summary
    const transactionStats = await Transaction.aggregate([
      { $match: { merchant_id: merchant._id, status: 'complete' } },
      {
        $group: {
          _id: null,
          total_credit: { $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0] } },
          total_debit: { $sum: { $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0] } },
          transaction_count: { $sum: 1 }
        }
      }
    ]);

    // Get loan summary
    const loanStats = await Loan.aggregate([
      { $match: { merchant_id: merchant._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total_amount: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      merchant,
      summary: {
        balance: transactionStats[0]?.total_credit - transactionStats[0]?.total_debit || 0,
        total_credit: transactionStats[0]?.total_credit || 0,
        total_debit: transactionStats[0]?.total_debit || 0,
        transaction_count: transactionStats[0]?.transaction_count || 0,
        loan_summary: loanStats
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update merchant profile
// @route   PUT /api/merchant/profile
// @access  Private (Merchant only)
const updateProfile = async (req, res) => {
  try {
    const { business_name, phone, address } = req.body;
    
    const merchant = await Merchant.findOne({ user_id: req.user.userId });
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant profile not found' });
    }

    if (business_name) merchant.business_name = business_name;
    if (phone) merchant.phone = phone;
    if (address) merchant.address = address;

    await merchant.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      merchant
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get merchant dashboard stats
// @route   GET /api/merchant/dashboard
// @access  Private (Merchant only)
const getDashboard = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user_id: req.user.userId });
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

// Calculate social boost
    const Reference = require('../models/reference.model');
    const { socialBoost, activeVouches } = await Reference.getSocialBoost(merchant._id);
    const { final_score } = await merchant.calculateFinalScore();


    // Recent transactions (last 10)
    const recentTransactions = await Transaction.find({ merchant_id: merchant._id })
      .sort({ date: -1 })
      .limit(10);

    // Active loans
    const activeLoans = await Loan.find({
      merchant_id: merchant._id,
      status: { $in: ['applied', 'approved'] }
    });

    // Monthly summary (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlySummary = await Transaction.aggregate([
      {
        $match: {
          merchant_id: merchant._id,
          date: { $gte: sixMonthsAgo },
          status: 'complete'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          credit: { $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0] } },
          debit: { $sum: { $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      merchant: {
        business_name: merchant.business_name,
        transaction_score: merchant.trust_score,
        social_boost: socialBoost,
        final_score: final_score,
        tier: merchant.tier,
        vouches_received: activeVouches,
        max_vouches_possible: 4
      },
      recent_transactions: recentTransactions,
      active_loans: activeLoans,
      monthly_summary: monthlySummary,
      metrics: {
        current_trust_score: merchant.trust_score,
        next_tier_threshold: merchant.tier === 'bronze' ? 50 : merchant.tier === 'silver' ? 75 : null,
        loans_taken: await Loan.countDocuments({ merchant_id: merchant._id })
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getDashboard
};