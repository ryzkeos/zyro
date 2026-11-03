import { eq } from 'drizzle-orm';
import { compare, hash } from 'bcryptjs';
import { getDb } from '@/server/db';
import { users } from '@/server/db/schema';
import { err, json, readJson, withAuth } from '@/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export const PATCH = withAuth(async (req, user) => {
  const data = await readJson(req);
  const currentPassword = str(data.currentPassword);
  const newPassword = str(data.newPassword);

  if (!currentPassword || !newPassword) return err('Both current and new password are required', 400);
  if (newPassword.length < 8) return err('New password must be at least 8 characters', 400);
  if (!(await compare(currentPassword, user.password))) return err('Current password is incorrect', 401);

  await getDb().update(users).set({ password: await hash(newPassword, 12) }).where(eq(users.id, user.id));
  return json({ message: 'Password updated successfully' });
});
