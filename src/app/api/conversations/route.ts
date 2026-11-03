import { and, desc, eq, exists, sql } from 'drizzle-orm';
import { getDb } from '@/server/db';
import { conversations, messages } from '@/server/db/schema';
import { clip, conversationToDict } from '@/server/conversations';
import { json, readJson, withAuth } from '@/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withAuth(async (_req, user) => {
  const db = getDb();
  const rows = await db
    .select()
    .from(conversations)
    .where(and(
      eq(conversations.userId, user.id),
      exists(db.select({ one: sql`1` }).from(messages).where(eq(messages.conversationId, conversations.id))),
    ))
    .orderBy(desc(conversations.pinned), desc(conversations.lastUpdated));
  return json(rows.map((c) => conversationToDict(c)));
});

export const POST = withAuth(async (req, user) => {
  const data = await readJson(req);
  const raw = typeof data.title === 'string' && data.title ? data.title : 'New Conversation';
  const [conv] = await getDb()
    .insert(conversations)
    .values({
      id: crypto.randomUUID(),
      userId: user.id,
      title: clip(raw.trim(), 200),
      lastUpdated: new Date(),
    })
    .returning();
  return json(conversationToDict(conv), 201);
});
