import { index, jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tokens } from './tokens';
import { users } from './users';

export const tokenHistory = pgTable(
  'token_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tokenId: uuid('token_id')
      .notNull()
      .references(() => tokens.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'set null' }),
    translations: jsonb('translations').$type<Record<string, string>>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('token_history_token_id_idx').on(table.tokenId),
  ],
);

export type TokenHistoryRecord = typeof tokenHistory.$inferSelect;
export type NewTokenHistoryRecord = typeof tokenHistory.$inferInsert;
