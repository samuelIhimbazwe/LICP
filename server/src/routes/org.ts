import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireAdmin, type AuthRequest } from '../middleware/auth.js';
import { writeAuditLog } from '../lib/audit.js';
import { sendSmtpEmail, verifyEmailConnection, getEmailStatus, emailResultForClient, invalidateEmailTransporters } from '../lib/email.js';
import { testEmail } from '../lib/email-templates.js';

export const orgRouter = Router();

orgRouter.use(authenticate, requireAdmin);

orgRouter.get('/settings', async (req: AuthRequest, res) => {
  const org = await prisma.organization.findUnique({
    where: { id: req.user!.db.organizationId },
  });
  if (!org) {
    res.status(404).json({ error: 'Organization not found.' });
    return;
  }
  const settings = (org.settings ?? {}) as Record<string, unknown>;
  res.json({
    settings: {
      systemName: settings.systemName ?? 'Legal Intelligence & Compliance Platform',
      systemUrl: settings.systemUrl ?? '',
      supportEmail: settings.supportEmail ?? '',
      timezone: settings.timezone ?? 'Africa/Kigali',
      language: settings.language ?? 'en',
      dateFormat: settings.dateFormat ?? 'MM/DD/YYYY',
      sessionTimeout: String(org.sessionTimeoutMinutes),
      maxLoginAttempts: String(org.maxLoginAttempts),
      requireMFA: org.mfaRequired,
      enableEmailNotifications: settings.enableEmailNotifications ?? true,
      enableAPIAccess: settings.enableAPIAccess ?? true,
      apiRateLimit: settings.apiRateLimit ?? '1000',
      regulatorySubscriptions: settings.regulatorySubscriptions ?? [],
      impactAssessments: settings.impactAssessments ?? [],
      maintenanceMode: settings.maintenanceMode ?? false,
      debugLogging: settings.debugLogging ?? false,
      ...settings,
    },
  });
});

orgRouter.put('/settings', async (req: AuthRequest, res) => {
  const body = z
    .object({
      systemName: z.string().optional(),
      systemUrl: z.string().optional(),
      supportEmail: z.string().optional(),
      timezone: z.string().optional(),
      language: z.string().optional(),
      dateFormat: z.string().optional(),
      sessionTimeout: z.string().optional(),
      maxLoginAttempts: z.string().optional(),
      requireMFA: z.boolean().optional(),
      enableEmailNotifications: z.boolean().optional(),
      enableAPIAccess: z.boolean().optional(),
      apiRateLimit: z.string().optional(),
      regulatorySubscriptions: z.array(z.record(z.unknown())).optional(),
      impactAssessments: z.array(z.record(z.unknown())).optional(),
      maintenanceMode: z.boolean().optional(),
      debugLogging: z.boolean().optional(),
      smtpHost: z.string().optional(),
      smtpPort: z.string().optional(),
      smtpUser: z.string().optional(),
      smtpPass: z.string().optional(),
      smtpEncryption: z.string().optional(),
      emailFromName: z.string().optional(),
      allowedFileTypes: z.string().optional(),
      maxFileSize: z.string().optional(),
    })
    .passthrough()
    .parse(req.body);

  const orgId = req.user!.db.organizationId;
  const existing = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!existing) {
    res.status(404).json({ error: 'Organization not found.' });
    return;
  }

  const prev = (existing.settings ?? {}) as Record<string, unknown>;
  const nextSettings = { ...prev, ...body };
  if (body.smtpPass === '') {
    delete nextSettings.smtpPass;
    if (typeof prev.smtpPass === 'string' && prev.smtpPass) {
      nextSettings.smtpPass = prev.smtpPass;
    }
  }

  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: {
      // MFA cannot be disabled for this organisation.
      mfaRequired: true,
      sessionTimeoutMinutes: body.sessionTimeout
        ? parseInt(body.sessionTimeout, 10)
        : existing.sessionTimeoutMinutes,
      maxLoginAttempts: body.maxLoginAttempts
        ? parseInt(body.maxLoginAttempts, 10)
        : existing.maxLoginAttempts,
      settings: nextSettings as object,
    },
  });

  if (
    body.smtpHost !== undefined ||
    body.smtpPort !== undefined ||
    body.smtpUser !== undefined ||
    body.smtpPass !== undefined ||
    body.smtpEncryption !== undefined ||
    body.emailFromName !== undefined
  ) {
    invalidateEmailTransporters();
  }

  await writeAuditLog({
    organizationId: orgId,
    userId: req.user!.db.id,
    userName: req.user!.db.fullName,
    userRole: req.user!.db.role,
    action: 'org_settings_updated',
    resource: 'organization',
    resourceId: orgId,
    resourceType: 'organization',
    actionDetails: 'Organization settings updated',
    req,
  });

  res.json({ ok: true, settings: updated.settings });
});

orgRouter.get('/email/status', async (req: AuthRequest, res) => {
  const status = await getEmailStatus(req.user!.db.organizationId, { fresh: req.query.fresh === '1' });
  res.json(status);
});

orgRouter.post('/email/test', async (req: AuthRequest, res) => {
  const body = z
    .object({ to: z.string().email().optional() })
    .parse(req.body ?? {});

  const orgId = req.user!.db.organizationId;
  invalidateEmailTransporters();
  const verify = await verifyEmailConnection(orgId);
  if (!verify.ok && verify.mode === 'none') {
    res.status(503).json({
      error: verify.error ?? 'Email is not configured.',
      ...emailResultForClient({ delivered: false, mode: 'console', error: verify.error }),
    });
    return;
  }

  const to = body.to ?? req.user!.db.email;
  const { subject, html } = testEmail(to);
  const result = await sendSmtpEmail(to, subject, html, { organizationId: orgId });

  await writeAuditLog({
    organizationId: orgId,
    userId: req.user!.db.id,
    userName: req.user!.db.fullName,
    userRole: req.user!.db.role,
    action: 'email_test_sent',
    resource: 'organization',
    resourceId: orgId,
    resourceType: 'email',
    actionDetails: `Test email to ${to} (${result.mode}, delivered=${result.delivered})`,
    req,
  });

  if (!result.delivered) {
    res.status(502).json({
      error: result.error ?? 'Test email could not be delivered.',
      ...emailResultForClient(result),
    });
    return;
  }

  res.json({
    success: true,
    message: `Test email sent to ${to}`,
    ...emailResultForClient(result),
  });
});
