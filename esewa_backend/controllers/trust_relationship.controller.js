//Manages trust relationships and guarantees


const mongoose = require('mongoose');
const { TrustRelationship, Merchant, User } = require('../models');

// @desc    Create trust relationship (add guarantor)
// @route   POST /api/trust/add-guarantor
// @access  Private (Merchant only)
const addGuarantor = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user_id: req.user.userId });
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    const { guarantor_citizen_id, trust_score, relationship_type } = req.body;

    if (!guarantor_citizen_id) {
      return res.status(400).json({ message: 'Guarantor citizen ID is required' });
    }

    // Find guarantor merchant
    const guarantor = await Merchant.findOne({ citizen_id: guarantor_citizen_id });
    if (!guarantor) {
      return res.status(404).json({ message: 'Guarantor not found with this citizen ID' });
    }

    // Cannot add self as guarantor
    if (guarantor._id.toString() === merchant._id.toString()) {
      return res.status(400).json({ message: 'Cannot add yourself as guarantor' });
    }

    // Check if relationship already exists
    const existing = await TrustRelationship.findOne({
      merchant_id: merchant._id,
      guarantor_id: guarantor._id
    });

    if (existing) {
      return res.status(400).json({ message: 'Guarantor relationship already exists' });
    }

    // Create trust relationship
    const relationship = await TrustRelationship.create({
      merchant_id: merchant._id,
      guarantor_id: guarantor._id,
      trust_score: trust_score || 50,
      relationship_type: relationship_type || 'guarantor',
      is_active: true,
      created_at: new Date()
    });

    // Update merchant's trust score based on guarantor's score
    const avgTrustScore = (merchant.trust_score + guarantor.trust_score) / 2;
    merchant.trust_score = Math.min(100, avgTrustScore);
    
    // Update tier
    if (merchant.trust_score >= 75) merchant.tier = 'gold';
    else if (merchant.trust_score >= 50) merchant.tier = 'silver';
    else merchant.tier = 'bronze';
    
    await merchant.save();

    res.status(201).json({
      success: true,
      message: 'Guarantor added successfully',
      relationship: {
        id: relationship._id,
        guarantor_business: guarantor.business_name,
        trust_score: relationship.trust_score,
        relationship_type: relationship.relationship_type
      },
      updated_trust_score: merchant.trust_score,
      updated_tier: merchant.tier
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get merchant's guarantors
// @route   GET /api/trust/my-guarantors
// @access  Private (Merchant only)
const getMyGuarantors = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user_id: req.user.userId });
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    const relationships = await TrustRelationship.find({
      merchant_id: merchant._id,
      is_active: true
    }).populate('guarantor_id', 'business_name trust_score tier citizen_id');

    const guarantors = relationships.map(rel => ({
      id: rel._id,
      business_name: rel.guarantor_id.business_name,
      trust_score: rel.guarantor_id.trust_score,
      tier: rel.guarantor_id.tier,
      relationship_trust_score: rel.trust_score,
      relationship_type: rel.relationship_type,
      created_at: rel.created_at
    }));

    res.json({
      total: guarantors.length,
      guarantors
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get merchants where I'm guarantor
// @route   GET /api/trust/my-guarantees
// @access  Private (Merchant only)
const getMyGuarantees = async (req, res) => {
  try {
    const merchant = await Merchant.findOne({ user_id: req.user.userId });
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    const relationships = await TrustRelationship.find({
      guarantor_id: merchant._id,
      is_active: true
    }).populate('merchant_id', 'business_name trust_score tier');

    const guarantees = relationships.map(rel => ({
      id: rel._id,
      merchant: {
        business_name: rel.merchant_id.business_name,
        trust_score: rel.merchant_id.trust_score,
        tier: rel.merchant_id.tier
      },
      trust_score_given: rel.trust_score,
      relationship_type: rel.relationship_type,
      created_at: rel.created_at
    }));

    res.json({
      total: guarantees.length,
      guarantees
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update trust score for relationship
// @route   PUT /api/trust/update/:id
// @access  Private (Merchant only)
const updateRelationshipTrust = async (req, res) => {
  try {
    const { id } = req.params;
    const { trust_score } = req.body;

    if (trust_score < 0 || trust_score > 100) {
      return res.status(400).json({ message: 'Trust score must be between 0 and 100' });
    }

    const relationship = await TrustRelationship.findById(id);
    if (!relationship) {
      return res.status(404).json({ message: 'Relationship not found' });
    }

    // Verify user owns this relationship
    const merchant = await Merchant.findOne({ user_id: req.user.userId });
    if (relationship.merchant_id.toString() !== merchant._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to update this relationship' });
    }

    relationship.trust_score = trust_score;
    await relationship.save();

    res.json({
      success: true,
      message: 'Trust score updated successfully',
      relationship: {
        id: relationship._id,
        trust_score: relationship.trust_score
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Remove guarantor relationship
// @route   DELETE /api/trust/remove/:id
// @access  Private (Merchant only)
const removeGuarantor = async (req, res) => {
  try {
    const { id } = req.params;

    const relationship = await TrustRelationship.findById(id);
    if (!relationship) {
      return res.status(404).json({ message: 'Relationship not found' });
    }

    // Verify user owns this relationship
    const merchant = await Merchant.findOne({ user_id: req.user.userId });
    if (relationship.merchant_id.toString() !== merchant._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to remove this relationship' });
    }

    // Soft delete - mark as inactive
    relationship.is_active = false;
    await relationship.save();

    res.json({
      success: true,
      message: 'Guarantor relationship removed successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get trust network (Admin)
// @route   GET /api/trust/admin/network
// @access  Private (Admin only)
const getTrustNetwork = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const relationships = await TrustRelationship.find({ is_active: true })
      .populate('merchant_id', 'business_name trust_score tier')
      .populate('guarantor_id', 'business_name trust_score tier')
      .sort({ created_at: -1 })
      .limit(100);

    const networkStats = await TrustRelationship.aggregate([
      { $match: { is_active: true } },
      {
        $group: {
          _id: null,
          total_relationships: { $sum: 1 },
          avg_trust_score: { $avg: '$trust_score' }
        }
      }
    ]);

    res.json({
      total_relationships: relationships.length,
      average_trust_score: networkStats[0]?.avg_trust_score || 0,
      relationships,
      network_stats: networkStats[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  addGuarantor,
  getMyGuarantors,
  getMyGuarantees,
  updateRelationshipTrust,
  removeGuarantor,
  getTrustNetwork
};