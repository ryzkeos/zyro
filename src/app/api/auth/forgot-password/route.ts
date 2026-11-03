import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { config } from '@/server/config';
import { getDb } from '@/server/db';
import { users } from '@/server/db/schema';
import { signPurposeToken } from '@/server/auth';
import { json, readJson } from '@/server/http';
import { resetEmailHtml, sendEmail, RESET_EXPIRY, RESET_PURPOSE } from '@/server/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const data = await readJson(req);
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';

  const [user] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
  if (user) {
    const token = await signPurposeToken(RESET_PURPOSE, email, RESET_EXPIRY);
    const url = `${config.appUrl}?reset_token=${token}`;
    try {
      await sendEmail(email, 'Reset your Zyro password', resetEmailHtml(url, user.username));
    } catch {}
  }
  return json({ message: 'If that email exists, a reset link was sent.' });
}
