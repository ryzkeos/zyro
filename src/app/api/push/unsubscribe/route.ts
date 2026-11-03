import { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/server/db';
import { pushSubscriptions } from '@/server/db/schema';
import { json, readJson, withAuth } from '@/server/http';
import { rateLimit } from '@/server/ratelimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = withAuth(async (req: NextRequest, user) => {
  const blocked = await rateLimit(req, 'push-unsubscribe', [{ limit: 10, windowSec: 60 }]);
  if (blocked) return blocked;

  const { endpoint } = await readJson<{ endpoint?: string }>(req);
  if (endpoint) {
    await getDb()
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, user.id), eq(pushSubscriptions.endpoint, endpoint)));
  }
  return json({ message: 'Unsubscribed' }, 200);
});
