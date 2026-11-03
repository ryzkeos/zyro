import { eq } from 'drizzle-orm';
import { getDb } from '@/server/db';
import { conversations, messages } from '@/server/db/schema';
import { getOwnedConversation } from '@/server/conversations';
import { err, json, withAuth } from '@/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const DELETE = withAuth<{ id: string }>(async (_req, user, { params }) => {
  const { id } = await params;
  const conv = await getOwnedConversation(id, user.id);
  if (!conv) return err('Not found', 404);

  await getDb().transaction(async (tx) => {
    await tx.delete(messages).where(eq(messages.conversationId, id));
    await tx.delete(conversations).where(eq(conversations.id, id));
  });
  return json({ deleted: id });
});
