import { PGlite } from '@electric-sql/pglite';
import { createTestDb, cleanupTestDb } from '../../db/test-utils';
import type { DrizzleDB } from '../../db/drizzle.types';
import { TeamRepository } from '../team.repository';
import { ProjectRepository } from '../project.repository';
import { TokenRepository } from '../token.repository';

describe('TokenRepository', () => {
  let db: DrizzleDB;
  let client: PGlite;
  let teamRepo: TeamRepository;
  let projectRepo: ProjectRepository;
  let tokenRepo: TokenRepository;

  let projectId: string;

  beforeAll(async () => {
    ({ db, client } = await createTestDb());
    teamRepo = new TeamRepository(db);
    projectRepo = new ProjectRepository(db);
    tokenRepo = new TokenRepository(db);

    // Setup chain: team -> project
    const team = await teamRepo.create({
      name: 'TokenTeam',
      url: 'token-team',
    });
    const project = await projectRepo.create({
      name: 'TokenProject',
      url: 'token-project',
      teamId: team.id,
    });
    projectId = project.id;
  });

  afterAll(async () => {
    await cleanupTestDb(client);
  });

  it('should create token with JSONB translations', async () => {
    const translations = { en: 'Hello', zh: '你好' };
    const token = await tokenRepo.create({
      key: 'greeting.hello',
      translations,
      projectId,
    });

    expect(token).toBeDefined();
    expect(token.id).toBeDefined();
    expect(token.key).toBe('greeting.hello');
    expect(token.translations).toEqual(translations);
    expect(token.projectId).toBe(projectId);
  });

  it('should round-trip JSONB tags', async () => {
    const tags = ['common', 'greeting'];
    const token = await tokenRepo.create({
      key: 'tags.test',
      translations: { en: 'Test' },
      projectId,
      tags,
    });

    const found = await tokenRepo.findById(token.id);
    expect(found).not.toBeNull();
    expect(found!.tags).toEqual(tags);
  });

  it('should round-trip JSONB screenshots', async () => {
    const screenshots = ['/uploads/img1.png', '/uploads/img2.png'];
    const token = await tokenRepo.create({
      key: 'screenshots.test',
      translations: { en: 'Screenshot test' },
      projectId,
      screenshots,
    });

    const found = await tokenRepo.findById(token.id);
    expect(found).not.toBeNull();
    expect(found!.screenshots).toEqual(screenshots);
  });

  it('should find tokens by projectId', async () => {
    const tokens = await tokenRepo.findByProjectId(projectId);
    // We've already created several tokens above
    expect(tokens.length).toBeGreaterThanOrEqual(3);
    expect(tokens.every((t) => t.projectId === projectId)).toBe(true);
  });

  it('should search by key', async () => {
    // Create tokens with distinct keys
    await tokenRepo.create({
      key: 'search.greeting.hello',
      translations: { en: 'Hello' },
      projectId,
    });
    await tokenRepo.create({
      key: 'search.greeting.goodbye',
      translations: { en: 'Goodbye' },
      projectId,
    });
    await tokenRepo.create({
      key: 'search.button.submit',
      translations: { en: 'Submit' },
      projectId,
    });

    const results = await tokenRepo.searchByKeyOrTranslation(
      projectId,
      'search.greeting',
    );
    expect(results.length).toBe(2);
  });

  it('should search by translation content', async () => {
    await tokenRepo.create({
      key: 'search.welcome',
      translations: { en: 'Welcome to the app', zh: '欢迎' },
      projectId,
    });

    const results = await tokenRepo.searchByKeyOrTranslation(
      projectId,
      'Welcome to the app',
    );
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((t) => t.key === 'search.welcome')).toBe(true);
  });

  it('should count tokens by projectId', async () => {
    // Create a fresh project with exactly 3 tokens for deterministic count
    const team2 = await teamRepo.create({
      name: 'CountTeam',
      url: 'count-team',
    });
    const proj2 = await projectRepo.create({
      name: 'CountProject',
      url: 'count-project',
      teamId: team2.id,
    });

    await tokenRepo.create({
      key: 'count.one',
      translations: { en: 'One' },
      projectId: proj2.id,
    });
    await tokenRepo.create({
      key: 'count.two',
      translations: { en: 'Two' },
      projectId: proj2.id,
    });
    await tokenRepo.create({
      key: 'count.three',
      translations: { en: 'Three' },
      projectId: proj2.id,
    });

    const count = await tokenRepo.countByProjectId(proj2.id);
    expect(count).toBe(3);
  });

  it('should update token translations', async () => {
    const token = await tokenRepo.create({
      key: 'update.translations',
      translations: { en: 'Hello' },
      projectId,
    });

    const updated = await tokenRepo.update(token.id, {
      translations: { en: 'Hello', zh: '你好', ja: 'こんにちは' },
    });

    expect(updated).not.toBeNull();
    expect(updated!.translations).toEqual({
      en: 'Hello',
      zh: '你好',
      ja: 'こんにちは',
    });
  });

  it('should cascade delete tokens when project is deleted', async () => {
    const team3 = await teamRepo.create({
      name: 'CascadeTeam',
      url: 'token-cascade-team',
    });
    const proj3 = await projectRepo.create({
      name: 'CascadeProject',
      url: 'cascade-project',
      teamId: team3.id,
    });

    await tokenRepo.create({
      key: 'cascade.one',
      translations: { en: 'One' },
      projectId: proj3.id,
    });
    await tokenRepo.create({
      key: 'cascade.two',
      translations: { en: 'Two' },
      projectId: proj3.id,
    });

    // Delete the project -- tokens should cascade
    await projectRepo.delete(proj3.id);

    const tokens = await tokenRepo.findByProjectId(proj3.id);
    expect(tokens).toHaveLength(0);
  });
});
