import { AiConnectorMigrationService } from '../ai-connector-migration.service';

// Mock encryption.util so we can simulate decrypt failures
jest.mock('../encryption.util', () => ({
  ...jest.requireActual('../encryption.util'),
  decryptApiKey: jest.fn((key: string) => {
    if (key === 'BAD_CIPHERTEXT') throw new Error('Decryption failed');
    return 'plaintext-key';
  }),
}));

describe('AiConnectorMigrationService.runOnce', () => {
  const oldTeamConfig = { provider: 'openai', apiKey: 'enc:abc', model: 'gpt-5.5', baseUrl: null };
  const oldProjectConfig = { provider: 'claude', apiKey: 'enc:def', model: 'claude-sonnet-4-6', baseUrl: null };

  function makeService(initial: { teams: any[]; projects: any[] }) {
    const teams = [...initial.teams];
    const projects = [...initial.projects];
    const created: any[] = [];
    const connectors = {
      create: jest.fn(async (data) => { const row = { id: `c${created.length + 1}`, ...data }; created.push(row); return row; }),
      delete: jest.fn(async () => undefined),
    };
    const teamRepo = {
      findAllWithLegacyConfig: jest.fn().mockResolvedValue(teams.filter((t) => t.aiConfig && !t.defaultConnectorId)),
      update: jest.fn(async (id, patch) => { Object.assign(teams.find((t) => t.id === id), patch); }),
    };
    const projectRepo = {
      findAllWithLegacyConfig: jest.fn().mockResolvedValue(projects.filter((p) => p.aiConfig && !p.defaultConnectorId)),
      update: jest.fn(async (id, patch) => { Object.assign(projects.find((p) => p.id === id), patch); }),
    };
    // Advisory-lock mock: report locked=true so the migration always proceeds in tests.
    const db = {
      execute: jest.fn(async (q: any) => {
        const queryStr = String(q?.queryChunks ?? q);
        if (queryStr.includes('pg_try_advisory_lock')) return [{ locked: true }];
        return [];
      }),
    };
    const svc = new AiConnectorMigrationService(connectors as any, teamRepo as any, projectRepo as any, db as any);
    return { svc, teams, projects, created, connectors, teamRepo, projectRepo, db };
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

  it('skips rows whose apiKey is not decryptable and returns non-zero skipped counters', async () => {
    const badTeamConfig = { provider: 'openai', apiKey: 'BAD_CIPHERTEXT', model: 'gpt-5.5', baseUrl: null };
    const badProjectConfig = { provider: 'claude', apiKey: 'BAD_CIPHERTEXT', model: 'claude-sonnet-4-6', baseUrl: null };

    const { svc, teams, projects, created } = makeService({
      teams: [
        { id: 't1', aiConfig: badTeamConfig, defaultConnectorId: null },
        { id: 't2', aiConfig: oldTeamConfig, defaultConnectorId: null },
      ],
      projects: [
        { id: 'p1', teamId: 't1', aiConfig: badProjectConfig, defaultConnectorId: null },
      ],
    });

    const result = await svc.runOnce();

    // Only t2 should have been migrated; t1 (bad key) and p1 (bad key) should be skipped
    expect(result.migratedTeams).toBe(1);
    expect(result.skippedTeams).toBe(1);
    expect(result.migratedProjects).toBe(0);
    expect(result.skippedProjects).toBe(1);

    // Only one connector created (for t2)
    expect(created).toHaveLength(1);
    expect(created[0].teamId).toBe('t2');

    // t1 must NOT have defaultConnectorId set
    expect(teams.find((t) => t.id === 't1')?.defaultConnectorId).toBeNull();
    // p1 must NOT have defaultConnectorId set
    expect(projects.find((p) => p.id === 'p1')?.defaultConnectorId).toBeNull();
  });
});
