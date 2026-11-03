import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/server/db';
import { users } from '@/server/db/schema';
import { err, json, readJson } from '@/server/http';
import { readPurposeToken, VERIFY_PURPOSE } from '@/server/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const data = await readJson(req);
  const token = typeof data.token === 'string' ? data.token : '';

  const result = await readPurposeToken(token, VERIFY_PURPOSE);
  if ('error' in result) {
    return err(
      result.error === 'expired'
        ? 'Verification link expired. Please request a new one.'
        : 'Invalid verification link.',
      400,
    );
  }

  const db = getDb();
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, result.email)).limit(1);
  if (!user) return err('User not found.', 404);

  await db.update(users).set({ emailVerified: true }).where(eq(users.id, user.id));
  return json({ message: 'Email verified successfully.' });
}
