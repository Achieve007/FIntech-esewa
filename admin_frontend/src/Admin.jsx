import { useEffect, useMemo, useState } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import "./Admin.css";
import { useAuth } from "./context/AuthContext";
import { useToast } from "./components/Toast";
import LoanReviewModal from "./components/LoanReviewModal";
import {
  fetchAnalytics, fetchMerchants, reviewLoan, analyzeMerchant,
  updateTrustScore, normalizeLoan, num,
} from "./api/admin";

const fmtNPR = (n) => "NPR " + Number(n || 0).toLocaleString("en-IN");
const PIE_COLORS = ["#60bb46", "#f5a623", "#e74c3c", "#3498db", "#9b59b6", "#1abc9c"];

export default function Admin() {
  const { user, logout } = useAuth();
  const [activePage, setActivePage] = useState("dashboard");
  const [search, setSearch] = useState("");

  const menu = [
    { id: "dashboard", label: "Dashboard", icon: "💳" },
    { id: "merchants", label: "Merchants", icon: "🏪" },
    { id: "loans", label: "Loan Requests", icon: "🏛" },
    { id: "analytics", label: "Analytics", icon: "📊" },
    { id: "settings", label: "Settings", icon: "⚙" },
  ];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-logo-box">
          <div className="admin-logo">eSewa</div>
          <span className="admin-badge">ADMIN PANEL</span>
        </div>

        <SidebarStats />

        <nav className="admin-nav">
          {menu.map((m) => (
            <button
              key={m.id}
              className={`admin-nav-item ${activePage === m.id ? "active" : ""}`}
              onClick={() => setActivePage(m.id)}
            >
              <span className="admin-nav-icon">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </nav>

        <button className="admin-logout" onClick={logout}>Logout</button>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <input
            className="admin-search"
            placeholder="Search merchants, loans..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="admin-user-chip">
            {user?.name || user?.email || "Admin"}
            <span className="admin-user-avatar">
              {(user?.name || "A").charAt(0).toUpperCase()}
            </span>
          </div>
        </header>

        {activePage === "dashboard" && <DashboardPage onJumpToLoans={() => setActivePage("loans")} />}
        {activePage === "merchants" && <MerchantsPage search={search} />}
        {activePage === "loans" && <LoansPage search={search} />}
        {activePage === "analytics" && <AnalyticsPage />}
        {activePage === "settings" && <SettingsPage />}
      </main>
    </div>
  );
}

/* ---------- Sidebar live stats ---------- */
function SidebarStats() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    let alive = true;
    fetchAnalytics().then((d) => alive && setStats(d.summary)).catch(() => {});
    const id = setInterval(() => fetchAnalytics().then((d) => alive && setStats(d.summary)).catch(() => {}), 30000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return (
    <div className="admin-stat-card">
      <p className="admin-stat-label">Platform Loan Volume</p>
      <h3 className="admin-stat-value">{stats ? fmtNPR(stats.total_loan_volume) : "…"}</h3>
      <p className="admin-stat-sub">
        Active Merchants <strong>{stats?.total_merchants ?? "…"}</strong>
      </p>
    </div>
  );
}

/* ---------- Dashboard ---------- */
function DashboardPage({ onJumpToLoans }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetchAnalytics().then(setData).catch((e) => setErr(e.message));
  }, []);

  if (err) return <ErrorBox msg={err} />;
  if (!data) return <Skeleton lines={6} />;

  const { summary, loan_analytics = [], tier_distribution = [], recent_loans = [] } = data;
  const pending = loan_analytics.find((l) => l._id === "applied")?.count || 0;
  const approved = loan_analytics.find((l) => l._id === "approved")?.count || 0;
  const rejected = loan_analytics.find((l) => l._id === "rejected")?.count || 0;
  const repaid = loan_analytics.find((l) => l._id === "repaid")?.count || 0;

  return (
    <div className="admin-page">
      <span className="admin-tag">System Overview</span>
      <h1 className="admin-title">Admin Dashboard</h1>
      <p className="admin-subtitle">
        Monitor platform health, merchants, and loan activity in real time.
      </p>

      <div className="admin-hero">
        <div>
          <p className="admin-hero-label">Total Loan Volume</p>
          <h2 className="admin-hero-value">{(() => {
  let total = summary.total_loan_volume;
  let num = Array.isArray(total) ? total.reduce((a,b) => a + Number(b), 0) : Number(total);
  return 'NPR ' + (isNaN(num) ? 0 : num).toLocaleString('en-IN');
})()}
</h2>
          <p className="admin-hero-sub">All-time disbursed + pending</p>
        </div>
        <div className="admin-hero-stats">
          <div><p>Merchants</p><h4>{summary.total_merchants}</h4></div>
          <div><p>Active Loans</p><h4>{summary.active_loans}</h4></div>
          <div><p>Pending</p><h4 style={{ color: pending ? "#f5a623" : undefined }}>{pending}</h4></div>
        </div>
      </div>

      <div className="admin-grid-4">
        <StatCard title="Pending Loans" value={pending} sub="Click to review" onClick={onJumpToLoans} />
        <StatCard title="Approved" value={approved} sub="Lifetime" />
        <StatCard title="Rejected" value={rejected} sub="Lifetime" />
        <StatCard title="Repaid" value={repaid} sub="Lifetime" />
      </div>

      <div className="admin-charts-row">
        <div className="admin-card chart-card">
          <h3 className="admin-card-title">Loans by Status</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={loan_analytics.map((l) => ({ name: l._id, value: l.count }))}
                dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}
              >
                {loan_analytics.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="admin-card chart-card">
          <h3 className="admin-card-title">Merchants by Tier</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={tier_distribution.map((t) => ({
              tier: t._id, count: t.count, score: Math.round(t.avg_trust_score || 0),
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tier" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#60bb46" name="Merchants" />
              <Bar dataKey="score" fill="#3498db" name="Avg Trust" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="admin-card">
        <h3 className="admin-card-title">Recent Loan Activity</h3>
        <table className="admin-table">
          <thead><tr><th>Merchant</th><th>Amount</th><th>Duration</th><th>Status</th><th>Applied</th></tr></thead>
          <tbody>
            {recent_loans.map((l) => {
              const ln = normalizeLoan(l);
              return (
                <tr key={ln._id}>
                  <td>{ln.merchant_id?.business_name || "—"}</td>
                  <td>{fmtNPR(ln.amount)}</td>
                  <td>{ln.duration_months} mo</td>
                  <td><StatusPill status={ln.status} /></td>
                  <td>{ln.created_at ? new Date(ln.created_at).toLocaleDateString() : "—"}</td>
                </tr>
              );
            })}
            {recent_loans.length === 0 && <tr><td colSpan="5" className="muted">No loans yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Merchants ---------- */
function MerchantsPage({ search }) {
  const toast = useToast();
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState("");
  const [minScore, setMinScore] = useState("");
  const [analyzing, setAnalyzing] = useState(null);

  const load = () => {
    setLoading(true);
    fetchMerchants({ tier: tier || undefined, minTrustScore: minScore || undefined })
      .then((d) => setMerchants(d.merchants || []))
      .catch((e) => toast.error(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, [tier, minScore]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return merchants;
    return merchants.filter((m) =>
      (m.business_name || "").toLowerCase().includes(q) ||
      (m.user_id?.email || "").toLowerCase().includes(q)
    );
  }, [merchants, search]);

  const onAnalyze = async (m) => {
    setAnalyzing(m._id);
    try {
      const res = await analyzeMerchant(m._id);
      toast.success(`AI score: ${res.final_score ?? res.score ?? "computed"}`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    } finally { setAnalyzing(null); }
  };

  const onBumpScore = async (m) => {
    const v = prompt(`New trust score for ${m.business_name} (0–100):`, Math.round(m.trust_score || 0));
    if (v == null) return;
    const n = Number(v);
    if (Number.isNaN(n) || n < 0 || n > 100) return toast.error("Score must be 0–100");
    try {
      await updateTrustScore(m._id, n);
      toast.success("Trust score updated");
      load();
    } catch (e) { toast.error(e.response?.data?.message || e.message); }
  };

  return (
    <div className="admin-page">
      <h1 className="admin-title">Merchant Management</h1>
      <p className="admin-subtitle">Review merchant profiles, run AI behavioral analysis, adjust trust scores.</p>

      <div className="admin-filters">
        <select value={tier} onChange={(e) => setTier(e.target.value)}>
          <option value="">All Tiers</option>
          <option value="gold">Gold</option>
          <option value="silver">Silver</option>
          <option value="bronze">Bronze</option>
        </select>
        <input type="number" placeholder="Min trust score" value={minScore}
          onChange={(e) => setMinScore(e.target.value)} />
        <button className="btn-sm" onClick={load}>Refresh</button>
      </div>

      <div className="admin-card">
        {loading ? <Skeleton lines={4} /> : (
          <table className="admin-table">
            <thead><tr>
              <th>Business</th><th>Email</th><th>Tier</th><th>Trust</th>
              <th>Credit</th><th>Debit</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m._id}>
                  <td>{m.business_name}</td>
                  <td className="muted">{m.user_id?.email || "—"}</td>
                  <td><span className="pill pill-tier">{m.tier}</span></td>
                  <td><strong>{Number(m.trust_score || 0).toFixed(1)}</strong></td>
                  <td>{fmtNPR(m.stats?.total_credit)}</td>
                  <td>{fmtNPR(m.stats?.total_debit)}</td>
                  <td>
                    <button className="btn-sm" disabled={analyzing === m._id}
                      onClick={() => onAnalyze(m)}>
                      {analyzing === m._id ? "Analyzing…" : "AI Analyze"}
                    </button>{" "}
                    <button className="btn-sm" onClick={() => onBumpScore(m)}>Edit Score</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="7" className="muted">No merchants found</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ---------- Loans ---------- */
function LoansPage({ search }) {
  const toast = useToast();
  const [loans, setLoans] = useState([]);
  const [statusFilter, setStatusFilter] = useState("applied");
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(null);

  const load = () => {
    setLoading(true);
    fetchAnalytics()
      .then((d) => setLoans((d.recent_loans || []).map(normalizeLoan)))
      .catch((e) => toast.error(e.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return loans.filter((l) => {
      if (statusFilter && l.status !== statusFilter) return false;
      if (!q) return true;
      return (l.merchant_id?.business_name || "").toLowerCase().includes(q) ||
             (l._id || "").toLowerCase().includes(q);
    });
  }, [loans, statusFilter, search]);

  const onApprove = async (loan) => {
    try {
      await reviewLoan(loan._id, "approve");
      toast.success(`Loan approved · ${fmtNPR(loan.amount)}`);
      setReviewing(null); load();
    } catch (e) { toast.error(e.response?.data?.message || e.message); }
  };
  const onReject = async (loan, reason) => {
    try {
      await reviewLoan(loan._id, "reject", reason);
      toast.info("Loan rejected");
      setReviewing(null); load();
    } catch (e) { toast.error(e.response?.data?.message || e.message); }
  };

  const counts = useMemo(() => {
    const c = { applied: 0, approved: 0, rejected: 0, repaid: 0 };
    loans.forEach((l) => { if (c[l.status] != null) c[l.status]++; });
    return c;
  }, [loans]);

  return (
    <div className="admin-page">
      <h1 className="admin-title">Loan Requests</h1>
      <p className="admin-subtitle">Review credit profile and approve or reject merchant loan requests.</p>

      <div className="admin-grid-4">
        <StatCard title="Pending" value={counts.applied} />
        <StatCard title="Approved" value={counts.approved} />
        <StatCard title="Rejected" value={counts.rejected} />
        <StatCard title="Repaid" value={counts.repaid} />
      </div>

      <div className="admin-filters">
        {["applied", "approved", "rejected", "repaid", ""].map((s) => (
          <button key={s || "all"}
            className={`btn-sm ${statusFilter === s ? "btn-active" : ""}`}
            onClick={() => setStatusFilter(s)}>
            {s ? s[0].toUpperCase() + s.slice(1) : "All"}
          </button>
        ))}
        <button className="btn-sm" onClick={load}>Refresh</button>
      </div>

      <div className="admin-card">
        {loading ? <Skeleton lines={5} /> : (
          <table className="admin-table">
            <thead><tr>
              <th>Loan</th><th>Merchant</th><th>Amount</th><th>Duration</th>
              <th>Rate</th><th>Trust</th><th>Status</th><th>Action</th>
            </tr></thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l._id}>
                  <td className="muted">#{l._id.slice(-6)}</td>
                  <td>{l.merchant_id?.business_name || "—"}</td>
                  <td>{fmtNPR(l.amount)}</td>
                  <td>{l.duration_months} mo</td>
                  <td>{l.interest_rate}%</td>
                  <td><strong>{Number(l.merchant_id?.trust_score || 0).toFixed(1)}</strong></td>
                  <td><StatusPill status={l.status} /></td>
                  <td>
                    {l.status === "applied" ? (
                      <button className="btn-sm btn-success" onClick={() => setReviewing(l)}>Review</button>
                    ) : <span className="muted">—</span>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="8" className="muted">No loans match filter</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      <LoanReviewModal
        loan={reviewing}
        onClose={() => setReviewing(null)}
        onApprove={onApprove}
        onReject={onReject}
      />
    </div>
  );
}

/* ---------- Analytics ---------- */
function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { fetchAnalytics().then(setData).catch((e) => setErr(e.message)); }, []);
  if (err) return <ErrorBox msg={err} />;
  if (!data) return <Skeleton lines={6} />;

  const txVol = data.transaction_volume || [];
  const trust = data.trust_distribution || [];

  return (
    <div className="admin-page">
      <h1 className="admin-title">Platform Analytics</h1>
      <p className="admin-subtitle">30-day transaction volume and trust score distribution.</p>

      <div className="admin-charts-row">
        <div className="admin-card chart-card">
          <h3 className="admin-card-title">Transaction Volume (30 days)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={txVol.map((t) => ({
              type: t._id, amount: t.total_amount, count: t.count,
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip formatter={(v) => fmtNPR(v)} />
              <Bar dataKey="amount" fill="#60bb46" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="admin-card chart-card">
          <h3 className="admin-card-title">Trust Score Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={trust.map((t) => ({
              bucket: typeof t._id === "number" ? `${t._id}–${t._id + 25}` : String(t._id),
              count: t.count,
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3498db" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ---------- Settings ---------- */
function SettingsPage() {
  return (
    <div className="admin-page">
      <h1 className="admin-title">Platform Settings</h1>
      <p className="admin-subtitle">Configure platform-wide rules (display only — wire to backend when ready).</p>
      <div className="admin-card">
        <div className="admin-form-row"><label>Bronze loan ceiling (NPR)</label><input defaultValue="50000" /></div>
        <div className="admin-form-row"><label>Silver loan ceiling (NPR)</label><input defaultValue="200000" /></div>
        <div className="admin-form-row"><label>Gold loan ceiling (NPR)</label><input defaultValue="500000" /></div>
        <div className="admin-form-row"><label>Base interest rate (%)</label><input defaultValue="6.0" /></div>
        <button className="btn-primary" disabled>Save Settings</button>
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */
function StatCard({ title, value, sub, onClick }) {
  return (
    <div className={`stat-card ${onClick ? "stat-card-clickable" : ""}`} onClick={onClick}>
      <p className="stat-card-title">{title}</p>
      <h3 className="stat-card-value">{value}</h3>
      {sub && <p className="stat-card-sub">{sub}</p>}
    </div>
  );
}

function StatusPill({ status }) {
  const cls = status === "approved" || status === "repaid" ? "pill-success"
    : status === "rejected" || status === "defaulted" ? "pill-failed"
    : "pill-pending";
  return <span className={`pill ${cls}`}>{status}</span>;
}

function Skeleton({ lines = 3 }) {
  return (
    <div className="admin-card">
      {Array.from({ length: lines }).map((_, i) => <div key={i} className="skeleton-line" />)}
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div className="admin-page">
      <div className="admin-card" style={{ borderLeft: "4px solid #e74c3c" }}>
        <h3 className="admin-card-title">Couldn't load data</h3>
        <p className="muted">{msg}</p>
        <p className="muted">Check the backend is running at <code>:5000</code> and that you're logged in as an admin.</p>
      </div>
    </div>
  );
}
