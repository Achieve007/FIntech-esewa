//controllers/reference.controller.js


const mongoose = require('mongoose');
const { Reference, Merchant, User } = require('../models');

// @desc    Gold merchant vouches for another merchant
// @route   POST /api/reference/vouch
// @access  Private (Gold Merchant only)
const createVouch = async (req, res) => {
  try {
    // Get the vouching merchant (must be Gold tier)
    const fromMerchant = await Merchant.findOne({ user_id: req.user.userId });
    
    if (!fromMerchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }
    
    // CRITICAL: Check if merchant is Gold tier (score ≥ 80 OR tier === 'gold')
    const { final_score } = await fromMerchant.calculateFinalScore();
    
    if (fromMerchant.tier !== 'gold' && final_score < 80) {
      return res.status(403).json({ 
        message: 'Only Gold tier merchants (score ≥ 80) can vouch for others',
        current_tier: fromMerchant.tier,
        current_score: final_score,
        required_score: 80
      });
    }
    
    const { toMerchantId, relationship } = req.body;
    
    if (!toMerchantId || !relationship) {
      return res.status(400).json({ 
        message: 'Missing required fields: toMerchantId, relationship' 
      });
    }
    
    // Find the receiving merchant
    const toMerchant = await Merchant.findById(toMerchantId);
    if (!toMerchant) {
      return res.status(404).json({ message: 'Target merchant not found' });
    }
    
    // Cannot vouch for self
    if (fromMerchant._id.toString() === toMerchant._id.toString()) {
      return res.status(400).json({ message: 'Cannot vouch for yourself' });
    }
    
    // Check if receiver can receive more vouches (max 4)
    const canReceive = await Reference.canReceiveVouch(toMerchantId);
    if (!canReceive) {
      const currentVouches = await Reference.countDocuments({
        toMerchantId,
        status: 'active',
        expiresAt: { $gt: new Date() }
      });
      return res.status(400).json({ 
        message: `Merchant already has maximum vouches (4/4). Current: ${currentVouches}`,
        max_vouches: 4,
        current_vouches: currentVouches
      });
    }
    
    // Check if already vouched
    const existingVouch = await Reference.findOne({
      fromMerchantId: fromMerchant._id,
      toMerchantId: toMerchant._id,
      status: 'active'
    });
    
    if (existingVouch) {
      return res.status(400).json({ message: 'You have already vouched for this merchant' });
    }
    
    // Calculate expiry date (1 year from now)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    
    // Create the vouch
    const vouch = await Reference.create({
      fromMerchantId: fromMerchant._id,
      toMerchantId: toMerchant._id,
      relationship,
      status: 'active',
      expiresAt,
      createdAt: new Date()
    });
    
    // Calculate new social boost for receiver
    const { socialBoost, activeVouches } = await Reference.getSocialBoost(toMerchant._id);
    const oldScore = toMerchant.trust_score;
    const newFinalScore = oldScore + socialBoost;
    
    // Update receiver's trust score (add social boost)
    // Note: We're storing transaction score separately, final score is calculated on the fly
    await toMerchant.updateTier();
    
    // Populate merchant details for response
    await vouch.populate('fromMerchantId', 'business_name trust_score tier');
    await vouch.populate('toMerchantId', 'business_name trust_score tier');
    
    res.status(201).json({
      success: true,
      message: `Vouch created successfully! ${toMerchant.business_name} receives +5 points`,
      vouch: {
        id: vouch._id,
        from_merchant: vouch.fromMerchantId.business_name,
        to_merchant: vouch.toMerchantId.business_name,
        relationship: vouch.relationship,
        expires_at: vouch.expiresAt
      },
      receiver_update: {
        merchant: toMerchant.business_name,
        old_score: oldScore,
        social_boost: socialBoost,
        new_final_score: oldScore + socialBoost,
        total_vouches_received: activeVouches,
        max_vouches_allowed: 4
      }
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get list of merchants who vouched for this merchant (incoming)
// @route   GET /api/reference/incoming/:merchantId
// @access  Private
const getIncomingVouches = async (req, res) => {
  try {
    const { merchantId } = req.params;
    
    // If no merchantId provided, get current user's merchant
    let targetMerchantId = merchantId;
    if (!targetMerchantId) {
      const merchant = await Merchant.findOne({ user_id: req.user.userId });
      targetMerchantId = merchant._id;
    }
    
    const vouches = await Reference.find({
      toMerchantId: targetMerchantId,
      status: 'active',
      expiresAt: { $gt: new Date() }
    })
      .populate('fromMerchantId', 'business_name trust_score tier citizen_id')
      .sort({ createdAt: -1 });
    
    const { socialBoost, activeVouches } = await Reference.getSocialBoost(targetMerchantId);
    
    res.json({
      merchant_id: targetMerchantId,
      total_vouches_received: activeVouches,
      max_vouches_allowed: 4,
      current_social_boost: socialBoost,
      vouches: vouches.map(v => ({
        id: v._id,
        from_merchant: v.fromMerchantId.business_name,
        from_merchant_tier: v.fromMerchantId.tier,
        from_merchant_score: v.fromMerchantId.trust_score,
        relationship: v.relationship,
        created_at: v.createdAt,
        expires_at: v.expiresAt
      }))
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get list of merchants this merchant vouched for (outgoing)
// @route   GET /api/reference/outgoing/:merchantId
// @access  Private
const getOutgoingVouches = async (req, res) => {
  try {
    const { merchantId } = req.params;
    
    let fromMerchantId = merchantId;
    if (!fromMerchantId) {
      const merchant = await Merchant.findOne({ user_id: req.user.userId });
      fromMerchantId = merchant._id;
    }
    
    const vouches = await Reference.find({
      fromMerchantId: fromMerchantId,
      status: 'active'
    })
      .populate('toMerchantId', 'business_name trust_score tier')
      .sort({ createdAt: -1 });
    
    res.json({
      merchant_id: fromMerchantId,
      total_vouches_given: vouches.length,
      max_vouches_allowed: 'Unlimited (as Gold merchant)',
      vouches: vouches.map(v => ({
        id: v._id,
        to_merchant: v.toMerchantId.business_name,
        to_merchant_tier: v.toMerchantId.tier,
        to_merchant_score: v.toMerchantId.trust_score,
        relationship: v.relationship,
        created_at: v.createdAt,
        expires_at: v.expiresAt
      }))
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Revoke a vouch
// @route   DELETE /api/reference/vouch/:id
// @access  Private (Only the vouch creator or admin)
const revokeVouch = async (req, res) => {
  try {
    const { id } = req.params;
    
    const vouch = await Reference.findById(id);
    if (!vouch) {
      return res.status(404).json({ message: 'Vouch not found' });
    }
    
    // Check if user is authorized to revoke
    const merchant = await Merchant.findOne({ user_id: req.user.userId });
    const isCreator = vouch.fromMerchantId.toString() === merchant._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: 'Unauthorized to revoke this vouch' });
    }
    
    if (vouch.status !== 'active') {
      return res.status(400).json({ message: `Vouch is already ${vouch.status}` });
    }
    
    // Revoke the vouch
    await vouch.revoke(req.user.userId);
    
    // Update receiver's social boost
    const receiver = await Merchant.findById(vouch.toMerchantId);
    const { socialBoost, activeVouches } = await Reference.getSocialBoost(receiver._id);
    
    res.json({
      success: true,
      message: 'Vouch revoked successfully',
      vouch: {
        id: vouch._id,
        status: vouch.status,
        revoked_at: vouch.revokedAt
      },
      receiver_update: {
        merchant: receiver.business_name,
        new_social_boost: socialBoost,
        total_vouches_remaining: activeVouches
      }
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get social graph network visualization data
// @route   GET /api/reference/network/:merchantId
// @access  Private
const getSocialNetwork = async (req, res) => {
  try {
    const { merchantId } = req.params;
    
    let targetMerchantId = merchantId;
    if (!targetMerchantId) {
      const merchant = await Merchant.findOne({ user_id: req.user.userId });
      targetMerchantId = merchant._id;
    }
    
    // Get incoming vouches (who trusts me)
    const incoming = await Reference.find({
      toMerchantId: targetMerchantId,
      status: 'active',
      expiresAt: { $gt: new Date() }
    }).populate('fromMerchantId', 'business_name trust_score tier');
    
    // Get outgoing vouches (who I trust)
    const outgoing = await Reference.find({
      fromMerchantId: targetMerchantId,
      status: 'active'
    }).populate('toMerchantId', 'business_name trust_score tier');
    
    // Get current merchant details
    const merchant = await Merchant.findById(targetMerchantId);
    const { final_score, socialBoost } = await merchant.calculateFinalScore();
    
    res.json({
      center_merchant: {
        id: merchant._id,
        business_name: merchant.business_name,
        trust_score: merchant.trust_score,
        social_boost: socialBoost,
        final_score: final_score,
        tier: merchant.tier
      },
      network: {
        incoming_trust: incoming.map(v => ({
          merchant: v.fromMerchantId.business_name,
          tier: v.fromMerchantId.tier,
          trust_score: v.fromMerchantId.trust_score,
          relationship: v.relationship,
          since: v.createdAt
        })),
        outgoing_trust: outgoing.map(v => ({
          merchant: v.toMerchantId.business_name,
          tier: v.toMerchantId.tier,
          trust_score: v.toMerchantId.trust_score,
          relationship: v.relationship,
          until: v.expiresAt
        }))
      },
      stats: {
        trust_received: incoming.length,
        trust_given: outgoing.length,
        max_benefit_received: Math.min(incoming.length * 5, 20),
        social_graph_strength: incoming.length + outgoing.length
      }
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Check if merchant can receive more vouches
// @route   GET /api/reference/can-receive/:merchantId
// @access  Private
const checkCanReceiveVouch = async (req, res) => {
  try {
    const { merchantId } = req.params;
    
    const canReceive = await Reference.canReceiveVouch(merchantId);
    const currentVouches = await Reference.countDocuments({
      toMerchantId: merchantId,
      status: 'active',
      expiresAt: { $gt: new Date() }
    });
    
    res.json({
      merchant_id: merchantId,
      can_receive_vouch: canReceive,
      current_vouches: currentVouches,
      max_vouches: 4,
      remaining_slots: 4 - currentVouches,
      points_per_vouch: 5,
      max_possible_boost: 20
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Auto-expire old vouches (cron job)
// @route   POST /api/reference/expire
// @access  Private (Admin only)
const expireOldVouches = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }
    
    const result = await Reference.updateMany(
      {
        status: 'active',
        expiresAt: { $lt: new Date() }
      },
      {
        status: 'expired'
      }
    );
    
    res.json({
      success: true,
      message: `Expired ${result.modifiedCount} vouches`,
      expired_count: result.modifiedCount
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createVouch,
  getIncomingVouches,
  getOutgoingVouches,
  revokeVouch,
  getSocialNetwork,
  checkCanReceiveVouch,
  expireOldVouches
};