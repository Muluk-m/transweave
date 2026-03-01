import { relations } from 'drizzle-orm';
import { users } from './users';
import { teams } from './teams';
import { memberships } from './memberships';
import { projects } from './projects';
import { tokens } from './tokens';
import { tokenHistory } from './token-history';
import { activityLogs } from './activity-logs';

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
  tokenHistory: many(tokenHistory),
  activityLogs: many(activityLogs),
}));

export const teamsRelations = relations(teams, ({ many }) => ({
  memberships: many(memberships),
  projects: many(projects),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [memberships.teamId],
    references: [teams.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  team: one(teams, {
    fields: [projects.teamId],
    references: [teams.id],
  }),
  tokens: many(tokens),
  activityLogs: many(activityLogs),
}));

export const tokensRelations = relations(tokens, ({ one, many }) => ({
  project: one(projects, {
    fields: [tokens.projectId],
    references: [projects.id],
  }),
  history: many(tokenHistory),
}));

export const tokenHistoryRelations = relations(tokenHistory, ({ one }) => ({
  token: one(tokens, {
    fields: [tokenHistory.tokenId],
    references: [tokens.id],
  }),
  user: one(users, {
    fields: [tokenHistory.userId],
    references: [users.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  project: one(projects, {
    fields: [activityLogs.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));
