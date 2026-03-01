import { PGlite } from '@electric-sql/pglite';
import { createTestDb, cleanupTestDb } from '../../db/test-utils';
import type { DrizzleDB } from '../../db/drizzle.types';
import { TeamRepository } from '../team.repository';

describe('TeamRepository', () => {
  let db: DrizzleDB;
  let client: PGlite;
  let teamRepo: TeamRepository;

  beforeAll(async () => {
    ({ db, client } = await createTestDb());
    teamRepo = new TeamRepository(db);
  });

  afterAll(async () => {
    await cleanupTestDb(client);
  });

  it('should create a team', async () => {
    const team = await teamRepo.create({
      name: 'Engineering',
      url: 'engineering',
    });

    expect(team).toBeDefined();
    expect(team.id).toBeDefined();
    expect(team.name).toBe('Engineering');
    expect(team.url).toBe('engineering');
    expect(team.createdAt).toBeInstanceOf(Date);
  });

  it('should find team by id', async () => {
    const created = await teamRepo.create({
      name: 'Design',
      url: 'design',
    });

    const found = await teamRepo.findById(created.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
    expect(found!.name).toBe('Design');
  });

  it('should find team by URL', async () => {
    const created = await teamRepo.create({
      name: 'Marketing',
      url: 'marketing-team',
    });

    const found = await teamRepo.findByUrl('marketing-team');
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
    expect(found!.name).toBe('Marketing');
  });

  it('should update team name', async () => {
    const created = await teamRepo.create({
      name: 'Old Name',
      url: 'old-name',
    });

    const updated = await teamRepo.update(created.id, { name: 'New Name' });
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe('New Name');
    expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(
      created.updatedAt.getTime(),
    );
  });

  it('should delete a team', async () => {
    const created = await teamRepo.create({
      name: 'Temp Team',
      url: 'temp-team',
    });

    await teamRepo.delete(created.id);

    const found = await teamRepo.findById(created.id);
    expect(found).toBeNull();
  });
});
