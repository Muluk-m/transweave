import { AiConnectorMigrationService } from '../ai-connector-migration.service';

describe('AiConnectorMigrationService.runOnce', () => {
  const oldTeamConfig = { provider: 'openai', apiKey: 'enc:abc', model: 'gpt-5.5', baseUrl: null };
  const oldProjectConfig = { provider: 'claude', apiKey: 'enc:def', model: 'claude-sonnet-4-6', baseUrl: null };

  function makeService(initial: { teams: any[]; projects: any[] }) {
    const teams = [...initial.teams];
    const projects = [...initial.projects];
    const created: any[] = [];
    const connectors = {
      create: jest.fn(async (data) => { const row = { id: `c${created.length + 1}`, ...data }; created.push(row); return row; }),
    };
    const teamRepo = {
      findAllWithLegacyConfig: jest.fn().mockResolvedValue(teams.filter((t) => t.aiConfig && !t.defaultConnectorId)),
      update: jest.fn(async (id, patch) => { Object.assign(teams.find((t) => t.id === id), patch); }),
    };
    const projectRepo = {
      findAllWithLegacyConfig: jest.fn().mockResolvedValue(projects.filter((p) => p.aiConfig && !p.defaultConnectorId)),
      update: jest.fn(async (id, patch) => { Object.assign(projects.find((p) => p.id === id), patch); }),
    };
    const svc = new AiConnectorMigrationService(connectors as any, teamRepo as any, projectRepo as any);
    return { svc, teams, projects, created, connectors, teamRepo, projectRepo };
  }

  it('migrates team with legacy aiConfig into a Default connector + sets default', async () => {
    const { svc, teams, created } = makeService({
      teams: [{ id: 't1', aiConfig: oldTeamConfig, defaultConnectorId: null }],
      projects: [],
    });
    await svc.runOnce();
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ scope: 'team', teamId: 't1', provider: 'openai', displayName: 'Default (migrated)' });
    expect(created[0].enabledModels).toEqual([{ modelId: 'gpt-5.5', addedManually: true }]);
    expect(teams[0].defaultConnectorId).toBe(created[0].id);
    expect(teams[0].defaultModel).toBe('gpt-5.5');
  });

  it('migrates project legacy aiConfig as project-scoped connector', async () => {
    const { svc, projects, created } = makeService({
      teams: [{ id: 't1', aiConfig: null, defaultConnectorId: null }],
      projects: [{ id: 'p1', teamId: 't1', aiConfig: oldProjectConfig, defaultConnectorId: null }],
    });
    await svc.runOnce();
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ scope: 'project', teamId: 't1', projectId: 'p1', provider: 'claude' });
    expect(projects[0].defaultConnectorId).toBe(created[0].id);
  });

  it('is idempotent — a second run does nothing', async () => {
    const { svc, created } = makeService({
      teams: [{ id: 't1', aiConfig: oldTeamConfig, defaultConnectorId: 'already' }],
      projects: [],
    });
    await svc.runOnce();
    expect(created).toHaveLength(0);
  });
});
