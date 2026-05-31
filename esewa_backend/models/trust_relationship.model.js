const mongoose = require('mongoose');

const trustRelationshipSchema = new mongoose.Schema({
  merchant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
  guarantor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
  trust_score: { type: Number, required: true },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TrustRelationship', trustRelationshipSchema);
