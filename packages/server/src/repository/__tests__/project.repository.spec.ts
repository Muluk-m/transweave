import { PGlite } from '@electric-sql/pglite';
import { createTestDb, cleanupTestDb } from '../../db/test-utils';
import type { DrizzleDB } from '../../db/drizzle.types';
import { TeamRepository } from '../team.repository';
import { ProjectRepository } from '../project.repository';

describe('ProjectRepository', () => {
  let db: DrizzleDB;
  let client: PGlite;
  let teamRepo: TeamRepository;
  let projectRepo: ProjectRepository;

  let teamId: string;

  beforeAll(async () => {
    ({ db, client } = await createTestDb());
    teamRepo = new TeamRepository(db);
    projectRepo = new ProjectRepository(db);

    const team = await teamRepo.create({
      name: 'ProjectTeam',
      url: 'project-team',
    });
    teamId = team.id;
  });

  afterAll(async () => {
    await cleanupTestDb(client);
  });

  it('should create a project with JSONB fields', async () => {
    const project = await projectRepo.create({
      name: 'My i18n Project',
      url: 'my-i18n-project',
      teamId,
      defaultLang: 'en',
      languages: ['en', 'zh', 'ja'],
      languageLabels: { zh: '中文', ja: '日本語' },
      modules: [{ name: '用户中心', code: 'userCenter' }],
    });

    expect(project).toBeDefined();
    expect(project.id).toBeDefined();
    expect(project.name).toBe('My i18n Project');
    expect(project.teamId).toBe(teamId);
  });

  it('should round-trip languages JSONB array', async () => {
    const languages = ['en', 'zh', 'ja'];
    const project = await projectRepo.create({
      name: 'Lang Test',
      url: 'lang-test',
      teamId,
      languages,
    });

    const found = await projectRepo.findById(project.id);
    expect(found).not.toBeNull();
    expect(found!.languages).toEqual(languages);
  });

  it('should round-trip languageLabels JSONB object', async () => {
    const labels = { zh: '中文', ja: '日本語', ko: '한국어' };
    const project = await projectRepo.create({
      name: 'Labels Test',
      url: 'labels-test',
      teamId,
      languageLabels: labels,
    });

    const found = await projectRepo.findById(project.id);
    expect(found).not.toBeNull();
    expect(found!.languageLabels).toEqual(labels);
  });

  it('should round-trip modules JSONB array of objects', async () => {
    const modules = [
      { name: '用户中心', code: 'userCenter' },
      { name: '设置', code: 'settings' },
    ];
    const project = await projectRepo.create({
      name: 'Modules Test',
      url: 'modules-test',
      teamId,
      modules,
    });

    const found = await projectRepo.findById(project.id);
    expect(found).not.toBeNull();
    expect(found!.modules).toEqual(modules);
  });

  it('should find projects by teamId', async () => {
    const projects = await projectRepo.findByTeamId(teamId);
    expect(projects.length).toBeGreaterThanOrEqual(1);
    expect(projects.every((p) => p.teamId === teamId)).toBe(true);
  });

  it('should update a project', async () => {
    const created = await projectRepo.create({
      name: 'Update Test',
      url: 'update-test',
      teamId,
    });

    const updated = await projectRepo.update(created.id, {
      name: 'Updated Name',
      description: 'A description',
    });

    expect(updated).not.toBeNull();
    expect(updated!.name).toBe('Updated Name');
    expect(updated!.description).toBe('A description');
  });

  it('should delete a project', async () => {
    const created = await projectRepo.create({
      name: 'Delete Test',
      url: 'delete-test',
      teamId,
    });

    await projectRepo.delete(created.id);

    const found = await projectRepo.findById(created.id);
    expect(found).toBeNull();
  });
});
