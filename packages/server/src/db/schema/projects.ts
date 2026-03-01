import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { teams } from './teams';

export interface ProjectModule {
  name: string;
  code: string;
}

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    url: text('url').notNull(),
    defaultLang: text('default_lang'),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    description: text('description'),
    languages: jsonb('languages').$type<string[]>().default([]),
    languageLabels: jsonb('language_labels').$type<Record<string, string>>().default({}),
    modules: jsonb('modules').$type<ProjectModule[]>().default([]),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('projects_team_id_idx').on(table.teamId),
  ],
);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
