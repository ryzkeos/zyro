import { config } from '@/server/config';
import { json } from '@/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET() {
  return json({ publicKey: config.vapidPublicKey });
}
