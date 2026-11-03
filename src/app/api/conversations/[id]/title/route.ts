import { eq } from 'drizzle-orm';
import { getDb } from '@/server/db';
import { conversations } from '@/server/db/schema';
import { clip, conversationToDict, getOwnedConversation } from '@/server/conversations';
import { err, json, readJson, withAuth } from '@/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const PATCH = withAuth<{ id: string }>(async (req, user, { params }) => {
  const { id } = await params;
  const conv = await getOwnedConversation(id, user.id);
  if (!conv) return err('Not found', 404);

  const data = await readJson(req);
  const raw = typeof data.title === 'string' ? data.title : 'New Conversation';
  const [updated] = await getDb()
    .update(conversations)
    .set({ title: clip(raw.trim(), 200) })
    .where(eq(conversations.id, id))
    .returning();
  return json(conversationToDict(updated));
});
