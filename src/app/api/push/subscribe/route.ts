import { NextRequest } from 'next/server';
import { getDb } from '@/server/db';
import { pushSubscriptions } from '@/server/db/schema';
import { err, json, readJson, withAuth } from '@/server/http';
import { hasSubscription } from '@/server/push';
import { rateLimit } from '@/server/ratelimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type SubscribeBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

export const POST = withAuth(async (req: NextRequest, user) => {
  const blocked = await rateLimit(req, 'push-subscribe', [{ limit: 10, windowSec: 60 }]);
  if (blocked) return blocked;

  const sub = await readJson<SubscribeBody>(req);
  const endpoint = sub.endpoint;
  if (!endpoint) return err('Missing endpoint', 400);

  if (!(await hasSubscription(user.id, endpoint))) {
    await getDb().insert(pushSubscriptions).values({
      userId: user.id,
      endpoint,
      p256dh: sub.keys?.p256dh ?? '',
      auth: sub.keys?.auth ?? '',
    });
  }
  return json({ message: 'Subscribed' }, 201);
});
