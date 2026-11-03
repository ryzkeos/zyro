import { eq } from 'drizzle-orm';
import { getDb } from '@/server/db';
import { conversations } from '@/server/db/schema';
import { conversationToDict, getOwnedConversation } from '@/server/conversations';
import { err, json, withAuth } from '@/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const PATCH = withAuth<{ id: string }>(async (_req, user, { params }) => {
  const { id } = await params;
  const conv = await getOwnedConversation(id, user.id);
  if (!conv) return err('Not found', 404);

  const [updated] = await getDb()
    .update(conversations)
    .set({ pinned: !conv.pinned })
    .where(eq(conversations.id, id))
    .returning();
  return json(conversationToDict(updated));
});
