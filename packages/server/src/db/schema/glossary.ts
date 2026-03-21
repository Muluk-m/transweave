import { boolean, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { teams } from './teams';
import { projects } from './projects';
import { users } from './users';

export const glossaryEntries = pgTable(
  'glossary_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    sourceTerm: text('source_term').notNull(),
    translations: jsonb('translations').$type<Record<string, string>>().notNull(),
    description: text('description'),
    caseSensitive: boolean('case_sensitive').default(false).notNull(),
    doNotTranslate: boolean('do_not_translate').default(false).notNull(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('glossary_team_id_idx').on(table.teamId),
    index('glossary_project_id_idx').on(table.projectId),
    uniqueIndex('glossary_scope_term_unique').on(table.teamId, table.projectId, table.sourceTerm),
  ],
);

export type GlossaryEntry = typeof glossaryEntries.$inferSelect;
export type NewGlossaryEntry = typeof glossaryEntries.$inferInsert;
