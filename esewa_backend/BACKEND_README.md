# eSewa E-Credit — Backend

Node.js + Express + MongoDB API powering the eSewa hackathon credit-scoring
platform. Serves the admin dashboard, merchant app, and any future client.

- **Default port:** `5000`
- **Base URL:** `http://localhost:5000/api`
- **Health:** `GET /health`

For full endpoint reference see [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md).
For system design see [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## 1. Requirements

- Node.js **18+**
- MongoDB **6+** (local or Atlas)
- npm (or pnpm/yarn)

## 2. Setup

```bash
cd esewa_backend
npm install
cp .env.example .env   # if missing, create the file below
```

### `.env`
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/merchant_db
JWT_SECRET=replace_me_with_a_long_random_string
CLIENT_URL=http://localhost:5174,http://localhost:5175,http://localhost:3000
NODE_ENV=development
# Optional, for the real Gemini integration:
# GEMINI_API_KEY=...
```

`CLIENT_URL` is a comma-separated CORS allowlist — add every frontend origin
that should be allowed to call this API.

## 3. Run

```bash
npm run dev      # nodemon, auto-reloads on file changes
npm start        # production mode
npm run seed     # seed demo merchants, transactions, loans
```

On boot you should see:
```
✅ MongoDB Connected: merchant_db
🚀 Server running on port 5000
✅ CORS allowed origins: http://localhost:5174, http://localhost:5175, ...
```

## 4. Project Layout

```
esewa_backend/
├── server.js            # Bootstrap: CORS, JSON, rate limit, routes, errors
├── db.js                # Mongoose connect helper
├── seed.js              # Demo data seeder
├── routes/              # Verb/path → controller wiring (one file per domain)
├── controllers/         # Request handlers (auth, merchant, transaction, ...)
├── services/
│   ├── behavioralAnalysis.js   # Credit-score components
│   └── geminiAnalyzer.js       # AI wrapper (mock today)
├── models/              # Mongoose schemas + methods/statics
└── middleware/auth.js   # protect, adminOnly, merchantOnly
```

## 5. Authentication

JWT bearer tokens, issued for **7 days**. Send on every protected request:

```
Authorization: Bearer <token>
```

Roles: `merchant` (default) and `admin`. Admin routes require `role === "admin"`.

Register a merchant:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"m@test.com","password":"Test1234","business_name":"Shop","citizen_id":"1234567890"}'
```

Create an admin (one-off, via Mongo shell or `seed.js`):
```js
db.users.updateOne({ email: "you@example.com" }, { $set: { role: "admin" } })
```

## 6. Rate Limits

Auth routes are limited to **10 requests / 15 min / IP** to slow credential
stuffing. Other routes are unlimited; add `express-rate-limit` where needed.

## 7. NPM Scripts

| Script         | What it does                          |
|----------------|---------------------------------------|
| `npm run dev`  | Start with `nodemon`                  |
| `npm start`    | Start with `node server.js`           |
| `npm run seed` | Run `seed.js` to populate demo data   |

## 8. Common Issues

- **CORS blocked for origin** — add the origin to `CLIENT_URL` and restart.
- **MongoDB connection failed** — check `MONGO_URI`, that `mongod` is running, and that the network/Atlas IP allowlist permits you.
- **401 on every request** — token missing/expired; log in again.
- **`Maximum 3 active loans allowed`** — repay/reject existing loans first.
- **`Citizen ID already registered`** — `citizen_id` must be unique per merchant.

## 9. Production Notes

- Set `NODE_ENV=production` to hide stack traces in error responses.
- Use a long random `JWT_SECRET` (≥ 32 bytes).
- Front the API with HTTPS (nginx / platform TLS).
- Use a managed MongoDB (Atlas) or replica set; back up regularly.
- Run behind a process manager (PM2, systemd) or in a container.
