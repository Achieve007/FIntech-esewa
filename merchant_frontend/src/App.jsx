
import { useState } from "react";
import "./App.css";
import {
  FaWallet,
  FaFileInvoice,
  FaArrowUp,
  FaUniversity,
  FaUser,
  FaLock,
} from "react-icons/fa";

import esewaLogo from "./assets/Esewa-logo.png";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { login as apiLogin, changePassword as apiChangePassword, logout as apiLogout, isLoggedIn as apiIsLoggedIn } from "./api/auth";


function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(apiIsLoggedIn());

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showBalance, setShowBalance] = useState(true);

  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [loanAmount, setLoanAmount] = useState("");
const [loanTenure, setLoanTenure] = useState("12 Months");
const [currentPassword, setCurrentPassword] = useState("");
const [newPassword, setNewPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");

const [showCurrentPassword, setShowCurrentPassword] =
  useState(false);

const [showNewPassword, setShowNewPassword] =
  useState(false);

const [showConfirmPassword, setShowConfirmPassword] =
  useState(false);
  const passwordStrength = () => {
  let score = 0;

  if (newPassword.length >= 8) score++;
  if (/[A-Z]/.test(newPassword)) score++;
  if (/[0-9]/.test(newPassword)) score++;
  if (/[^A-Za-z0-9]/.test(newPassword)) score++;

  return score;
};

const strength = passwordStrength();

const strengthLabel =
  strength === 4
    ? "Strong"
    : strength === 3
    ? "Good"
    : strength === 2
    ? "Fair"
    : "Weak";

const handlePasswordChange = async () => {
  if (!currentPassword || !newPassword || !confirmPassword) {
    alert("Please fill all fields"); return;
  }
  if (newPassword !== confirmPassword) {
    alert("Passwords do not match"); return;
  }
  if (newPassword.length < 8) {
    alert("Password must contain at least 8 characters."); return;
  }
  try {
    await apiChangePassword(currentPassword, newPassword);
    alert("Password changed successfully.");
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
  } catch (err) {
    alert(err.response?.data?.message || "Failed to change password");
  }
};
  

  const userData = {
    creditScore: 88,
    progressToNextTier: 72,
  };

  const getTier = (score) => {
    if (score >= 80) return "Platinum";
    if (score >= 60) return "Gold";
    if (score >= 40) return "Silver";
    return "Bronze";
  };

  const getRisk = (score) => {
    if (score >= 75) return { level: "Low", color: "green" };
    if (score >= 50) return { level: "Medium", color: "orange" };
    return { level: "High", color: "red" };
  };

  const tier = getTier(userData.creditScore);
  const risk = getRisk(userData.creditScore);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }
    try {
      await apiLogin(email, password);
      setIsLoggedIn(true);
    } catch (err) {
      alert(err.response?.data?.message || "Invalid credentials");
    }
  };

  const handleLogout = () => {
    apiLogout();
    setIsLoggedIn(false);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setActiveMenu("Dashboard");
  };
  const [showLoyaltyGuide, setShowLoyaltyGuide] = useState(false);

const loyaltyData = {
  points: 74,
  nextLevel: 100,

  breakdown: {
    transactionConsistency: 20,
    incomeStability: 18,
    savingsBehaviour: 14,
    customerTrust: 12,
    merchantVerification: 10,
  },
};
const loyaltyPercent =
  (loyaltyData.points / loyaltyData.nextLevel) * 100;

  const menuItems = [
    { name: "Dashboard", icon: <FaWallet /> },
    { name: "Statement", icon: <FaFileInvoice /> },
    { name: "Get Money Out", icon: <FaArrowUp /> },
    { name: "Apply Loan", icon: <FaUniversity /> },
    { name: "User", icon: <FaUser /> },
    { name: "Change Password", icon: <FaLock /> },
  ];
  const statementData = [
  {
    date: "2025-07-01",
    id: "#TXN001",
    customer: "Ram Sharma",
    method: "eSewa",
    amount: "NPR 2,500",
    status: "Success",
  },
  {
    date: "2025-07-02",
    id: "#TXN002",
    customer: "Sita Karki",
    method: "Bank",
    amount: "NPR 1,200",
    status: "Pending",
  },
  {
    date: "2025-07-03",
    id: "#TXN003",
    customer: "Hari Nepal",
    method: "eSewa",
    amount: "NPR 4,500",
    status: "Success",
  },
  
];
const [searchTerm, setSearchTerm] = useState("");
const [statusFilter, setStatusFilter] = useState("All");
const [fromDate, setFromDate] = useState("");
const [toDate, setToDate] = useState("");
const filteredTransactions = statementData.filter((txn) => {
  const matchesSearch =
    txn.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    txn.customer.toLowerCase().includes(searchTerm.toLowerCase());

  const matchesStatus =
    statusFilter === "All" || txn.status === statusFilter;

  const matchesFromDate =
    !fromDate || new Date(txn.date) >= new Date(fromDate);

  const matchesToDate =
    !toDate || new Date(txn.date) <= new Date(toDate);

  return (
    matchesSearch &&
    matchesStatus &&
    matchesFromDate &&
    matchesToDate
  );
});

const totalTransactions = filteredTransactions.length;

const totalAmount = filteredTransactions.reduce(
  (sum, txn) =>
    sum + Number(txn.amount.replace(/[^\d]/g, "")),
  0
);

const successCount = filteredTransactions.filter(
  (txn) => txn.status === "Success"
).length;

const pendingCount = filteredTransactions.filter(
  (txn) => txn.status === "Pending"
).length;

const failedCount = filteredTransactions.filter(
  (txn) => txn.status === "Failed"
).length;

const downloadPDF = () => {
  alert("PDF Export Coming Soon");
};

const downloadExcel = () => {
  alert("Excel Export Coming Soon");
};
const creditData = {
  score: 100,
  

  insights: [
    "High digital settlement volume improves loan eligibility.",
    "98.7% successful transaction rate maintained.",
    "Business revenue increased by 18% this quarter.",
    "Customer retention remains above average.",
  ],
};
const getMerchantTier = (score) => {
  if (score >= 85) return "Gold Tier";
  if (score >= 75) return "SilverTier";
  if (score >= 65) return "Bronze Tier";
  return "Not Eligible";
};
const getLoanLimit = (score) => {
  if (score >= 85) return 500000;
  if (score >= 75) return 300000;
  if (score >= 65) return 150000;
  return 0;
};
const getTierMessage = (score) => {
  if (score >= 85) {
    return "Your business demonstrates exceptional transaction consistency, settlement reliability, and financial performance, qualifying for the highest merchant trust category.";
  }

  if (score >= 75) {
    return "Your business maintains strong transaction activity and reliable settlement behaviour, positioning you among high-performing merchants.";
  }

  if (score >= 65) {
    return "Your business shows stable transaction and settlement performance. Continued growth and consistency can help unlock higher merchant benefits.";
  }

  return "Your current transaction and settlement activity is being evaluated. Consistent business performance can improve your merchant standing over time.";
};
const scoreTrend = [
  { month: "Mar", score: 68 },
  { month: "Apr", score: 72 },
  { month: "May", score: 76 },
  { month: "Jun", score: 82 },
  { month: "Jul", score: 88 },
];
const approvalRate =
  creditData.score >= 85
    ? 95
    : creditData.score >= 75
    ? 85
    : creditData.score >= 65
    ? 70
    : 40;

const eligibility =
  creditData.score >= 65
    ? "Eligible"
    : "Under Review";
    const customerTrustData = {
  overallScore: 92,

  breakdown: {
    repeatCustomers: 20,
    successfulTransactions: 25,
    customerSatisfaction: 18,
    disputeResolution: 15,
    merchantVerification: 10,
    refundManagement: 4,
  },

  metrics: {
    repeatCustomerRate: "62%",
    transactionSuccessRate: "98.7%",
    customerSatisfaction: "94%",
    disputeResolutionRate: "97%",
    refundRate: "1.8%",
    verifiedStatus: "Verified",
  },

  trend: [
    { month: "Mar", score: 82 },
    { month: "Apr", score: 85 },
    { month: "May", score: 88 },
    { month: "Jun", score: 90 },
    { month: "Jul", score: 92 },
  ],
};
  const renderContent = () => {
    switch (activeMenu) {
      case "Dashboard":
  return (
    <>
      {/* HEADER */}
      <div className="header">
        <div className="welcome-bar">
          Welcome back, {firstName || "Merchant"} 👋
        </div>

        <h1>Merchant Dashboard</h1>

        <p>
          Monitor balance, transactions, settlements and account activity.
        </p>
      </div>

      {/* BALANCE CARD */}
      <div className="wallet-overview">

  <div className="wallet-left">
    <span className="wallet-label">
      Available Balance
    </span>

    <div className="balance-header">
  <h1>
    {showBalance ? "NPR 110.17" : "NPR XXX.XX"}
  </h1>

  <button
    className="eye-btn"
    onClick={() => setShowBalance(!showBalance)}
  >
    {showBalance ? <FaEyeSlash /> : <FaEye />}
  </button>
</div>

    <p>Last settlement updated today</p>
  </div>

  <div className="withdraw-progress">
    <div
  className="progress-circle"
  style={{
    background: showBalance
      ? `conic-gradient(
          #ffffff 0deg 100deg,
          rgba(255,255,255,0.18) 100deg 360deg
        )`
      : "rgba(255,255,255,0.18)"
  }}
>
  <span>{showBalance ? "28%" : "XX%"}</span>
</div>

    <p>Withdrawable</p>
  </div>

  <div className="wallet-right">
    <div className="wallet-item">
      <span>Withdrawable</span>
      <strong>
  {showBalance ? "NPR 31.17" : "NPR XX.XX"}
</strong>
    </div>

    <div className="wallet-item">
      <span>Pending</span>
      <strong>
  {showBalance ? "NPR 79.00" : "NPR XX.XX"}
</strong>
    </div>

    <div className="wallet-item">
      <span>Loan</span>
      <strong>
  {showBalance ? "NPR 0.00" : "NPR XX.XX"}
</strong>
    </div>
  </div>

</div>


      {/* TODAY SUMMARY */}
      <div className="today-summary">
        <div className="today-box">
          <h4>Today's Sales</h4>
          <strong>
  {showBalance ? "NPR 12,500.00" : "NPR XX.XX"}
</strong>
        </div>

        <div className="today-box">
          <h4>Transactions</h4>
          <strong>
  {showBalance ? "52" : "NPR XX.XX"}
</strong>
        </div>

        <div className="today-box">
          <h4>Settlement Due</h4>
          <strong>
  {showBalance ? "NPR 4,200.00" : "NPR XX.XX"}
</strong>
        </div>
      </div>

      {/* STATISTICS */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <h4>Total Transactions</h4>
          <strong>
  {showBalance ? "NPR 1,245.00" : "NPR XX.XX"}
</strong>
          <span>This Month</span>
        </div>

        <div className="stat-card">
          <h4>Total Revenue</h4>
          <strong>
  {showBalance ? "NPR 245k" : "NPR XX.XX"}
</strong>
          <span>Current Month</span>
        </div>

        <div className="stat-card">
          <h4>Success Rate</h4>
          <strong>
  {showBalance ? "98.7%" : "NPR XX.XX"}
</strong>
          <span>Payment Success</span>
        </div>

        <div className="stat-card">
          <h4>Settlement Cycle</h4>
          <h2>T+1</h2>
          <span>Active</span>
        </div>
      </div>

      {/* RECENT TRANSACTIONS */}
      <div className="recent-transactions">
        <div className="section-title">
          <h3>Recent Transactions</h3>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>#TXN001</td>
              <td>Ram Sharma</td>
              <td>NPR 2,500</td>
              <td>
                <span className="status success">
                  Success
                </span>
              </td>
            </tr>

            <tr>
              <td>#TXN002</td>
              <td>Sita Karki</td>
              <td>NPR 1,200</td>
              <td>
                <span className="status pending">
                  Pending
                </span>
              </td>
            </tr>

            <tr>
              <td>#TXN003</td>
              <td>Hari Nepal</td>
              <td>NPR 4,500</td>
              <td>
                <span className="status success">
                  Success
                </span>
              </td>
            </tr>

            <tr>
              <td>#TXN004</td>
              <td>Gita Rai</td>
              <td>NPR 900</td>
              <td>
                <span className="status failed">
                  Failed
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* QUICK ACTIONS */}
      <div className="quick-actions">
        <button
          className="action-btn"
          onClick={() => setActiveMenu("Get Money Out")}
        >
          Withdraw Money
        </button>

        <button
          className="action-btn"
          onClick={() => setActiveMenu("Apply Loan")}
        >
          Apply Loan
        </button>

        <button
          className="action-btn"
          onClick={() => setActiveMenu("Statement")}
        >
          Download Statement
        </button>
      </div>

      {/* MERCHANT INFO */}
      <div className="merchant-card">
        <h3>Merchant Information</h3>

        <div className="merchant-details">
          <div>
            <span>Merchant Name</span>
            <strong>
              {firstName} {lastName}
            </strong>
          </div>

          <div>
            <span>Email</span>
            <strong>{email}</strong>
          </div>

          <div>
            <span>Status</span>
            <strong>Verified Merchant</strong>
          </div>
        </div>
      </div>
    </>
  );
  case "Change Password":
  return (
    <div className="security-page">

      <div className="security-header">
        <h2>Account Security</h2>
        <p>
          Protect your merchant account by
          updating your password regularly.
        </p>
      </div>

      <div className="security-grid">

        <div className="security-card">

          <h3>Password Management</h3>

          {/* CURRENT PASSWORD */}

          <div className="password-field">

            <label>Current Password</label>

            <div className="password-input">

              <input
                type={
                  showCurrentPassword
                    ? "text"
                    : "password"
                }
                value={currentPassword}
                onChange={(e) =>
                  setCurrentPassword(
                    e.target.value
                  )
                }
                placeholder="Enter current password"
              />

              <button
                type="button"
                onClick={() =>
                  setShowCurrentPassword(
                    !showCurrentPassword
                  )
                }
              >
                {showCurrentPassword ? (
                  <FaEyeSlash />
                ) : (
                  <FaEye />
                )}
              </button>

            </div>

          </div>

          {/* NEW PASSWORD */}

          <div className="password-field">

            <label>New Password</label>

            <div className="password-input">

              <input
                type={
                  showNewPassword
                    ? "text"
                    : "password"
                }
                value={newPassword}
                onChange={(e) =>
                  setNewPassword(
                    e.target.value
                  )
                }
                placeholder="Enter new password"
              />

              <button
                type="button"
                onClick={() =>
                  setShowNewPassword(
                    !showNewPassword
                  )
                }
              >
                {showNewPassword ? (
                  <FaEyeSlash />
                ) : (
                  <FaEye />
                )}
              </button>

            </div>

          </div>

          {/* PASSWORD STRENGTH */}

          <div className="strength-section">

            <div className="strength-top">
              <span>Password Strength</span>
              <strong>{strengthLabel}</strong>
            </div>

            <div className="strength-bar">

              <div
                className={`strength-fill strength-${strength}`}
              />

            </div>

          </div>

          {/* CONFIRM PASSWORD */}

          <div className="password-field">

            <label>Confirm Password</label>

            <div className="password-input">

              <input
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value
                  )
                }
                placeholder="Confirm password"
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    !showConfirmPassword
                  )
                }
              >
                {showConfirmPassword ? (
                  <FaEyeSlash />
                ) : (
                  <FaEye />
                )}
              </button>

            </div>

          </div>

          <button
            className="apply-btn security-btn"
            onClick={handlePasswordChange}
          >
            Update Password
          </button>

        </div>

        <div className="security-card">

          <h3>Security Guidelines</h3>

          <div className="security-rule">
            ✓ Minimum 8 characters
          </div>

          <div className="security-rule">
            ✓ Include uppercase letter
          </div>

          <div className="security-rule">
            ✓ Include number
          </div>

          <div className="security-rule">
            ✓ Include special character
          </div>

          <div className="security-rule">
            ✓ Never share your password
          </div>

          <div className="security-rule">
            ✓ Change passwords regularly
          </div>

        </div>

      </div>

    </div>
  );
  case "Statement":
  return (
    <div className="card">

      <div className="statement-header">
        <h2>Transaction Statement</h2>
        <p>
          Search, filter and export merchant transactions.
        </p>
      </div>

      <div className="statement-filters">

        <input
          type="date"
          value={fromDate}
          onChange={(e) =>
            setFromDate(e.target.value)
          }
        />

        <input
          type="date"
          value={toDate}
          onChange={(e) =>
            setToDate(e.target.value)
          }
        />

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
        >
          <option value="All">
            All Status
          </option>
          <option value="Success">
            Success
          </option>
          <option value="Pending">
            Pending
          </option>
          <option value="Failed">
            Failed
          </option>
        </select>

        <input
          type="text"
          placeholder="Search Txn ID or Customer"
          value={searchTerm}
          onChange={(e) =>
            setSearchTerm(e.target.value)
          }
        />

      </div>

      <div className="statement-summary">

        <div className="summary-card">
          <span>Total Transactions</span>
          <h3>{totalTransactions}</h3>
        </div>

        <div className="summary-card">
          <span>Total Amount</span>
          <h3>
            NPR {totalAmount.toLocaleString()}
          </h3>
        </div>

        <div className="summary-card">
          <span>Success</span>
          <h3>{successCount}</h3>
        </div>

        <div className="summary-card">
          <span>Pending</span>
          <h3>{pendingCount}</h3>
        </div>

        <div className="summary-card">
          <span>Failed</span>
          <h3>{failedCount}</h3>
        </div>

      </div>

      <div className="recent-transactions">

        <table>

          <thead>
            <tr>
              <th>Date</th>
              <th>Txn ID</th>
              <th>Customer</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>

            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((txn) => (
                <tr key={txn.id}>
                  <td>{txn.date}</td>
                  <td>{txn.id}</td>
                  <td>{txn.customer}</td>
                  <td>{txn.method}</td>
                  <td>{txn.amount}</td>

                  <td>
                    <span
                      className={`status ${txn.status.toLowerCase()}`}
                    >
                      {txn.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="6"
                  style={{
                    textAlign: "center",
                    padding: "20px",
                  }}
                >
                  No transactions found.
                </td>
              </tr>
            )}

          </tbody>

        </table>

      </div>

      <div className="statement-actions">

        <button
          className="apply-btn"
          onClick={downloadPDF}
        >
          Download PDF
        </button>

        <button
          className="apply-btn"
          onClick={downloadExcel}
        >
          Download Excel
        </button>

      </div>

    </div>
  );
  case "User":
  return (
    <div className="card">

      <div className="statement-header">
        <h2>Merchant Profile</h2>
        <p>
          Manage your account information and merchant details.
        </p>
      </div>

      <div className="user-profile-grid">

        <div className="user-card">

          <div className="user-avatar">
            {firstName?.charAt(0)}
            {lastName?.charAt(0)}
          </div>

          <h3>
            {firstName} {lastName}
          </h3>

          <p>{email}</p>

          <span className="verified-badge">
            Verified Merchant
          </span>

        </div>

        <div className="user-details-card">

          <h3>Personal Information</h3>

          <div className="detail-row">
            <span>First Name</span>
            <strong>{firstName}</strong>
          </div>

          <div className="detail-row">
            <span>Last Name</span>
            <strong>{lastName}</strong>
          </div>

          <div className="detail-row">
            <span>Email</span>
            <strong>{email}</strong>
          </div>

          <div className="detail-row">
            <span>Merchant Status</span>
            <strong>Verified</strong>
          </div>

        </div>

      </div>

      <div className="account-stats">

        <div className="summary-card">
          <span>Credit Score</span>
          <h3>{creditData.score}</h3>
        </div>

        <div className="summary-card">
          <span>Customer Trust</span>
          <h3>{customerTrustData.overallScore}</h3>
        </div>

        <div className="summary-card">
          <span>Merchant Tier</span>
          <h3>{getMerchantTier(creditData.score)}</h3>
        </div>

        <div className="summary-card">
          <span>Loan Limit</span>
          <h3>
            NPR {getLoanLimit(creditData.score).toLocaleString()}
          </h3>
        </div>

      </div>

    </div>
  );
      case "Apply Loan":
        const merchantTier = getMerchantTier(creditData.score);
        
const tierMessage = getTierMessage(creditData.score);
  const loanLimit = getLoanLimit(creditData.score);
  const requestedLoan = Number(loanAmount) || 0;

const monthlyInstallment =
  requestedLoan > 0
    ? Math.round(
        requestedLoan /
          (loanTenure === "6 Months"
            ? 6
            : loanTenure === "12 Months"
            ? 12
            : 18)
      )
    : 0;

  return (
  <div className="loan-card active-section">

      {/* TOP SECTION */}

<div className="credit-top-grid">

  {/* MERCHANT TIER */}

  <div className="tier-card">

    <h3>Merchant Tier Status</h3>

    <div
      className={`tier-pill ${
        merchantTier === "Gold Tier"
          ? "gold-tier"
          : merchantTier === "Silver Tier"
          ? "silver-tier"
          : merchantTier === "Bronze Tier"
          ? "bronze-tier"
          : "default-tier"
      }`}
    >
      {merchantTier}
    </div>

    <ul>
      <li>Preferred base interest rates</li>
      <li>Priority loan approvals</li>
      <li>Higher borrowing limits</li>
    </ul>

  </div>

  {/* CREDIT SCORE */}

  <div className="credit-score-card">

    <h3>Merchant Credit Score</h3>

    <div className="score-wrapper">

      <div
        className="score-circle"
        style={{
          background: `conic-gradient(
            #22c55e ${creditData.score * 3.6}deg,
            #e5e7eb 0deg
          )`,
        }}
      >
        <div className="score-inner">
          <strong>{creditData.score}</strong>
          <span>/100</span>
        </div>
      </div>

      <div className="score-details">

        <h2>{merchantTier}</h2>

        <p>{tierMessage}</p>

        <div className="rating-progress">
          <div
            className="rating-progress-fill"
            style={{
              width: `${creditData.score}%`,
            }}
          />
        </div>

      </div>

    </div>

  </div>

</div>
      {/* LOAN CONFIGURATOR */}

      <div className="loan-config-card">

  <h3>Loan Limit & Request Configurator</h3>

  <div className="loan-info">

    <div className="info-box">
      <p>Maximum Pre-Approved Limit</p>
      <h2>NPR {loanLimit.toLocaleString()}</h2>
    </div>

    <div className="info-box">
      <p>Loan Eligibility</p>
      <h2
        className={
          eligibility === "Eligible"
            ? "green"
            : "orange"
        }
      >
        {eligibility}
      </h2>
    </div>

    <div className="info-box">
      <p>Approval Probability</p>
      <h2>{approvalRate}%</h2>
    </div>

  </div>

  <div className="form-section">

    <div className="input-group">
      <label>Desired Loan Amount</label>

      <input
        type="number"
        value={loanAmount}
        onChange={(e) =>
          setLoanAmount(e.target.value)
        }
        placeholder="Enter amount"
        max={loanLimit}
      />
    </div>

    <div className="input-group">
      <label>Tenure</label>

      <select
        value={loanTenure}
        onChange={(e) =>
          setLoanTenure(e.target.value)
        }
      >
        <option>6 Months</option>
        <option>12 Months</option>
        <option>18 Months</option>
      </select>
    </div>

    {requestedLoan > 0 && (
      <div className="loan-preview">

        <p>
          Estimated Monthly Installment
        </p>

        <h3>
          NPR {monthlyInstallment.toLocaleString()}
        </h3>

      </div>
    )}

    <button
      className="apply-btn"
      disabled={
        requestedLoan <= 0 ||
        requestedLoan > loanLimit
      }
      onClick={() => {
        if (requestedLoan > loanLimit) {
          alert(
            "Requested amount exceeds your approved limit."
          );
          return;
        }

        alert(
          `Loan application submitted for NPR ${requestedLoan.toLocaleString()}`
        );
      }}
    >
      Proceed to Apply
    </button>

  </div>

</div>

      {/* TRUST ANALYTICS */}

      <div className="trust-section">

        <h3>
          Credit Analytics & Trust Signals
        </h3>
<div className="analytics-summary">

  <div className="analytics-box">
    <span>Credit Score</span>
    <h2>{creditData.score}</h2>
  </div>

  <div className="analytics-box">
    <span>Approval Probability</span>
    <h2>{approvalRate}%</h2>
  </div>

  <div className="analytics-box">
    <span>Risk Category</span>
    <h2 className="green">Low Risk</h2>
  </div>

  <div className="analytics-box">
    <span>Eligible Amount</span>
    <h2>NPR {loanLimit.toLocaleString()}</h2>
  </div>

</div>
        <div className="trust-grid-modern">

  {/* SCORE TREND */}

  <div className="trust-card large-card">

  <h4>Credit Score Trend</h4>

  <div className="score-trend-chart">

    {scoreTrend.map((item) => (
      <div
        key={item.month}
        className="chart-item"
      >
        <div
          className="chart-bar"
          style={{
            height: `${item.score}%`,
          }}
        />

        <span>{item.month}</span>
      </div>
    ))}

  </div>

  <p>
    Score improved steadily over the last
    five months due to strong settlement
    consistency and transaction growth.
  </p>

</div>

          {/* ELIGIBILITY */}

          <div className="trust-card">

  <h4>Loan Eligibility</h4>

  <h2 className="green">
    {eligibility}
  </h2>

  <div className="eligibility-bar">
    <div
      className="eligibility-fill"
      style={{
        width: `${approvalRate}%`,
      }}
    />
  </div>

  <span>
    {approvalRate}% Approval Probability
  </span>

</div>

          {/* REVENUE */}

          <div className="trust-card">

  <h4>Revenue Growth</h4>

  <ul>
    <li>May : NPR 180,000</li>
    <li>Jun : NPR 220,000</li>
    <li>Jul : NPR 245,000</li>
  </ul>

  <div className="mini-progress">
    <div
      className="mini-progress-fill"
      style={{ width: "78%" }}
    />
  </div>

  <p>36% quarterly growth</p>

</div>

          {/* SETTLEMENT */}

          <div className="trust-card">

  <h4>Settlement Reliability</h4>

  <h2>95%</h2>

  <p>
    Transactions settled within
    T+1 settlement cycle.
  </p>

  <div className="mini-progress">
    <div
      className="mini-progress-fill green-fill"
      style={{ width: "95%" }}
    />
  </div>

</div>

          {/* FACTORS */}

          <div className="trust-card">

  <h4>Credit Score Factors</h4>

  <div className="factor-row">
    <span>Transaction Volume</span>
    <strong>25%</strong>
  </div>

  <div className="factor-row">
    <span>Success Rate</span>
    <strong>20%</strong>
  </div>

  <div className="factor-row">
    <span>Settlement History</span>
    <strong>20%</strong>
  </div>

  <div className="factor-row">
    <span>Business Age</span>
    <strong>15%</strong>
  </div>

  <div className="factor-row">
    <span>Customer Loyalty</span>
    <strong>10%</strong>
  </div>

  <div className="factor-row">
    <span>KYC Verification</span>
    <strong>10%</strong>
  </div>

</div>

<div className="trust-card customer-trust-card">

  <h4>Customer Trust Intelligence</h4>

  <div className="trust-score-header">
    <h2>{customerTrustData.overallScore}/100</h2>

    <span className="trust-badge">
      Highly Trusted
    </span>
  </div>

  <div className="mini-progress">
    <div
      className="mini-progress-fill"
      style={{
        width: `${customerTrustData.overallScore}%`,
      }}
    />
  </div>

  <p className="trust-description">
    Trust score generated using transaction
    quality, customer retention,
    dispute management and merchant
    verification analytics.
  </p>

  <div className="trust-metrics">

    <div className="metric-row">
      <span>Repeat Customers</span>
      <strong>
        {customerTrustData.metrics.repeatCustomerRate}
      </strong>
    </div>

    <div className="metric-row">
      <span>Transaction Success</span>
      <strong>
        {customerTrustData.metrics.transactionSuccessRate}
      </strong>
    </div>

    <div className="metric-row">
      <span>Customer Satisfaction</span>
      <strong>
        {customerTrustData.metrics.customerSatisfaction}
      </strong>
    </div>

    <div className="metric-row">
      <span>Dispute Resolution</span>
      <strong>
        {customerTrustData.metrics.disputeResolutionRate}
      </strong>
    </div>

    <div className="metric-row">
      <span>Refund Rate</span>
      <strong>
        {customerTrustData.metrics.refundRate}
      </strong>
    </div>

    <div className="metric-row">
      <span>Verification</span>
      <strong>
        {customerTrustData.metrics.verifiedStatus}
      </strong>
    </div>

  </div>

  <div className="trust-factor-section">

    <h5>Trust Contributors</h5>

    <div className="factor-row">
      <span>Transaction Success</span>
      <strong>25%</strong>
    </div>

    <div className="factor-row">
      <span>Repeat Customers</span>
      <strong>20%</strong>
    </div>

    <div className="factor-row">
      <span>Customer Satisfaction</span>
      <strong>18%</strong>
    </div>

    <div className="factor-row">
      <span>Dispute Resolution</span>
      <strong>15%</strong>
    </div>

    <div className="factor-row">
      <span>Merchant Verification</span>
      <strong>10%</strong>
    </div>

  </div>

</div>
<div className="trust-card">

  <h4>Customer Trust Trend</h4>

  <div className="score-trend-chart">

    {customerTrustData.trend.map((item) => (
      <div
        key={item.month}
        className="chart-item"
      >
        <div
          className="chart-bar"
          style={{
            height: `${item.score}%`,
          }}
        />

        <span>{item.month}</span>
      </div>
    ))}

  </div>

  <p>
    Trust score increased steadily due to
    improved customer retention and
    lower dispute rates.
  </p>

</div>
      {/* AI INSIGHTS */}

      <div className="ai-insights-card">

        <h3>
          AI Engine Credit Insights & Analytics
        </h3>

        {creditData.insights.map(
          (insight, index) => (
            <div
              key={index}
              className="insight-row"
            >
              ✅ {insight}
            </div>
          )
        )}

      </div>

     </div> {/* trust-grid-modern */}
      </div>   {/* trust-section */}

    </div>     
  );{/* loan-card active-section */}
 

      default:
        return (
          <div className="card">
            <h2>{activeMenu}</h2>
            <p>Section under development...</p>
          </div>
        );
    }
  };

  return (
    <>
      {/* LOGIN */}
      {!isLoggedIn && (
        <div className="login-overlay">
          <div className="login-box">
            <div className="login-title">eSewa Merchant Login</div>

            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />

            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button onClick={handleLogin}>Login</button>

            <p className="login-hint">
              Demo login: admin@esewa.com / 1234
            </p>
          </div>
        </div>
      )}

      {/* APP */}
      {isLoggedIn && (
        <div className="app">
          {/* SIDEBAR */}
          <div className="sidebar">
            <div className="logo-wrapper">
              <div className="logo">
                <img src={esewaLogo} alt="eSewa" className="esewa-logo" />
              </div>
              <div className="merchant-badge">VERIFIED MERCHANT</div>
            </div>

            <div className="balance-card">
              <p className="balance-title">Current Balance</p>
              <strong>
  {showBalance ? "NPR 110.17" : "NPR XX.XX"}
</strong>
              <p className="loan">Loan <strong>
  {showBalance ? "NPR 0.00" : "NPR XX.XX"}
</strong></p>
            </div>

            <div className="menu">
              {menuItems.map((item) => (
                <div
                  key={item.name}
                  className={`menu-item ${
                    activeMenu === item.name ? "active" : ""
                  }`}
                  onClick={() => setActiveMenu(item.name)}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </div>
              ))}
            </div>

            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>

          {/* MAIN */}
          <div className="main">
            <div className="topbar">
              <div className="profile">
                
                <span>{firstName || "User"}</span>
                <div className="profile-icon">
                  <FaUser />
                </div>
              </div>
            </div>
            
            

            {renderContent()}
          </div>
        </div>
      )}
    </>
  );
}

export default App;