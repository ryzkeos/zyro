import { createHash } from 'crypto';
import { Redis } from '@upstash/redis';
import { config } from '@/server/config';

const STREAM_TTL = 600;

export type CacheMessage = { role?: unknown; content?: unknown };

let client: Redis | null = null;

function getClient(): Redis | null {
  if (client) return client;
  const url = config.redisUrl.trim();
  const token = config.redisToken.trim();
  if (!url || !token) return null;
  client = new Redis({ url, token, automaticDeserialization: false });
  return client;
}

const text = (v: unknown) => (v == null ? '' : String(v));

function promptKey(model: string, systemPrompt: string, messages: CacheMessage[], userId: string): string {
  const msgs = messages.map((m) => ({ content: text(m.content), role: typeof m.role === 'string' ? m.role : '' }));
  const raw = JSON.stringify({ m: model, msgs, s: systemPrompt, u: userId });
  return 'zyro:ai:' + createHash('sha256').update(raw).digest('hex');
}

export async function getCached(model: string, systemPrompt: string, messages: CacheMessage[], userId: string): Promise<string | null> {
  const r = getClient();
  if (!r) return null;
  try {
    const val = await r.get<string>(promptKey(model, systemPrompt, messages, userId));
    return typeof val === 'string' && val ? val : null;
  } catch {
    return null;
  }
}

export async function setCached(model: string, systemPrompt: string, messages: CacheMessage[], reply: string, userId: string): Promise<void> {
  const r = getClient();
  if (!r) return;
  try {
    await r.set(promptKey(model, systemPrompt, messages, userId), reply, { ex: config.redisTtl });
  } catch {
    /* cache is best effort */
  }
}

export async function getStream(streamId: string): Promise<string | null> {
  const r = getClient();
  if (!r) return null;
  try {
    const val = await r.get<string>(`zyro:stream:${streamId}`);
    return typeof val === 'string' && val ? val : null;
  } catch {
    return null;
  }
}

export async function setStream(streamId: string, body: string): Promise<void> {
  const r = getClient();
  if (!r) return;
  try {
    await r.set(`zyro:stream:${streamId}`, body, { ex: STREAM_TTL });
  } catch {
    /* cache is best effort */
  }
}

export async function pingCache(): Promise<boolean> {
  const r = getClient();
  if (!r) return false;
  try {
    await r.ping();
    return true;
  } catch {
    return false;
  }
}

export async function cacheHealth(): Promise<{ redis: boolean; error: string | null }> {
  if (!config.redisUrl.trim()) return { redis: false, error: 'UPSTASH_REDIS_REST_URL not in environment' };
  if (!config.redisToken.trim()) return { redis: false, error: 'UPSTASH_REDIS_REST_TOKEN not in environment' };
  const r = getClient();
  if (!r) return { redis: false, error: 'Redis client unavailable' };
  try {
    await r.set('zyro:health', '1');
    const val = await r.get<string>('zyro:health');
    await r.del('zyro:health');
    const ok = String(val) === '1';
    return { redis: ok, error: ok ? null : `SET/GET mismatch: got ${JSON.stringify(val)}` };
  } catch (e) {
    return { redis: false, error: e instanceof Error ? e.message : String(e) };
  }
}
