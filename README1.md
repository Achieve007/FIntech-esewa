# eSewa Trust Credit Platform — Project Overview

A full-stack platform that scores merchant creditworthiness and underwrites micro-loans using transaction history, vouching, psychometric data, and AI insights. The system is split into three deployable apps that share one backend API.

---

## 1. Repository Layout

```
esewa-workspace/
├── esewa_backend/        # Node.js + Express + MongoDB API (port 5000)
├── admin_frontend/       # React + Vite admin console (port 5174)
└── merchant_frontend/    # React + Vite merchant portal (port 5175)
```

Each folder is an independent npm package with its own `package.json`, `.env`, and deploy lifecycle. They communicate exclusively over HTTP/JSON.

---

## 2. The Three Applications

### 2.1 Backend — `esewa_backend/`
The single source of truth. Express server exposing REST endpoints under `/api/*`, persisting to MongoDB via Mongoose, issuing JWTs for auth, and calling the Gemini-style AI service for credit insights.

- **Entry:** `server.js` → mounts routers from `src/routes/`
- **Layers:** routes → controllers → services → models
- **Key domains:** auth, merchant, transactions, loans, references (vouching), trust relationships, hardship claims, psychometric, admin, AI
- **Security:** bcrypt password hashing, JWT bearer auth, role middleware (`merchant` / `admin`), per-IP rate limiting (10 req / 15 min on auth)
- **Docs:** see [`BACKEND_README.md`](./BACKEND_README.md) for setup & env, [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md) for every endpoint

### 2.2 Admin Frontend — `admin_frontend/`
Internal console used by eSewa staff to review merchants, approve/reject loans, run AI analyses, and inspect platform-wide insights.

- **Stack:** React 18, Vite, Axios, React Router
- **Auth token key:** `admin_token` in `localStorage`
- **Default port:** `5174`
- **Primary screens:** merchant list, merchant detail (trust score breakdown), loan queue, AI insights dashboard
- **Docs:** [`FRONTEND_README.md`](./FRONTEND_README.md) (admin section)

### 2.3 Merchant Frontend — `merchant_frontend/`
Public-facing portal where merchants register, complete onboarding (psychometric + references), view their dashboard, apply for loans, and repay them.

- **Stack:** React 18, Vite, Axios, React Router
- **Auth token key:** `merchant_token` in `localStorage`
- **Default port:** `5175`
- **Primary screens:** register/login, profile & onboarding, transactions, loan apply/repay, hardship claim, trust network
- **Docs:** [`FRONTEND_README.md`](./FRONTEND_README.md) (merchant section)

---

## 3. Documentation Index

| File | Audience | Purpose |
|---|---|---|
| [`README1.md`](./README1.md) | Everyone | This file — start here |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Engineers | System diagram, data model, credit-score pipeline, deploy topology |
| [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md) | Frontend & integration devs | Every endpoint: method, path, auth, request, response, errors |
| [`BACKEND_README.md`](./BACKEND_README.md) | Backend devs / ops | Install, env vars, scripts, seeding, deployment |
| [`FRONTEND_README.md`](./FRONTEND_README.md) | Frontend devs | Setup for both admin & merchant apps, shared patterns |

---

## 4. End-to-End Flow (happy path)

1. Merchant registers via `merchant_frontend` → `POST /api/auth/register` creates `User` + `Merchant`.
2. Merchant completes profile, psychometric quiz, and invites references.
3. Transactions accumulate (seeded or POSTed) → recalculated trust score.
4. Merchant applies for a loan → `POST /api/loans/apply`.
5. Admin reviews in `admin_frontend`, optionally triggers `POST /api/admin/analyze/:merchantId` for AI insight, then approves/rejects.
6. Disbursed loan is repaid via `POST /api/loans/repay`; repayment history feeds back into the trust score.

---

## 5. Local Quick Start

```bash
# 1. Backend
cd esewa_backend && npm install && npm run seed && npm run dev   # :5000

# 2. Admin (new terminal)
cd admin_frontend && npm install && npm run dev                  # :5174

# 3. Merchant (new terminal)
cd merchant_frontend && npm install && npm run dev               # :5175
```

Default seeded admin credentials and merchant fixtures are documented in [`BACKEND_README.md`](./BACKEND_README.md).

---

## 6. Tech Stack Summary

| Layer | Choice |
|---|---|
| Runtime | Node.js 18+ |
| API | Express 4 |
| DB | MongoDB + Mongoose 8 |
| Auth | JWT (HS256) + bcrypt |
| AI | `@google/generative-ai` (mockable) |
| Frontend | React 18 + Vite + Axios |
| Routing | React Router v6 |
| Rate limit | `express-rate-limit` |

---

## 7. Where to Go Next

- Setting up locally? → `BACKEND_README.md` + `FRONTEND_README.md`
- Integrating a new client? → `API_DOCUMENTATION.md`
- Understanding the trust score or data model? → `ARCHITECTURE.md`
