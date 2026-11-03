import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { compare } from 'bcryptjs';
import { getDb } from '@/server/db';
import { users } from '@/server/db/schema';
import { setAuthCookie, userToDict } from '@/server/auth';
import { err, json, readJson } from '@/server/http';
import { rateLimit } from '@/server/ratelimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export async function POST(req: NextRequest) {
  const blocked = await rateLimit(req, 'login', [
    { limit: 10, windowSec: 60 },
    { limit: 50, windowSec: 3600 },
  ]);
  if (blocked) return blocked;

  const data = await readJson(req);
  const email = str(data.email).toLowerCase();
  const password = str(data.password);
  if (!email || !password) return err('Email and password are required', 400);

  const [user] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !(await compare(password, user.password))) return err('Invalid email or password', 401);

  const res = json({ user: userToDict(user) });
  await setAuthCookie(res, user.id);
  return res;
}
