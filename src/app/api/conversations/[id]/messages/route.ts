import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/server/db';
import { conversations, messages } from '@/server/db/schema';
import { getOwnedConversation, messageToDict } from '@/server/conversations';
import { err, json, readJson, withAuth } from '@/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withAuth<{ id: string }>(async (_req, user, { params }) => {
  const { id } = await params;
  const conv = await getOwnedConversation(id, user.id);
  if (!conv) return err('Not found', 404);

  const rows = await getDb()
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.timestamp));
  return json(rows.map(messageToDict));
});

export const POST = withAuth<{ id: string }>(async (req, user, { params }) => {
  const { id } = await params;
  const conv = await getOwnedConversation(id, user.id);
  if (!conv) return err('Not found', 404);

  const data = await readJson(req);
  const now = Date.now();

  const msg = await getDb().transaction(async (tx) => {
    const [saved] = await tx
      .insert(messages)
      .values({
        id: typeof data.id === 'string' && data.id ? data.id : crypto.randomUUID(),
        conversationId: id,
        role: typeof data.role === 'string' ? data.role : 'user',
        content: typeof data.content === 'string' ? data.content : '',
        isError: data.isError === true,
        model: typeof data.model === 'string' ? data.model : null,
        timestamp: typeof data.timestamp === 'number' && data.timestamp ? data.timestamp : now,
      })
      .returning();
    await tx.update(conversations).set({ lastUpdated: new Date(now) }).where(eq(conversations.id, id));
    return saved;
  });
  return json(messageToDict(msg), 201);
});
