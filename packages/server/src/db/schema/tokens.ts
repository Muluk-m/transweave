import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const tokens = pgTable(
  'tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull(),
    module: text('module'),
    translations: jsonb('translations').$type<Record<string, string>>().notNull(),
    tags: jsonb('tags').$type<string[]>().default([]),
    comment: text('comment'),
    screenshots: jsonb('screenshots').$type<string[]>().default([]),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('tokens_project_id_idx').on(table.projectId),
    uniqueIndex('tokens_project_key_unique').on(table.projectId, table.key),
  ],
);

export type Token = typeof tokens.$inferSelect;
export type NewToken = typeof tokens.$inferInsert;
