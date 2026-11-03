import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { hash } from 'bcryptjs';
import { getDb } from '@/server/db';
import { users } from '@/server/db/schema';
import { err, json, readJson } from '@/server/http';
import { readPurposeToken, RESET_PURPOSE } from '@/server/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const data = await readJson(req);
  const token = typeof data.token === 'string' ? data.token : '';
  const password = typeof data.password === 'string' ? data.password.trim() : '';

  if (password.length < 8) return err('Password must be at least 8 characters.', 400);

  const result = await readPurposeToken(token, RESET_PURPOSE);
  if ('error' in result) {
    return err(
      result.error === 'expired'
        ? 'Reset link expired. Please request a new one.'
        : 'Invalid reset link.',
      400,
    );
  }

  const db = getDb();
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, result.email)).limit(1);
  if (!user) return err('User not found.', 404);

  await db.update(users).set({ password: await hash(password, 12) }).where(eq(users.id, user.id));
  return json({ message: 'Password updated successfully.' });
}
