//Handles registration, login, and authentication



const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Merchant } = require('../models');

// Generate JWT Token
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'esewa_hackathon_secret_2026',
    { expiresIn: '7d' }
  );
};

// @desc    Register new merchant
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, password, business_name, citizen_id } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Check if citizen ID exists
    const citizenExists = await Merchant.findOne({ citizen_id });
    if (citizenExists) {
      return res.status(400).json({ message: 'Citizen ID already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      password_hash,
      role: 'merchant'
    });

    // Create merchant profile
    const merchant = await Merchant.create({
      user_id: user._id,
      business_name,
      citizen_id,
      trust_score: 50, // Default starting score
      tier: 'bronze'
    });

    // Generate token
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      merchant: {
        id: merchant._id,
        business_name: merchant.business_name,
        trust_score: merchant.trust_score,
        tier: merchant.tier
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with password field
    const user = await User.findOne({ email }).select('+password_hash');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Get merchant profile if merchant
    let merchant = null;
    if (user.role === 'merchant') {
      merchant = await Merchant.findOne({ user_id: user._id });
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      merchant
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let merchant = null;
    if (user.role === 'merchant') {
      merchant = await Merchant.findOne({ user_id: user._id });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      },
      merchant
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  getMe
};