import { userToDict } from '@/server/auth';
import { json, withOptionalAuth } from '@/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withOptionalAuth(async (_req, user) =>
  json({ user: user ? userToDict(user) : null }),
);
