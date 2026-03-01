import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.provider';
import type { DrizzleDB } from '../db/drizzle.types';
import { projects, type NewProject, type Project } from '../db/schema';
import { BaseRepository } from './base.repository';

@Injectable()
export class ProjectRepository extends BaseRepository<
  typeof projects,
  Project,
  NewProject
> {
  constructor(@Inject(DRIZZLE) db: DrizzleDB) {
    super(db, projects);
  }

  async findByTeamId(teamId: string): Promise<Project[]> {
    return this.db
      .select()
      .from(projects)
      .where(eq(projects.teamId, teamId));
  }

  async findByUrl(url: string): Promise<Project | null> {
    const results = await this.db
      .select()
      .from(projects)
      .where(eq(projects.url, url))
      .limit(1);
    return results[0] ?? null;
  }

  override async update(
    id: string,
    data: Partial<NewProject>,
  ): Promise<Project | null> {
    const [result] = await this.db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return result ?? null;
  }
}
