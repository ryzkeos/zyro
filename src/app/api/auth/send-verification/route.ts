import { config } from '@/server/config';
import { signPurposeToken } from '@/server/auth';
import { err, json, withAuth } from '@/server/http';
import { sendEmail, verifyEmailHtml, VERIFY_EXPIRY, VERIFY_PURPOSE } from '@/server/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = withAuth(async (_req, user) => {
  if (user.emailVerified) return json({ message: 'Already verified' });

  const token = await signPurposeToken(VERIFY_PURPOSE, user.email, VERIFY_EXPIRY);
  const url = `${config.appUrl}?verify_token=${token}`;
  try {
    await sendEmail(user.email, 'Verify your Zyro email', verifyEmailHtml(url, user.username));
  } catch (e) {
    return err(`Failed to send email: ${e instanceof Error ? e.message : String(e)}`, 500);
  }
  return json({ message: 'Verification email sent' });
});
