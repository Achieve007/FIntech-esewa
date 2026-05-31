const mongoose = require('mongoose');

const hardshipClaimSchema = new mongoose.Schema({
  merchant_id:          { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
  event_type:           { type: String, maxlength: 50 },
  verification_status:  { type: String, maxlength: 20, enum: ['pending', 'verified', 'rejected'] },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

module.exports = mongoose.model('HardshipClaim', hardshipClaimSchema);