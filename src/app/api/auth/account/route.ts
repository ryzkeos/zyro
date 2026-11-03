import { eq, inArray } from 'drizzle-orm';
import { compare } from 'bcryptjs';
import { getDb } from '@/server/db';
import { conversations, messages, pushSubscriptions, users } from '@/server/db/schema';
import { clearAuthCookie } from '@/server/auth';
import { err, json, readJson, withAuth } from '@/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export const DELETE = withAuth(async (req, user) => {
  const data = await readJson(req);
  const password = str(data.password);

  if (!password) return err('Password is required to delete account', 400);
  if (!(await compare(password, user.password))) return err('Incorrect password', 401);

  await getDb().transaction(async (tx) => {
    const owned = tx.select({ id: conversations.id }).from(conversations).where(eq(conversations.userId, user.id));
    await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, user.id));
    await tx.delete(messages).where(inArray(messages.conversationId, owned));
    await tx.delete(conversations).where(eq(conversations.userId, user.id));
    await tx.delete(users).where(eq(users.id, user.id));
  });

  const res = json({ message: 'Account deleted' });
  clearAuthCookie(res);
  return res;
});
