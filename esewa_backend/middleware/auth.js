const jwt = require('jsonwebtoken');  // ← THIS WAS MISSING
const { User } = require('../models');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.headers['x-auth-token']) {
    token = req.headers['x-auth-token'];
  }

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Not authorized, no token provided' 
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hackathon_secret_2026');
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password_hash');
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    req.user = {
      userId: user._id,
      email: user.email,
      role: user.role,
      name: user.name
    };
    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ 
      success: false, 
      message: 'Not authorized, token failed' 
    });
  }
};

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ 
      success: false, 
      message: 'Access denied. Admin only.' 
    });
  }
};

// Merchant only middleware
const merchantOnly = (req, res, next) => {
  if (req.user && req.user.role === 'merchant') {
    next();
  } else {
    res.status(403).json({ 
      success: false, 
      message: 'Access denied. Merchant only.' 
    });
  }
};

module.exports = { protect, adminOnly, merchantOnly };