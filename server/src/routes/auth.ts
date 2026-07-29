import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import {
  hashPassword,
  hashToken,
  verifyPassword,
  generateToken,
  parseUserAgent,
} from '../lib/crypto.js';
import {
  signAccessToken,
  signPendingToken,
  verifyPendingToken,
} from '../lib/jwt.js';
import {
  generateMfaSecret,
  getOtpAuthUrl,
  verifyTotp,
  generateBackupCodes,
  verifyBackupCode,
  generateTotp,
} from '../lib/mfa.js';
import { writeAuditLog, writeLoginActivity, sendEmail } from '../lib/audit.js';
import {
  verificationEmail,
  passwordResetEmail,
} from '../lib/email-templates.js';
import { emailResultForClient } from '../lib/email.js';
import { config } from '../config.js';
import { authenticate, authenticateAllowUnverified, requireAdmin, type AuthRequest } from '../middleware/auth.js';
import { serializeUser, passwordMeetsPolicy } from '../lib/users.js';
import { getDefaultPermissions } from '../lib/permissions.js';
import { checkRateLimit } from '../lib/rate-limit.js';

export const authRouter = Router();

function cookieBase() {
  return {
    httpOnly: config.cookie.httpOnly,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: config.cookie.path,
  };
}

function setAuthCookies(res: import('express').Response, accessToken: string, refreshToken: string) {
  const opts = cookieBase();
  res.cookie('accessToken', accessToken, { ...opts, maxAge: config.jwt.accessMinutes * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, {
    ...opts,
    maxAge: config.jwt.refreshDays * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookies(res: import('express').Response) {
  const opts = cookieBase();
  res.clearCookie('accessToken', opts);
  res.clearCookie('refreshToken', opts);
}

async function createSession(userId: string, req: AuthRequest) {
  const rawRefresh = generateToken(32);
  await prisma.session.create({
    data: {
      userId,
      refreshTokenHash: hashToken(rawRefresh),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      expiresAt: new Date(Date.now() + config.jwt.refreshDays * 24 * 60 * 60 * 1000),
    },
  });
  return rawRefresh;
}

async function issueFullAuth(userId: string, req: AuthRequest, res: import('express').Response) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { organization: true },
  });
  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    organizationId: user.organizationId,
  });
  const refreshToken = await createSession(user.id, req);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
  });
  setAuthCookies(res, accessToken, refreshToken);
  return serializeUser(user, user.organization);
}

authRouter.post('/login', async (req, res) => {
  const ip = req.ip ?? 'unknown';
  if (!checkRateLimit(`login:${ip}`, 30, 15 * 60 * 1000)) {
    res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
    return;
  }
  const body = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
  const email = body.email.toLowerCase();

  const user = await prisma.user.findFirst({ where: { email }, include: { organization: true } });

  if (!user || !user.passwordHash) {
    await writeLoginActivity({ email, status: 'failed', failureReason: 'invalid_credentials', req });
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  if (user.status === 'suspended') {
    await writeLoginActivity({
      userId: user.id,
      email,
      status: 'blocked',
      failureReason: 'account_suspended',
      req,
    });
    res.status(403).json({ error: 'Account suspended. Contact your administrator.' });
    return;
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await writeLoginActivity({
      userId: user.id,
      email,
      status: 'blocked',
      failureReason: 'account_locked',
      req,
    });
    res.status(423).json({
      error: 'Account temporarily locked.',
      lockedUntil: user.lockedUntil.toISOString(),
    });
    return;
  }

  const valid = await verifyPassword(body.password, user.passwordHash);
  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    const max = user.organization.maxLoginAttempts;
    const lockoutMinutes = user.organization.lockoutMinutes;
    const lockedUntil =
      attempts >= max ? new Date(Date.now() + lockoutMinutes * 60 * 1000) : null;

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: attempts, lockedUntil },
    });
    await writeLoginActivity({
      userId: user.id,
      email,
      status: 'failed',
      failureReason: 'invalid_credentials',
      req,
    });
    await writeAuditLog({
      organizationId: user.organizationId,
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: 'login_failed',
      resource: 'auth',
      resourceType: 'system',
      actionDetails: `Failed login attempt ${attempts}/${max}`,
      req,
      severity: attempts >= max ? 'warning' : 'info',
      status: 'failure',
    });

    res.status(401).json({
      error: 'Invalid email or password.',
      attemptsRemaining: Math.max(0, max - attempts),
      locked: Boolean(lockedUntil),
    });
    return;
  }

  // MFA is mandatory for the organisation (and for any user who already enrolled).
  const orgRequiresMfa = user.organization.mfaRequired !== false;
  const mfaRequiredForUser = orgRequiresMfa || user.mfaEnabled;

  if (mfaRequiredForUser && !config.auth.skipLoginMfa) {
    if (!user.mfaSecret || !user.mfaEnabled) {
      res.status(403).json({
        error: 'Multi-factor authentication is required. Complete MFA setup before signing in.',
        requiresMfaSetup: true,
      });
      return;
    }
    const pendingToken = signPendingToken({ sub: user.id, type: 'pending' });
    await writeLoginActivity({
      userId: user.id,
      email,
      status: 'mfa_required',
      req,
    });
    res.json({ requiresMfa: true, pendingToken, emailVerified: Boolean(user.emailVerifiedAt) });
    return;
  }

  // Only reachable when SKIP_LOGIN_MFA=true (automated UAT).
  const safeUser = await issueFullAuth(user.id, req as AuthRequest, res);
  await writeLoginActivity({ userId: user.id, email, status: 'success', mfaVerified: false, req });
  res.json({
    requiresMfa: false,
    requiresEmailVerification: !user.emailVerifiedAt,
    user: safeUser,
  });
});

authRouter.post('/mfa/verify', async (req, res) => {
  const body = z
    .object({ pendingToken: z.string(), code: z.string().min(6).max(8) })
    .parse(req.body);

  let payload;
  try {
    payload = verifyPendingToken(body.pendingToken);
  } catch {
    res.status(401).json({ error: 'MFA session expired. Please log in again.' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.mfaSecret) {
    res.status(401).json({ error: 'Invalid MFA session.' });
    return;
  }

  const backupCodes = await prisma.mfaBackupCode.findMany({
    where: { userId: user.id, usedAt: null },
  });
  const backupIndex = verifyBackupCode(
    body.code,
    backupCodes.map((c) => c.codeHash)
  );

  const totpValid = verifyTotp(body.code, user.mfaSecret);
  if (!totpValid && backupIndex === -1) {
    await writeLoginActivity({
      userId: user.id,
      email: user.email,
      status: 'failed',
      failureReason: 'invalid_mfa',
      req: req as AuthRequest,
    });
    res.status(401).json({ error: 'Invalid verification code.' });
    return;
  }

  if (backupIndex >= 0) {
    await prisma.mfaBackupCode.update({
      where: { id: backupCodes[backupIndex].id },
      data: { usedAt: new Date() },
    });
  }

  const safeUser = await issueFullAuth(user.id, req as AuthRequest, res);
  await writeLoginActivity({
    userId: user.id,
    email: user.email,
    status: 'success',
    mfaVerified: true,
    req: req as AuthRequest,
  });
  await writeAuditLog({
    organizationId: user.organizationId,
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    action: 'login',
    resource: 'auth',
    resourceType: 'system',
    actionDetails: 'Successful login with MFA',
    req: req as AuthRequest,
  });

  res.json({ user: safeUser, requiresEmailVerification: !user.emailVerifiedAt });
});

authRouter.post('/register', (_req, res) => {
  res.status(403).json({ error: 'Public registration is disabled. Contact your administrator.' });
});

authRouter.post('/logout', authenticateAllowUnverified, async (req: AuthRequest, res) => {
  const user = req.user!.db;
  await prisma.session.updateMany({
    where: { userId: user.id, isActive: true },
    data: { isActive: false },
  });
  clearAuthCookies(res);
  await writeAuditLog({
    organizationId: user.organizationId,
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    action: 'logout',
    resource: 'auth',
    resourceType: 'system',
    actionDetails: 'User logged out',
    req,
  });
  res.json({ success: true });
});

authRouter.get('/me', authenticateAllowUnverified, (req: AuthRequest, res) => {
  res.json({ user: req.user!.safe });
});

authRouter.post('/refresh', async (req, res) => {
  const token = req.cookies?.refreshToken as string | undefined;
  if (!token) {
    res.status(401).json({ error: 'No refresh token.' });
    return;
  }
  const session = await prisma.session.findFirst({
    where: { refreshTokenHash: hashToken(token), isActive: true },
    include: { user: { include: { organization: true } } },
  });
  if (!session || session.expiresAt < new Date()) {
    res.status(401).json({ error: 'Session expired.' });
    return;
  }
  const idleMs = Date.now() - session.lastActivityAt.getTime();
  const timeoutMs = session.user.organization.sessionTimeoutMinutes * 60 * 1000;
  if (idleMs > timeoutMs) {
    await prisma.session.update({ where: { id: session.id }, data: { isActive: false } });
    res.status(401).json({ error: 'Session expired due to inactivity.' });
    return;
  }
  const accessToken = signAccessToken({
    sub: session.user.id,
    role: session.user.role,
    organizationId: session.user.organizationId,
  });
  setAuthCookies(res, accessToken, token);
  await prisma.session.update({
    where: { id: session.id },
    data: { lastActivityAt: new Date() },
  });
  res.json({ user: serializeUser(session.user, session.user.organization) });
});

authRouter.post('/forgot-password', async (req, res) => {
  const { email } = z.object({ email: z.string().email() }).parse(req.body);
  const user = await prisma.user.findFirst({ where: { email: email.toLowerCase() } });
  if (user) {
    const token = generateToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const link = `${config.clientOrigin}/forgot-password?token=${token}`;
    const { subject, html } = passwordResetEmail(link);
    await sendEmail(user.email, subject, html, { organizationId: user.organizationId });
  }
  res.json({ success: true, message: 'If the email exists, a reset link was sent.' });
});

authRouter.post('/reset-password', async (req, res) => {
  const body = z.object({ token: z.string(), password: z.string() }).parse(req.body);
  const policy = passwordMeetsPolicy(body.password);
  if (!policy.ok) {
    res.status(400).json({ error: policy.message });
    return;
  }
  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash: hashToken(body.token), usedAt: null, expiresAt: { gt: new Date() } },
    include: { user: true },
  });
  if (!record) {
    res.status(400).json({ error: 'Invalid or expired reset token.' });
    return;
  }
  await prisma.user.update({
    where: { id: record.userId },
    data: { passwordHash: await hashPassword(body.password) },
  });
  await prisma.passwordResetToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });
  await writeAuditLog({
    organizationId: record.user.organizationId,
    userId: record.user.id,
    userName: record.user.fullName,
    userRole: record.user.role,
    action: 'password_reset',
    resource: 'auth',
    resourceType: 'user',
    resourceId: record.user.id,
    actionDetails: 'Password reset via email token',
    req: req as AuthRequest,
  });
  res.json({ success: true });
});

authRouter.post('/change-password', authenticate, async (req: AuthRequest, res) => {
  const body = z
    .object({ oldPassword: z.string(), newPassword: z.string() })
    .parse(req.body);
  const user = req.user!.db;
  if (!user.passwordHash || !(await verifyPassword(body.oldPassword, user.passwordHash))) {
    res.status(400).json({ error: 'Current password is incorrect.' });
    return;
  }
  const policy = passwordMeetsPolicy(body.newPassword);
  if (!policy.ok) {
    res.status(400).json({ error: policy.message });
    return;
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(body.newPassword) },
  });
  await writeAuditLog({
    organizationId: user.organizationId,
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    action: 'password_changed',
    resource: 'auth',
    resourceId: user.id,
    resourceType: 'user',
    actionDetails: 'Password changed by user',
    req,
  });
  res.json({ success: true });
});

authRouter.get('/verify-email/:token', async (req, res) => {
  const record = await prisma.emailVerificationToken.findFirst({
    where: {
      tokenHash: hashToken(req.params.token),
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });
  if (!record) {
    res.status(400).json({ error: 'Invalid or expired verification link.' });
    return;
  }
  await prisma.user.update({
    where: { id: record.userId },
    data: { emailVerifiedAt: new Date(), status: 'active' },
  });
  await prisma.emailVerificationToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });
  await writeAuditLog({
    organizationId: record.user.organizationId,
    userId: record.user.id,
    userName: record.user.fullName,
    userRole: record.user.role,
    action: 'email_verified',
    resource: 'auth',
    resourceType: 'user',
    resourceId: record.user.id,
    actionDetails: 'Email address verified',
    req: req as AuthRequest,
  });
  res.json({ success: true, message: 'Email verified successfully.' });
});

authRouter.post('/resend-verification', authenticateAllowUnverified, async (req: AuthRequest, res) => {
  const user = req.user!.db;
  if (user.emailVerifiedAt) {
    res.json({ success: true, message: 'Email already verified.' });
    return;
  }
  const emailResult = await createAndSendVerificationEmail(
    user.id,
    user.email,
    user.fullName,
    user.organizationId
  );
  res.json({ success: true, ...emailResultForClient(emailResult) });
});

export async function createAndSendVerificationEmail(
  userId: string,
  email: string,
  fullName: string,
  organizationId?: string
) {
  const token = generateToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  const link = `${config.clientOrigin}/verify-email/${token}`;
  const { subject, html } = verificationEmail(fullName, link);
  const result = await sendEmail(email, subject, html, { organizationId });
  return { token, ...result };
}

authRouter.patch('/profile', authenticate, async (req: AuthRequest, res) => {
  const body = z
    .object({
      fullName: z.string().min(1).optional(),
      phone: z.string().optional(),
    })
    .parse(req.body);
  const current = req.user!.db;
  const updated = await prisma.user.update({
    where: { id: current.id },
    data: body,
    include: { organization: true },
  });
  await writeAuditLog({
    organizationId: current.organizationId,
    userId: current.id,
    userName: updated.fullName,
    userRole: updated.role,
    action: 'profile_updated',
    resource: 'user',
    resourceId: updated.id,
    resourceType: 'user',
    actionDetails: 'Profile information updated',
    changes: body,
    req,
  });
  res.json({ user: serializeUser(updated, updated.organization) });
});

authRouter.get('/dev/verification-token', async (req, res) => {
  if (!config.auth.devHelpersEnabled) {
    res.status(404).json({ error: 'Not found.' });
    return;
  }
  const email = String(req.query.email ?? '').toLowerCase();
  if (!email) {
    res.status(400).json({ error: 'email query parameter required.' });
    return;
  }
  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  const token = await createAndSendVerificationEmail(user.id, user.email, user.fullName, user.organizationId);
  res.json({
    token: token.token,
    link: `${config.clientOrigin}/verify-email/${token.token}`,
    ...emailResultForClient(token),
  });
});

authRouter.get('/mfa/dev-code', (_req, res) => {
  if (!config.auth.devHelpersEnabled) {
    res.status(404).json({ error: 'Not found.' });
    return;
  }
  const secret = process.env.DEMO_MFA_SECRET ?? 'JBSWY3DPEHPK3PXP';
  res.json({
    code: generateTotp(secret),
    secret,
    hint: 'Development only. Demo accounts use this TOTP secret.',
  });
});

authRouter.post('/mfa/backup-codes/regenerate', authenticate, async (req: AuthRequest, res) => {
  const user = req.user!.db;
  if (!user.mfaEnabled || !user.mfaSecret) {
    res.status(400).json({ error: 'MFA must be enabled before regenerating recovery codes.' });
    return;
  }
  await prisma.mfaBackupCode.deleteMany({ where: { userId: user.id } });
  const { plain, hashed } = generateBackupCodes();
  await prisma.mfaBackupCode.createMany({
    data: hashed.map((codeHash) => ({ userId: user.id, codeHash })),
  });
  await writeAuditLog({
    organizationId: user.organizationId,
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    action: 'mfa_backup_codes_regenerated',
    resource: 'user',
    resourceId: user.id,
    resourceType: 'user',
    actionDetails: 'MFA recovery codes regenerated',
    req,
  });
  res.json({ backupCodes: plain });
});

authRouter.get('/sessions', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const sessions = await prisma.session.findMany({
    where: { user: { organizationId: req.user!.db.organizationId }, isActive: true },
    include: { user: { select: { fullName: true, email: true } } },
    orderBy: { lastActivityAt: 'desc' },
  });
  res.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      userId: s.userId,
      userName: s.user.fullName,
      email: s.user.email,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      loginTime: s.loginAt,
      lastActivity: s.lastActivityAt,
      expiresAt: s.expiresAt,
      isActive: s.isActive,
    })),
  });
});

authRouter.get('/me/sessions', authenticate, async (req: AuthRequest, res) => {
  const sessions = await prisma.session.findMany({
    where: { userId: req.user!.db.id, isActive: true },
    orderBy: { lastActivityAt: 'desc' },
  });
  const currentRefresh = req.cookies?.refreshToken as string | undefined;
  res.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      loginTime: s.loginAt.toISOString(),
      lastActivity: s.lastActivityAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      isActive: s.isActive,
      // Best-effort: mark most recent as current when cookie match unavailable
      current: false,
    })),
    hint: currentRefresh ? undefined : undefined,
  });
});

authRouter.delete('/me/sessions/:sessionId', authenticate, async (req: AuthRequest, res) => {
  const sessionId = String(req.params.sessionId);
  const result = await prisma.session.updateMany({
    where: { id: sessionId, userId: req.user!.db.id },
    data: { isActive: false },
  });
  if (result.count === 0) {
    res.status(404).json({ error: 'Session not found.' });
    return;
  }
  res.json({ ok: true });
});

authRouter.delete('/me/sessions', authenticate, async (req: AuthRequest, res) => {
  // Keep the newest session active (current browser); revoke others.
  const sessions = await prisma.session.findMany({
    where: { userId: req.user!.db.id, isActive: true },
    orderBy: { lastActivityAt: 'desc' },
  });
  const keepId = sessions[0]?.id;
  await prisma.session.updateMany({
    where: {
      userId: req.user!.db.id,
      isActive: true,
      ...(keepId ? { id: { not: keepId } } : {}),
    },
    data: { isActive: false },
  });
  res.json({ ok: true, revoked: Math.max(0, sessions.length - (keepId ? 1 : 0)) });
});

authRouter.delete('/sessions/:sessionId', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  const sessionId = String(req.params.sessionId);
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) {
    res.status(404).json({ error: 'Session not found.' });
    return;
  }
  await prisma.session.update({ where: { id: session.id }, data: { isActive: false } });
  res.json({ success: true });
});

authRouter.get('/permissions/check-route', authenticate, (req: AuthRequest, res) => {
  const path = String(req.query.path ?? '');
  const role = req.user!.db.role;
  const adminOnly = ['/user-management', '/system-settings'];
  const allowed = !adminOnly.some((p) => path.startsWith(p)) || role === 'admin';
  res.json({ allowed, role });
});