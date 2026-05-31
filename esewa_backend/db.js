const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGO_URI || 'mongodb://localhost:27017/merchant_db'
    );
    console.log(`✅ MongoDB Connected: ${conn.connection.name}`);
    console.log(`📀 Database Host: ${conn.connection.host}`);
    console.log(`🔢 Database Port: ${conn.connection.port}`);
    return conn;
  } catch (err) {
    console.error('❌ MongoDB Connection Failed:', err.message);
    throw err;
  }
};

module.exports = connectDB;
