# Gate A Setup — Auth, RBAC & Audit Backend

Gate A adds a real **Node.js API**, a **SQLite database** for local development, and wires the React frontend to replace mock authentication.

**Production deployment** uses **PostgreSQL** (see [Deployment database](#deployment-database-postgresql) below).

## Prerequisites

- Node.js 20+
- npm or pnpm
- Docker Desktop — **optional**, only if you want to test against PostgreSQL locally

## Quick start

### 1. Environment

Copy the example env file to the project root:

```bash
cp .env.example .env
```

Local dev uses SQLite — no database server to install:

```
DATABASE_URL="file:./dev.db"
```

The database file is created at `prisma/dev.db` when you run migrations.

### 2. Install API dependencies

```bash
cd server && npm install && npm run db:generate
```

### 3. Create schema and seed demo data

From the project root:

```bash
npm run setup:gate-a
```

Or step by step:

```bash
npm run db:migrate
npm run db:seed
```

### 4. Run API + frontend (two terminals)

**Terminal 1 — API (port 3001):**

```bash
npm run dev:api
```

**Terminal 2 — Frontend (port 5173):**

```bash
npm run dev
```

The Vite dev server proxies `/api` → `http://localhost:3001`.

## Demo accounts (after seed)

| Role | Email | Password |
|------|-------|----------|
| Compliance Officer | sarah.johnson@legalfirm.com | demo123 |
| Legal Practitioner | michael.chen@legalfirm.com | demo123 |
| Manager | emily.rodriguez@legalfirm.com | demo123 |
| Admin | david.park@legalfirm.com | demo123 |

**MFA (Google Authenticator / TOTP):** secret `JBSWY3DPEHPK3PXP`

> **Dev shortcut:** `SKIP_LOGIN_MFA=true` in `.env` skips the MFA step at login for easier dashboard testing. Set to `false` before running Gate A UAT.

## Gate A API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/login` | Login → MFA challenge |
| POST | `/api/v1/auth/mfa/verify` | Verify TOTP / backup code |
| POST | `/api/v1/auth/logout` | Logout |
| GET | `/api/v1/auth/me` | Current user |
| POST | `/api/v1/auth/refresh` | Refresh session |
| POST | `/api/v1/auth/forgot-password` | Send reset email (logged in dev) |
| POST | `/api/v1/auth/reset-password` | Reset password |
| GET | `/api/v1/auth/verify-email/:token` | Email verification |
| POST | `/api/v1/invitations` | Admin invite user |
| GET | `/api/v1/invitations/:token` | Validate invitation |
| POST | `/api/v1/invitations/:token/accept` | Accept + set password |
| GET | `/api/v1/audit/logs` | Audit log (admin) |
| GET | `/api/v1/audit/login-activity` | Login activity (admin) |
| GET | `/api/v1/audit/logs/export` | Export audit CSV |

## What's implemented

- Invite-only registration (no public signup)
- Password policy + bcrypt hashing
- Mandatory MFA (TOTP + backup codes)
- Email verification flow
- Login lockout after failed attempts
- Session timeout (idle)
- Role-based route guard (admin-only pages)
- Audit log + login activity
- Admin session list + revoke

## Deployment database (PostgreSQL)

Local dev uses `prisma/schema.prisma` (SQLite). For production/staging:

1. Set `DATABASE_URL` to your Postgres connection string.
2. Apply schema with the Postgres variant:

```bash
npm run db:postgres:push
```

This uses `prisma/schema.postgresql.prisma` — same models, PostgreSQL provider.

Optional: run Postgres locally via Docker for parity testing:

```bash
npm run db:postgres:up
# set DATABASE_URL=postgresql://licp:licp_dev_password@localhost:5432/licp?schema=public
npm run db:postgres:push
npm run db:seed
```

## Next steps

Run **UAT Gate A** (`docs/UAT_GATE_A_AUTH_SECURITY.md`) against this stack, then proceed to Gate B implementation.
