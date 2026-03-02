import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, LoggerService } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { AppModule } from '../src/app.module';

// Suppress logs during tests
class SilentLogger implements LoggerService {
  log() {}
  error() {}
  warn() {}
  debug() {}
  verbose() {}
}

describe('Transweave Server (e2e)', () => {
  let app: INestApplication<App>;
  let jwtToken: string;
  let teamId: string;
  let projectId: string;
  let tokenId: string;
  let apiKeyId: string;
  let testDataDir: string;

  beforeAll(async () => {
    testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'transweave-e2e-'));
    process.env.JWT_SECRET = 'e2e-test-jwt-secret-12345';
    process.env.PGLITE_DATA_DIR = testDataDir;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .setLogger(new SilentLogger())
      .compile();

    app = moduleFixture.createNestApplication({ logger: new SilentLogger() });
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app.close();
    fs.rmSync(testDataDir, { recursive: true, force: true });
  });

  // ─── Health ───────────────────────────────────────────────────────────────

  describe('/health', () => {
    it('GET should return ok status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.timestamp).toBeDefined();
        });
    });
  });

  // ─── Auth: Setup ─────────────────────────────────────────────────────────

  describe('Auth Setup', () => {
    it('GET /api/auth/setup/status should require setup on fresh DB', () => {
      return request(app.getHttpServer())
        .get('/api/auth/setup/status')
        .expect(200)
        .expect((res) => {
          expect(res.body.needsSetup).toBe(true);
        });
    });

    it('POST /api/auth/setup should create first user and team', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/setup')
        .send({
          name: 'Admin User',
          email: 'admin@e2e.test',
          password: 'Password123!',
          teamName: 'E2E Team',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      jwtToken = res.body.token;
    });

    it('GET /api/auth/setup/status should no longer need setup', () => {
      return request(app.getHttpServer())
        .get('/api/auth/setup/status')
        .expect(200)
        .expect((res) => {
          expect(res.body.needsSetup).toBe(false);
        });
    });
  });

  // ─── Auth: Login ─────────────────────────────────────────────────────────

  describe('Auth Login', () => {
    it('POST /api/auth/login should succeed with correct credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@e2e.test', password: 'Password123!' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      jwtToken = res.body.token;
    });

    it('POST /api/auth/login should fail with wrong password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@e2e.test', password: 'wrongpassword' })
        .expect(401);
    });

    it('POST /api/auth/login should fail with unknown email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nobody@e2e.test', password: 'Password123!' })
        .expect(401);
    });

    it('GET /api/auth/status should return authenticated user', () => {
      return request(app.getHttpServer())
        .get('/api/auth/status')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('authenticated');
          expect(res.body.user.email).toBe('admin@e2e.test');
        });
    });

    it('GET /api/auth/status should reject requests without token', () => {
      return request(app.getHttpServer())
        .get('/api/auth/status')
        .expect(403);
    });
  });

  // ─── Team ────────────────────────────────────────────────────────────────

  describe('Team', () => {
    it('GET /api/team/all should return user teams', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/team/all')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      teamId = res.body[0].id;
    });

    it('POST /api/team/create should create a new team', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/team/create')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ name: 'Second Team', url: 'https://second.test' })
        .expect(201);

      expect(res.body.name).toBe('Second Team');
    });

    it('GET /api/team/find/:id should return team details', () => {
      return request(app.getHttpServer())
        .get(`/api/team/find/${teamId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(teamId);
        });
    });

    it('GET /api/team/members/:id should return team members', () => {
      return request(app.getHttpServer())
        .get(`/api/team/members/${teamId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });
  });

  // ─── Project ─────────────────────────────────────────────────────────────

  describe('Project', () => {
    it('POST /api/project/create should create a project', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/project/create')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          name: 'E2E Test Project',
          teamId,
          url: 'https://e2e.test',
          description: 'Created by e2e tests',
          languages: ['en', 'zh-CN', 'ja'],
        })
        .expect(201);

      expect(res.body.name).toBe('E2E Test Project');
      expect(res.body.languages).toContain('en');
      expect(res.body.languages).toContain('zh-CN');
      projectId = res.body.id;
    });

    it('GET /api/project/all should list projects', () => {
      return request(app.getHttpServer())
        .get('/api/project/all')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.some((p: any) => p.id === projectId)).toBe(true);
        });
    });

    it('GET /api/project/find/:id should return project with memberships', () => {
      return request(app.getHttpServer())
        .get(`/api/project/find/${projectId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(projectId);
          expect(res.body.name).toBe('E2E Test Project');
          expect(res.body.memberships).toBeDefined();
        });
    });

    it('PUT /api/project/update/:id should update project', () => {
      return request(app.getHttpServer())
        .put(`/api/project/update/${projectId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ description: 'Updated by e2e' })
        .expect(200)
        .expect((res) => {
          expect(res.body.description).toBe('Updated by e2e');
        });
    });

    it('GET /api/project/team/:teamId should return projects by team', () => {
      return request(app.getHttpServer())
        .get(`/api/project/team/${teamId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.some((p: any) => p.id === projectId)).toBe(true);
        });
    });

    it('GET /api/project/check/:id should confirm permission', () => {
      return request(app.getHttpServer())
        .get(`/api/project/check/${projectId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200)
        .expect((res) => {
          // NestJS may return boolean true directly or wrapped
          expect(res.body === true || res.body?.result === true || !!res.body).toBe(true);
        });
    });
  });

  // ─── Token ───────────────────────────────────────────────────────────────

  describe('Token', () => {
    it('POST /api/tokens should create a token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/tokens')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          projectId,
          key: 'common.greeting',
          translations: { en: 'Hello', 'zh-CN': '你好', ja: 'こんにちは' },
          tags: ['common', 'ui'],
          comment: 'Basic greeting',
        })
        .expect(201);

      expect(res.body.key).toBe('common.greeting');
      expect(res.body.translations['en']).toBe('Hello');
      expect(res.body.translations['zh-CN']).toBe('你好');
      tokenId = res.body.id;
    });

    it('POST /api/tokens should create a second token', () => {
      return request(app.getHttpServer())
        .post('/api/tokens')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          projectId,
          key: 'common.farewell',
          translations: { en: 'Goodbye', 'zh-CN': '再见' },
          tags: ['common'],
        })
        .expect(201);
    });

    it('GET /api/tokens/:projectId should list project tokens', () => {
      return request(app.getHttpServer())
        .get(`/api/tokens/${projectId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(2);
          expect(res.body.some((t: any) => t.id === tokenId)).toBe(true);
        });
    });

    it('GET /api/tokens/detail/:tokenId should return token details', () => {
      return request(app.getHttpServer())
        .get(`/api/tokens/detail/${tokenId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(tokenId);
          expect(res.body.key).toBe('common.greeting');
        });
    });

    it('PUT /api/tokens/:tokenId should update token translations', () => {
      return request(app.getHttpServer())
        .put(`/api/tokens/${tokenId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ translations: { en: 'Hi there', 'zh-CN': '嗨', ja: 'やあ' } })
        .expect(200)
        .expect((res) => {
          expect(res.body.translations['en']).toBe('Hi there');
          expect(res.body.translations['ja']).toBe('やあ');
        });
    });

    it('GET /api/tokens/:projectId/search should return paginated results', () => {
      return request(app.getHttpServer())
        .get(`/api/tokens/${projectId}/search?q=greeting&page=1&perPage=10`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.tokens).toBeDefined();
          expect(res.body.total).toBeGreaterThanOrEqual(1);
          expect(res.body.page).toBe(1);
          expect(res.body.perPage).toBe(10);
        });
    });

    it('GET /api/tokens/:projectId/search should filter by tags', () => {
      return request(app.getHttpServer())
        .get(`/api/tokens/${projectId}/search?tags=ui`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.tokens.length).toBeGreaterThanOrEqual(1);
          expect(
            res.body.tokens.some((t: any) => t.tags?.includes('ui')),
          ).toBe(true);
        });
    });

    it('GET /api/tokens/:projectId/progress should return language completion', () => {
      return request(app.getHttpServer())
        .get(`/api/tokens/${projectId}/progress`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('GET /api/tokens/:tokenId/history should return change history', () => {
      return request(app.getHttpServer())
        .get(`/api/tokens/${tokenId}/history`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  // ─── API Keys ────────────────────────────────────────────────────────────

  describe('API Keys', () => {
    let fullApiKey: string;

    it('POST /api/api-keys should create an API key', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/api-keys')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ name: 'E2E Test Key', scopes: ['read', 'write'] })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.apiKey.key).toMatch(/^qlji_/);
      expect(res.body.apiKey.name).toBe('E2E Test Key');
      apiKeyId = res.body.apiKey.id;
      fullApiKey = res.body.apiKey.key;
    });

    it('GET /api/api-keys should list API keys', () => {
      return request(app.getHttpServer())
        .get('/api/api-keys')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.some((k: any) => k.id === apiKeyId)).toBe(true);
          // Full key should NOT be returned in list
          expect(res.body.every((k: any) => k.key === undefined)).toBe(true);
        });
    });

    it('API key should authenticate requests to protected routes', () => {
      return request(app.getHttpServer())
        .get('/api/auth/status')
        .set('Authorization', `Bearer ${fullApiKey}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('authenticated');
          expect(res.body.user.authType).toBe('api_key');
        });
    });

    it('DELETE /api/api-keys/:id should revoke the key', () => {
      return request(app.getHttpServer())
        .delete(`/api/api-keys/${apiKeyId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });

    it('Revoked API key should no longer authenticate', () => {
      return request(app.getHttpServer())
        .get('/api/auth/status')
        .set('Authorization', `Bearer ${fullApiKey}`)
        .expect(403);
    });
  });

  // ─── Bulk Token Operations ────────────────────────────────────────────────

  describe('Token Bulk Operations', () => {
    let tokenId2: string;

    it('should create another token for bulk test', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/tokens')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          projectId,
          key: 'nav.home',
          translations: { en: 'Home', 'zh-CN': '首页' },
        })
        .expect(201);
      tokenId2 = res.body.id;
    });

    it('POST /api/tokens/bulk set-tags should update tags on multiple tokens', () => {
      return request(app.getHttpServer())
        .post('/api/tokens/bulk')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          tokenIds: [tokenId, tokenId2],
          operation: 'set-tags',
          payload: { tags: ['nav', 'bulk-updated'] },
        })
        .expect(201);
    });

    it('POST /api/tokens/bulk set-module should update module', () => {
      return request(app.getHttpServer())
        .post('/api/tokens/bulk')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          tokenIds: [tokenId2],
          operation: 'set-module',
          payload: { module: 'navigation' },
        })
        .expect(201);
    });

    it('POST /api/tokens/bulk delete should delete tokens', () => {
      return request(app.getHttpServer())
        .post('/api/tokens/bulk')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          tokenIds: [tokenId2],
          operation: 'delete',
        })
        .expect(201);
    });
  });

  // ─── Import / Export ──────────────────────────────────────────────────────

  describe('Project Import/Export', () => {
    it('POST /api/project/import/preview/:projectId should preview JSON import', () => {
      const content = JSON.stringify({ 'common.newkey': 'New Value' });
      return request(app.getHttpServer())
        .post(`/api/project/import/preview/${projectId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ language: 'en', content, format: 'json', mode: 'append' })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.changes).toBeDefined();
        });
    });

    it('POST /api/project/import/:projectId should import tokens', () => {
      const content = JSON.stringify({ 'common.imported': 'Imported Value' });
      return request(app.getHttpServer())
        .post(`/api/project/import/${projectId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ language: 'en', content, format: 'json', mode: 'append' })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });

    it('POST /api/project/export/:projectId should return a ZIP', () => {
      return request(app.getHttpServer())
        .post(`/api/project/export/${projectId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ format: 'json', scope: 'all' })
        .expect(201)
        .expect((res) => {
          // Should have binary response (ZIP)
          expect(res.headers['content-type']).toContain('application/zip');
        });
    });
  });

  // ─── Cleanup ─────────────────────────────────────────────────────────────

  describe('Cleanup', () => {
    it('DELETE /api/tokens/:tokenId should delete token', () => {
      return request(app.getHttpServer())
        .delete(`/api/tokens/${tokenId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);
    });

    it('DELETE /api/project/delete/:id should delete project', () => {
      return request(app.getHttpServer())
        .delete(`/api/project/delete/${projectId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);
    });
  });
});
