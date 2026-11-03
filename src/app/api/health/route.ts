import { APP_NAME, VERSION } from '@/server/project';

export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ status: 'ok', service: APP_NAME, version: VERSION });
}
