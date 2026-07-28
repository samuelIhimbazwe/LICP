import { config } from '../config.js';

function layout(title: string, body: string) {
  const origin = config.clientOrigin;
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:Inter,Segoe UI,sans-serif;background:#faf9f7;margin:0;padding:24px;color:#1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e8e6e3;border-radius:8px;">
    <tr><td style="padding:24px 28px 8px;border-bottom:1px solid #e8e6e3;">
      <strong style="font-size:18px;color:#1a1a1a;">Legal Intelligence &amp; Compliance Platform</strong>
    </td></tr>
    <tr><td style="padding:28px;line-height:1.6;font-size:15px;">${body}</td></tr>
    <tr><td style="padding:16px 28px 24px;font-size:12px;color:#6b7280;border-top:1px solid #e8e6e3;">
      This message was sent by LICP. If you did not request it, you can ignore this email.<br/>
      <a href="${origin}" style="color:#a68b67;">${origin}</a>
    </td></tr>
  </table>
</body></html>`;
}

function button(href: string, label: string) {
  return `<p style="margin:24px 0;">
    <a href="${href}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;">${label}</a>
  </p>
  <p style="font-size:13px;color:#6b7280;word-break:break-all;">Or copy this link: ${href}</p>`;
}

export function invitationEmail(fullName: string, link: string, invitedBy?: string) {
  const body = `
    <p>Hello ${fullName},</p>
    <p>${invitedBy ? `${invitedBy} has invited you` : 'You have been invited'} to join the Legal Intelligence &amp; Compliance Platform.</p>
    <p>Accept your invitation to set your password, verify your email, and complete MFA setup.</p>
    ${button(link, 'Accept invitation')}
    <p style="font-size:13px;color:#6b7280;">This invitation link expires in 7 days unless otherwise configured.</p>`;
  return {
    subject: 'You are invited to LICP',
    html: layout('Invitation to LICP', body),
  };
}

export function verificationEmail(fullName: string, link: string) {
  const body = `
    <p>Hello ${fullName},</p>
    <p>Please verify your email address to activate your LICP account.</p>
    ${button(link, 'Verify email address')}
    <p style="font-size:13px;color:#6b7280;">This link expires in 24 hours.</p>`;
  return {
    subject: 'Verify your LICP email address',
    html: layout('Verify your email', body),
  };
}

export function passwordResetEmail(link: string) {
  const body = `
    <p>We received a request to reset your LICP password.</p>
    ${button(link, 'Reset password')}
    <p style="font-size:13px;color:#6b7280;">This link expires in 1 hour. If you did not request a reset, ignore this email.</p>`;
  return {
    subject: 'Reset your LICP password',
    html: layout('Password reset', body),
  };
}

export function testEmail(to: string) {
  const body = `
    <p>This is a test message from LICP.</p>
    <p>If you received this at <strong>${to}</strong>, your SMTP configuration is working correctly.</p>
    <p style="font-size:13px;color:#6b7280;">Sent at ${new Date().toISOString()}</p>`;
  return {
    subject: 'LICP — SMTP test email',
    html: layout('SMTP test', body),
  };
}

export function scheduledReportEmail(reportName: string, periodLabel: string, archiveHint: string) {
  const body = `
    <p>Your scheduled report <strong>${reportName}</strong> has been generated.</p>
    <p>Reporting period: ${periodLabel}</p>
    <p>${archiveHint}</p>`;
  return {
    subject: `LICP scheduled report: ${reportName}`,
    html: layout('Scheduled report ready', body),
  };
}
