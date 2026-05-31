////Manages hardship claims

const mongoose = require('mongoose');
const { HardshipClaim, Merchant } = require('../models');

// @desc    Submit hardship claim
// @route   POST /api/hardship/submit
// @access  Private (Merchant only)
const submitClaim = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user_id: req.user.userId });
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    const { event_type, description, supporting_docs } = req.body;

    // Validate required fields
    if (!event_type || !description) {
      return res.status(400).json({ message: 'Event type and description are required' });
    }

    // Check for recent claims (prevent spam)
    const recentClaim = await HardshipClaim.findOne({
      merchant_id: merchant._id,
      verification_status: 'pending',
      created_at: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    if (recentClaim) {
      return res.status(400).json({ message: 'You already have a pending claim. Please wait for review.' });
    }

    // Create claim
    const claim = await HardshipClaim.create({
      merchant_id: merchant._id,
      event_type,
      description,
      supporting_docs: supporting_docs || [],
      verification_status: 'pending',
      created_at: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Hardship claim submitted successfully',
      claim: {
        id: claim._id,
        event_type: claim.event_type,
        description: claim.description,
        verification_status: claim.verification_status,
        created_at: claim.created_at
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get merchant's hardship claims
// @route   GET /api/hardship/my-claims
// @access  Private (Merchant only)
const getMyClaims = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user_id: req.user.userId });
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    const claims = await HardshipClaim.find({ merchant_id: merchant._id })
      .sort({ created_at: -1 });

    res.json({
      total: claims.length,
      claims
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single claim details
// @route   GET /api/hardship/claim/:id
// @access  Private (Merchant only)
const getClaimById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const merchant = await Merchant.findOne({ user_id: req.user.userId });
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    const claim = await HardshipClaim.findOne({
      _id: id,
      merchant_id: merchant._id
    });

    if (!claim) {
      return res.status(404).json({ message: 'Claim not found' });
    }

    res.json({ claim });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all hardship claims (Admin)
// @route   GET /api/hardship/admin/all
// @access  Private (Admin only)
const getAllClaims = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { verification_status, page = 1, limit = 20 } = req.query;
    const query = {};
    
    if (verification_status) {
      query.verification_status = verification_status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const claims = await HardshipClaim.find(query)
      .populate('merchant_id', 'business_name trust_score tier citizen_id')
      .populate('verified_by', 'name email')
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await HardshipClaim.countDocuments(query);

    res.json({
      claims,
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

// @desc    Verify hardship claim (Admin)
// @route   PUT /api/hardship/admin/verify/:id
// @access  Private (Admin only)
const verifyClaim = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { id } = req.params;
    const { verification_status, rejection_reason } = req.body;

    if (!['verified', 'rejected'].includes(verification_status)) {
      return res.status(400).json({ message: 'Status must be verified or rejected' });
    }

    const claim = await HardshipClaim.findById(id).populate('merchant_id');
    if (!claim) {
      return res.status(404).json({ message: 'Claim not found' });
    }

    if (claim.verification_status !== 'pending') {
      return res.status(400).json({ message: `Claim already ${claim.verification_status}` });
    }

    // Update claim
    claim.verification_status = verification_status;
    claim.verified_by = req.user.userId;
    claim.verified_at = new Date();
    
    if (verification_status === 'rejected' && rejection_reason) {
      claim.rejection_reason = rejection_reason;
    }

    // If verified, adjust merchant trust score
    if (verification_status === 'verified') {
  const merchant = claim.merchant_id;
  // Only Gold merchants get automatic moratorium
  if (merchant.tier === 'gold' || merchant.tier === 'gold' && merchant.trust_score >= 80) {
    // Find all active loans (approved or applied)
    const Loan = require('../models/loan.model');
    await Loan.updateMany(
      { merchant_id: merchant._id, status: { $in: ['approved', 'applied'] } },
      { 
        $set: { 
          status: 'moratorium',
          moratorium_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months
          moratorium_reason: claim.event_type
        }
      }
    );
  }
}

    await claim.save();

    res.json({
      success: true,
      message: `Claim ${verification_status} successfully`,
      claim
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get hardship statistics (Admin)
// @route   GET /api/hardship/admin/stats
// @access  Private (Admin only)
const getHardshipStats = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const stats = await HardshipClaim.aggregate([
      {
        $group: {
          _id: '$verification_status',
          count: { $sum: 1 }
        }
      }
    ]);

    const eventTypeStats = await HardshipClaim.aggregate([
      {
        $group: {
          _id: '$event_type',
          count: { $sum: 1 }
        }
      }
    ]);

    const monthlyStats = await HardshipClaim.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$created_at' },
            month: { $month: '$created_at' },
            status: '$verification_status'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.json({
      status_breakdown: stats,
      event_type_breakdown: eventTypeStats,
      monthly_trends: monthlyStats
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  submitClaim,
  getMyClaims,
  getClaimById,
  getAllClaims,
  verifyClaim,
  getHardshipStats
};