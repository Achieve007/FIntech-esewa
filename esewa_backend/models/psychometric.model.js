const mongoose = require('mongoose');

// Schema for individual answer (subdocument)
const answerSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  value: { type: Number, min: 1, max: 5, required: true }
}, { _id: false });

const psychometricSchema = new mongoose.Schema({
  merchant_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
    required: true,
    unique: true
  },
  answers: {
    type: [answerSchema],  // Array of subdocuments
    default: []
  },
  conscientiousness: { type: Number, min: 0, max: 100, default: 50 },
  risk_aversion: { type: Number, min: 0, max: 100, default: 50 },
  psychometric_score: { type: Number, min: 0, max: 100, default: 50 },
  completed_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: true });

psychometricSchema.index({ merchant_id: 1 });

module.exports = mongoose.model('Psychometric', psychometricSchema);