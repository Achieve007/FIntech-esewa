// services/behavioralAnalysis.js
// Complete behavioral scoring engine for E-Credit

class BehavioralAnalysis {
  // ------------------------------------------------------------------
  // Helper: safe date extraction (handles both 'date' and 'transaction_date')
  // ------------------------------------------------------------------
  static safeDate(tx) {
    let d = tx.date || tx.transaction_date;
    if (!d) return new Date();
    return new Date(d);
  }

  // ------------------------------------------------------------------
  // 1. EXPENSE DISCIPLINE (40% of behavioral score)
  // ------------------------------------------------------------------
  static calculateExpenseDiscipline(transactions, merchant = null) {
    const expenses = transactions.filter(tx => tx.type === 'debit' && tx.status === 'complete');
    if (expenses.length === 0) return 50;
    const totalExpense = expenses.reduce((s, tx) => s + tx.amount, 0);
    
    // Fixed vs variable (categories: rent, salary, loan_repayment)
    const fixedCategories = ['rent', 'salary', 'loan_repayment'];
    const fixedExpenses = expenses.filter(tx => fixedCategories.includes(tx.category)).reduce((s, tx) => s + tx.amount, 0);
    const fixedRatio = Math.min(fixedExpenses / totalExpense, 0.8);
    
    // Essential vs discretionary (essential: utility, inventory, staff)
    const essentialCategories = ['utility', 'inventory', 'staff'];
    const essentialExpenses = expenses.filter(tx => essentialCategories.includes(tx.category)).reduce((s, tx) => s + tx.amount, 0);
    const essentialRatio = Math.min(essentialExpenses / totalExpense, 0.9);
    
    // Volatility: standard deviation of monthly expenses
    const monthlyMap = new Map();
    expenses.forEach(tx => {
      const month = this.safeDate(tx).toISOString().slice(0,7);
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + tx.amount);
    });
    const monthlyExpenses = Array.from(monthlyMap.values());
    if (monthlyExpenses.length === 0) return 50;
    const avgExpense = monthlyExpenses.reduce((a,b)=>a+b,0)/monthlyExpenses.length;
    const variance = monthlyExpenses.reduce((sum,val) => sum + Math.pow(val-avgExpense,2),0)/monthlyExpenses.length;
    const stdDev = Math.sqrt(variance);
    const volatility = 1 - Math.min(stdDev/avgExpense, 1);
    
    const fixedScore = fixedRatio * 100;
    const essentialScore = essentialRatio * 100;
    const volatilityScore = volatility * 100;
    return Math.min(Math.max(Math.round((fixedScore*0.4)+(essentialScore*0.4)+(volatilityScore*0.2)),0),100);
  }

  // ------------------------------------------------------------------
  // 2. PAYMENT TIMING (30% of behavioral score)
  // ------------------------------------------------------------------
  static calculatePaymentTiming(payments) {
    if (payments.length === 0) return 50;
    let onTimeCount = 0, totalDelayDays = 0;
    payments.forEach(p => {
      const day = this.safeDate(p).getDate();
      const isOnTime = day <= 10;
      if (isOnTime) onTimeCount++;
      else totalDelayDays += (day - 10);
    });
    const onTimeRate = onTimeCount / payments.length;
    const avgDelayDays = totalDelayDays / payments.length;
    const delayPenalty = 1 - Math.min(avgDelayDays/30, 1);
    
    // Trend (last 3 months vs previous)
    const now = new Date();
    const threeMonthsAgo = new Date(now.setMonth(now.getMonth()-3));
    const recent = payments.filter(p => this.safeDate(p) >= threeMonthsAgo);
    const older = payments.filter(p => this.safeDate(p) < threeMonthsAgo);
    const recentRate = recent.length ? recent.filter(p => this.safeDate(p).getDate() <= 10).length / recent.length : 0;
    const oldRate = older.length ? older.filter(p => this.safeDate(p).getDate() <= 10).length / older.length : 0;
    let trendBonus = 1;
    if (recentRate > oldRate) trendBonus = 1.2;
    else if (recentRate < oldRate) trendBonus = 0.8;
    
    const paymentScore = ((onTimeRate*0.5)+(delayPenalty*0.3))*100;
    const adjusted = paymentScore * trendBonus;
    return Math.min(Math.max(Math.round(adjusted),0),100);
  }

  // ------------------------------------------------------------------
  // 3. SAVINGS BEHAVIOR (20% of behavioral score)
  // ------------------------------------------------------------------
  static calculateSavingsBehavior(incomes, expenses, currentSavings = 0) {
    const totalIncome = incomes.reduce((s,i)=>s+i.amount,0);
    const totalExpense = expenses.reduce((s,e)=>s+e.amount,0);
    if (totalIncome === 0) return 0;
    const savingsRate = (totalIncome - totalExpense)/totalIncome;
    const savingsRateScore = Math.min(Math.max(savingsRate*100,0),100);
    
    const monthlyExpense = totalExpense / 6; // assume 6 months
    const bufferMonths = currentSavings / monthlyExpense;
    const bufferScore = Math.min(bufferMonths/6,1)*100;
    
    // Consistency: months with net positive savings
    const monthMap = new Map();
    incomes.forEach(i => {
      const m = this.safeDate(i).toISOString().slice(0,7);
      monthMap.set(m, (monthMap.get(m)||0) + i.amount);
    });
    expenses.forEach(e => {
      const m = this.safeDate(e).toISOString().slice(0,7);
      monthMap.set(m, (monthMap.get(m)||0) - e.amount);
    });
    let consistentMonths = 0;
    for (let net of monthMap.values()) if (net > 0) consistentMonths++;
    const consistencyBonus = (consistentMonths / monthMap.size) * 100;
    
    const savingsScore = (savingsRateScore*0.4)+(bufferScore*0.4)+(consistencyBonus*0.2);
    return Math.min(Math.max(Math.round(savingsScore),0),100);
  }

  // ------------------------------------------------------------------
  // 4. TRANSACTION PATTERNS (10% of behavioral score)
  // ------------------------------------------------------------------
  static calculateTransactionPattern(transactions) {
    const debits = transactions.filter(tx => tx.type === 'debit');
    if (debits.length === 0) return 50;
    let nightSpends = 0, weekendSpends = 0, roundSpends = 0;
    debits.forEach(tx => {
      const d = this.safeDate(tx);
      const hour = d.getHours();
      if (hour >= 22 || hour <= 4) nightSpends++;
      const day = d.getDay();
      if (day === 0 || day === 6) weekendSpends++;
      if (tx.amount % 1000 === 0) roundSpends++;
    });
    const nightRatio = nightSpends / debits.length;
    const weekendRatio = weekendSpends / debits.length;
    const roundRatio = roundSpends / debits.length;
    const nightPenalty = 1 - nightRatio;
    const weekendPenalty = 1 - weekendRatio;
    const roundPenalty = 1 - roundRatio;
    const patternScore = ((nightPenalty*0.4)+(weekendPenalty*0.3)+(roundPenalty*0.3))*100;
    return Math.min(Math.max(Math.round(patternScore),0),100);
  }

  // ------------------------------------------------------------------
  // COMPUTE BEHAVIORAL SCORE (0-100) from 4 components
  // ------------------------------------------------------------------
  static async computeBehavioralScore(merchant, transactions) {
    const debits = transactions.filter(tx => tx.type === 'debit');
    const credits = transactions.filter(tx => tx.type === 'credit');
    const payments = transactions.filter(tx => tx.category === 'loan_repayment' || tx.category === 'utility');
    
    const discipline = this.calculateExpenseDiscipline(transactions, merchant);
    const paymentTiming = this.calculatePaymentTiming(payments);
    const savings = this.calculateSavingsBehavior(credits, debits, merchant.metadata?.savings_balance || 0);
    const patterns = this.calculateTransactionPattern(transactions);
    
    const behavioralScore = Math.round(
      (discipline * 0.4) + (paymentTiming * 0.3) + (savings * 0.2) + (patterns * 0.1)
    );
    
    return {
      behavioral_score: behavioralScore,
      components: {
        expense_discipline: discipline,
        payment_timing: paymentTiming,
        savings_behavior: savings,
        transaction_patterns: patterns
      },
      details: {
        fixed_expense_ratio: discipline/100,
        essential_spending_ratio: discipline/100,
        on_time_payment_rate: paymentTiming/100,
        savings_rate: savings/100,
        buffer_months: (savings/100)*6
      }
    };
  }

  // ------------------------------------------------------------------
  // 5. SLIDING WINDOW EMPIRICAL SCORE (for scoring fusion)
  //    Given loan amount and duration, returns success rate (0-100)
  // ------------------------------------------------------------------
  static calculateEmpiricalScore(transactions, loanAmount, loanDurationMonths) {
    if (!transactions || transactions.length === 0) return 0;
    const sorted = [...transactions].sort((a,b) => this.safeDate(a) - this.safeDate(b));
    const startDate = this.safeDate(sorted[0]);
    const endDate = this.safeDate(sorted[sorted.length-1]);
    const totalMonths = (endDate - startDate) / (30*24*60*60*1000);
    if (totalMonths < loanDurationMonths) return 0;
    
    let successCount = 0;
    let windowCount = 0;
    let currentStart = new Date(startDate);
    while (true) {
      const windowEnd = new Date(currentStart);
      windowEnd.setMonth(windowEnd.getMonth() + loanDurationMonths);
      if (windowEnd > endDate) break;
      const windowTxs = sorted.filter(tx => {
        const txDate = this.safeDate(tx);
        return txDate >= currentStart && txDate <= windowEnd;
      });
      const netSavings = windowTxs.reduce((sum, tx) => {
        return sum + (tx.type === 'credit' ? tx.amount : -tx.amount);
      }, 0);
      if (netSavings >= loanAmount) successCount++;
      windowCount++;
      currentStart.setMonth(currentStart.getMonth() + 1);
    }
    return windowCount === 0 ? 0 : (successCount / windowCount) * 100;
  }

  // ------------------------------------------------------------------
  // 6. PSYCHOMETRIC INFERENCE FROM BEHAVIOR (no questionnaire)
  //    Returns: psychometric_score, conscientiousness, risk_tolerance,
  //    future_orientation, impulsivity_control (each 0-100)
  // ------------------------------------------------------------------
  static inferPsychometricFromBehavior(transactions, merchant = null) {
    // Helper to safely get date
    const safe = (tx) => this.safeDate(tx);
    
    // ---------- 1. CONSCIENTIOUSNESS ----------
    // = (OnTimeRate × 0.5) + (SavingsConsistency × 0.3) + (ExpensePredictability × 0.2)
    const payments = transactions.filter(tx => tx.category === 'loan_repayment' || tx.category === 'utility');
    let onTimeRate = 50;
    if (payments.length > 0) {
      const onTimeCount = payments.filter(p => safe(p).getDate() <= 10).length;
      onTimeRate = (onTimeCount / payments.length) * 100;
    }
    
    // Savings consistency: months with net positive savings / total months
    const monthlyMap = new Map();
    transactions.forEach(tx => {
      const month = safe(tx).toISOString().slice(0,7);
      const delta = tx.type === 'credit' ? tx.amount : -tx.amount;
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + delta);
    });
    let positiveMonths = 0;
    for (let net of monthlyMap.values()) if (net > 0) positiveMonths++;
    const savingsConsistency = monthlyMap.size === 0 ? 50 : (positiveMonths / monthlyMap.size) * 100;
    
    // Expense predictability: inverse of expense volatility
    const expenses = transactions.filter(tx => tx.type === 'debit');
    let expensePredictability = 50;
    if (expenses.length > 0) {
      const monthlyExpenses = new Map();
      expenses.forEach(tx => {
        const month = safe(tx).toISOString().slice(0,7);
        monthlyExpenses.set(month, (monthlyExpenses.get(month) || 0) + tx.amount);
      });
      const expArray = Array.from(monthlyExpenses.values());
      if (expArray.length > 0) {
        const avg = expArray.reduce((a,b)=>a+b,0)/expArray.length;
        const variance = expArray.reduce((sum,val)=>sum+Math.pow(val-avg,2),0)/expArray.length;
        const stdDev = Math.sqrt(variance);
        const volatility = avg === 0 ? 0 : Math.min(stdDev/avg, 1);
        expensePredictability = (1 - volatility) * 100;
      }
    }
    const conscientiousness = Math.round((onTimeRate * 0.5) + (savingsConsistency * 0.3) + (expensePredictability * 0.2));
    
    // ---------- 2. RISK TOLERANCE ----------
    // = (LargePurchaseFrequency × 0.4) + (BusinessInvestment × 0.4) + (SpeculativeSpending × 0.2)
    const totalDebits = expenses.length;
    let largePurchaseFreq = 0, businessInvestmentScore = 0, speculativeScore = 0;
    if (totalDebits > 0) {
      const avgExpense = expenses.reduce((s,t)=>s+t.amount,0)/totalDebits;
      const largePurchases = expenses.filter(tx => tx.amount > avgExpense * 2).length;
      largePurchaseFreq = (largePurchases / totalDebits) * 100;
      const businessInvestments = expenses.filter(tx => tx.category === 'inventory' || tx.category === 'equipment').length;
      businessInvestmentScore = (businessInvestments / totalDebits) * 100;
      const speculative = expenses.filter(tx => tx.category === 'gambling' || tx.category === 'crypto').length;
      speculativeScore = (speculative / totalDebits) * 100;
    }
    const riskTolerance = Math.round((largePurchaseFreq * 0.4) + (businessInvestmentScore * 0.4) + (speculativeScore * 0.2));
    
    // ---------- 3. FUTURE ORIENTATION ----------
    // = (SavingsRate × 0.4) + (BufferScore × 0.4) + (InvestmentScore × 0.2)
    const totalCredit = transactions.filter(tx=>tx.type==='credit').reduce((s,t)=>s+t.amount,0);
    const totalDebitSum = expenses.reduce((s,t)=>s+t.amount,0);
    let savingsRate = 0;
    if (totalCredit > 0) savingsRate = ((totalCredit - totalDebitSum)/totalCredit) * 100;
    const monthlyExpense = totalDebitSum / 6;
    const savingsBalance = merchant?.metadata?.savings_balance || 0;
    const bufferMonths = monthlyExpense === 0 ? 0 : savingsBalance / monthlyExpense;
    const bufferScore = Math.min(bufferMonths/6, 1) * 100;
    const investmentScore = businessInvestmentScore; // reuse
    const futureOrientation = Math.round((savingsRate * 0.4) + (bufferScore * 0.4) + (investmentScore * 0.2));
    
    // ---------- 4. IMPULSIVITY CONTROL ----------
    // = (RandomPurchasePenalty × 0.4) + (LateNightPenalty × 0.3) + (ConsistencyScore × 0.3)
    let randomPurchasePenalty = 50;
    if (totalDebits > 0) {
      const randomPurchases = expenses.filter(tx => tx.category === 'other' || !tx.category).length;
      randomPurchasePenalty = (1 - randomPurchases/totalDebits) * 100;
    }
    let lateNightPenalty = 50;
    if (totalDebits > 0) {
      const lateNightSpends = expenses.filter(tx => {
        const hour = safe(tx).getHours();
        return hour >= 22 || hour <= 4;
      }).length;
      lateNightPenalty = (1 - lateNightSpends/totalDebits) * 100;
    }
    // Consistency: inverse of monthly spend coefficient of variation
    let consistencyScore = 50;
    if (expenses.length > 0) {
      const monthlySpend = new Map();
      expenses.forEach(tx => {
        const month = safe(tx).toISOString().slice(0,7);
        monthlySpend.set(month, (monthlySpend.get(month) || 0) + tx.amount);
      });
      const values = Array.from(monthlySpend.values());
      if (values.length > 0) {
        const avg = values.reduce((a,b)=>a+b,0)/values.length;
        const var_ = values.reduce((s,v)=>s+Math.pow(v-avg,2),0)/values.length;
        const cv = avg === 0 ? 0 : Math.sqrt(var_)/avg;
        consistencyScore = (1 - Math.min(cv,1)) * 100;
      }
    }
    const impulsivityControl = Math.round((randomPurchasePenalty * 0.4) + (lateNightPenalty * 0.3) + (consistencyScore * 0.3));
    
    // Overall psychometric score (weights per document)
    const psychometricScore = Math.round(
      (conscientiousness * 0.4) + (riskTolerance * 0.25) + (futureOrientation * 0.2) + (impulsivityControl * 0.15)
    );
    
    return {
      psychometric_score: Math.min(psychometricScore, 100),
      conscientiousness: Math.min(conscientiousness, 100),
      risk_tolerance: Math.min(riskTolerance, 100),
      future_orientation: Math.min(futureOrientation, 100),
      impulsivity_control: Math.min(impulsivityControl, 100)
    };
  }
}

module.exports = BehavioralAnalysis;