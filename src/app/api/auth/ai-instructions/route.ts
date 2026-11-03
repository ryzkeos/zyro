import { eq } from 'drizzle-orm';
import { getDb } from '@/server/db';
import { users } from '@/server/db/schema';
import { err, json, readJson, withAuth } from '@/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_LENGTH = 5000;

export const GET = withAuth(async (_req, user) => json({ ai_instructions: user.aiInstructions || '' }));

export const PATCH = withAuth(async (req, user) => {
  const data = await readJson(req);
  const instructions = 'ai_instructions' in data ? data.ai_instructions : '';
  if (typeof instructions !== 'string') return err('ai_instructions must be a string', 400);

  const trimmed = Array.from(instructions).slice(0, MAX_LENGTH).join('');
  await getDb().update(users).set({ aiInstructions: trimmed }).where(eq(users.id, user.id));
  return json({ ai_instructions: trimmed });
});
