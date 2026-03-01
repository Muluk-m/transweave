import { Injectable } from '@nestjs/common';
import { MembershipRepository } from '../repository/membership.repository';

@Injectable()
export class MembershipService {
  constructor(private membershipRepo: MembershipRepository) {}

  async createMembership(data: {
    userId: string;
    teamId: string;
    role: string;
  }) {
    // Upsert the membership row (create or update role if exists)
    const membership = await this.membershipRepo.upsert(data);

    // Return membership with user data populated (matching old response shape)
    const results = await this.membershipRepo.findByTeamIdWithUser(
      data.teamId,
    );
    return (
      results.find((r) => r.membership.id === membership.id) ?? {
        membership,
        user: null,
      }
    );
  }

  // Check if user is a team member
  async isMember(teamId: string, userId: string): Promise<boolean> {
    const membership = await this.membershipRepo.findByUserAndTeam(
      userId,
      teamId,
    );
    return !!membership;
  }

  // Check if user is a team owner
  async isOwner(teamId: string, userId: string): Promise<boolean> {
    const membership = await this.membershipRepo.findByUserAndTeam(
      userId,
      teamId,
    );
    return membership?.role === 'owner';
  }

  // Check if user is a team manager or owner
  async isManagerOrOwner(teamId: string, userId: string): Promise<boolean> {
    const membership = await this.membershipRepo.findByUserAndTeam(
      userId,
      teamId,
    );
    return membership?.role === 'owner' || membership?.role === 'manager';
  }

  // Get user's role in team
  async getUserRole(teamId: string, userId: string): Promise<string | null> {
    const membership = await this.membershipRepo.findByUserAndTeam(
      userId,
      teamId,
    );
    return membership?.role ?? null;
  }

  // Get all members of a team
  async getTeamMembers(teamId: string) {
    return this.membershipRepo.findByTeamIdWithUser(teamId);
  }

  // Get all team memberships for a user
  async getUserMemberships(userId: string) {
    return this.membershipRepo.findByUserIdWithTeam(userId);
  }

  // Update member role
  async updateMemberRole(
    teamId: string,
    memberId: string,
    newRole: string,
  ): Promise<void> {
    await this.membershipRepo.updateRole(teamId, memberId, newRole);
  }

  // Remove membership
  async removeMember(teamId: string, memberId: string): Promise<void> {
    await this.membershipRepo.delete(memberId);
  }

  // Find specific membership
  async findMembership(teamId: string, userId: string) {
    return this.membershipRepo.findByUserAndTeam(userId, teamId);
  }
}
