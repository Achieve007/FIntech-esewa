# eSewa 3-System Integrated Workspace

Unzip and you get three sibling folders:

```
esewa_workspace/
  backend_patch/       # one-file CORS patch for your existing esewa_backend
  admin_frontend/      # admin dashboard (port 5174) — already wired
  merchant_frontend/   # merchant app   (port 5175) — already wired
```

All three talk to ONE backend on `http://localhost:5000`.

---

## One-time setup

### 1. Backend (your existing esewa_backend project)
Follow `backend_patch/README.md` (single CORS edit) and start it:
```
cd esewa_backend
npm install
npm run dev          # → http://localhost:5000
```

### 2. Admin frontend
```
cd admin_frontend
npm install
npm run dev          # → http://localhost:5174
```

### 3. Merchant frontend
```
cd merchant_frontend
npm install
npm run dev          # → http://localhost:5175
```

---

## First-time login

Register a merchant once:
```
curl -X POST http://localhost:5000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Test User\",\"email\":\"m@test.com\",\"password\":\"Test1234\",\"business_name\":\"Shop\",\"citizen_id\":\"1234567890\"}"
```
Then log in at http://localhost:5175 with `m@test.com / Test1234`.

For the admin, register/seed an admin account in your backend the way it
already supports (the admin login enforces `role === "admin"`).

---

## How they're wired

| App                | Port | API base                 | LocalStorage token key |
|--------------------|------|--------------------------|------------------------|
| esewa_backend      | 5000 | —                        | —                      |
| admin_frontend     | 5174 | http://localhost:5000/api| `admin_token`          |
| merchant_frontend  | 5175 | http://localhost:5000/api| `merchant_token`       |

Different token keys = both can be logged in simultaneously in the same
browser without colliding. CORS allowlist on the backend covers both ports.

Nothing in the visual UI of either frontend was changed — only the auth
handlers now hit the real backend.
