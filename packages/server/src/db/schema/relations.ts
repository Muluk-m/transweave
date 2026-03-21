import { relations } from 'drizzle-orm';
import { users } from './users';
import { teams } from './teams';
import { memberships } from './memberships';
import { projects } from './projects';
import { tokens } from './tokens';
import { tokenHistory } from './token-history';
import { activityLogs } from './activity-logs';
import { apiKeys } from './api-keys';
import { glossaryEntries } from './glossary';
import { translationMemory } from './translation-memory';

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
  tokenHistory: many(tokenHistory),
  activityLogs: many(activityLogs),
  apiKeys: many(apiKeys),
}));

export const teamsRelations = relations(teams, ({ many }) => ({
  memberships: many(memberships),
  projects: many(projects),
  glossaryEntries: many(glossaryEntries),
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
  glossaryEntries: many(glossaryEntries),
  translationMemory: many(translationMemory),
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

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

export const glossaryEntriesRelations = relations(glossaryEntries, ({ one }) => ({
  team: one(teams, {
    fields: [glossaryEntries.teamId],
    references: [teams.id],
  }),
  project: one(projects, {
    fields: [glossaryEntries.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [glossaryEntries.createdBy],
    references: [users.id],
  }),
}));

export const translationMemoryRelations = relations(translationMemory, ({ one }) => ({
  project: one(projects, {
    fields: [translationMemory.projectId],
    references: [projects.id],
  }),
  token: one(tokens, {
    fields: [translationMemory.tokenId],
    references: [tokens.id],
  }),
  creator: one(users, {
    fields: [translationMemory.createdBy],
    references: [users.id],
  }),
}));
