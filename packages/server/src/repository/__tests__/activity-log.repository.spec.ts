import { PGlite } from '@electric-sql/pglite';
import { createTestDb, cleanupTestDb } from '../../db/test-utils';
import type { DrizzleDB } from '../../db/drizzle.types';
import { UserRepository } from '../user.repository';
import { TeamRepository } from '../team.repository';
import { ProjectRepository } from '../project.repository';
import { ActivityLogRepository } from '../activity-log.repository';
import type { ActivityDetails } from '../../db/schema/activity-logs';

describe('ActivityLogRepository', () => {
  let db: DrizzleDB;
  let client: PGlite;
  let userRepo: UserRepository;
  let teamRepo: TeamRepository;
  let projectRepo: ProjectRepository;
  let activityRepo: ActivityLogRepository;

  let userId: string;
  let projectId: string;

  beforeAll(async () => {
    ({ db, client } = await createTestDb());
    userRepo = new UserRepository(db);
    teamRepo = new TeamRepository(db);
    projectRepo = new ProjectRepository(db);
    activityRepo = new ActivityLogRepository(db);

    // Setup: user, team -> project
    const user = await userRepo.create({
      name: 'ActivityUser',
      email: 'activity-test@example.com',
      password: 'pw',
    });
    userId = user.id;

    const team = await teamRepo.create({
      name: 'ActivityTeam',
      url: 'activity-team',
    });
    const project = await projectRepo.create({
      name: 'ActivityProject',
      url: 'activity-project',
      teamId: team.id,
    });
    projectId = project.id;
  });

  afterAll(async () => {
    await cleanupTestDb(client);
  });

  it('should create an activity log', async () => {
    const log = await activityRepo.create({
      type: 'TOKEN_CREATE',
      projectId,
      userId,
    });

    expect(log).toBeDefined();
    expect(log.id).toBeDefined();
    expect(log.type).toBe('TOKEN_CREATE');
    expect(log.projectId).toBe(projectId);
    expect(log.userId).toBe(userId);
  });

  it('should get user activity stats grouped by type', async () => {
    // Create additional logs for deterministic stats
    // We already have 1 TOKEN_CREATE from the previous test
    await activityRepo.create({ type: 'TOKEN_CREATE', projectId, userId });
    await activityRepo.create({ type: 'TOKEN_CREATE', projectId, userId });
    // Now 3 TOKEN_CREATE total

    await activityRepo.create({ type: 'TOKEN_UPDATE', projectId, userId });
    await activityRepo.create({ type: 'TOKEN_UPDATE', projectId, userId });
    // 2 TOKEN_UPDATE total

    const stats = await activityRepo.getUserActivityStats(userId);

    const createStat = stats.find((s) => s.type === 'TOKEN_CREATE');
    const updateStat = stats.find((s) => s.type === 'TOKEN_UPDATE');

    expect(createStat).toBeDefined();
    expect(createStat!.count).toBe(3);
    expect(updateStat).toBeDefined();
    expect(updateStat!.count).toBe(2);
  });

  it('should filter stats by projectId', async () => {
    // Create a second project with its own logs
    const team2 = await teamRepo.create({
      name: 'StatsTeam2',
      url: 'stats-team-2',
    });
    const proj2 = await projectRepo.create({
      name: 'StatsProject2',
      url: 'stats-project-2',
      teamId: team2.id,
    });

    await activityRepo.create({
      type: 'TOKEN_CREATE',
      projectId: proj2.id,
      userId,
    });
    await activityRepo.create({
      type: 'TOKEN_DELETE',
      projectId: proj2.id,
      userId,
    });

    const stats = await activityRepo.getUserActivityStats(userId, proj2.id);

    // Should only count proj2's logs
    const totalCount = stats.reduce((acc, s) => acc + s.count, 0);
    expect(totalCount).toBe(2);

    const deleteStat = stats.find((s) => s.type === 'TOKEN_DELETE');
    expect(deleteStat).toBeDefined();
    expect(deleteStat!.count).toBe(1);
  });

  it('should get project timeline', async () => {
    // Create a fresh project to have deterministic timeline data
    const team3 = await teamRepo.create({
      name: 'TimelineTeam',
      url: 'timeline-team',
    });
    const proj3 = await projectRepo.create({
      name: 'TimelineProject',
      url: 'timeline-project',
      teamId: team3.id,
    });

    // Create logs (all will have "today" as createdAt since PGlite defaults to now())
    await activityRepo.create({
      type: 'TOKEN_CREATE',
      projectId: proj3.id,
      userId,
    });
    await activityRepo.create({
      type: 'TOKEN_CREATE',
      projectId: proj3.id,
      userId,
    });
    await activityRepo.create({
      type: 'TOKEN_UPDATE',
      projectId: proj3.id,
      userId,
    });

    const timeline = await activityRepo.getProjectTimeline(proj3.id, 30);
    expect(timeline.length).toBeGreaterThanOrEqual(1);

    // All entries are for today, so there should be two groups (TOKEN_CREATE, TOKEN_UPDATE)
    const createEntry = timeline.find((t) => t.type === 'TOKEN_CREATE');
    const updateEntry = timeline.find((t) => t.type === 'TOKEN_UPDATE');

    expect(createEntry).toBeDefined();
    expect(createEntry!.count).toBe(2);
    expect(updateEntry).toBeDefined();
    expect(updateEntry!.count).toBe(1);

    // date field should be a string
    expect(typeof timeline[0].date).toBe('string');
  });

  it('should find logs with user data', async () => {
    const results = await activityRepo.findByProjectIdWithUser(projectId);
    expect(results.length).toBeGreaterThanOrEqual(1);

    const first = results[0];
    expect(first.log).toBeDefined();
    expect(first.user).toBeDefined();
    expect(first.user!.name).toBe('ActivityUser');
    expect(first.user!.email).toBe('activity-test@example.com');
  });

  it('should round-trip JSONB details field', async () => {
    const details: ActivityDetails = {
      entityId: '123e4567-e89b-12d3-a456-426614174000',
      entityType: 'token',
      entityName: 'greeting.hello',
      changes: [
        { field: 'translations.en', oldValue: 'Hi', newValue: 'Hello' },
      ],
      language: 'en',
      stats: { added: 5, updated: 3, unchanged: 10, total: 18 },
      metadata: { importFile: 'en.json' },
    };

    const log = await activityRepo.create({
      type: 'TOKEN_UPDATE',
      projectId,
      userId,
      details,
      ipAddress: '127.0.0.1',
      userAgent: 'TestAgent/1.0',
    });

    const found = await activityRepo.findById(log.id);
    expect(found).not.toBeNull();
    expect(found!.details).toEqual(details);
    expect(found!.ipAddress).toBe('127.0.0.1');
    expect(found!.userAgent).toBe('TestAgent/1.0');
  });
});
