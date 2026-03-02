import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { users } from './users';

export enum ActivityType {
  PROJECT_CREATE = 'PROJECT_CREATE',
  PROJECT_UPDATE = 'PROJECT_UPDATE',
  PROJECT_DELETE = 'PROJECT_DELETE',
  PROJECT_LANGUAGE_ADD = 'PROJECT_LANGUAGE_ADD',
  PROJECT_LANGUAGE_REMOVE = 'PROJECT_LANGUAGE_REMOVE',
  TOKEN_CREATE = 'TOKEN_CREATE',
  TOKEN_UPDATE = 'TOKEN_UPDATE',
  TOKEN_DELETE = 'TOKEN_DELETE',
  TOKEN_BATCH_UPDATE = 'TOKEN_BATCH_UPDATE',
  PROJECT_EXPORT = 'PROJECT_EXPORT',
  PROJECT_IMPORT = 'PROJECT_IMPORT',
}

export interface ActivityDetails {
  entityId?: string;
  entityType?: 'project' | 'token';
  entityName?: string;
  changes?: Array<{ field: string; oldValue?: unknown; newValue?: unknown }>;
  language?: string;
  format?: string;
  mode?: string;
  stats?: { added?: number; updated?: number; unchanged?: number; total?: number };
  metadata?: Record<string, unknown>;
}

export const activityLogs = pgTable(
  'activity_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: varchar('type', { length: 50 }).notNull(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'set null' }),
    details: jsonb('details').$type<ActivityDetails>(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('activity_logs_project_created_idx').on(table.projectId, table.createdAt),
    index('activity_logs_user_created_idx').on(table.userId, table.createdAt),
    index('activity_logs_type_created_idx').on(table.type, table.createdAt),
  ],
);

export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
