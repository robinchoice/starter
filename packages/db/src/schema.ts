import type { FeedbackContext } from '@app/shared';
import { customType, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer }>({ dataType: () => 'bytea' });

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  // Stored lowercase, see the email schema in @app/shared
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const magicLinks = pgTable('magic_links', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Mobile apps log in with a code from the mail, a link can't open the app
export const loginCodes = pgTable('login_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  codeHash: varchar('code_hash', { length: 64 }).notNull(),
  attempts: integer('attempts').default(0).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Counters of lib/rate-limit.ts in the API
export const rateLimits = pgTable('rate_limits', {
  key: varchar('key', { length: 300 }).primaryKey(),
  count: integer('count').notNull(),
  resetAt: timestamp('reset_at').notNull(),
});

// Bug reports and ideas from the feedback button, also mailed and filed as
// GitHub issues. The random id is the key of the screenshot URL.
export const feedback = pgTable('feedback', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  kind: varchar('kind', { length: 10 }).notNull(),
  message: text('message').notNull(),
  screenshot: bytea('screenshot'),
  context: jsonb('context').$type<FeedbackContext & { api: string }>().notNull(),
  issueUrl: varchar('issue_url', { length: 300 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
