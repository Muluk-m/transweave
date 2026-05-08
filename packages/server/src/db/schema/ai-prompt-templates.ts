import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { teams } from './teams';
import { users } from './users';

export type PromptKind =
  | 'translate'
  | 'translate_plural'
  | 'translate_batch'
  | 'tone_adjust';

export const aiPromptTemplates = pgTable(
  'ai_prompt_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** 'team' | 'project' — enforced in service */
    scope: varchar('scope', { length: 16 }).notNull(),
    /** team.id or project.id depending on scope */
    scopeId: uuid('scope_id').notNull(),
    /** Owning team — used for permission scoping when scope=project */
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    kind: varchar('kind', { length: 32 }).notNull(),
    name: text('name').notNull(),
    body: text('body').notNull(),
    /** Documentation for variables used in this template body */
    variables: jsonb('variables').$type<string[]>().default([]),
    /** At most one default per (scope, scopeId, kind) — enforced in service inside a transaction */
    isDefault: boolean('is_default').notNull().default(false),
    createdBy: uuid('created_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('ai_prompt_templates_scope_idx').on(table.scope, table.scopeId, table.kind),
    index('ai_prompt_templates_team_idx').on(table.teamId),
  ],
);

export type AiPromptTemplate = typeof aiPromptTemplates.$inferSelect;
export type NewAiPromptTemplate = typeof aiPromptTemplates.$inferInsert;
