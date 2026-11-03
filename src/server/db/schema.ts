import { relations } from 'drizzle-orm';
import {
  bigint, boolean, index, integer, pgTable, serial, text, timestamp, varchar,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  username: varchar('username', { length: 80 }).notNull().unique(),
  email: varchar('email', { length: 120 }).notNull().unique(),
  password: varchar('password', { length: 256 }).notNull(),
  aiInstructions: text('ai_instructions').notNull().default(''),
  emailVerified: boolean('email_verified').notNull().default(false),
  createdAt: timestamp('created_at').$defaultFn(() => new Date()),
});

export const conversations = pgTable('conversations', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id),
  title: varchar('title', { length: 200 }).default('New Conversation'),
  pinned: boolean('pinned').default(false),
  lastUpdated: timestamp('last_updated').$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  createdAt: timestamp('created_at').$defaultFn(() => new Date()),
}, (t) => [index('ix_conv_user_updated').on(t.userId, t.lastUpdated)]);

export const messages = pgTable('messages', {
  id: varchar('id', { length: 36 }).primaryKey(),
  conversationId: varchar('conversation_id', { length: 36 }).notNull().references(() => conversations.id),
  role: varchar('role', { length: 10 }).notNull(),
  content: text('content').notNull(),
  isError: boolean('is_error').default(false),
  model: varchar('model', { length: 50 }),
  timestamp: bigint('timestamp', { mode: 'number' }).notNull(),
}, (t) => [index('ix_msg_conv_id').on(t.conversationId)]);

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id),
  endpoint: text('endpoint').notNull(),
  p256dh: text('p256dh').notNull(),
  auth: varchar('auth', { length: 64 }).notNull(),
  createdAt: timestamp('created_at').$defaultFn(() => new Date()),
});

export const usersRelations = relations(users, ({ many }) => ({
  conversations: many(conversations),
  pushSubscriptions: many(pushSubscriptions),
}));
export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, { fields: [conversations.userId], references: [users.id] }),
  messages: many(messages),
}));
export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
}));
export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, { fields: [pushSubscriptions.userId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
