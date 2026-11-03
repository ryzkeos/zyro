import { and, eq } from 'drizzle-orm';
import { getDb } from './db';
import { conversations, type Conversation, type Message } from './db/schema';

const toMs = (d: Date | null) => (d ? d.getTime() : 0);

export const clip = (s: string, max: number) => Array.from(s).slice(0, max).join('');

export function messageToDict(m: Message) {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    isError: m.isError ?? false,
    model: m.model,
    timestamp: m.timestamp,
  };
}

export function conversationToDict(c: Conversation, msgs?: Message[]) {
  return {
    id: c.id,
    title: c.title,
    pinned: c.pinned ?? false,
    lastUpdated: toMs(c.lastUpdated),
    createdAt: toMs(c.createdAt),
    ...(msgs ? { messages: msgs.map(messageToDict) } : {}),
  };
}

export async function getOwnedConversation(id: string, userId: string): Promise<Conversation | undefined> {
  const [conv] = await getDb()
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
    .limit(1);
  return conv;
}
