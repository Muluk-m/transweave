import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { AiConfigStored } from '../../ai/providers/translation-provider.interface';

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  aiConfig: jsonb('ai_config').$type<AiConfigStored>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
