import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: true });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

const DEV_SECRET_MARKERS = ['dev-access-secret', 'dev-refresh-secret', 'dev-pending-secret', 'change-me-'];

function parseOrigins(): string[] {
  const raw =
    process.env.CLIENT_ORIGINS ??
    process.env.CLIENT_ORIGIN ??
    process.env.RENDER_EXTERNAL_URL ??
    'http://localhost:5173';
  return raw
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

const clientOrigins = parseOrigins();
const isProd = (process.env.NODE_ENV ?? 'development') === 'production';
/** Cross-site cookies (Vercel frontend → Render API) need SameSite=None; Secure */
const cookieSameSite =
  (process.env.COOKIE_SAME_SITE as 'lax' | 'none' | 'strict' | undefined) ??
  (isProd && process.env.CLIENT_ORIGIN && !process.env.CLIENT_ORIGIN.includes('onrender.com')
    ? 'none'
    : 'lax');

export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  /** Primary SPA origin (first in list) */
  clientOrigin: clientOrigins[0] ?? 'http://localhost:5173',
  /** All allowed browser origins for CORS */
  clientOrigins,
  /** When false, API does not serve the Vite dist (use Vercel for the web app) */
  serveFrontend: process.env.SERVE_FRONTEND !== 'false',
  cookie: {
    secure: isProd || cookieSameSite === 'none',
    sameSite: cookieSameSite,
    path: '/',
    httpOnly: true,
  },
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret-min-32-characters-long'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret-min-32-characters-long'),
    pendingSecret: required('JWT_PENDING_SECRET', 'dev-pending-secret-min-32-characters-long'),
    accessMinutes: parseInt(process.env.ACCESS_TOKEN_MINUTES ?? '15', 10),
    refreshDays: parseInt(process.env.REFRESH_TOKEN_DAYS ?? '7', 10),
    pendingMinutes: parseInt(process.env.PENDING_TOKEN_MINUTES ?? '10', 10),
  },
  email: {
    from: process.env.EMAIL_FROM ?? 'LICP <noreply@licp.local>',
    smtpConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER),
  },
  auth: {
    /** Dev/testing only — set SKIP_LOGIN_MFA=true to sign in without MFA step. Re-enable for Gate A UAT. */
    skipLoginMfa: process.env.SKIP_LOGIN_MFA === 'true',
    /** Explicit opt-in for demo MFA helpers (allowed on hosted demos when set). */
    devHelpersEnabled: process.env.ENABLE_DEV_AUTH_HELPERS === 'true',
  },
};

if (config.nodeEnv === 'production') {
  for (const [key, value] of Object.entries({
    JWT_ACCESS_SECRET: config.jwt.accessSecret,
    JWT_REFRESH_SECRET: config.jwt.refreshSecret,
    JWT_PENDING_SECRET: config.jwt.pendingSecret,
  })) {
    if (DEV_SECRET_MARKERS.some((m) => value.includes(m))) {
      throw new Error(`[licp] ${key} must be set to a strong unique value in production.`);
    }
  }
  if (config.auth.skipLoginMfa) {
    throw new Error('[licp] SKIP_LOGIN_MFA must not be enabled in production.');
  }
}
