import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import esewaLogo from "../assets/Esewa-logo.png";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@esewa.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try { await login(email, password); }
    catch (err) {
      setError(err.response?.data?.message || err.message || "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo">eSewa <span>ADMIN</span></div>
        <h2>Sign in to admin panel</h2>
        <label>Email
          <input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} />
        </label>
        <label>Password
          <input type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} />
        </label>
        {error && <div className="login-error">{error}</div>}
        <button className="btn-primary" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <p className="login-hint">Backend must be running at <code>:5000</code>. Admin role required.</p>
      </form>
    </div>
  );
}
