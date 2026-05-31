import { useState } from "react";

export default function LoanReviewModal({ loan, onClose, onApprove, onReject }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loan) return null;

  const run = async (fn) => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e)=>e.stopPropagation()}>
        <h3>Review Loan {loan._id?.slice(-6)}</h3>
        <div className="modal-grid">
          <div><label>Merchant</label><p>{loan.merchant_id?.business_name || "—"}</p></div>
          <div><label>Amount</label><p>NPR {loan.amount?.toLocaleString()}</p></div>
          <div><label>Duration</label><p>{loan.duration_months} months</p></div>
          <div><label>Interest</label><p>{loan.interest_rate}%</p></div>
          <div><label>Trust Score</label><p>{loan.merchant_id?.trust_score?.toFixed?.(1) ?? "—"}</p></div>
          <div><label>Tier</label><p>{loan.merchant_id?.tier || "—"}</p></div>
        </div>

        <label className="modal-reason">
          Rejection reason (only used if you reject)
          <textarea value={reason} onChange={(e)=>setReason(e.target.value)} rows={3}
            placeholder="e.g. Insufficient transaction history" />
        </label>

        <div className="modal-actions">
          <button className="btn-sm" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn-sm btn-danger" disabled={busy}
            onClick={() => run(() => onReject(loan, reason || "Not specified"))}>
            Reject
          </button>
          <button className="btn-sm btn-success" disabled={busy}
            onClick={() => run(() => onApprove(loan))}>
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}
