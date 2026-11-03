import { NextRequest } from 'next/server';
import { config } from './config';
import { verifyToken } from './auth';

type Window = { count: number; resetAt: number };
const g = globalThis as unknown as { __zyroRl?: Map<string, Window> };
const store = (g.__zyroRl ??= new Map<string, Window>());

export type Limit = { limit: number; windowSec: number };

async function keyFor(req: NextRequest): Promise<string> {
  const token = req.cookies.get(config.jwtCookieName)?.value;
  if (token) {
    const uid = await verifyToken(token);
    if (uid) return `user:${uid}`;
  }
  const fwd = req.headers.get('x-forwarded-for');
  return `ip:${(fwd ? fwd.split(',')[0] : req.headers.get('x-real-ip') || 'unknown').trim()}`;
}

/**
 * fixed window limiter, same behavior as flask-limiter's memory store (per instance).
 * pass several limits for stacked rules, e.g. "5 per minute; 20 per hour".
 * returns a 429 Response when blocked, otherwise null.
 *
 *   const blocked = await rateLimit(req, 'login', [{ limit: 10, windowSec: 60 }, { limit: 50, windowSec: 3600 }]);
 *   if (blocked) return blocked;
 */
export async function rateLimit(req: NextRequest, name: string, limits: Limit[]): Promise<Response | null> {
  const id = await keyFor(req);
  const now = Date.now();
  if (store.size > 10000) for (const [k, w] of store) if (w.resetAt < now) store.delete(k);

  for (const { limit, windowSec } of limits) {
    const k = `${name}:${windowSec}:${id}`;
    let w = store.get(k);
    if (!w || w.resetAt <= now) {
      w = { count: 0, resetAt: now + windowSec * 1000 };
      store.set(k, w);
    }
    w.count += 1;
    if (w.count > limit) {
      return Response.json(
        { error: 'Too many requests. Slow down and try again.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((w.resetAt - now) / 1000)) } },
      );
    }
  }
  return null;
}
