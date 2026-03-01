import { PGlite } from '@electric-sql/pglite';
import { createTestDb, cleanupTestDb } from '../../db/test-utils';
import type { DrizzleDB } from '../../db/drizzle.types';
import { UserRepository } from '../user.repository';
import { TeamRepository } from '../team.repository';
import { ProjectRepository } from '../project.repository';
import { TokenRepository } from '../token.repository';
import { TokenHistoryRepository } from '../token-history.repository';

describe('TokenHistoryRepository', () => {
  let db: DrizzleDB;
  let client: PGlite;
  let userRepo: UserRepository;
  let teamRepo: TeamRepository;
  let projectRepo: ProjectRepository;
  let tokenRepo: TokenRepository;
  let historyRepo: TokenHistoryRepository;

  let userId: string;
  let tokenId: string;

  beforeAll(async () => {
    ({ db, client } = await createTestDb());
    userRepo = new UserRepository(db);
    teamRepo = new TeamRepository(db);
    projectRepo = new ProjectRepository(db);
    tokenRepo = new TokenRepository(db);
    historyRepo = new TokenHistoryRepository(db);

    // Setup chain: user, team -> project -> token
    const user = await userRepo.create({
      name: 'HistoryUser',
      email: 'history-test@example.com',
      password: 'pw',
    });
    userId = user.id;

    const team = await teamRepo.create({
      name: 'HistoryTeam',
      url: 'history-team',
    });
    const project = await projectRepo.create({
      name: 'HistoryProject',
      url: 'history-project',
      teamId: team.id,
    });
    const token = await tokenRepo.create({
      key: 'history.test',
      translations: { en: 'Original' },
      projectId: project.id,
    });
    tokenId = token.id;
  });

  afterAll(async () => {
    await cleanupTestDb(client);
  });

  it('should create token history entries', async () => {
    const entry = await historyRepo.create({
      tokenId,
      userId,
      translations: { en: 'Version 1' },
    });

    expect(entry).toBeDefined();
    expect(entry.id).toBeDefined();
    expect(entry.tokenId).toBe(tokenId);
    expect(entry.userId).toBe(userId);
    expect(entry.createdAt).toBeInstanceOf(Date);
  });

  it('should find history by tokenId', async () => {
    // Create a second entry
    await historyRepo.create({
      tokenId,
      userId,
      translations: { en: 'Version 2', zh: '版本2' },
    });

    const entries = await historyRepo.findByTokenId(tokenId);
    expect(entries.length).toBeGreaterThanOrEqual(2);
    expect(entries.every((e) => e.tokenId === tokenId)).toBe(true);
  });

  it('should findByTokenIdWithUser and return joined user data', async () => {
    const results = await historyRepo.findByTokenIdWithUser(tokenId);
    expect(results.length).toBeGreaterThanOrEqual(1);

    const first = results[0];
    expect(first.history).toBeDefined();
    expect(first.user).toBeDefined();
    expect(first.user!.name).toBe('HistoryUser');
    expect(first.user!.email).toBe('history-test@example.com');
  });

  it('should round-trip JSONB translations in history', async () => {
    const translations = { en: 'Hello', zh: '你好', ja: 'こんにちは' };
    const entry = await historyRepo.create({
      tokenId,
      userId,
      translations,
    });

    const found = await historyRepo.findById(entry.id);
    expect(found).not.toBeNull();
    expect(found!.translations).toEqual(translations);
  });

  it('should cascade delete history when token is deleted', async () => {
    // Create a separate token with its own history
    const team2 = await teamRepo.create({
      name: 'HistCascadeTeam',
      url: 'hist-cascade-team',
    });
    const proj2 = await projectRepo.create({
      name: 'HistCascadeProject',
      url: 'hist-cascade-project',
      teamId: team2.id,
    });
    const token2 = await tokenRepo.create({
      key: 'hist.cascade',
      translations: { en: 'Cascade' },
      projectId: proj2.id,
    });

    await historyRepo.create({
      tokenId: token2.id,
      userId,
      translations: { en: 'Before delete' },
    });

    // Delete the token -- history should cascade
    await tokenRepo.delete(token2.id);

    const entries = await historyRepo.findByTokenId(token2.id);
    expect(entries).toHaveLength(0);
  });
});
