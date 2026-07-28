import { Router } from 'express';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { hashPassword, hashToken, generateToken } from '../lib/crypto.js';
import { signPendingToken, verifyPendingToken } from '../lib/jwt.js';
import {
  generateMfaSecret,
  getOtpAuthUrl,
  verifyTotp,
  generateBackupCodes,
} from '../lib/mfa.js';
import { writeAuditLog } from '../lib/audit.js';
import { sendSmtpEmail, emailResultForClient } from '../lib/email.js';
import { invitationEmail } from '../lib/email-templates.js';
import { authenticate, requireAdmin, type AuthRequest } from '../middleware/auth.js';
import { passwordMeetsPolicy } from '../lib/users.js';
import { getDefaultPermissions } from '../lib/permissions.js';
import { createAndSendVerificationEmail } from './auth.js';
import { config } from '../config.js';

export const invitationsRouter = Router();

invitationsRouter.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const body = z
    .object({
      fullName: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
      role: z.nativeEnum(UserRole),
      department: z.string().optional(),
      requireMfa: z.boolean().default(true).optional(),
      expirationDays: z.number().int().min(1).max(30).default(7),
    })
    .parse(req.body);

  // MFA is always required for new users in this organisation.
  const requireMfa = true;
  const admin = req.user!.db;
  const email = body.email.toLowerCase();

  const existing = await prisma.user.findFirst({
    where: { email, organizationId: admin.organizationId },
  });
  if (existing) {
    res.status(409).json({ error: 'A user with this email already exists.' });
    return;
  }

  const token = generateToken();
  const invitation = await prisma.invitation.create({
    data: {
      tokenHash: hashToken(token),
      email,
      fullName: body.fullName,
      phone: body.phone,
      role: body.role,
      organizationId: admin.organizationId,
      department: body.department,
      requireMfa,
      expiresAt: new Date(Date.now() + body.expirationDays * 24 * 60 * 60 * 1000),
      invitedById: admin.id,
    },
  });

  const link = `${config.clientOrigin}/accept-invitation/${token}`;
  const { subject, html } = invitationEmail(body.fullName, link, admin.fullName);
  const emailResult = await sendSmtpEmail(body.email, subject, html, {
    organizationId: admin.organizationId,
  });

  if (!emailResult.delivered) {
    await prisma.invitation.delete({ where: { id: invitation.id } });
    res.status(503).json({
      error:
        emailResult.error ??
        'Could not send invitation email. Configure Gmail SMTP (npm run setup:email) or System Settings → Email.',
      code: 'EMAIL_DELIVERY_FAILED',
      ...emailResultForClient(emailResult),
    });
    return;
  }

  await writeAuditLog({
    organizationId: admin.organizationId,
    userId: admin.id,
    userName: admin.fullName,
    userRole: admin.role,
    action: 'invitation_created',
    resource: 'invitation',
    resourceId: invitation.id,
    resourceType: 'user',
    actionDetails: `Invited ${email} as ${body.role}`,
    req,
  });

  res.status(201).json({
    token,
    link,
    ...emailResultForClient(emailResult),
    invitation: {
      email,
      fullName: body.fullName,
      role: body.role,
      expiresAt: invitation.expiresAt,
    },
  });
});

invitationsRouter.get('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const list = await prisma.invitation.findMany({
    where: { organizationId: req.user!.db.organizationId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ invitations: list });
});

invitationsRouter.get('/:token', async (req, res) => {
  const invitation = await prisma.invitation.findFirst({
    where: { tokenHash: hashToken(req.params.token) },
  });

  if (!invitation) {
    res.status(404).json({ error: 'Invitation not found.' });
    return;
  }

  if (invitation.expiresAt < new Date()) {
    res.json({
      status: 'expired',
      fullName: invitation.fullName,
      email: invitation.email,
      role: invitation.role,
    });
    return;
  }

  if (invitation.status === 'accepted') {
    res.json({ status: 'accepted', email: invitation.email });
    return;
  }

  res.json({
    status: 'pending',
    fullName: invitation.fullName,
    email: invitation.email,
    phone: invitation.phone,
    role: invitation.role,
    department: invitation.department,
    requireMFA: true,
    expiresAt: invitation.expiresAt,
  });
});

invitationsRouter.post('/:token/accept', async (req, res) => {
  const body = z.object({ password: z.string() }).parse(req.body);
  const policy = passwordMeetsPolicy(body.password);
  if (!policy.ok) {
    res.status(400).json({ error: policy.message });
    return;
  }

  const invitation = await prisma.invitation.findFirst({
    where: { tokenHash: hashToken(req.params.token), status: 'pending' },
  });

  if (!invitation || invitation.expiresAt < new Date()) {
    res.status(400).json({ error: 'Invalid or expired invitation.' });
    return;
  }

  const requireMfa = true;
  const mfaSecret = generateMfaSecret();

  const user = await prisma.user.create({
    data: {
      organizationId: invitation.organizationId,
      email: invitation.email,
      fullName: invitation.fullName,
      phone: invitation.phone ?? '',
      role: invitation.role,
      department: invitation.department,
      passwordHash: await hashPassword(body.password),
      mfaEnabled: true,
      mfaSecret,
      status: 'pending',
      permissions: getDefaultPermissions(invitation.role) as object,
    },
  });

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { status: 'accepted', acceptedAt: new Date() },
  });

  await createAndSendVerificationEmail(
    user.id,
    user.email,
    user.fullName,
    invitation.organizationId
  );

  const pendingToken = signPendingToken({
    sub: user.id,
    type: 'mfa_setup',
    invitationId: invitation.id,
  });

  res.json({
    success: true,
    requiresMFA: true,
    requiresEmailVerification: true,
    pendingToken,
    mfa: {
      secret: mfaSecret,
      otpauthUrl: getOtpAuthUrl(user.email, mfaSecret),
    },
  });
});

invitationsRouter.post('/:token/setup-mfa', async (req, res) => {
  const body = z
    .object({ pendingToken: z.string(), code: z.string().length(6) })
    .parse(req.body);

  let payload;
  try {
    payload = verifyPendingToken(body.pendingToken);
  } catch {
    res.status(401).json({ error: 'Setup session expired.' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.mfaSecret) {
    res.status(400).json({ error: 'Invalid MFA setup.' });
    return;
  }

  if (!verifyTotp(body.code, user.mfaSecret)) {
    res.status(400).json({ error: 'Invalid verification code.' });
    return;
  }

  const { plain, hashed } = generateBackupCodes();
  await prisma.mfaBackupCode.createMany({
    data: hashed.map((codeHash) => ({ userId: user.id, codeHash })),
  });

  res.json({ success: true, backupCodes: plain });
});
