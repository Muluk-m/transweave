import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.provider';
import type { DrizzleDB } from '../db/drizzle.types';
import {
  memberships,
  type Membership,
  type NewMembership,
} from '../db/schema';
import { users } from '../db/schema';
import { teams } from '../db/schema';
import { BaseRepository } from './base.repository';

@Injectable()
export class MembershipRepository extends BaseRepository<
  typeof memberships,
  Membership,
  NewMembership
> {
  constructor(@Inject(DRIZZLE) db: DrizzleDB) {
    super(db, memberships);
  }

  async findByUserAndTeam(
    userId: string,
    teamId: string,
  ): Promise<Membership | null> {
    const results = await this.db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, userId),
          eq(memberships.teamId, teamId),
        ),
      )
      .limit(1);
    return results[0] ?? null;
  }

  async findByUserId(userId: string): Promise<Membership[]> {
    return this.db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, userId));
  }

  async findByTeamId(teamId: string): Promise<Membership[]> {
    return this.db
      .select()
      .from(memberships)
      .where(eq(memberships.teamId, teamId));
  }

  async findByTeamIdWithUser(teamId: string) {
    return this.db
      .select({
        membership: memberships,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
        },
      })
      .from(memberships)
      .leftJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.teamId, teamId));
  }

  async findByUserIdWithTeam(userId: string) {
    return this.db
      .select({
        membership: memberships,
        team: teams,
      })
      .from(memberships)
      .leftJoin(teams, eq(memberships.teamId, teams.id))
      .where(eq(memberships.userId, userId));
  }

  async deleteByUserAndTeam(userId: string, teamId: string): Promise<void> {
    await this.db
      .delete(memberships)
      .where(
        and(
          eq(memberships.userId, userId),
          eq(memberships.teamId, teamId),
        ),
      );
  }
}
