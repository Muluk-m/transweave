import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Team, TeamDocument, Membership, MembershipDocument } from '../models';
import { MongooseService } from './mongoose.service';

@Injectable()
export class TeamService {
  constructor(
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
    @InjectModel(Membership.name)
    private membershipModel: Model<MembershipDocument>,
    private mongooseService: MongooseService,
  ) {}

  async createTeam(data: { name: string; url: string; userId: string }) {
    const session = await this.mongooseService.getConnection().startSession();
    try {
      let result: any = null;
      await session.withTransaction(async () => {
        const name = (data.name ?? '').trim();
        const url =
          (data.url ?? '').trim() || Math.random().toString(36).slice(2, 10);

        // 创建团队
        const team = new this.teamModel({
          name,
          url,
        });
        await team.save({ session });

        // 创建会员关系
        const membership = new this.membershipModel({
          userId: data.userId,
          teamId: team._id,
          role: 'owner',
        });

        await membership.save({ session });

        team.memberships.push(membership);

        await team.save({ session }); // 保存修改

        // 查询团队并填充成员信息
        result = await this.teamModel
          .findById(team._id)
          .populate({
            path: 'memberships',
            populate: {
              path: 'user',
              select: 'id name email',
            },
          })
          .session(session)
          .exec();
      });
      return result;
    } finally {
      session.endSession();
    }
  }

  async findAllTeams() {
    return this.teamModel.find().exec();
  }

  async findTeamsByUserId(userId: string) {
    const memberships = await this.membershipModel
      .find({ userId })
      .select('_id')
      .lean();
    const membershipIds = memberships.map((m) => m._id);

    return this.teamModel
      .find({ memberships: { $in: membershipIds } })
      .populate({
        path: 'memberships',
        populate: {
          path: 'user',
          select: 'id name email',
        },
      })
      .exec();
  }

  async findTeamById(id: string) {
    return this.teamModel
      .findById(id)
      .populate({
        path: 'memberships',
        populate: {
          path: 'user',
          select: 'id name email',
        },
      })
      .exec();
  }

  // Update team information
  async updateTeam(id: string, data: { name?: string; url?: string }) {
    return this.teamModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  // Delete team
  async deleteTeam(id: string) {
    // First delete all related membership records
    await this.membershipModel.deleteMany({ teamId: id }).exec();

    // Then delete the team
    return this.teamModel.findByIdAndDelete(id).exec();
  }

  // Get all member information for a specific team
  async getTeamMembers(teamId: string) {
    const team = await this.teamModel
      .findById(teamId)
      .populate({
        path: 'memberships',
        populate: {
          path: 'user',
          select: 'id name email',
        },
      })
      .exec();

    if (!team || !team.memberships) {
      return [];
    }

    return team?.memberships.map((membership) => ({
      ...membership.user,
      role: membership.role,
    }));
  }
}
