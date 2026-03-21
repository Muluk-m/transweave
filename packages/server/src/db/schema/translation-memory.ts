import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { tokens } from './tokens';
import { users } from './users';

export const translationMemory = pgTable(
  'translation_memory',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    sourceLanguage: text('source_language').notNull(),
    targetLanguage: text('target_language').notNull(),
    sourceText: text('source_text').notNull(),
    targetText: text('target_text').notNull(),
    tokenId: uuid('token_id').references(() => tokens.id, { onDelete: 'set null' }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('tm_project_langs_idx').on(table.projectId, table.sourceLanguage, table.targetLanguage),
    uniqueIndex('tm_project_source_unique').on(
      table.projectId,
      table.sourceLanguage,
      table.targetLanguage,
      table.sourceText,
    ),
  ],
);

export type TranslationMemoryEntry = typeof translationMemory.$inferSelect;
export type NewTranslationMemoryEntry = typeof translationMemory.$inferInsert;
