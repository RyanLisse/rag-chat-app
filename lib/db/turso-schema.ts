import type { InferSelectModel } from 'drizzle-orm';
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

// SQLite doesn't have native UUID support, so we'll use TEXT with a UUID constraint
const uuid = (name: string) =>
  text(name)
    .$defaultFn(() => crypto.randomUUID())
    .notNull();

const timestamp = (name: string) =>
  text(name)
    .$defaultFn(() => new Date().toISOString())
    .notNull();

export const user = sqliteTable('User', {
  id: uuid('id').primaryKey(),
  email: text('email', { length: 64 }).notNull(),
  password: text('password', { length: 64 }),
});

export type User = InferSelectModel<typeof user>;

export const chat = sqliteTable('Chat', {
  id: uuid('id').primaryKey(),
  createdAt: timestamp('createdAt'),
  title: text('title').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id),
  visibility: text('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
export const messageDeprecated = sqliteTable('Message', {
  id: uuid('id').primaryKey(),
  chatId: text('chatId')
    .notNull()
    .references(() => chat.id),
  role: text('role').notNull(),
  content: text('content', { mode: 'json' }).notNull(),
  createdAt: timestamp('createdAt'),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = sqliteTable('Message_v2', {
  id: uuid('id').primaryKey(),
  chatId: text('chatId')
    .notNull()
    .references(() => chat.id),
  role: text('role').notNull(),
  parts: text('parts', { mode: 'json' }).notNull(),
  attachments: text('attachments', { mode: 'json' }).notNull(),
  createdAt: timestamp('createdAt'),
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
export const voteDeprecated = sqliteTable(
  'Vote',
  {
    chatId: text('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: text('messageId')
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: integer('isUpvoted', { mode: 'boolean' }).notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = sqliteTable(
  'Vote_v2',
  {
    chatId: text('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: text('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: integer('isUpvoted', { mode: 'boolean' }).notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type Vote = InferSelectModel<typeof vote>;

export const document = sqliteTable(
  'Document',
  {
    id: uuid('id'),
    createdAt: timestamp('createdAt'),
    title: text('title').notNull(),
    content: text('content'),
    kind: text('kind', { enum: ['text', 'code', 'image', 'sheet'] })
      .notNull()
      .default('text'),
    userId: text('userId')
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  }
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = sqliteTable('Suggestion', {
  id: uuid('id').primaryKey(),
  documentId: text('documentId').notNull(),
  documentCreatedAt: text('documentCreatedAt').notNull(),
  originalText: text('originalText').notNull(),
  suggestedText: text('suggestedText').notNull(),
  description: text('description'),
  isResolved: integer('isResolved', { mode: 'boolean' })
    .notNull()
    .default(false),
  userId: text('userId')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('createdAt'),
});

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = sqliteTable('Stream', {
  id: uuid('id').primaryKey(),
  chatId: text('chatId')
    .notNull()
    .references(() => chat.id),
  createdAt: timestamp('createdAt'),
});

export type Stream = InferSelectModel<typeof stream>;
