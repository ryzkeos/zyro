import { and, eq, ne } from 'drizzle-orm';
import { getDb } from '@/server/db';
import { users } from '@/server/db/schema';
import { userToDict } from '@/server/auth';
import { err, json, readJson, withAuth } from '@/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export const PATCH = withAuth(async (req, user) => {
  const data = await readJson(req);
  const username = str(data.username);
  const email = str(data.email).toLowerCase();

  if (!username && !email) return err('Provide at least one field to update', 400);
  const usernameLength = [...username].length;
  if (username && (usernameLength < 3 || usernameLength > 30)) return err('Username must be 3–30 characters', 400);
  if (email && !EMAIL_RE.test(email)) return err('Invalid email format', 400);

  const db = getDb();
  const changes: Partial<{ username: string; email: string }> = {};

  if (username && username !== user.username) {
    const [taken] = await db.select({ id: users.id }).from(users)
      .where(and(eq(users.username, username), ne(users.id, user.id))).limit(1);
    if (taken) return err('Username already taken', 409);
    changes.username = username;
  }

  if (email && email !== user.email) {
    const [taken] = await db.select({ id: users.id }).from(users)
      .where(and(eq(users.email, email), ne(users.id, user.id))).limit(1);
    if (taken) return err('Email already registered', 409);
    changes.email = email;
  }

  if (Object.keys(changes).length === 0) return json({ user: userToDict(user) });

  const [updated] = await db.update(users).set(changes).where(eq(users.id, user.id)).returning();
  return json({ user: userToDict(updated) });
});
