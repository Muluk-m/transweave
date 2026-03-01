import { PGlite } from '@electric-sql/pglite';
import { createTestDb, cleanupTestDb } from '../../db/test-utils';
import type { DrizzleDB } from '../../db/drizzle.types';
import { UserRepository } from '../user.repository';
import { TeamRepository } from '../team.repository';
import { MembershipRepository } from '../membership.repository';

describe('MembershipRepository', () => {
  let db: DrizzleDB;
  let client: PGlite;
  let userRepo: UserRepository;
  let teamRepo: TeamRepository;
  let membershipRepo: MembershipRepository;

  let userId: string;
  let teamId: string;

  beforeAll(async () => {
    ({ db, client } = await createTestDb());
    userRepo = new UserRepository(db);
    teamRepo = new TeamRepository(db);
    membershipRepo = new MembershipRepository(db);

    // Setup: create a user and a team
    const user = await userRepo.create({
      name: 'TestUser',
      email: 'membership-test@example.com',
      password: 'pw',
    });
    userId = user.id;

    const team = await teamRepo.create({
      name: 'TestTeam',
      url: 'membership-test-team',
    });
    teamId = team.id;
  });

  afterAll(async () => {
    await cleanupTestDb(client);
  });

  it('should create a membership', async () => {
    const membership = await membershipRepo.create({
      userId,
      teamId,
      role: 'owner',
    });

    expect(membership).toBeDefined();
    expect(membership.id).toBeDefined();
    expect(membership.userId).toBe(userId);
    expect(membership.teamId).toBe(teamId);
    expect(membership.role).toBe('owner');
  });

  it('should find by userId', async () => {
    const memberships = await membershipRepo.findByUserId(userId);
    expect(memberships.length).toBeGreaterThanOrEqual(1);
    expect(memberships[0].userId).toBe(userId);
  });

  it('should find by teamId', async () => {
    const memberships = await membershipRepo.findByTeamId(teamId);
    expect(memberships.length).toBeGreaterThanOrEqual(1);
    expect(memberships[0].teamId).toBe(teamId);
  });

  it('should findByTeamIdWithUser and return joined user data', async () => {
    const results = await membershipRepo.findByTeamIdWithUser(teamId);
    expect(results.length).toBeGreaterThanOrEqual(1);

    const first = results[0];
    expect(first.membership).toBeDefined();
    expect(first.user).toBeDefined();
    expect(first.user!.name).toBe('TestUser');
    expect(first.user!.email).toBe('membership-test@example.com');
  });

  it('should enforce unique (userId, teamId) constraint', async () => {
    // Already created a membership for (userId, teamId) above
    await expect(
      membershipRepo.create({
        userId,
        teamId,
        role: 'member',
      }),
    ).rejects.toThrow();
  });

  it('should delete a membership', async () => {
    const user2 = await userRepo.create({
      name: 'User2',
      email: 'user2-membership@example.com',
      password: 'pw',
    });
    const membership = await membershipRepo.create({
      userId: user2.id,
      teamId,
      role: 'member',
    });

    await membershipRepo.delete(membership.id);

    const found = await membershipRepo.findById(membership.id);
    expect(found).toBeNull();
  });

  it('should cascade delete memberships when team is deleted', async () => {
    const team2 = await teamRepo.create({
      name: 'CascadeTeam',
      url: 'cascade-team',
    });
    const user3 = await userRepo.create({
      name: 'User3',
      email: 'user3-cascade@example.com',
      password: 'pw',
    });

    await membershipRepo.create({
      userId: user3.id,
      teamId: team2.id,
      role: 'owner',
    });

    // Delete the team -- memberships should cascade
    await teamRepo.delete(team2.id);

    const memberships = await membershipRepo.findByTeamId(team2.id);
    expect(memberships).toHaveLength(0);
  });
});
