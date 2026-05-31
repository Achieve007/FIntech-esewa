const User = require('./user.model');
const Merchant = require('./merchant.model');
const Transaction = require('./transaction.model');
const Loan = require('./loan.model');
const HardshipClaim = require('./hardship_claim.model');
const TrustRelationship = require('./trust_relationship.model');
const Reference = require('./reference.model'); // ADD THIS
module.exports = {
  User,
  Merchant,
  Transaction,
  Loan,
  HardshipClaim,
  TrustRelationship,
  Reference
};