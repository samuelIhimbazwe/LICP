import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { invitationsRouter } from './routes/invitations.js';
import { auditRouter } from './routes/audit.js';
import { usersRouter } from './routes/users.js';
import { dashboardRouter } from './routes/dashboard.js';
import { notificationsRouter } from './routes/notifications.js';
import { complianceRouter } from './routes/compliance.js';
import { regulatoryRouter } from './routes/regulatory.js';
import { knowledgeRouter } from './routes/knowledge.js';
import { contractsRouter } from './routes/contracts.js';
import { analyticsRouter } from './routes/analytics.js';
import { reportsRouter } from './routes/reports.js';
import { aiRouter } from './routes/ai.js';
import { integrationsRouter } from './routes/integrations.js';
import { filesRouter } from './routes/files.js';
import { shareRouter } from './routes/share.js';
import { searchRouter } from './routes/search.js';
import { orgRouter } from './routes/org.js';

import { prisma } from './lib/prisma.js';
import { getEmailStatus } from './lib/email.js';

if (
  !('notification' in prisma) ||
  !('complianceEvidence' in prisma) ||
  !('legalDocument' in prisma) ||
  !('contract' in prisma) ||
  !('customReport' in prisma) ||
  !('integration' in prisma) ||
  !('aiQueryLog' in prisma) ||
  !('regulatoryUpdateHistory' in prisma) ||
  !('notificationPreference' in prisma) ||
  !('contractTemplate' in prisma) ||
  !('documentAnnotation' in prisma)
) {
  console.error(
    '\n[licp] Prisma client is missing required models.\n' +
      'Stop the API, run: npm run db:generate --prefix server\n' +
      'Then restart: npm run dev:api\n'
  );
  process.exit(1);
}

const app = express();

app.set('trust proxy', 1);
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.set('trust proxy', 1);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      const normalized = origin.replace(/\/$/, '');
      const listed =
        config.clientOrigins.includes(normalized) || config.clientOrigins.includes('*');
      const vercelPreview =
        process.env.VERCEL_CORS === 'true' && /\.vercel\.app$/i.test(normalized);
      callback(null, listed || vercelPreview);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.get('/api/v1/health', async (_req, res) => {
  const email = await getEmailStatus();
  res.json({
    status: 'ok',
    env: config.nodeEnv,
    email: {
      configured: email.configured,
      mode: email.mode,
      from: email.from,
    },
  });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/invitations', invitationsRouter);
app.use('/api/v1/audit', auditRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/compliance', complianceRouter);
app.use('/api/v1/regulatory', regulatoryRouter);
app.use('/api/v1/knowledge', knowledgeRouter);
app.use('/api/v1/contracts', contractsRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/ai', aiRouter);
app.use('/api/v1/integrations', integrationsRouter);
app.use('/api/v1/search', searchRouter);
app.use('/api/v1/org', orgRouter);
app.use('/api/v1/files', filesRouter);
app.use('/api/v1/public/share', shareRouter);

if (config.nodeEnv === 'production' && config.serveFrontend) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const distPath = path.resolve(__dirname, '../../dist');
  app.use(express.static(distPath));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use(
  (
    err: Error & { issues?: unknown },
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    if (err.name === 'ZodError') {
      res.status(400).json({ error: 'Validation failed.', details: err.issues });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
);

app.listen(config.port, async () => {
  console.log(`LICP API listening on http://localhost:${config.port}`);
  const email = await getEmailStatus();
  if (email.configured) {
    console.log(`[licp:email] Ready (${email.mode}, from ${email.from})`);
  } else {
    console.warn(`[licp:email] Not configured — ${email.error ?? 'set SMTP in .env or System Settings'}`);
    if (config.nodeEnv === 'development') {
      console.log('[licp:email] Dev mode: Ethereal test SMTP will be used automatically for outbound mail.');
    }
  }
});
