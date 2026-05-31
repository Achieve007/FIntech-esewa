# eSewa E-Credit — Architecture

## 1. System Overview

A three-app workspace built around one Node/Express + MongoDB backend that
provides a social-graph-based credit-scoring platform for micro-merchants.

```
                ┌──────────────────────────┐
                │  Admin Frontend (5174)   │
                │  React 19 + Vite + Recharts
                └──────────────┬───────────┘
                               │  JWT (admin_token)
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                Backend API  —  Express @ :5000               │
│  Auth · Merchant · Transactions · Loans · Admin              │
│  References (vouching) · Trust · Hardship · Psychometric · AI│
│  Middleware: CORS allowlist, JWT, role guards, rate-limit    │
│  Services:   BehavioralAnalysis, GeminiAnalyzer (mock)       │
└───────────────┬───────────────────────────────┬──────────────┘
                │ Mongoose ODM                  │
                ▼                               ▼
        ┌───────────────┐                ┌──────────────┐
        │   MongoDB     │                │ Gemini API   │
        │  merchant_db  │                │ (mock today) │
        └───────────────┘                └──────────────┘
                               ▲
                               │  JWT (merchant_token)
                ┌──────────────┴───────────┐
                │ Merchant Frontend (5175) │
                │ React 19 + Vite          │
                └──────────────────────────┘
```

Both frontends are independent SPAs; they share the same backend but use
**different localStorage keys** (`admin_token` vs `merchant_token`) so an
operator can log in to both in the same browser without collision.

---

## 2. Backend Architecture

### 2.1 Stack

| Concern        | Choice                                  |
|----------------|-----------------------------------------|
| Runtime        | Node.js (CommonJS)                      |
| Framework      | Express 4                               |
| Database       | MongoDB via Mongoose 8                  |
| Auth           | JWT (`jsonwebtoken`) + `bcryptjs`       |
| Validation     | Mongoose schema + ad-hoc controller checks |
| Rate limiting  | `express-rate-limit` (auth routes only) |
| CORS           | `cors` with env-driven allowlist        |
| AI             | `@google/generative-ai` (mocked for now)|
| Dev runner     | `nodemon`                               |

### 2.2 Layered structure

```
esewa_backend/
├── server.js              # App bootstrap, middleware, route mounting
├── db.js                  # Mongoose connection
├── seed.js                # Demo data seeder
├── routes/                # Thin HTTP layer — verbs + paths only
├── controllers/           # Request handling, validation, response shaping
├── services/              # Pure domain logic (behavioral, AI)
│   ├── behavioralAnalysis.js
│   └── geminiAnalyzer.js
├── models/                # Mongoose schemas + instance/static methods
└── middleware/
    └── auth.js            # protect, adminOnly, merchantOnly
```

**Request flow:** `Route → (auth middleware) → Controller → (Model | Service) → MongoDB`.

### 2.3 Domain Model (Mongoose)

```
User ──1─1──> Merchant ──1─n──> Transaction
                 │   │
                 │   ├─1─n──> Loan
                 │   ├─1─n──> HardshipClaim
                 │   ├─1─1──> Psychometric
                 │   └─m─n──> Merchant (via Reference, TrustRelationship)
```

Key invariants enforced at the schema layer:
- `users.email` unique; `merchants.citizen_id` unique.
- A merchant cannot vouch for the same merchant twice (compound unique index).
- A merchant can receive at most **4 active vouches** (`Reference.canReceiveVouch`).
- Loan `status` is a finite enum; max 3 active loans per merchant (controller guard).

### 2.4 Credit-scoring pipeline

`Merchant.calculateFinalScore(loanAmount, durationMonths)` composes:

| Component         | Source                                            | Weight |
|-------------------|---------------------------------------------------|--------|
| Empirical         | Sliding-window analysis of last 6 mo transactions | 30%    |
| Behavioral        | `BehavioralAnalysis.computeBehavioralScore`       | 25%    |
| Psychometric      | Either explicit answers or inferred from behavior | 15%    |
| Assets            | `assets_value / monthlyExpense / 12`              | 10%    |
| VAT filing rate   | Merchant field                                    | 10%    |
| Payment history   | On-time rate from behavioral output               | 10%    |
| Social boost      | +5 per active vouch (capped +20)                  | bonus  |

Output tier: `gold ≥ 75`, `silver ≥ 50`, else `bronze`. Tier drives default
interest rate at loan-application time.

### 2.5 Security

- Passwords hashed with bcrypt (10 rounds).
- JWT signed with `JWT_SECRET`; `protect` middleware verifies and hydrates `req.user`.
- Role guards: `adminOnly`, `merchantOnly`.
- Auth endpoints rate-limited (10 / 15 min / IP).
- CORS allowlist from `CLIENT_URL` env (comma-separated origins).
- Centralized error handler maps Mongoose `ValidationError`, `CastError`, and duplicate-key errors to 400s.

---

## 3. Frontend Architecture (shared)

Both SPAs use the same shape:

```
src/
├── main.jsx                 # ReactDOM.createRoot
├── App.jsx / Admin.jsx      # Top-level layout + routing
├── api/
│   ├── client.js            # Axios instance, JWT injector, 401 handler
│   ├── auth.js              # login / register / me wrappers
│   └── admin.js (admin only)
├── components/ or pages/    # Screens
├── context/                 # AuthContext (admin)
└── assets/                  # Logos, hero images
```

### 3.1 Networking

- One `axios.create({ baseURL: VITE_API_URL || "/api", timeout: 15000 })`.
- Request interceptor injects `Authorization: Bearer <token>` from `localStorage`.
- Response interceptor evicts the token on 401 (admin also redirects to `/`).

### 3.2 State

- Auth state lives in `AuthContext` (admin) / lightweight module state (merchant).
- No global store; component-local state + Axios calls are enough for the current surface.
- Recharts (admin) for analytics visualizations.

### 3.3 Configuration

`.env` per app:
```
VITE_API_URL=http://localhost:5000/api
```
Vite dev server ports are pinned in `package.json` scripts:
- admin → 5174
- merchant → 5175

---

## 4. Deployment Topology (suggested)

| Layer            | Local            | Prod (suggested)                  |
|------------------|------------------|-----------------------------------|
| Backend          | `npm run dev`    | Node behind nginx / PM2 / Docker  |
| MongoDB          | local 27017      | Mongo Atlas                       |
| Frontends        | Vite dev servers | Static build behind CDN           |
| Secrets          | `.env`           | Vault / platform env vars         |

Set `CLIENT_URL` to a comma-separated list of all deployed frontend origins
so CORS continues to work in production.

---

## 5. Cross-cutting Concerns

- **Logging:** `console.error` in controllers; centralized error middleware in `server.js`.
- **Validation:** Schema enums + controller-level checks (no Zod/Joi today).
- **Background work:** None; `/api/reference/expire` is intended to be hit by an external cron.
- **AI:** `ai.routes` returns a Gemini-shaped mock so the frontend contract is stable; swap for the real `@google/generative-ai` call in `services/geminiAnalyzer.js` without touching clients.

---

## 6. Extension Points

- Add Zod/Joi validation at the route boundary.
- Promote `BehavioralAnalysis` to a worker queue for batch scoring.
- Replace mock Gemini with a real call gated by `GEMINI_API_KEY`.
- Add refresh-token rotation if 7-day JWT lifetime becomes a problem.
- Add socket/websocket channel for real-time admin risk alerts.
