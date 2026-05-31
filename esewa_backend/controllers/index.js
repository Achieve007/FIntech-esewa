const authController = require('./auth.controller');
const merchantController = require('./merchant.controller');
const transactionController = require('./transaction.controller');
const loanController = require('./loan.controller');
const adminController = require('./admin.controller');
const hardshipController = require('./hardship_claim.controller');
const trustController = require('./trust_relationship.controller');
const referenceController = require('./reference.controller');

module.exports = {
  authController,
  merchantController,
  transactionController,
  loanController,
  adminController,
  hardshipController,
  trustController,
  referenceController
};