const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ['merchant', 'admin'], default: 'merchant' }
}, { timestamps: { createdAt: 'created_at' } });

module.exports = mongoose.model('User', userSchema);