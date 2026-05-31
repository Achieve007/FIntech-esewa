# eSewa E-Credit — API Documentation

**Base URL:** `http://localhost:5000/api`
**Auth:** JWT bearer token in `Authorization: Bearer <token>` header (or `x-auth-token`).
**Token lifetime:** 7 days. Issued at login/register.
**Content-Type:** `application/json` for all bodies.

Standard envelope:
```json
{ "success": true, "message": "...", "...payload": "..." }
```
Errors:
```json
{ "success": false, "message": "Reason" }
```

Auth endpoints are rate-limited: **10 requests / 15 min / IP**.

---

## 1. Auth — `/api/auth`

| Method | Path        | Auth | Description                  |
|--------|-------------|------|------------------------------|
| POST   | `/register` | —    | Register a new merchant user |
| POST   | `/login`    | —    | Login (merchant or admin)    |
| GET    | `/me`       | JWT  | Current user + merchant      |

### POST /register
Body:
```json
{
  "name": "Test User",
  "email": "m@test.com",
  "password": "Test1234",
  "business_name": "Shop",
  "citizen_id": "1234567890"
}
```
201 →
```json
{
  "success": true,
  "token": "<jwt>",
  "user":    { "id": "...", "name": "...", "email": "...", "role": "merchant" },
  "merchant":{ "id": "...", "business_name": "...", "trust_score": 50, "tier": "bronze" }
}
```

### POST /login
Body: `{ "email": "...", "password": "..." }`
200 → `{ success, token, user, merchant? }`

### GET /me
Returns the authenticated user profile and merchant record (if any).

---

## 2. Merchant — `/api/merchant`  *(JWT required)*

| Method | Path          | Description                          |
|--------|---------------|--------------------------------------|
| GET    | `/profile`    | Full merchant profile                |
| PUT    | `/profile`    | Update profile fields                |
| GET    | `/dashboard`  | Aggregated dashboard stats           |
| GET    | `/stats`      | Alias of `/dashboard`                |

`PUT /profile` body (any subset): `{ business_name, assets_value, vat_filing_rate }`.

`/dashboard` returns trust score, tier, totals, recent loans/transactions.

---

## 3. Transactions — `/api/transactions`  *(JWT)*

| Method | Path        | Description                            |
|--------|-------------|----------------------------------------|
| GET    | `/`         | List (paginated, filterable)           |
| POST   | `/`         | Create a transaction                   |
| GET    | `/summary`  | Period summary (`?period=week|month`)  |

`GET /` query: `limit=50, page=1, type=credit|debit, status, startDate, endDate`.

`POST /` body:
```json
{ "amount": 1500, "type": "credit", "category": "retail", "description": "..." }
```
`type` ∈ `credit|debit`. `category` ∈ `utility|retail|loan_repayment|inventory|salary|other`.
Side-effects: updates merchant `metadata.total_credit/total_debit`, nudges `trust_score`, recalculates tier.

---

## 4. Loans — `/api/loans`  *(JWT)*

| Method | Path          | Description                  |
|--------|---------------|------------------------------|
| POST   | `/apply`      | Apply for a loan             |
| GET    | `/`           | List my loans (`?status=`)   |
| GET    | `/:id`        | Loan details                 |
| POST   | `/:id/repay`  | Record a repayment           |

`POST /apply` body:
```json
{ "amount": 5000, "duration_months": 6, "interest_rate": 6.0, "purpose": "Inventory" }
```
Rules: `amount ≤ trust_score × 100`; max **3** simultaneous `applied|approved` loans.
Default interest by tier if omitted: gold 4.5%, silver 6.0%, bronze 7.5%.

Status lifecycle: `applied → approved | rejected → repaid | defaulted` (and `moratorium`).

---

## 5. Admin — `/api/admin`  *(JWT + role=admin)*

| Method | Path                              | Description                       |
|--------|-----------------------------------|-----------------------------------|
| GET    | `/merchants`                      | List all merchants                |
| PUT    | `/merchants/:id/trust-score`      | Manually override trust score     |
| PUT    | `/loans/:id/:action`              | `action` = `approve` \| `reject`  |
| GET    | `/analytics`                      | Platform analytics                |
| GET    | `/dashboard`                      | Alias of `/analytics`             |
| POST   | `/analyze/:merchantId`            | Behavioral + Gemini analysis      |
| POST   | `/analyze/batch`                  | Batch behavioral analysis         |
| GET    | `/alerts`                         | Risk alerts feed                  |

`PUT /loans/:id/approve` body: `{ "monthly_installment": 1000 }` (optional, auto-computed otherwise).
`PUT /loans/:id/reject` body: `{ "rejection_reason": "..." }`.

---

## 6. References / Social Vouching — `/api/reference`  *(JWT)*

| Method | Path                              | Description                                |
|--------|-----------------------------------|--------------------------------------------|
| POST   | `/vouch`                          | Create vouch for another merchant          |
| DELETE | `/vouch/:id`                      | Revoke own vouch                           |
| GET    | `/incoming/:merchantId?`          | Vouches received                           |
| GET    | `/outgoing/:merchantId?`          | Vouches given                              |
| GET    | `/network/:merchantId?`           | Full social graph                          |
| GET    | `/can-receive/:merchantId`        | Capacity check (max 4 active vouches)      |
| POST   | `/expire`                         | Expire stale vouches (admin/cron)          |

`POST /vouch` body:
```json
{ "toMerchantId": "<id>", "relationship": "supplier", "durationMonths": 6 }
```
`relationship` ∈ `supplier|friend|neighbor|community`.
Scoring: each active vouch = +5 trust points, capped at +20 (max 4 vouchers).

---

## 7. Trust Relationships — `/api/trust`  *(JWT)*

| Method | Path                  | Description                            |
|--------|-----------------------|----------------------------------------|
| POST   | `/add-guarantor`      | Add a guarantor                        |
| GET    | `/my-guarantors`      | People guaranteeing me                 |
| GET    | `/my-guarantees`      | People I guarantee                     |
| PUT    | `/update/:id`         | Update relationship trust              |
| DELETE | `/remove/:id`         | Remove relationship                    |
| GET    | `/admin/network`      | Admin: full trust network              |

---

## 8. Hardship Claims — `/api/hardship`  *(JWT)*

Merchant:
| Method | Path             | Description           |
|--------|------------------|-----------------------|
| POST   | `/submit`        | Submit a claim        |
| GET    | `/my-claims`     | My claims             |
| GET    | `/claim/:id`     | One claim             |

Admin:
| Method | Path                  | Description                            |
|--------|-----------------------|----------------------------------------|
| GET    | `/admin/all`          | All claims                             |
| PUT    | `/admin/verify/:id`   | Verify / reject (body: `{ status }`)   |
| GET    | `/admin/stats`        | Aggregate stats                        |

`event_type` is free text (e.g. `flood`, `medical`, `theft`). `verification_status` ∈ `pending|verified|rejected`.
Verified claims grant a loan moratorium.

---

## 9. Psychometric — `/api/psychometric`

| Method | Path         | Auth | Description                          |
|--------|--------------|------|--------------------------------------|
| GET    | `/questions` | —    | Get the questionnaire                |
| POST   | `/submit`    | JWT  | Submit answers (Likert 1–5)          |
| GET    | `/profile`   | JWT  | Current scores for this merchant     |

`POST /submit` body:
```json
{ "answers": [ { "questionId": "Q1", "value": 4 }, ... ] }
```
Returns: `{ conscientiousness, risk_aversion, psychometric_score }` (each 0–100).

---

## 10. AI Insights — `/api/ai`

| Method | Path        | Description                                                       |
|--------|-------------|-------------------------------------------------------------------|
| POST   | `/insights` | Mock Gemini-shaped insights based on score                        |
| GET    | `/health`   | Health check for the AI service                                   |

`POST /insights` body: `{ "score": 82, "context": {} }`.
Returns `{ success, model, insights: string[], raw: { candidates, usageMetadata } }`.

---

## 11. Health / Root

| Method | Path      | Description           |
|--------|-----------|-----------------------|
| GET    | `/health` | Server health + uptime |
| GET    | `/`       | API banner            |

---

## Error Codes

| Status | Meaning                                      |
|--------|----------------------------------------------|
| 400    | Validation / bad input / duplicate key       |
| 401    | Missing or invalid JWT                       |
| 403    | Authenticated but lacks role                 |
| 404    | Resource or route not found                  |
| 429    | Rate limit exceeded (auth routes)            |
| 500    | Internal server error                        |

---

## Trust Score Formula (server-computed)

```
final_score = empirical*0.30 + behavioral*0.25 + psychometric*0.15
            + assets*0.10   + vat*0.10        + payment_history*0.10
            + social_boost (capped at +20)
```
Tier: `≥75 → gold`, `≥50 → silver`, else `bronze`.
