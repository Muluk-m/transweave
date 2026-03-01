import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../db/drizzle.provider';
import type { DrizzleDB } from '../db/drizzle.types';
import { teams, memberships, users, type NewTeam } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { TeamRepository } from '../repository/team.repository';
import { MembershipRepository } from '../repository/membership.repository';

@Injectable()
export class TeamService {
  constructor(
    private teamRepo: TeamRepository,
    private membershipRepo: MembershipRepository,
    @Inject(DRIZZLE) private db: DrizzleDB,
  ) {}

  async createTeam(data: { name: string; url: string; userId: string }) {
    const name = (data.name ?? '').trim();
    const url =
      (data.url ?? '').trim() || Math.random().toString(36).slice(2, 10);

    // Use Drizzle transaction for atomicity
    return (this.db as any).transaction(async (tx: any) => {
      // 1. Create team
      const [team] = await tx
        .insert(teams)
        .values({ name, url })
        .returning();

      // 2. Create owner membership
      await tx.insert(memberships).values({
        userId: data.userId,
        teamId: team.id,
        role: 'owner',
      });

      // 3. Return team with members populated
      const teamWithMembers = await tx.query.teams.findFirst({
        where: eq(teams.id, team.id),
        with: {
          memberships: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      return teamWithMembers;
    });
  }

  async findAllTeams() {
    return (this.db as any).query.teams.findMany({
      with: {
        memberships: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
      },
    });
  }

  async findTeamsByUserId(userId: string) {
    // Find all memberships for this user
    const userMemberships = await this.membershipRepo.findByUserId(userId);
    if (userMemberships.length === 0) {
      return [];
    }

    const teamIds = userMemberships.map((m) => m.teamId);

    // Fetch those teams with full membership data
    return (this.db as any).query.teams.findMany({
      where: inArray(teams.id, teamIds),
      with: {
        memberships: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
      },
    });
  }

  async findTeamById(id: string) {
    return (this.db as any).query.teams.findFirst({
      where: eq(teams.id, id),
      with: {
        memberships: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
      },
    });
  }

  // Update team information
  async updateTeam(id: string, data: { name?: string; url?: string }) {
    return this.teamRepo.update(id, data);
  }

  // Delete team
  async deleteTeam(id: string) {
    // Use transaction: delete memberships first, then team
    return (this.db as any).transaction(async (tx: any) => {
      await tx
        .delete(memberships)
        .where(eq(memberships.teamId, id));
      await tx
        .delete(teams)
        .where(eq(teams.id, id));
    });
  }

  // Get all member information for a specific team
  async getTeamMembers(teamId: string) {
    const results = await this.membershipRepo.findByTeamIdWithUser(teamId);

    return results.map((row) => ({
      ...row.user,
      role: row.membership.role,
    }));
  }
}
