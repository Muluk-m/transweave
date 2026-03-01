import { index, pgTable, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users';
import { teams } from './teams';

export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull(), // 'owner' | 'manager' | 'member'
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('memberships_user_team_unique').on(table.userId, table.teamId),
    index('memberships_user_id_idx').on(table.userId),
    index('memberships_team_id_idx').on(table.teamId),
  ],
);

export type Membership = typeof memberships.$inferSelect;
export type NewMembership = typeof memberships.$inferInsert;
