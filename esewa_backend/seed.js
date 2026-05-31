const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('./models/user.model');
const Merchant = require('./models/merchant.model');
const Transaction = require('./models/transaction.model');
const Loan = require('./models/loan.model');
const HardshipClaim = require('./models/hardship_claim.model');
const TrustRelationship = require('./models/trust_relationship.model');
const Reference = require('./models/reference.model');
const Psychometric = require('./models/psychometric.model');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/merchant_db';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Merchant.deleteMany({}),
      Transaction.deleteMany({}),
      Loan.deleteMany({}),
      HardshipClaim.deleteMany({}),
      TrustRelationship.deleteMany({}),
      Reference.deleteMany({}),
      Psychometric.deleteMany({}),
    ]);
    console.log('Cleared all collections');

    const salt = await bcrypt.genSalt(10);

    // Create users (merchants + admin)
    const users = await User.create([
      {
        name: 'Alice Merchant',
        email: 'alice@example.com',
        password_hash: await bcrypt.hash('password123', salt),
        role: 'merchant',
      },
      {
        name: 'Bob Trader',
        email: 'bob@example.com',
        password_hash: await bcrypt.hash('password123', salt),
        role: 'merchant',
      },
      {
        name: 'Carol Vendor',
        email: 'carol@example.com',
        password_hash: await bcrypt.hash('password123', salt),
        role: 'merchant',
      },
      {
        name: 'Admin User',
        email: 'admin@esewa.com',
        password_hash: await bcrypt.hash('admin123', salt),
        role: 'admin',
      },
    ]);
    console.log(`✅ Created ${users.length} users`);

    // Create merchants with new fields: assets_value, vat_filing_rate
    const merchants = await Merchant.create([
      {
        user_id: users[0]._id,
        business_name: 'Alice Groceries & Supplies',
        citizen_id: 'CIT-ALICE-001',
        trust_score: 85,
        tier: 'gold',
        metadata: { total_credit: 15000, total_debit: 5000, loan_count: 0 },
        assets_value: 250000,   // NPR 2.5 lakhs savings/inventory
        vat_filing_rate: 95,
      },
      {
        user_id: users[1]._id,
        business_name: 'Bob Electronics Hub',
        citizen_id: 'CIT-BOB-002',
        trust_score: 62,
        tier: 'silver',
        metadata: { total_credit: 8000, total_debit: 3000, loan_count: 0 },
        assets_value: 80000,
        vat_filing_rate: 80,
      },
      {
        user_id: users[2]._id,
        business_name: "Carol's Fashion Boutique",
        citizen_id: 'CIT-CAROL-003',
        trust_score: 45,
        tier: 'bronze',
        metadata: { total_credit: 2000, total_debit: 1500, loan_count: 0 },
        assets_value: 15000,
        vat_filing_rate: 45,
      },
    ]);
    console.log(`✅ Created ${merchants.length} merchants`);

    // Create transactions (last 6 months, ensure each merchant has at least 20 txs)
    const now = new Date();
    const transactions = [];
    for (let i = 0; i < 30; i++) {
      const merchant = merchants[Math.floor(Math.random() * merchants.length)];
      const type = Math.random() > 0.6 ? 'credit' : 'debit';
      const amount = Math.floor(Math.random() * 1000) + 50;
      const date = new Date(now - Math.random() * 180 * 24 * 60 * 60 * 1000);
      const categories = ['utility', 'retail', 'loan_repayment', 'inventory', 'salary', 'other'];
      const category = categories[Math.floor(Math.random() * categories.length)];
      transactions.push({
        merchant_id: merchant._id,
        amount,
        type,
        status: Math.random() > 0.9 ? 'pending' : 'complete',
        category,
        date,
      });
    }
    // Ensure each merchant has enough transactions for sliding window
    for (const merchant of merchants) {
      for (let i = 0; i < 15; i++) {
        const date = new Date(now - (i * 10) * 24 * 60 * 60 * 1000);
        const creditAmt = 3000 + Math.random() * 2000;
        const debitAmt = 2000 + Math.random() * 1500;
        transactions.push({
          merchant_id: merchant._id,
          amount: creditAmt,
          type: 'credit',
          status: 'complete',
          category: 'retail',
          date,
        });
        transactions.push({
          merchant_id: merchant._id,
          amount: debitAmt,
          type: 'debit',
          status: 'complete',
          category: 'inventory',
          date: new Date(date.getTime() + 2 * 24 * 60 * 60 * 1000),
        });
      }
    }
    await Transaction.insertMany(transactions);
    console.log(`✅ Created ${transactions.length} transactions`);

    // Create loans (with statuses)
    await Loan.create([
      {
        merchant_id: merchants[0]._id,
        amount: 10000,
        duration_months: 12,
        interest_rate: 5.5,
        status: 'approved',
        applied_at: new Date(2025, 0, 15),
        approved_at: new Date(2025, 0, 20),
      },
      {
        merchant_id: merchants[1]._id,
        amount: 5000,
        duration_months: 6,
        interest_rate: 6.0,
        status: 'applied',
        applied_at: new Date(2025, 2, 1),
      },
      {
        merchant_id: merchants[2]._id,
        amount: 2000,
        duration_months: 3,
        interest_rate: 7.0,
        status: 'repaid',
        applied_at: new Date(2024, 11, 1),
        repaid_at: new Date(2025, 2, 1),
      },
    ]);
    console.log('✅ Created loans');

    // Trust relationships
    await TrustRelationship.create([
      {
        merchant_id: merchants[0]._id,
        guarantor_id: merchants[1]._id,
        trust_score: 75,
        relationship_type: 'business_partner',
        is_active: true,
      },
      {
        merchant_id: merchants[1]._id,
        guarantor_id: merchants[2]._id,
        trust_score: 45,
        relationship_type: 'guarantor',
        is_active: true,
      },
    ]);
    console.log('✅ Created trust relationships');

    // References (social graph vouches)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    await Reference.create([
      {
        fromMerchantId: merchants[0]._id,
        toMerchantId: merchants[1]._id,
        relationship: 'supplier',
        status: 'active',
        expiresAt,
      },
      {
        fromMerchantId: merchants[0]._id,
        toMerchantId: merchants[2]._id,
        relationship: 'friend',
        status: 'active',
        expiresAt,
      },
    ]);
    console.log('✅ Created references (social graph)');

    // Psychometric data will be computed on‑the‑fly by the new inference engine
    // No need to seed manual answers.

    console.log('\n🌱 SEEDING COMPLETE!');
    console.log('========================');
    console.log('Admin login: admin@esewa.com / admin123');
    console.log('Merchant logins: alice@example.com / password123, etc.');
    console.log('Merchant IDs:');
    merchants.forEach(m => console.log(`  ${m.business_name}: ${m._id}`));

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();