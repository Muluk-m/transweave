import { PGlite } from '@electric-sql/pglite';
import { createTestDb, cleanupTestDb } from '../../db/test-utils';
import type { DrizzleDB } from '../../db/drizzle.types';
import { UserRepository } from '../user.repository';
import { TeamRepository } from '../team.repository';
import { MembershipRepository } from '../membership.repository';
import { ProjectRepository } from '../project.repository';

describe('ProjectRepository.findByUserId', () => {
  let db: DrizzleDB;
  let client: PGlite;
  let userRepo: UserRepository;
  let teamRepo: TeamRepository;
  let membershipRepo: MembershipRepository;
  let projectRepo: ProjectRepository;

  let userId: string;
  let otherUserId: string;

  beforeAll(async () => {
    ({ db, client } = await createTestDb());
    userRepo = new UserRepository(db);
    teamRepo = new TeamRepository(db);
    membershipRepo = new MembershipRepository(db);
    projectRepo = new ProjectRepository(db);

    const user = await userRepo.create({
      name: 'TestUser',
      email: 'findbyuserid-test@example.com',
      password: 'pw',
    });
    userId = user.id;

    const otherUser = await userRepo.create({
      name: 'OtherUser',
      email: 'findbyuserid-other@example.com',
      password: 'pw',
    });
    otherUserId = otherUser.id;
  });

  afterAll(async () => {
    await cleanupTestDb(client);
  });

  it('should return projects from all teams the user belongs to', async () => {
    // Create two teams
    const team1 = await teamRepo.create({ name: 'Team1', url: 'team1-fbu' });
    const team2 = await teamRepo.create({ name: 'Team2', url: 'team2-fbu' });

    // Add user to both teams
    await membershipRepo.create({ userId, teamId: team1.id, role: 'owner' });
    await membershipRepo.create({ userId, teamId: team2.id, role: 'member' });

    // Create projects in each team
    await projectRepo.create({ name: 'Project A', url: 'proj-a-fbu', teamId: team1.id });
    await projectRepo.create({ name: 'Project B', url: 'proj-b-fbu', teamId: team1.id });
    await projectRepo.create({ name: 'Project C', url: 'proj-c-fbu', teamId: team2.id });

    const projects = await projectRepo.findByUserId(userId);

    expect(projects.length).toBe(3);
    const names = projects.map((p) => p.name).sort();
    expect(names).toEqual(['Project A', 'Project B', 'Project C']);
  });

  it('should return empty array for user with no teams', async () => {
    const projects = await projectRepo.findByUserId(otherUserId);
    expect(projects).toEqual([]);
  });

  it('should not return projects from teams the user is not in', async () => {
    // Create a team that only otherUser belongs to
    const isolatedTeam = await teamRepo.create({ name: 'Isolated', url: 'isolated-fbu' });
    await membershipRepo.create({ userId: otherUserId, teamId: isolatedTeam.id, role: 'owner' });
    await projectRepo.create({ name: 'Private Project', url: 'private-fbu', teamId: isolatedTeam.id });

    const userProjects = await projectRepo.findByUserId(userId);
    const privateProject = userProjects.find((p) => p.name === 'Private Project');
    expect(privateProject).toBeUndefined();

    // But otherUser should see it
    const otherProjects = await projectRepo.findByUserId(otherUserId);
    const found = otherProjects.find((p) => p.name === 'Private Project');
    expect(found).toBeDefined();
  });

  it('should return correct project fields', async () => {
    const projects = await projectRepo.findByUserId(userId);
    const project = projects[0];

    expect(project).toHaveProperty('id');
    expect(project).toHaveProperty('name');
    expect(project).toHaveProperty('url');
    expect(project).toHaveProperty('teamId');
    expect(project).toHaveProperty('languages');
    expect(project).toHaveProperty('createdAt');
    expect(project).toHaveProperty('updatedAt');
  });
});
