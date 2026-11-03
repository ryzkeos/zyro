import { err, json, readJson, withAuth } from '@/server/http';
import { rateLimit } from '@/server/ratelimit';
import { generateTitle } from '@/server/ai/providers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type TitleMessage = { role?: unknown; content?: unknown };

const text = (v: unknown) => (v == null ? '' : String(v));

export const POST = withAuth(async (req) => {
  const blocked = await rateLimit(req, 'ai-auto-title', [{ limit: 30, windowSec: 60 }]);
  if (blocked) return blocked;

  const { messages } = await readJson<{ messages?: unknown }>(req);
  const list = (Array.isArray(messages) ? messages : []).filter(
    (m): m is TitleMessage => typeof m === 'object' && m !== null,
  );
  if (!list.length) return err('No messages', 400);

  const exchange = list
    .slice(0, 4)
    .map((m) => text(m.role).toUpperCase() + ': ' + text(m.content).slice(0, 300))
    .join('\n');
  const prompt =
    'Generate a short title (4-7 words) for this conversation. ' +
    'Reply with ONLY the title, no quotes, no punctuation at end:\n\n' + exchange;

  const title = await generateTitle(prompt);
  if (title === null) return err('Could not generate title', 500);
  return json({ title });
});
