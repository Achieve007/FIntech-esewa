const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const connectDB = require('./db');

dotenv.config();
connectDB();

const app = express();

// ---------- CORS allowlist ----------
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5175,http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin / curl / mobile (no Origin header)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------- Rate limiter for auth ----------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                  // 10 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

// ---------- Routes ----------
const authRoutes = require('./routes/auth.routes');
const merchantRoutes = require('./routes/merchant.routes');
const transactionRoutes = require('./routes/transaction.routes');
const loanRoutes = require('./routes/loan.routes');
const adminRoutes = require('./routes/admin.routes');
const referenceRoutes = require('./routes/reference.routes');
const hardshipRoutes = require('./routes/hardship.routes');
const trustRoutes = require('./routes/trust.routes');
const psychometricRoutes = require('./routes/psychometric.routes');
const aiRoutes = require('./routes/ai.routes');

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/merchant', merchantRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reference', referenceRoutes);
app.use('/api/hardship', hardshipRoutes);
app.use('/api/trust', trustRoutes);
app.use('/api/psychometric', psychometricRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'E-Credit Backend is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to E-Credit Hackathon API',
    version: '1.0.0',
  });
});

// 404 handler (Express 4 safe — no '*' path)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map((e) => e.message),
    });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid ID format', error: err.message });
  }
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate key error',
      field: Object.keys(err.keyPattern)[0],
    });
  }
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`🔗 http://localhost:${PORT}`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log(`✅ CORS allowed origins: ${allowedOrigins.join(', ')}\n`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));

module.exports = app;
