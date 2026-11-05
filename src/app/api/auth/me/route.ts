import { setAuthCookie, userToDict } from '@/server/auth';
import { json, withOptionalAuth } from '@/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withOptionalAuth(async (_req, user) => {
  const res = json({ user: user ? userToDict(user) : null });
  if (user) await setAuthCookie(res, user.id);
  res.headers.set('Cache-Control', 'no-store');
  return res;
});
