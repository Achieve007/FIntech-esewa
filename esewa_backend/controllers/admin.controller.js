//Admin operations for managing merchants and loans
const { User, Merchant, Loan, Transaction, HardshipClaim } = require('../models');

// @desc    Get all merchants (Admin)
// @route   GET /api/admin/merchants
// @access  Private (Admin only)
const getAllMerchants = async (req, res) => {
  try {
    const { page = 1, limit = 20, tier, minTrustScore } = req.query;
    const query = {};
    
    if (tier) query.tier = tier;
    if (minTrustScore) query.trust_score = { $gte: parseFloat(minTrustScore) };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const merchants = await Merchant.find(query)
      .populate('user_id', 'name email created_at')
      .sort({ trust_score: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Merchant.countDocuments(query);

    // Get additional stats for each merchant
    const merchantsWithStats = await Promise.all(
      merchants.map(async (merchant) => {
        const transactionStats = await Transaction.aggregate([
          { $match: { merchant_id: merchant._id, status: 'complete' } },
          {
            $group: {
              _id: null,
              total_credit: { $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0] } },
              total_debit: { $sum: { $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0] } }
            }
          }
        ]);

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

        return {
          ...merchant.toObject(),
          stats: {
            total_credit: transactionStats[0]?.total_credit || 0,
            total_debit: transactionStats[0]?.total_debit || 0,
            loan_summary: loanStats
          }
        };
      })
    );

    res.json({
      merchants: merchantsWithStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Approve or reject loan (Admin)
// @route   PUT /api/admin/loans/:id/:action
// @access  Private (Admin only)
const reviewLoan = async (req, res) => {
  try {
    const { id, action } = req.params;
    const { rejection_reason } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Use approve or reject' });
    }

    const loan = await Loan.findById(id).populate('merchant_id');
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    if (loan.status !== 'applied') {
      return res.status(400).json({ message: `Cannot ${action} loan with status: ${loan.status}` });
    }

    if (action === 'approve') {
      loan.status = 'approved';
      loan.approved_by = req.user.userId;
      loan.approved_at = new Date();

      // Calculate total payable and EMI
      // NOTE: Decimal128 fields stringify with `+`, so coerce to Number first
      // to avoid string concatenation (e.g. "5000" + 300 => "5000300").
      const amount = Number(loan.amount?.toString() ?? loan.amount) || 0;
      const interestRate = Number(loan.interest_rate?.toString() ?? loan.interest_rate) || 0;
      const months = Number(loan.duration_months) || 0;

      const totalPayable = amount + (amount * interestRate * months) / 100;
      loan.total_payable = totalPayable;
      loan.monthly_installment = months > 0 ? totalPayable / months : 0;

      // Update merchant trust score for responsible borrowing
      const merchant = loan.merchant_id;
      const currentTrust = Number(merchant.trust_score?.toString() ?? merchant.trust_score) || 0;
      merchant.trust_score = Math.min(100, currentTrust + 2);
      await merchant.updateTier();
      await merchant.save();
    } else {
      loan.status = 'rejected';
      loan.rejection_reason = rejection_reason || 'Not specified';
    }

    await loan.save();

    res.json({
      success: true,
      message: `Loan ${action}d successfully`,
      loan
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get platform analytics (Admin)
// @route   GET /api/admin/analytics
// @access  Private (Admin only)
const getAnalytics = async (req, res) => {
  try {
    // Total counts
    const totalMerchants = await Merchant.countDocuments();
    const totalUsers = await User.countDocuments({ role: 'merchant' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });

    // Loan analytics
    const loanAnalytics = await Loan.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total_amount: { $sum: '$amount' },
          avg_amount: { $avg: '$amount' }
        }
      }
    ]);

    // Transaction volume (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const transactionVolume = await Transaction.aggregate([
      {
        $match: {
          date: { $gte: thirtyDaysAgo },
          status: 'complete'
        }
      },
      {
        $group: {
          _id: '$type',
          total_amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Trust score distribution
    const trustDistribution = await Merchant.aggregate([
      {
        $bucket: {
          groupBy: '$trust_score',
          boundaries: [0, 25, 50, 75, 100],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            avg_score: { $avg: '$trust_score' }
          }
        }
      }
    ]);

    // Tier distribution
    const tierDistribution = await Merchant.aggregate([
      {
        $group: {
          _id: '$tier',
          count: { $sum: 1 },
          avg_trust_score: { $avg: '$trust_score' }
        }
      }
    ]);

    // Recent activities
    const recentLoans = await Loan.find()
      .sort({ applied_at: -1 })
      .limit(10)
      .populate('merchant_id', 'business_name');

    res.json({
      summary: {
        total_merchants: totalMerchants,
        total_users: totalUsers,
        total_admins: totalAdmins,
        active_loans: loanAnalytics.find(l => l._id === 'approved')?.count || 0,
        total_loan_volume: loanAnalytics.reduce((sum, l) => sum + (Number(l.total_amount?.toString() ?? l.total_amount) || 0), 0)
      },
      loan_analytics: loanAnalytics,
      transaction_volume: transactionVolume,
      trust_distribution: trustDistribution,
      tier_distribution: tierDistribution,
      recent_loans: recentLoans
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update merchant trust score (Admin)
// @route   PUT /api/admin/merchants/:id/trust-score
// @access  Private (Admin only)
const updateTrustScore = async (req, res) => {
  try {
    const { id } = req.params;
    const { trust_score, reason } = req.body;

    if (trust_score < 0 || trust_score > 100) {
      return res.status(400).json({ message: 'Trust score must be between 0 and 100' });
    }

    const merchant = await Merchant.findById(id);
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    const oldScore = merchant.trust_score;
    merchant.trust_score = trust_score;
    await merchant.updateTier();
    await merchant.save();

    res.json({
      success: true,
      message: `Trust score updated from ${oldScore} to ${trust_score}`,
      reason,
      merchant: {
        business_name: merchant.business_name,
        trust_score: merchant.trust_score,
        tier: merchant.tier
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllMerchants,
  reviewLoan,
  getAnalytics,
  updateTrustScore
};