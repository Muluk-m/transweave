import { Inject, Injectable } from '@nestjs/common';
import { eq, and, isNotNull, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.provider';
import type { DrizzleDB } from '../db/drizzle.types';
import { teams, type NewTeam, type Team } from '../db/schema';
import { BaseRepository } from './base.repository';

@Injectable()
export class TeamRepository extends BaseRepository<typeof teams, Team, NewTeam> {
  constructor(@Inject(DRIZZLE) db: DrizzleDB) {
    super(db, teams);
  }

  async findAllWithLegacyConfig(): Promise<Team[]> {
    return this.db
      .select()
      .from(teams)
      .where(and(isNotNull(teams.aiConfig), isNull(teams.defaultConnectorId))) as Promise<Team[]>;
  }

  async findByUrl(url: string): Promise<Team | null> {
    const results = await this.db
      .select()
      .from(teams)
      .where(eq(teams.url, url))
      .limit(1);
    return results[0] ?? null;
  }

  override async update(
    id: string,
    data: Partial<NewTeam>,
  ): Promise<Team | null> {
    const [result] = await this.db
      .update(teams)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(teams.id, id))
      .returning();
    return result ?? null;
  }
}
