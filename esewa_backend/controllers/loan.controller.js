//Manages loan applications and tracking


const { Loan, Merchant, User } = require('../models');

// @desc    Apply for new loan
// @route   POST /api/loans/apply
// @access  Private (Merchant only)
const applyForLoan = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user_id: req.user.userId });
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    const { amount, duration_months, interest_rate, purpose } = req.body;

    // Validate loan amount based on trust score
    const maxLoanAmount = merchant.trust_score * 100; // Trust score 50 = max 5000
    if (amount > maxLoanAmount) {
      return res.status(400).json({
        message: `Maximum loan amount based on your trust score (${merchant.trust_score}) is ${maxLoanAmount}`,
        max_allowed: maxLoanAmount
      });
    }

    // Check existing active loans
    const existingActiveLoans = await Loan.countDocuments({
      merchant_id: merchant._id,
      status: { $in: ['applied', 'approved'] }
    });

    if (existingActiveLoans >= 3) {
      return res.status(400).json({ message: 'Maximum 3 active loans allowed' });
    }

    // Create loan application
    const loan = await Loan.create({
      merchant_id: merchant._id,
      amount,
      duration_months,
      interest_rate: interest_rate || (merchant.tier === 'gold' ? 4.5 : merchant.tier === 'silver' ? 6.0 : 7.5),
      purpose,
      applied_at: new Date(),
      monthly_installment: null // Will be calculated on approval
    });

    // Update merchant metadata
    merchant.metadata.loan_count = (merchant.metadata.loan_count || 0) + 1;
    await merchant.save();

    res.status(201).json({
      success: true,
      message: 'Loan application submitted successfully',
      loan: {
        id: loan._id,
        amount: loan.amount,
        duration_months: loan.duration_months,
        interest_rate: loan.interest_rate,
        status: loan.status,
        applied_at: loan.applied_at
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get merchant's loans
// @route   GET /api/loans
// @access  Private (Merchant only)
const getMyLoans = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user_id: req.user.userId });
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    const { status } = req.query;
    const query = { merchant_id: merchant._id };
    if (status) query.status = status;

    const loans = await Loan.find(query)
      .sort({ applied_at: -1 })
      .populate('approved_by', 'name email');

    // Calculate EMI for each loan
    const loansWithEMI = loans.map(loan => ({
      ...loan.toObject(),
      emi: loan.calculateEMI ? loan.calculateEMI() : (loan.total_payable / loan.duration_months)
    }));

    res.json({
      total_loans: loans.length,
      loans: loansWithEMI
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get loan details
// @route   GET /api/loans/:id
// @access  Private (Merchant & Admin)
const getLoanDetails = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate('merchant_id', 'business_name trust_score tier')
      .populate('approved_by', 'name email');

    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    // Check authorization (merchant owns the loan or is admin)
    const merchant = await Merchant.findOne({ user_id: req.user.userId });
    if (req.user.role !== 'admin' && loan.merchant_id._id.toString() !== merchant._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json({
      loan,
      emi: loan.calculateEMI ? loan.calculateEMI() : (loan.total_payable / loan.duration_months)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Repay loan (Merchant)
// @route   POST /api/loans/:id/repay
// @access  Private (Merchant only)
const repayLoan = async (req, res) => {
  try {
    const { amount } = req.body;
    
    const loan = await Loan.findById(req.params.id);

if (loan.status === 'moratorium') {
  return res.status(400).json({ message: 'Loan is under moratorium due to verified hardship. Payments paused until ' + loan.moratorium_until });
}

    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const merchant = await Merchant.findOne({ user_id: req.user.userId });
    if (loan.merchant_id.toString() !== merchant._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (loan.status !== 'approved') {
      return res.status(400).json({ message: `Cannot repay loan with status: ${loan.status}` });
    }

    // For MVP, mark as repaid if any payment made
    if (amount >= loan.amount) {
      loan.status = 'repaid';
      loan.repaid_at = new Date();
      
      // Update merchant trust score for successful repayment
      merchant.trust_score = Math.min(100, merchant.trust_score + 5);
      await merchant.updateTier();
      await merchant.save();
    }

    await loan.save();

    res.json({
      success: true,
      message: loan.status === 'repaid' ? 'Loan fully repaid!' : 'Partial payment recorded',
      loan
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  applyForLoan,
  getMyLoans,
  getLoanDetails,
  repayLoan
};
