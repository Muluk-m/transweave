import { check, index, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { teams } from './teams';
import { projects } from './projects';
import { users } from './users';

export type EnabledModel = {
  modelId: string;
  label?: string;
  addedManually: boolean;
};

export const aiConnectors = pgTable(
  'ai_connectors',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    scope: varchar('scope', { length: 10 }).notNull(),
    teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    displayName: varchar('display_name', { length: 80 }).notNull(),
    provider: varchar('provider', { length: 30 }).notNull(),
    apiKey: text('api_key').notNull(),
    baseUrl: varchar('base_url', { length: 500 }),
    enabledModels: jsonb('enabled_models').$type<EnabledModel[]>().notNull().default([]),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('ai_connectors_team_id_idx').on(table.teamId),
    index('ai_connectors_project_id_idx').on(table.projectId),
    check(
      'ai_connectors_scope_consistent',
      sql`(scope = 'team' AND project_id IS NULL) OR (scope = 'project' AND project_id IS NOT NULL)`,
    ),
  ],
);

export type AiConnector = typeof aiConnectors.$inferSelect;
export type NewAiConnector = typeof aiConnectors.$inferInsert;
