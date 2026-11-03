import { randomBytes } from 'crypto';

const INSECURE_SECRETS = new Set([
  'dev-secret-change-in-production', 'secret', 'password', 'changeme',
  'default', 'test', 'development', 'production', 'admin',
]);

const list = (v?: string) => (v || '').split(',').map((k) => k.trim()).filter(Boolean);

const g = globalThis as unknown as { __zyroDevSecret?: string };

export function getSecretKey(): string {
  const raw = process.env.SECRET_KEY || '';
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SECRET_KEY is not set');
    }
    g.__zyroDevSecret ??= randomBytes(32).toString('hex');
    return g.__zyroDevSecret;
  }
  if (INSECURE_SECRETS.has(raw)) {
    throw new Error(`SECRET_KEY is set to a known insecure value '${raw}'`);
  }
  return raw;
}

export const config = {
  get databaseUrl() {
    const u = process.env.DATABASE_URL || '';
    return u.startsWith('postgres://') ? u.replace('postgres://', 'postgresql://') : u;
  },
  jwtCookieName: 'zyro_token',
  jwtExpirySeconds: 7 * 24 * 60 * 60,
  get cookieSecure() { return (process.env.COOKIE_SECURE || 'false').toLowerCase() === 'true'; },
  get appUrl() { return process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:7004'; },
  get yuruzuKeys() { return list(process.env.YURUZU_API_KEY); },
  get xenonKeys() { return list(process.env.XENON_API_KEY); },
  get resendApiKey() { return process.env.RESEND_API_KEY || ''; },
  get resendFrom() { return process.env.RESEND_FROM || 'Zyro AI <noreply@zyro.app>'; },
  get redisUrl() { return process.env.UPSTASH_REDIS_REST_URL || ''; },
  get redisToken() { return process.env.UPSTASH_REDIS_REST_TOKEN || ''; },
  get redisTtl() { return parseInt(process.env.REDIS_CACHE_TTL || '3600', 10); },
  get vapidPrivateKey() { return process.env.VAPID_PRIVATE_KEY || ''; },
  get vapidPublicKey() { return process.env.VAPID_PUBLIC_KEY || ''; },
  get vapidEmail() { return process.env.VAPID_CLAIMS_EMAIL || 'admin@zyro.app'; },
  maxBodyBytes: 20 * 1024 * 1024,
};
