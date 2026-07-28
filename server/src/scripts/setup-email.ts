/**
 * One-time Gmail SMTP setup for real invitations and verification emails.
 *
 * Usage (PowerShell):
 *   $env:SMTP_USER="you@gmail.com"; $env:SMTP_PASS="your-app-password"; npm run setup:email
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
dotenv.config({ path: path.join(root, '.env') });

const user = process.env.SMTP_USER?.trim();
const pass = process.env.SMTP_PASS?.trim();

if (!user || !pass) {
  console.error(`
[licp] Gmail SMTP setup

Set your Gmail address and Google App Password, then run again:

  PowerShell:
    $env:SMTP_USER="you@gmail.com"
    $env:SMTP_PASS="xxxx xxxx xxxx xxxx"
    npm run setup:email

Create an App Password: https://myaccount.google.com/apppasswords
(Requires 2-Step Verification on your Google account.)
`);
  process.exit(1);
}

const envLocalPath = path.join(root, '.env.local');
const lines = [
  '# Real email — created by npm run setup:email (do not commit)',
  `SMTP_HOST=smtp.gmail.com`,
  `SMTP_PORT=587`,
  `SMTP_ENCRYPTION=tls`,
  `SMTP_USER=${user}`,
  `SMTP_PASS=${pass.replace(/"/g, '')}`,
  `EMAIL_FROM="LICP <${user}>"`,
  `USE_ETHEREAL_EMAIL=false`,
  '',
];
fs.writeFileSync(envLocalPath, lines.join('\n'), 'utf8');
console.log(`[licp] Wrote ${envLocalPath}`);

dotenv.config({ path: envLocalPath, override: true });

const transport = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: { user, pass },
});

try {
  await transport.verify();
  console.log('[licp] SMTP connection OK');
} catch (err) {
  console.error('[licp] SMTP verify failed:', err instanceof Error ? err.message : err);
  process.exit(1);
}

const info = await transport.sendMail({
  from: `LICP <${user}>`,
  to: user,
  subject: 'LICP email test — invitations are ready',
  html: `<p>If you received this, LICP can send real invitation emails.</p>
<p>Next: sign in as admin → User Management → Invite User → use <strong>${user}</strong> as the invitee email.</p>`,
  text: 'LICP email is configured. Invite a user from User Management to see the invitation in your inbox.',
});

console.log(`[licp] Test email sent to ${user} (messageId: ${info.messageId})`);
console.log('[licp] Restart the API if it is already running: npm run dev:api');
