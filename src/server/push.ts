import webpush from 'web-push';
import { and, eq, inArray } from 'drizzle-orm';
import { config } from './config';
import { getDb } from './db';
import { pushSubscriptions } from './db/schema';

let configured = false;

function ensureConfigured(): boolean {
  if (!config.vapidPrivateKey || !config.vapidPublicKey) return false;
  if (!configured) {
    webpush.setVapidDetails(`mailto:${config.vapidEmail}`, config.vapidPublicKey, config.vapidPrivateKey);
    configured = true;
  }
  return true;
}

export async function sendPush(userId: string, title: string, body: string, url = '/'): Promise<void> {
  if (!ensureConfigured()) return;
  const db = getDb();
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  if (!subs.length) return;

  const payload = JSON.stringify({ title, body, url });
  const dead: number[] = [];

  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) dead.push(sub.id);
    }
  }));

  if (dead.length) await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, dead));
}

export async function hasSubscription(userId: string, endpoint: string): Promise<boolean> {
  const rows = await getDb()
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)))
    .limit(1);
  return rows.length > 0;
}
