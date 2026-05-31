// Handles all transaction operations

const { Transaction, Merchant } = require('../models');

// @desc    Get all transactions for merchant
// @route   GET /api/transactions
// @access  Private (Merchant only)
const getTransactions = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user_id: req.user.userId });
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    const { limit = 50, page = 1, type, status, startDate, endDate } = req.query;
    const query = { merchant_id: merchant._id };

    // Filters
    if (type) query.type = type;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const transactions = await Transaction.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
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

// @desc    Create new transaction
// @route   POST /api/transactions
// @access  Private (Merchant only)
const createTransaction = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user_id: req.user.userId });
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    const { amount, type, category, description } = req.body;

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be positive' });
    }

    // Create transaction
    const transaction = await Transaction.create({
      merchant_id: merchant._id,
      amount,
      type,
      category: category || 'other',
      description,
      status: 'complete',
      reference_id: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    // Update merchant metadata
    if (type === 'credit') {
      merchant.metadata.total_credit = (merchant.metadata.total_credit || 0) + amount;
    } else {
      merchant.metadata.total_debit = (merchant.metadata.total_debit || 0) + amount;
    }
    
    // Update trust score based on transaction behavior
    if (type === 'credit' && amount > 1000) {
      merchant.trust_score = Math.min(100, merchant.trust_score + 0.5);
    } else if (type === 'debit' && amount > 500) {
      merchant.trust_score = Math.max(0, merchant.trust_score - 0.3);
    }
    
    await merchant.updateTier();
    await merchant.save();

    res.status(201).json({
      success: true,
      transaction,
      updated_trust_score: merchant.trust_score
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get transaction summary
// @route   GET /api/transactions/summary
// @access  Private (Merchant only)
const getTransactionSummary = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user_id: req.user.userId });
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    const { period = 'month' } = req.query;
    let startDate = new Date();

    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === 'year') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    const summary = await Transaction.aggregate([
      {
        $match: {
          merchant_id: merchant._id,
          date: { $gte: startDate },
          status: 'complete'
        }
      },
      {
        $group: {
          _id: '$type',
          total_amount: { $sum: '$amount' },
          count: { $sum: 1 },
          avg_amount: { $avg: '$amount' }
        }
      }
    ]);

    const categoryBreakdown = await Transaction.aggregate([
      {
        $match: {
          merchant_id: merchant._id,
          date: { $gte: startDate },
          status: 'complete'
        }
      },
      {
        $group: {
          _id: '$category',
          total_amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      period,
      start_date: startDate,
      summary,
      category_breakdown: categoryBreakdown
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getTransactions,
  createTransaction,
  getTransactionSummary
};