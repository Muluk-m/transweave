import { PGlite } from '@electric-sql/pglite';
import { createTestDb, cleanupTestDb } from '../../db/test-utils';
import type { DrizzleDB } from '../../db/drizzle.types';
import { TeamRepository } from '../team.repository';
import { ProjectRepository } from '../project.repository';
import { AiConnectorRepository } from '../ai-connector.repository';

describe('AiConnectorRepository', () => {
  let db: DrizzleDB;
  let client: PGlite;
  let teamRepo: TeamRepository;
  let projectRepo: ProjectRepository;
  let connectorRepo: AiConnectorRepository;

  let teamId: string;
  let otherTeamId: string;
  let projectId: string;
  let otherProjectId: string;

  beforeAll(async () => {
    ({ db, client } = await createTestDb());
    teamRepo = new TeamRepository(db);
    projectRepo = new ProjectRepository(db);
    connectorRepo = new AiConnectorRepository(db);

    const team = await teamRepo.create({ name: 'ConnectorTeam', url: 'connector-team' });
    teamId = team.id;

    const otherTeam = await teamRepo.create({ name: 'OtherTeam', url: 'other-team' });
    otherTeamId = otherTeam.id;

    const project = await projectRepo.create({
      name: 'ConnectorProject',
      url: 'connector-project',
      teamId,
    });
    projectId = project.id;

    const otherProject = await projectRepo.create({
      name: 'OtherProject',
      url: 'other-project',
      teamId,
    });
    otherProjectId = otherProject.id;
  });

  afterAll(async () => {
    await cleanupTestDb(client);
  });

  describe('listForTeam', () => {
    it('creates and lists team-scoped connectors', async () => {
      const connector = await connectorRepo.create({
        scope: 'team',
        teamId,
        displayName: 'Team OpenAI',
        provider: 'openai',
        apiKey: 'sk-team-key',
      });

      const results = await connectorRepo.listForTeam(teamId);
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((c) => c.id === connector.id)).toBe(true);
    });

    it('does not return project-scoped connectors for the team', async () => {
      await connectorRepo.create({
        scope: 'project',
        teamId,
        projectId,
        displayName: 'Project OpenAI',
        provider: 'openai',
        apiKey: 'sk-project-key',
      });

      const results = await connectorRepo.listForTeam(teamId);
      expect(results.every((c) => c.scope === 'team')).toBe(true);
    });

    it('does not return team-scoped connectors from other teams', async () => {
      await connectorRepo.create({
        scope: 'team',
        teamId: otherTeamId,
        displayName: 'Other Team OpenAI',
        provider: 'openai',
        apiKey: 'sk-other-team-key',
      });

      const results = await connectorRepo.listForTeam(teamId);
      expect(results.every((c) => c.teamId === teamId)).toBe(true);
    });
  });

  describe('listForProject', () => {
    it('lists project-visible connectors as team-shared plus project-private', async () => {
      // Create a team-scoped connector for this team
      const teamConnector = await connectorRepo.create({
        scope: 'team',
        teamId,
        displayName: 'Shared Team Connector',
        provider: 'claude',
        apiKey: 'sk-shared',
      });

      // Create a project-scoped connector for this project
      const projectConnector = await connectorRepo.create({
        scope: 'project',
        teamId,
        projectId,
        displayName: 'Private Project Connector',
        provider: 'claude',
        apiKey: 'sk-private',
      });

      const results = await connectorRepo.listForProject(projectId);
      const ids = results.map((c) => c.id);
      expect(ids).toContain(teamConnector.id);
      expect(ids).toContain(projectConnector.id);
    });

    it('excludes other teams team-scoped connectors', async () => {
      const otherTeamConnector = await connectorRepo.create({
        scope: 'team',
        teamId: otherTeamId,
        displayName: 'Other Team Connector',
        provider: 'openai',
        apiKey: 'sk-other',
      });

      const results = await connectorRepo.listForProject(projectId);
      const ids = results.map((c) => c.id);
      expect(ids).not.toContain(otherTeamConnector.id);
    });

    it('excludes project-scoped connectors belonging to other projects', async () => {
      const otherProjectConnector = await connectorRepo.create({
        scope: 'project',
        teamId,
        projectId: otherProjectId,
        displayName: 'Other Project Connector',
        provider: 'openai',
        apiKey: 'sk-other-proj',
      });

      const results = await connectorRepo.listForProject(projectId);
      const ids = results.map((c) => c.id);
      expect(ids).not.toContain(otherProjectConnector.id);
    });

    it('returns empty array when project does not exist', async () => {
      const results = await connectorRepo.listForProject('00000000-0000-0000-0000-000000000000');
      expect(results).toEqual([]);
    });
  });
});
