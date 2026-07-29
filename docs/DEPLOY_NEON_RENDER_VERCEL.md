# Deploy LICP: Neon (DB) + Render (API) + Vercel (Web)

Split hosting for the full stack:

| Piece | Host | URL example |
|-------|------|-------------|
| PostgreSQL | [Neon](https://neon.tech) | connection string |
| API | [Render](https://render.com) | `https://licp-api.onrender.com` |
| Web UI | [Vercel](https://vercel.com) | `https://licp.vercel.app` |

Local still uses SQLite + `npm run dev` / `npm run dev:api`.

---

## 0. Push latest code to GitHub

```powershell
cd "c:\Users\ihimb\OneDrive\Documents\Legal Intelligence Platform Prototype"
git add -A
git status
git commit -m "Prepare Neon + Render API + Vercel web split deploy"
git push origin main
```

Repo (yours): `git@github.com:samuelIhimbazwe/LICP.git`

---

## 1. Neon database (you already created this)

1. Neon dashboard → your project → **Connection string**
2. Use the **pooled** or direct URI (Prisma works with both; for serverless prefer pooled + `?sslmode=require`)
3. Example shape:

```text
postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
```

Keep this for Render `DATABASE_URL`. Do **not** commit it.

Schema + seed run automatically on first Render start (`scripts/start-prod.mjs`).

---

## 2. Render — API only

1. https://dashboard.render.com → **New** → **Blueprint** (uses `render.yaml`)  
   **or** **New** → **Web Service** → connect `samuelIhimbazwe/LICP`
2. If manual Web Service:

| Setting | Value |
|---------|--------|
| Name | `licp-api` |
| Runtime | Node |
| Build | `npm ci && npm ci --prefix server --include=dev && npx prisma generate --schema prisma/schema.postgresql.prisma && npm run build --prefix server` |
| Start | `node scripts/start-prod.mjs` |
| Health check | `/api/v1/health` |
| Plan | Free |

3. **Environment variables**

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Neon connection string |
| `SERVE_FRONTEND` | `false` |
| `COOKIE_SAME_SITE` | `none` |
| `VERCEL_CORS` | `true` |
| `CLIENT_ORIGIN` | Your Vercel URL, e.g. `https://licp.vercel.app` (update after Vercel deploy if needed) |
| `JWT_ACCESS_SECRET` | Generate (32+ chars) |
| `JWT_REFRESH_SECRET` | Generate |
| `JWT_PENDING_SECRET` | Generate |
| `ENABLE_DEV_AUTH_HELPERS` | `true` (demo MFA) |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_ENCRYPTION` | `tls` |
| `SMTP_USER` | your Gmail address |
| `SMTP_PASS` | Gmail App Password (not your normal password) |
| `EMAIL_FROM` | `LICP <your-gmail@gmail.com>` |
| `USE_ETHEREAL_EMAIL` | `false` |
| `GROQ_API_KEY` | optional (AI LLM) |

4. Deploy → wait until healthy → open:

`https://YOUR-API.onrender.com/api/v1/health`

You should see `{ "status": "ok", ... }`.

**Note:** Free Render sleeps when idle; first request after sleep can take 30–60s.

---

## 3. Vercel — Web UI

1. https://vercel.com → **Add New** → **Project** → import `LICP` from GitHub
2. Framework: **Vite** (or Other). `vercel.json` is already in the repo.
3. **Root directory:** leave `.` (repo root)
4. **Environment variables** (Production + Preview):

| Key | Value |
|-----|--------|
| `VITE_API_URL` | `https://YOUR-API.onrender.com/api/v1` |
| `VITE_ENABLE_DEMO_LOGIN` | `true` |

5. Deploy → copy the production URL, e.g. `https://licp-xxxxx.vercel.app`

---

## 4. Connect them (important)

1. On **Render**, set / update:

| Key | Value |
|-----|--------|
| `CLIENT_ORIGIN` | Exact Vercel URL (no trailing slash), e.g. `https://licp-xxxxx.vercel.app` |

2. Optional: allow all Vercel previews with `VERCEL_CORS=true` (already in `render.yaml`).

3. **Redeploy Render** after changing `CLIENT_ORIGIN` (or restart the service).

4. Soft-refresh the Vercel site and log in.

Auth uses **httpOnly cookies** with `SameSite=None; Secure` so the browser on Vercel can talk to Render.

---

## 5. Login (demo)

Password: `demo123`

| Role | Email |
|------|--------|
| Admin | david.park@legalfirm.com |
| Compliance Officer | sarah.johnson@legalfirm.com |
| Legal Practitioner | michael.chen@legalfirm.com |
| Manager | emily.rodriguez@legalfirm.com |

With `ENABLE_DEV_AUTH_HELPERS=true`, use the MFA helper on the login screen.

---

## Checklist if something fails

| Symptom | Fix |
|---------|-----|
| CORS / blocked by browser | `CLIENT_ORIGIN` must match the Vercel URL exactly; set `COOKIE_SAME_SITE=none` |
| Login works then immediate logout | Cookies not cross-site — confirm `SameSite=none` + HTTPS on both hosts |
| API 503 / long wait | Render free tier waking up — retry after ~1 minute |
| DB errors on boot | Neon `DATABASE_URL` + `sslmode=require`; check Neon project is active |
| AI is search-only | Set `GROQ_API_KEY` on Render |
| Wrong API on Vercel | `VITE_API_URL` must include `/api/v1` and be set **before** build (redeploy Vercel after changing it) |

---

## Architecture

```text
Browser  →  Vercel (Vite SPA)
              │  fetch(VITE_API_URL) + cookies
              ▼
         Render (Express API)
              │  Prisma
              ▼
            Neon (PostgreSQL)
```
