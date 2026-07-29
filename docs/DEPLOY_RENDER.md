# Deploy LICP to Render (single service: API + UI)

> Prefer split hosting? See **[DEPLOY_NEON_RENDER_VERCEL.md](./DEPLOY_NEON_RENDER_VERCEL.md)**  
> (Neon DB + Render API + Vercel web).

This older path runs Express + built Vite UI on **one** Render URL.

## What you need

1. [GitHub](https://github.com) account
2. [Render](https://render.com) account
3. Free Postgres from [Neon](https://neon.tech)

## 1. Push this project to GitHub

In PowerShell (project folder):

```powershell
git init
git add .
git commit -m "Prepare LICP for Render deployment"
```

Create an empty repo on GitHub (no README), then:

```powershell
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## 2. Create a Neon database

1. Go to https://neon.tech → create project **licp**
2. Copy the connection string (`postgresql://...`)
3. Keep it for the Render `DATABASE_URL` setting

## 3. Deploy on Render

1. https://dashboard.render.com → **New** → **Blueprint**  
   **or** **New** → **Web Service** → connect your GitHub repo
2. Settings:
   - **Runtime:** Node
   - **Build command:**  
     `npm ci && npm ci --prefix server --include=dev && npx prisma generate --schema prisma/schema.postgresql.prisma && npm run build && npm run build --prefix server`
   - **Start command:**  
     `node scripts/start-prod.mjs`
   - **Instance type:** Free
3. Environment variables:

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Neon connection string |
| `JWT_ACCESS_SECRET` | long random string (32+ chars) |
| `JWT_REFRESH_SECRET` | long random string (32+ chars) |
| `JWT_PENDING_SECRET` | long random string (32+ chars) |
| `ENABLE_DEV_AUTH_HELPERS` | `true` (demo MFA helpers) |
| `EMAIL_FROM` | `LICP <noreply@licp.local>` |

`CLIENT_ORIGIN` / `RENDER_EXTERNAL_URL` are handled automatically on Render.

4. Deploy → wait for build → open `https://YOUR-SERVICE.onrender.com`

## 4. Login

Password: `demo123`

| Role | Email |
|------|--------|
| Admin | david.park@legalfirm.com |
| Compliance Officer | sarah.johnson@legalfirm.com |
| Legal Practitioner | michael.chen@legalfirm.com |
| Manager | emily.rodriguez@legalfirm.com |

With `ENABLE_DEV_AUTH_HELPERS=true`, use the on-screen MFA helper after password login.

## Notes

- Free Render services **sleep** after idle; first load can take ~30–60s.
- Uploaded files are on ephemeral disk (fine for demos).
- Local development still uses SQLite (`npm run dev` + `npm run dev:api`).
