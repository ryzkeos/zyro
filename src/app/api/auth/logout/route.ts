import { clearAuthCookie } from '@/server/auth';
import { json } from '@/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  const res = json({ message: 'Logged out' });
  clearAuthCookie(res);
  return res;
}
