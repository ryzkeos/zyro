import { and, desc, eq, ilike } from 'drizzle-orm';
import { getDb } from '@/server/db';
import { conversations, messages } from '@/server/db/schema';
import { clip } from '@/server/conversations';
import { json, withAuth } from '@/server/http';
import { rateLimit } from '@/server/ratelimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MIN_QUERY = 2;
const MAX_QUERY = 100;
const LIMIT = 25;

function snippet(content: string, query: string, ctx = 90): string {
  const idx = content.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return content.slice(0, ctx * 2);
  const s = Math.max(0, idx - ctx);
  const e = Math.min(content.length, idx + query.length + ctx);
  let out = content.slice(s, e);
  if (s > 0) out = `…${out}`;
  if (e < content.length) out = `${out}…`;
  return out;
}

export const GET = withAuth(async (req, user) => {
  const blocked = await rateLimit(req, 'search', [{ limit: 30, windowSec: 60 }]);
  if (blocked) return blocked;

  const q = clip((req.nextUrl.searchParams.get('q') ?? '').trim(), MAX_QUERY);
  if (Array.from(q).length < MIN_QUERY) return json([]);

  const rows = await getDb()
    .select({
      messageId: messages.id,
      conversationId: conversations.id,
      conversationTitle: conversations.title,
      role: messages.role,
      content: messages.content,
      timestamp: messages.timestamp,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(and(
      eq(conversations.userId, user.id),
      ilike(messages.content, `%${q}%`),
      eq(messages.isError, false),
    ))
    .orderBy(desc(conversations.lastUpdated))
    .limit(LIMIT);

  return json(rows.map(({ content, ...r }) => ({ ...r, snippet: snippet(content, q) })));
});
