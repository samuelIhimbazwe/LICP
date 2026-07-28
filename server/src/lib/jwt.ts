import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import type { UserRole } from '@prisma/client';

export interface AccessPayload {
  sub: string;
  role: UserRole;
  organizationId: string;
  type: 'access';
}

export interface PendingPayload {
  sub: string;
  type: 'pending' | 'mfa_setup';
  invitationId?: string;
}

export function signAccessToken(payload: Omit<AccessPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'access' }, config.jwt.accessSecret, {
    expiresIn: `${config.jwt.accessMinutes}m`,
  });
}

export function signPendingToken(payload: Omit<PendingPayload, 'type'> & { type?: PendingPayload['type'] }): string {
  return jwt.sign({ ...payload, type: payload.type ?? 'pending' }, config.jwt.pendingSecret, {
    expiresIn: `${config.jwt.pendingMinutes}m`,
  });
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, config.jwt.accessSecret) as AccessPayload;
}

export function verifyPendingToken(token: string): PendingPayload {
  return jwt.verify(token, config.jwt.pendingSecret) as PendingPayload;
}

export function signRefreshToken(sessionId: string): string {
  return jwt.sign({ sub: sessionId, type: 'refresh' }, config.jwt.refreshSecret, {
    expiresIn: `${config.jwt.refreshDays}d`,
  });
}

export function verifyRefreshToken(token: string): { sub: string; type: 'refresh' } {
  return jwt.verify(token, config.jwt.refreshSecret) as { sub: string; type: 'refresh' };
}
