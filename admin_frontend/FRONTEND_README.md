# eSewa E-Credit — Frontends

Two independent React 19 + Vite single-page apps that share the same backend:

| App                  | Port | Token key         | Purpose                                  |
|----------------------|------|-------------------|------------------------------------------|
| `admin_frontend/`    | 5174 | `admin_token`     | Ops dashboard: merchants, loans, analytics |
| `merchant_frontend/` | 5175 | `merchant_token`  | Merchant-facing app: profile, loans, txns  |

Both apps talk to the API at `VITE_API_URL` (default `/api`, set explicitly to
`http://localhost:5000/api` in development).

Different localStorage keys mean both apps can be logged in simultaneously in
the same browser without colliding.

---

## 1. Requirements

- Node.js **18+**
- A running backend (see `BACKEND_README.md`) reachable from your browser

## 2. Install & Run

### Admin
```bash
cd admin_frontend
npm install
npm run dev          # http://localhost:5174
npm run build        # production bundle in dist/
npm run preview      # preview the prod bundle
```

### Merchant
```bash
cd merchant_frontend
npm install
npm run dev          # http://localhost:5173 (or 5175 — see note)
npm run build
npm run preview
```

> The merchant `package.json` uses default Vite port (5173). The workspace
> README pins it to 5175 to avoid collisions and to match the backend CORS
> allowlist. If you need 5175, run:
> ```bash
> npm run dev -- --port 5175
> ```
> or add `--port 5175` to the `dev` script.

## 3. Environment

Create `.env` in each frontend folder:

```env
VITE_API_URL=http://localhost:5000/api
```

Vite exposes only variables prefixed with `VITE_` to the client.

## 4. Project Layout (shared shape)

```
<app>_frontend/
├── index.html
├── vite.config.js
├── public/                 # static assets served as-is
└── src/
    ├── main.jsx            # ReactDOM root
    ├── App.jsx | Admin.jsx # top-level layout
    ├── api/
    │   ├── client.js       # Axios instance + JWT injector + 401 handler
    │   ├── auth.js         # login/register/me wrappers
    │   └── admin.js        # (admin only) admin endpoints
    ├── components/         # screens & UI pieces
    ├── pages/              # (merchant) route-level views
    ├── context/            # (admin) AuthContext
    └── assets/             # logos, hero images
```

### Networking pattern (both apps)

```js
// src/api/client.js
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api", timeout: 15000 });
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("admin_token"); // or "merchant_token"
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});
api.interceptors.response.use(r => r, (err) => {
  if (err.response?.status === 401) { /* clear token, redirect to login */ }
  return Promise.reject(err);
});
```

Use `api.get/post/put/delete(path, ...)` everywhere — never a bare `fetch`.

## 5. Auth Flow

1. User submits credentials → `POST /api/auth/login`.
2. Server returns `{ token, user, merchant? }`.
3. Frontend stores `token` in localStorage under its app-specific key.
4. Axios interceptor attaches it to every subsequent request.
5. On 401, the interceptor clears the token (admin also redirects to `/`).

## 6. First-time Login

Register a merchant once against the running backend:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"m@test.com","password":"Test1234","business_name":"Shop","citizen_id":"1234567890"}'
```
Log in to the merchant app with `m@test.com / Test1234`.

For the admin app, register a user the same way then promote them in Mongo:
```js
db.users.updateOne({ email: "you@example.com" }, { $set: { role: "admin" } })
```
The admin login enforces `role === "admin"`.

## 7. Key Dependencies

**Admin**
- `react` 19, `react-dom` 19
- `axios` — HTTP client
- `recharts` — analytics charts

**Merchant**
- `react` 19, `react-dom` 19
- `axios`
- `react-icons`

Both use **Vite 8** + `@vitejs/plugin-react` for dev/build.

## 8. Build & Deploy

```bash
npm run build      # outputs to dist/
```

The output is a static bundle — host it on any CDN/static host (Vercel,
Netlify, Cloudflare Pages, S3+CloudFront, nginx). Make sure:

- `VITE_API_URL` is set at **build time** to the public backend URL.
- The backend's `CLIENT_URL` allowlist includes the deployed frontend origin.
- SPA fallback routes all paths to `index.html`.

## 9. Common Issues

- **CORS error in the browser** — the deployed/local origin isn't in the
  backend's `CLIENT_URL`. Add it and restart the backend.
- **`Network Error` / 404 on `/api/...`** — `VITE_API_URL` is wrong, or the
  backend isn't running on the expected port.
- **Stuck redirecting to login** — token expired (7-day lifetime) or backend
  returned 401; the interceptor cleared the token. Log in again.
- **Admin login refused** — the user exists but `role !== "admin"`. Promote
  the user in Mongo.
- **Port already in use** — kill the existing Vite process or run
  `npm run dev -- --port <other>`.

## 10. Adding New Screens

1. Create a component under `src/pages/` or `src/components/`.
2. Add an API wrapper in `src/api/<domain>.js` that uses the shared Axios
   `client` (do not create new Axios instances — you'd lose the JWT
   interceptor).
3. Mount the screen from `App.jsx` / `Admin.jsx`.
4. Keep auth-protected screens behind the existing auth check (AuthContext
   for admin, the lightweight token check in merchant).
