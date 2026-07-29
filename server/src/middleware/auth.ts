import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { verifyAccessToken } from '../lib/jwt.js';
import { serializeUser } from '../lib/users.js';
import {
  canAccessAnalytics,
  canAccessExecutiveAnalytics,
  hasModuleAccess,
  type PermissionLevel,
} from '../lib/permissions.js';
import type { UserRole } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: Awaited<ReturnType<typeof loadAuthUser>>;
}

async function loadAuthUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { organization: true },
  });
  if (!user) return null;
  return {
    db: user,
    safe: serializeUser(user, {
      name: user.organization.name,
      mfaRequired: user.organization.mfaRequired,
      sessionTimeoutMinutes: user.organization.sessionTimeoutMinutes,
      settings: user.organization.settings,
    }),
  };
}

interface AuthenticateOptions {
  /** Allow users who have not verified email (for /me, resend-verification, logout). */
  allowUnverifiedEmail?: boolean;
}

async function authenticateCore(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
  options: AuthenticateOptions = {}
): Promise<void> {
  try {
    const header = req.headers.authorization;
    const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    const cookieToken = req.cookies?.accessToken as string | undefined;
    const token = bearer ?? cookieToken;

    if (!token) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const payload = verifyAccessToken(token);
    const authUser = await loadAuthUser(payload.sub);

    if (!authUser || authUser.db.status === 'suspended') {
      res.status(401).json({ error: 'Invalid or inactive session.' });
      return;
    }

    const sessionTimeout = authUser.db.organization.sessionTimeoutMinutes;
    const session = await prisma.session.findFirst({
      where: { userId: authUser.db.id, isActive: true },
      orderBy: { lastActivityAt: 'desc' },
    });

    if (session) {
      const idleMs = Date.now() - session.lastActivityAt.getTime();
      if (idleMs > sessionTimeout * 60 * 1000) {
        await prisma.session.update({
          where: { id: session.id },
          data: { isActive: false },
        });
        res.status(401).json({ error: 'Session expired due to inactivity.' });
        return;
      }
      await prisma.session.update({
        where: { id: session.id },
        data: { lastActivityAt: new Date() },
      });
    }

    if (!options.allowUnverifiedEmail && !authUser.db.emailVerifiedAt) {
      res.status(403).json({ error: 'Email verification required.', code: 'EMAIL_NOT_VERIFIED' });
      return;
    }

    req.user = authUser;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  void authenticateCore(req, res, next);
}

export function authenticateAllowUnverified(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  void authenticateCore(req, res, next, { allowUnverifiedEmail: true });
}

export function requireRoles(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!roles.includes(req.user.db.role)) {
      res.status(403).json({ error: 'Insufficient permissions.' });
      return;
    }
    next();
  };
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  return requireRoles('admin')(req, res, next);
}

export function requireAnalyticsAccess(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  if (!canAccessAnalytics(req.user.safe.permissions)) {
    res.status(403).json({ error: 'Analytics access denied.' });
    return;
  }
  next();
}

export function requireExecutiveAnalytics(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  if (!canAccessExecutiveAnalytics(req.user.safe.permissions, req.user.db.role)) {
    res.status(403).json({ error: 'Executive analytics access denied.' });
    return;
  }
  next();
}

export function requireModule(module: string, minLevel: PermissionLevel = 'view') {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!hasModuleAccess(req.user.safe.permissions, module, minLevel)) {
      res.status(403).json({ error: 'Insufficient permissions for this module.' });
      return;
    }
    next();
  };
}

export function denyRoles(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (roles.includes(req.user.db.role)) {
      res.status(403).json({ error: 'Insufficient permissions.' });
      return;
    }
    next();
  };
}

export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const token = req.cookies?.accessToken as string | undefined;
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    const authUser = await loadAuthUser(payload.sub);
    if (authUser) req.user = authUser;
  } catch {
    // ignore
  }
  next();
}
