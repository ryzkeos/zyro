import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { hash } from 'bcryptjs';
import { getDb } from '@/server/db';
import { users } from '@/server/db/schema';
import { setAuthCookie, userToDict } from '@/server/auth';
import { err, json, readJson } from '@/server/http';
import { rateLimit } from '@/server/ratelimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export async function POST(req: NextRequest) {
  const blocked = await rateLimit(req, 'register', [
    { limit: 5, windowSec: 60 },
    { limit: 20, windowSec: 3600 },
  ]);
  if (blocked) return blocked;

  const data = await readJson(req);
  const username = str(data.username);
  const email = str(data.email).toLowerCase();
  const password = str(data.password);

  if (!username || !email || !password) return err('Username, email, and password are required', 400);
  const usernameLength = [...username].length;
  if (usernameLength < 3 || usernameLength > 30) return err('Username must be 3–30 characters', 400);
  if (!EMAIL_RE.test(email)) return err('Invalid email format', 400);
  if (password.length < 8) return err('Password must be at least 8 characters', 400);

  const db = getDb();
  const [emailTaken] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (emailTaken) return err('Email already registered', 409);
  const [usernameTaken] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  if (usernameTaken) return err('Username already taken', 409);

  const [user] = await db
    .insert(users)
    .values({ id: crypto.randomUUID(), username, email, password: await hash(password, 12) })
    .returning();

  const res = json({ user: userToDict(user) }, 201);
  await setAuthCookie(res, user.id);
  return res;
}
