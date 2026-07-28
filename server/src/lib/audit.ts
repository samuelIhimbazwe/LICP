import type { Request } from 'express';
import type { AuditSeverity } from '@prisma/client';
import { prisma } from './prisma.js';
import { parseUserAgent } from './crypto.js';

interface AuditInput {
  organizationId: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  action: string;
  resource: string;
  resourceId?: string;
  resourceType: string;
  actionDetails: string;
  req?: Request;
  changes?: unknown;
  status?: 'success' | 'failure';
  severity?: AuditSeverity;
}

export async function writeAuditLog(input: AuditInput): Promise<void> {
  const ip = input.req?.ip ?? input.req?.socket.remoteAddress;
  const ua = input.req?.get('user-agent') ?? undefined;

  await prisma.auditLog.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      userName: input.userName,
      userRole: input.userRole,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      resourceType: input.resourceType,
      actionDetails: input.actionDetails,
      ipAddress: ip,
      userAgent: ua,
      changes: input.changes as object | undefined,
      status: input.status ?? 'success',
      severity: input.severity ?? 'info',
    },
  });
}

export async function writeLoginActivity(input: {
  userId?: string;
  email: string;
  status: string;
  failureReason?: string;
  mfaVerified?: boolean;
  req?: Request;
}): Promise<void> {
  const ua = input.req?.get('user-agent') ?? undefined;
  const { browser, device } = parseUserAgent(ua);

  await prisma.loginActivity.create({
    data: {
      userId: input.userId,
      email: input.email.toLowerCase(),
      status: input.status,
      failureReason: input.failureReason,
      mfaVerified: input.mfaVerified ?? false,
      ipAddress: input.req?.ip ?? input.req?.socket.remoteAddress,
      userAgent: ua,
      browser,
      device,
    },
  });
}

import { sendSmtpEmail, type EmailSendResult } from './email.js';

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  options?: { organizationId?: string }
): Promise<EmailSendResult> {
  return sendSmtpEmail(to, subject, html, options);
}
