import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';
import { config } from '../config.js';
import { prisma } from './prisma.js';

export type EmailDeliveryMode = 'smtp' | 'ethereal' | 'console';

export interface EmailSendResult {
  delivered: boolean;
  mode: EmailDeliveryMode;
  messageId?: string;
  /** Ethereal preview URL — dev/testing only */
  previewUrl?: string;
  error?: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
  source: 'env' | 'organization';
}

let envTransporter: nodemailer.Transporter | null = null;
let orgTransporterKey: string | null = null;
let orgTransporter: nodemailer.Transporter | null = null;
let etherealTransporter: nodemailer.Transporter | null = null;
let etherealAccount: { user: string; pass: string } | null = null;

let emailStatusCache: {
  at: number;
  orgKey: string;
  value: {
    configured: boolean;
    mode: string;
    source: string;
    from: string;
    error?: string;
    etherealEnabled: boolean;
  };
} | null = null;
const EMAIL_STATUS_TTL_MS = 60_000;

/** Call after SMTP settings change so the next send uses fresh credentials. */
export function invalidateEmailTransporters(): void {
  envTransporter = null;
  orgTransporter = null;
  orgTransporterKey = null;
  etherealTransporter = null;
  etherealAccount = null;
  emailStatusCache = null;
}

function etherealAllowed(): boolean {
  return config.nodeEnv === 'development' && process.env.USE_ETHEREAL_EMAIL !== 'false';
}

function parseFromAddress(fromName?: string, fromEmail?: string) {
  if (fromName && fromEmail) return `${fromName} <${fromEmail}>`;
  return config.email.from;
}

function buildTransportOptions(smtp: SmtpConfig): SMTPTransport.Options {
  return {
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass ?? '' } : undefined,
    tls: smtp.secure ? undefined : { rejectUnauthorized: config.nodeEnv === 'production' },
  };
}

export function getEnvSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) return null;
  const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
  const encryption = process.env.SMTP_ENCRYPTION ?? 'tls';
  return {
    host,
    port,
    secure: encryption === 'ssl' || port === 465,
    user,
    pass,
    from: process.env.EMAIL_FROM ?? config.email.from,
    source: 'env',
  };
}

export async function getOrgSmtpConfig(organizationId: string): Promise<SmtpConfig | null> {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org?.settings || typeof org.settings !== 'object') return null;
  const s = org.settings as Record<string, unknown>;
  const host = typeof s.smtpHost === 'string' ? s.smtpHost.trim() : '';
  if (!host) return null;
  const port = parseInt(String(s.smtpPort ?? '587'), 10);
  const encryption = String(s.smtpEncryption ?? 'tls');
  const fromName = typeof s.emailFromName === 'string' ? s.emailFromName : 'LICP';
  const fromUser = typeof s.smtpUser === 'string' ? s.smtpUser.trim() : '';
  const pass = typeof s.smtpPass === 'string' ? s.smtpPass : '';
  if (!fromUser || !pass) return null;
  return {
    host,
    port,
    secure: encryption === 'ssl' || port === 465,
    user: fromUser,
    pass,
    from: parseFromAddress(fromName, fromUser),
    source: 'organization',
  };
}

export async function resolveSmtpConfig(organizationId?: string): Promise<SmtpConfig | null> {
  const env = getEnvSmtpConfig();
  if (env) return env;
  if (organizationId) {
    const org = await getOrgSmtpConfig(organizationId);
    if (org) return org;
  }
  return null;
}

async function getEtherealTransporter() {
  if (!etherealTransporter) {
    etherealAccount = await nodemailer.createTestAccount();
    etherealTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: etherealAccount.user, pass: etherealAccount.pass },
    });
    console.log('[licp:email] Using Ethereal test SMTP (dev). User:', etherealAccount.user);
  }
  return etherealTransporter;
}

function getEnvTransporter(smtp: SmtpConfig) {
  if (!envTransporter) {
    envTransporter = nodemailer.createTransport(buildTransportOptions(smtp));
  }
  return envTransporter;
}

function getOrgTransporter(smtp: SmtpConfig) {
  const key = `${smtp.host}:${smtp.port}:${smtp.user}:${smtp.from}`;
  if (orgTransporterKey !== key || !orgTransporter) {
    orgTransporter = nodemailer.createTransport(buildTransportOptions(smtp));
    orgTransporterKey = key;
  }
  return orgTransporter;
}

export async function verifyEmailConnection(organizationId?: string): Promise<{
  ok: boolean;
  mode: EmailDeliveryMode | 'none';
  source?: string;
  error?: string;
}> {
  const smtp = await resolveSmtpConfig(organizationId);
  if (smtp) {
    try {
      const transport = smtp.source === 'organization' ? getOrgTransporter(smtp) : getEnvTransporter(smtp);
      await transport.verify();
      return { ok: true, mode: 'smtp', source: smtp.source };
    } catch (err) {
      return {
        ok: false,
        mode: 'smtp',
        source: smtp.source,
        error: err instanceof Error ? err.message : 'SMTP verify failed',
      };
    }
  }
  if (etherealAllowed()) {
    try {
      await (await getEtherealTransporter()).verify();
      return { ok: true, mode: 'ethereal', source: 'ethereal' };
    } catch (err) {
      return { ok: false, mode: 'ethereal', error: err instanceof Error ? err.message : 'Ethereal verify failed' };
    }
  }
  return { ok: false, mode: 'none', error: 'No SMTP configured. Set SMTP_HOST in .env or System Settings → Email.' };
}

export async function getEmailStatus(organizationId?: string, options?: { fresh?: boolean }) {
  const orgKey = organizationId ?? '__global__';
  const now = Date.now();
  if (
    !options?.fresh &&
    emailStatusCache &&
    emailStatusCache.orgKey === orgKey &&
    now - emailStatusCache.at < EMAIL_STATUS_TTL_MS
  ) {
    return emailStatusCache.value;
  }

  const verify = await verifyEmailConnection(organizationId);
  const env = getEnvSmtpConfig();
  const value = {
    configured: verify.ok,
    mode: verify.mode,
    source: verify.source ?? (env ? 'env' : 'none'),
    from: env?.from ?? config.email.from,
    error: verify.error,
    etherealEnabled: etherealAllowed(),
  };
  emailStatusCache = { at: now, orgKey, value };
  return value;
}

export async function sendSmtpEmail(
  to: string,
  subject: string,
  html: string,
  options?: { organizationId?: string; text?: string }
): Promise<EmailSendResult> {
  const smtp = await resolveSmtpConfig(options?.organizationId);

  if (smtp) {
    try {
      const transport = smtp.source === 'organization' ? getOrgTransporter(smtp) : getEnvTransporter(smtp);
      const info = await transport.sendMail({
        from: smtp.from,
        to,
        subject,
        html,
        text: options?.text,
      });
      return { delivered: true, mode: 'smtp', messageId: info.messageId };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'SMTP send failed';
      console.error('[licp:email] SMTP send failed:', message);
      return { delivered: false, mode: 'smtp', error: message };
    }
  }

  if (etherealAllowed()) {
    try {
      const transport = await getEtherealTransporter();
      const from = etherealAccount?.user ?? 'noreply@licp.dev';
      const info = await transport.sendMail({ from, to, subject, html, text: options?.text });
      const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      if (previewUrl) {
        console.log(`[licp:email] Ethereal preview: ${previewUrl}`);
      }
      return { delivered: true, mode: 'ethereal', messageId: info.messageId, previewUrl };
    } catch (err) {
      console.error('[licp:email] Ethereal send failed:', err);
    }
  }

  console.log('\n--- EMAIL (no SMTP — console only) ---');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  console.log('--- END EMAIL ---\n');
  return {
    delivered: false,
    mode: 'console',
    error: 'Email not sent — configure SMTP_HOST in .env or System Settings → Email.',
  };
}

/** Include preview URL in API responses only in development */
export function emailResultForClient(result: EmailSendResult) {
  if (config.nodeEnv !== 'development') {
    return { emailSent: result.delivered, emailMode: result.mode, emailError: result.error };
  }
  return {
    emailSent: result.delivered,
    emailMode: result.mode,
    emailError: result.error,
    previewUrl: result.previewUrl,
  };
}
