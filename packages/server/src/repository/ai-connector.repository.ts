import { Inject, Injectable } from '@nestjs/common';
import { and, eq, or } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.provider';
import type { DrizzleDB } from '../db/drizzle.types';
import { aiConnectors, projects, type AiConnector, type NewAiConnector } from '../db/schema';
import { BaseRepository } from './base.repository';

@Injectable()
export class AiConnectorRepository extends BaseRepository<
  typeof aiConnectors,
  AiConnector,
  NewAiConnector
> {
  constructor(@Inject(DRIZZLE) db: DrizzleDB) {
    super(db, aiConnectors);
  }

  async listForTeam(teamId: string): Promise<AiConnector[]> {
    return this.db
      .select()
      .from(aiConnectors)
      .where(and(eq(aiConnectors.teamId, teamId), eq(aiConnectors.scope, 'team')));
  }

  async listForProject(projectId: string): Promise<AiConnector[]> {
    const [proj] = await this.db
      .select({ teamId: projects.teamId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    if (!proj) return [];
    return this.db
      .select()
      .from(aiConnectors)
      .where(
        or(
          eq(aiConnectors.projectId, projectId),
          and(eq(aiConnectors.scope, 'team'), eq(aiConnectors.teamId, proj.teamId)),
        ),
      );
  }

  async findDefaultForTeam(teamId: string): Promise<AiConnector | null> {
    const [row] = await this.db
      .select()
      .from(aiConnectors)
      .where(
        and(
          eq(aiConnectors.teamId, teamId),
          eq(aiConnectors.scope, 'team'),
          eq(aiConnectors.displayName, 'Default'),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async findDefaultForProject(projectId: string): Promise<AiConnector | null> {
    const [row] = await this.db
      .select()
      .from(aiConnectors)
      .where(
        and(
          eq(aiConnectors.projectId, projectId),
          eq(aiConnectors.scope, 'project'),
          eq(aiConnectors.displayName, 'Default'),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  override async update(id: string, data: Partial<NewAiConnector>): Promise<AiConnector | null> {
    const [row] = await this.db
      .update(aiConnectors)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(aiConnectors.id, id))
      .returning();
    return row ?? null;
  }
}
