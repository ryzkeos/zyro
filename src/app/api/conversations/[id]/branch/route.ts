import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/server/db';
import { conversations, messages } from '@/server/db/schema';
import { clip, conversationToDict, getOwnedConversation } from '@/server/conversations';
import { err, json, readJson, withAuth } from '@/server/http';
import { rateLimit } from '@/server/ratelimit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = withAuth<{ id: string }>(async (req, user, { params }) => {
  const blocked = await rateLimit(req, 'branch', [{ limit: 20, windowSec: 60 }]);
  if (blocked) return blocked;

  const { id } = await params;
  const data = await readJson(req);
  const messageId = typeof data.message_id === 'string' ? data.message_id : '';

  const conv = await getOwnedConversation(id, user.id);
  if (!conv) return err('Not found', 404);

  const db = getDb();
  const all = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.timestamp));

  const cutoff = messageId ? all.findIndex((m) => m.id === messageId) : -1;
  const source = cutoff === -1 ? all : all.slice(0, cutoff + 1);
  if (source.length === 0) return err('No messages to branch from', 400);

  const result = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(conversations)
      .values({
        id: crypto.randomUUID(),
        userId: user.id,
        title: `↳ ${clip(conv.title ?? '', 80)}`,
        lastUpdated: new Date(),
      })
      .returning();
    const copied = await tx
      .insert(messages)
      .values(source.map((m) => ({
        id: crypto.randomUUID(),
        conversationId: created.id,
        role: m.role,
        content: m.content,
        isError: m.isError,
        model: m.model,
        timestamp: m.timestamp,
      })))
      .returning();
    return { created, copied: copied.sort((a, b) => a.timestamp - b.timestamp) };
  });

  return json(conversationToDict(result.created, result.copied), 201);
});
