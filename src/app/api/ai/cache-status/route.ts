import { json, withAuth } from '@/server/http';
import { cacheHealth } from '@/server/ai/cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withAuth(async () => json(await cacheHealth()));
