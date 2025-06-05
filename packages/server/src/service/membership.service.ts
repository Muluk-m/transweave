import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, DeleteResult } from 'mongoose';
import { Membership, MembershipDocument, Team, TeamDocument, User, UserDocument } from '../models';
import { MongooseService } from './mongoose.service';

@Injectable()
export class MembershipService {
  constructor(
    @InjectModel(Membership.name)
    private membershipModel: Model<MembershipDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Team.name)
    private teamModel: Model<TeamDocument>,
    private mongooseService: MongooseService,
  ) {}

  async createMembership(data: { userId: string; teamId: string; role: string }) {
    const session = await this.mongooseService.getConnection().startSession();
    let membership: MembershipDocument;

    try {
      membership = new this.membershipModel({
        userId: data.userId,
        user: data.userId,
        teamId: data.teamId,
        role: data.role,
      });

      await membership.save({ session });

      await this.teamModel.findByIdAndUpdate(data.teamId, { $addToSet: { memberships: membership._id } }, { session });

      await this.userModel
        .findByIdAndUpdate(data.userId, { $addToSet: { memberships: membership._id } })
        .session(session);
    } finally {
      session.endSession();
    }

    return this.membershipModel
      .findById(membership._id)
      .populate({
        path: 'user',
        select: 'id name email',
      })
      .exec();
  }

  // Check if user is a team member
  async isMember(teamId: string, userId: string): Promise<boolean> {
    const membership = await this.membershipModel
      .findOne({
        teamId,
        userId,
      })
      .exec();
    return !!membership;
  }

  // Check if user is a team owner
  async isOwner(teamId: string, userId: string): Promise<boolean> {
    const membership = await this.membershipModel
      .findOne({
        teamId,
        userId,
        role: 'owner',
      })
      .exec();
    return !!membership;
  }

  // Check if user is a team manager or owner
  async isManagerOrOwner(teamId: string, userId: string): Promise<boolean> {
    const membership = await this.membershipModel
      .findOne({
        teamId,
        userId,
        role: { $in: ['manager', 'owner'] },
      })
      .exec();
    return !!membership;
  }

  // Get user's role in team
  async getUserRole(teamId: string, userId: string): Promise<string | null> {
    const membership = await this.membershipModel
      .findOne({
        teamId,
        userId,
      })
      .select('role')
      .exec();
    return membership ? membership.role : null;
  }

  // Get all members of a team
  async getTeamMembers(teamId: string) {
    return this.membershipModel
      .find({
        teamId,
      })
      .populate({
        path: 'user',
        select: 'id name email',
      })
      .exec();
  }

  // Get all team memberships for a user
  async getUserMemberships(userId: string) {
    return this.membershipModel
      .find({
        userId,
      })
      .populate('team')
      .exec();
  }

  // Update member role
  async updateMemberRole(teamId: string, userId: string, newRole: string) {
    return this.membershipModel
      .updateMany(
        {
          teamId,
          userId,
        },
        {
          role: newRole,
        },
      )
      .exec();
  }

  // Remove membership
  async removeMember(teamId: string, userId: string): Promise<DeleteResult> {
    return this.membershipModel
      .deleteMany({
        teamId,
        userId,
      })
      .exec();
  }

  // Find specific membership
  async findMembership(teamId: string, userId: string) {
    return this.membershipModel
      .findOne({
        teamId,
        userId,
      })
      .exec();
  }
}
