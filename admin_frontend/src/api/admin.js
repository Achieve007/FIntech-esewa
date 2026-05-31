import api from "./client";

const num = (v) => {
  if (v == null) return 0;
  if (typeof v === "object" && v.$numberDecimal) return Number(v.$numberDecimal);
  return Number(v);
};

export const fetchAnalytics = () => api.get("/admin/analytics").then(r => r.data);

export const fetchMerchants = (params = {}) =>
  api.get("/admin/merchants", { params }).then(r => r.data);

export const updateTrustScore = (merchantId, trust_score) =>
  api.put(`/admin/merchants/${merchantId}/trust-score`, { trust_score }).then(r => r.data);

export const reviewLoan = (loanId, action, rejection_reason) =>
  api.put(`/admin/loans/${loanId}/${action}`, { rejection_reason }).then(r => r.data);

export const analyzeMerchant = (merchantId) =>
  api.post(`/admin/analyze/${merchantId}`).then(r => r.data);

export const fetchAlerts = () => api.get("/admin/alerts").then(r => r.data);

// Loans list — uses analytics' recent_loans plus a normalizer
export const normalizeLoan = (loan) => ({
  ...loan,
  amount: num(loan.amount),
  interest_rate: num(loan.interest_rate),
  total_payable: num(loan.total_payable),
  monthly_installment: num(loan.monthly_installment),
});

export { num };
