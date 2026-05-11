import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, LoggerService, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// Suppress logs during tests
class SilentLogger implements LoggerService {
  log() {}
  error() {}
  warn() {}
  debug() {}
  verbose() {}
}

describe('AiConnectors (e2e)', () => {
  let app: INestApplication<App>;
  let ownerToken: string;
  let memberToken: string;
  let teamId: string;
  let projectId: string;
  let testDataDir: string;

  beforeAll(async () => {
    testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'transweave-e2e-connectors-'));

    // Set env vars before AppModule is loaded (dynamic import avoids hoisting issues)
    process.env.JWT_SECRET = 'e2e-connectors-jwt-secret-12345';
    process.env.PGLITE_DATA_DIR = testDataDir;
    process.env.AI_ENCRYPTION_KEY = 'e2e-test-encryption-key-32-chars-min!';

    // Dynamic import so env vars are set before module evaluation
    const { AppModule } = await import('../src/app.module');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .setLogger(new SilentLogger())
      .compile();

    app = moduleFixture.createNestApplication({ logger: new SilentLogger() });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    // ── Seed: owner (via /api/auth/setup) ─────────────────────────────────
    const setupRes = await request(app.getHttpServer())
      .post('/api/auth/setup')
      .send({
        name: 'Owner User',
        email: 'owner@connectors.test',
        password: 'Password123!',
        teamName: 'Connectors Team',
      })
      .expect(201);

    ownerToken = setupRes.body.token;

    // ── Get teamId ─────────────────────────────────────────────────────────
    const teamsRes = await request(app.getHttpServer())
      .get('/api/team/all')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    teamId = teamsRes.body[0].id;

    // ── Create a project ──────────────────────────────────────────────────
    const projectRes = await request(app.getHttpServer())
      .post('/api/project/create')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Connectors Test Project',
        teamId,
        url: 'https://connectors.test',
        languages: ['en', 'zh-CN'],
      })
      .expect(201);

    projectId = projectRes.body.id;

    // ── Seed: second user (member role) ───────────────────────────────────
    const memberRegRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Member User',
        email: 'member@connectors.test',
        password: 'Password123!',
      })
      .expect(201);

    memberToken = memberRegRes.body.token;
    const memberId = memberRegRes.body.user.id;

    // Add member to team
    await request(app.getHttpServer())
      .post(`/api/team/addmember/${teamId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: memberId, role: 'member' })
      .expect(201);
  }, 60000);

  afterAll(async () => {
    await app.close();
    fs.rmSync(testDataDir, { recursive: true, force: true });
  }, 30000);

  // ── Test cases ────────────────────────────────────────────────────────────

  it('owner creates a team-scoped connector', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/ai/connectors')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        scope: 'team',
        teamId,
        displayName: 'OpenAI Main',
        provider: 'openai',
        apiKey: 'sk-test',
        enabledModels: [{ modelId: 'gpt-5.5', addedManually: false }],
      })
      .expect(201);

    expect(res.body.keyHint).toBeDefined();
    // keyHint is masked from the encrypted ciphertext (not plaintext), so just verify format
    expect(res.body.keyHint).toMatch(/^\.\.\./);
    expect(res.body.apiKey).toBeUndefined();
    expect(res.body.displayName).toBe('OpenAI Main');
    expect(res.body.scope).toBe('team');
  });

  it('member cannot create a connector', async () => {
    await request(app.getHttpServer())
      .post('/api/ai/connectors')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        scope: 'team',
        teamId,
        displayName: 'Unauthorized',
        provider: 'openai',
        apiKey: 'sk-test',
        enabledModels: [],
      })
      .expect(403);
  });

  it('rejects openai-compatible without baseUrl', async () => {
    await request(app.getHttpServer())
      .post('/api/ai/connectors')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        scope: 'team',
        teamId,
        displayName: 'Compatible No URL',
        provider: 'openai-compatible',
        apiKey: 'sk-test',
        enabledModels: [],
      })
      .expect(400);
  });

  it('lists project connectors (includes inherited team + own project scope)', async () => {
    // Create a project-scoped connector
    await request(app.getHttpServer())
      .post('/api/ai/connectors')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        scope: 'project',
        teamId,
        projectId,
        displayName: 'Claude Project',
        provider: 'claude',
        apiKey: 'sk-ant-test',
        enabledModels: [],
      })
      .expect(201);

    // List by projectId — should include both team-scoped and project-scoped
    const res = await request(app.getHttpServer())
      .get(`/api/ai/connectors?projectId=${projectId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    // All rows must have keyHint, not apiKey
    for (const row of res.body) {
      expect(row.apiKey).toBeUndefined();
      expect(row.keyHint).toBeDefined();
    }
  });

  it('requires teamId or projectId on list', async () => {
    await request(app.getHttpServer())
      .get('/api/ai/connectors')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(400);
  });

  it('owner can update a connector display name', async () => {
    // Create a connector to update
    const createRes = await request(app.getHttpServer())
      .post('/api/ai/connectors')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        scope: 'team',
        teamId,
        displayName: 'To Be Updated',
        provider: 'deepl',
        apiKey: 'deepl-key-test',
        enabledModels: [],
      })
      .expect(201);

    const connectorId = createRes.body.id;

    const updateRes = await request(app.getHttpServer())
      .patch(`/api/ai/connectors/${connectorId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ displayName: 'Updated Name' })
      .expect(200);

    expect(updateRes.body.displayName).toBe('Updated Name');
    expect(updateRes.body.apiKey).toBeUndefined();
    expect(updateRes.body.keyHint).toBeDefined();
  });

  it('owner can delete a connector', async () => {
    // Create a connector to delete
    const createRes = await request(app.getHttpServer())
      .post('/api/ai/connectors')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        scope: 'team',
        teamId,
        displayName: 'To Be Deleted',
        provider: 'gemini',
        apiKey: 'gemini-key-test',
        enabledModels: [],
      })
      .expect(201);

    const connectorId = createRes.body.id;

    await request(app.getHttpServer())
      .delete(`/api/ai/connectors/${connectorId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.ok).toBe(true);
      });
  });

  describe('probe-models', () => {
    it('returns recommended models for claude (no network call)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/ai/connectors/probe-models')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ provider: 'claude', apiKey: 'fake-key' })
        .expect(201);

      expect(res.body.source).toBe('recommended');
      expect(Array.isArray(res.body.models)).toBe(true);
      expect(res.body.models.length).toBeGreaterThan(0);
      // Should contain at least one claude model
      expect(res.body.models.some((m: string) => m.includes('claude'))).toBe(true);
    });

    it('returns static empty list for deepl (not an LLM provider)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/ai/connectors/probe-models')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ provider: 'deepl', apiKey: 'fake-key' })
        .expect(201);

      expect(res.body.source).toBe('static');
      expect(res.body.models).toEqual([]);
    });

    it('rejects unauthenticated requests', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/ai/connectors/probe-models')
        .send({ provider: 'claude', apiKey: 'fake-key' });
      // AuthGuard returns 401 or 403 depending on implementation
      expect([401, 403]).toContain(res.status);
    });
  });

  describe('defaults', () => {
    let teamConnectorId: string;

    beforeAll(async () => {
      // Create a team-scoped openai connector for defaults tests
      const res = await request(app.getHttpServer())
        .post('/api/ai/connectors')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          scope: 'team',
          teamId,
          displayName: 'OpenAI Defaults Test',
          provider: 'openai',
          apiKey: 'sk-defaults-test',
          enabledModels: [{ modelId: 'gpt-5.5', addedManually: false }],
        })
        .expect(201);

      teamConnectorId = res.body.id;
    });

    it('owner sets team default connector + model', async () => {
      await request(app.getHttpServer())
        .put(`/api/ai/defaults/team/${teamId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ connectorId: teamConnectorId, model: 'gpt-5.5' })
        .expect(200)
        .expect((res) => {
          expect(res.body.ok).toBe(true);
        });
    });

    it('resolve returns configured: true with source: team after setting team default', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/ai/defaults/resolve?projectId=${projectId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(res.body.configured).toBe(true);
      expect(res.body.source).toBe('team');
      expect(res.body.toolCalling).toBe(true);
      expect(res.body.connectorId).toBe(teamConnectorId);
      expect(res.body.model).toBe('gpt-5.5');
      expect(res.body.keyHint).toMatch(/^\.\.\./);
    });

    it('member can resolve but not set defaults', async () => {
      // Member can resolve
      const resolveRes = await request(app.getHttpServer())
        .get(`/api/ai/defaults/resolve?projectId=${projectId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);
      expect(resolveRes.body.configured).toBe(true);

      // Member cannot set team defaults
      await request(app.getHttpServer())
        .put(`/api/ai/defaults/team/${teamId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ connectorId: teamConnectorId, model: 'gpt-5.5' })
        .expect(403);
    });

    it('owner can clear team default by passing null', async () => {
      await request(app.getHttpServer())
        .put(`/api/ai/defaults/team/${teamId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ connectorId: null, model: null })
        .expect(200)
        .expect((res) => {
          expect(res.body.ok).toBe(true);
        });

      // After clearing, resolve should return configured: false (no project default either)
      const resolveRes = await request(app.getHttpServer())
        .get(`/api/ai/defaults/resolve?projectId=${projectId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(resolveRes.body.configured).toBe(false);
    });
  });
});
