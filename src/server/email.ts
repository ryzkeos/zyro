import { Resend } from 'resend';
import { decodeJwt } from 'jose';
import { config } from './config';
import { verifyPurposeToken } from './auth';

export const VERIFY_PURPOSE = 'verify-email';
export const RESET_PURPOSE = 'reset-password';
export const VERIFY_EXPIRY = '24h';
export const RESET_EXPIRY = '1h';

export async function sendEmail(to: string, subject: string, html: string): Promise<string> {
  const apiKey = config.resendApiKey;
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured.');
  const { data, error } = await new Resend(apiKey).emails.send({
    from: config.resendFrom,
    to: [to],
    subject,
    html,
  });
  if (error) throw new Error(`Resend error ${error.name}: ${error.message}`);
  if (!data?.id) throw new Error('Resend returned no email ID.');
  return data.id;
}

export type PurposeTokenResult = { email: string } | { error: 'expired' | 'invalid' };

export async function readPurposeToken(token: string, purpose: string): Promise<PurposeTokenResult> {
  const email = await verifyPurposeToken(token, purpose);
  if (email) return { email };
  try {
    const { exp, purpose: p } = decodeJwt(token);
    if (p === purpose && typeof exp === 'number' && exp * 1000 <= Date.now()) return { error: 'expired' };
  } catch {
    return { error: 'invalid' };
  }
  return { error: 'invalid' };
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function template(heading: string, intro: string, button: string, footer: string, url: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'IBM Plex Mono',monospace">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:48px 16px">
    <table width="480" style="background:#111;border:1px solid #222;padding:48px">
      <tr><td>
        <p style="color:#555;font-size:10px;letter-spacing:.2em;text-transform:uppercase;margin:0 0 24px">Zyro AI</p>
        <h1 style="color:#d8d8d8;font-size:18px;font-weight:700;letter-spacing:.1em;margin:0 0 16px;text-transform:uppercase">${heading}</h1>
        <p style="color:#888;font-size:13px;line-height:1.75;margin:0 0 32px">
          ${intro}
        </p>
        <a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 32px;background:#d8d8d8;color:#000;
           text-decoration:none;font-size:11px;letter-spacing:.2em;text-transform:uppercase;font-weight:700">
          ${button}
        </a>
        <p style="color:#444;font-size:11px;margin:32px 0 0;line-height:1.6">
          ${footer}
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export function verifyEmailHtml(url: string, username: string): string {
  return template(
    'Verify your email',
    `Hi ${escapeHtml(username)}, click the button below within 24 hours to activate your Zyro account.`,
    'Verify Email',
    "If you didn't create a Zyro account, ignore this email.<br>\n          Link expires in 24 hours.",
    url,
  );
}

export function resetEmailHtml(url: string, username: string): string {
  return template(
    'Reset your password',
    `Hi ${escapeHtml(username)}, click the button below within 1 hour to set a new password.`,
    'Reset Password',
    "If you didn't request a reset, ignore this email.<br>\n          Link expires in 1 hour.",
    url,
  );
}
