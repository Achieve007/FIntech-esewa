//models/reference.model.js


const mongoose = require('mongoose');

const referenceSchema = new mongoose.Schema(
  {
    fromMerchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    toMerchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    relationship: {
      type: String,
      enum: ['supplier', 'friend', 'neighbor', 'community'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'revoked', 'expired'],
      default: 'active',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    revokedAt: Date,
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Ensure one merchant cannot vouch for same merchant twice
referenceSchema.index({ fromMerchantId: 1, toMerchantId: 1 }, { unique: true });

// Compound index for queries
referenceSchema.index({ toMerchantId: 1, status: 1 });
referenceSchema.index({ fromMerchantId: 1, status: 1 });
referenceSchema.index({ expiresAt: 1 });

// Static method to calculate social boost for a merchant
referenceSchema.statics.getSocialBoost = async function(merchantId) {
  const activeVouches = await this.countDocuments({
    toMerchantId: merchantId,
    status: 'active',
    expiresAt: { $gt: new Date() }
  });
  
  // Each vouch = +5 points, max 20 points (4 vouches)
  const socialBoost = Math.min(activeVouches * 5, 20);
  return { activeVouches, socialBoost };
};

// Static method to check if merchant can receive more vouches
referenceSchema.statics.canReceiveVouch = async function(merchantId) {
  const activeVouches = await this.countDocuments({
    toMerchantId: merchantId,
    status: 'active',
    expiresAt: { $gt: new Date() }
  });
  return activeVouches < 4; // Max 4 vouches
};

// Instance method to revoke vouch
referenceSchema.methods.revoke = async function(userId) {
  this.status = 'revoked';
  this.revokedAt = new Date();
  this.revokedBy = userId;
  await this.save();
  return this;
};

module.exports = mongoose.model('Reference', referenceSchema);