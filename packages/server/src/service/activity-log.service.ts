import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ActivityLog,
  ActivityLogDocument,
  ActivityType,
  ActivityDetails,
} from '../models';

export interface CreateActivityLogDto {
  type: ActivityType;
  projectId: string;
  userId: string;
  details: ActivityDetails;
  ipAddress?: string;
  userAgent?: string;
}

export interface QueryActivityLogDto {
  projectId?: string;
  userId?: string;
  type?: ActivityType;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectModel(ActivityLog.name)
    private activityLogModel: Model<ActivityLogDocument>,
  ) {}

  /**
   * 创建操作日志
   */
  async create(data: CreateActivityLogDto): Promise<ActivityLogDocument> {
    const activityLog = new this.activityLogModel({
      ...data,
      projectId: new Types.ObjectId(data.projectId),
      userId: new Types.ObjectId(data.userId),
    });

    return activityLog.save();
  }

  /**
   * 批量创建操作日志
   */
  async createMany(data: CreateActivityLogDto[]) {
    const logs = data.map(log => ({
      ...log,
      projectId: new Types.ObjectId(log.projectId),
      userId: new Types.ObjectId(log.userId),
    }));

    return this.activityLogModel.insertMany(logs);
  }

  /**
   * 查询操作日志
   */
  async query(params: QueryActivityLogDto) {
    const {
      projectId,
      userId,
      type,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = params;

    // 构建查询条件
    const query: any = {};

    if (projectId) {
      query.projectId = new Types.ObjectId(projectId);
    }

    if (userId) {
      query.userId = new Types.ObjectId(userId);
    }

    if (type) {
      query.type = type;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = startDate;
      }
      if (endDate) {
        query.createdAt.$lte = endDate;
      }
    }

    // 计算分页
    const skip = (page - 1) * limit;

    // 执行查询
    const [logs, total] = await Promise.all([
      this.activityLogModel
        .find(query)
        .populate('userId', 'name email id avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.activityLogModel.countDocuments(query).exec(),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 获取项目的最近活动
   */
  async getRecentActivities(projectId: string, limit = 10) {
    return this.activityLogModel
      .find({ projectId: new Types.ObjectId(projectId) })
      .populate('userId', 'name email id avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * 获取用户的活动统计
   */
  async getUserActivityStats(userId: string, projectId?: string) {
    const match: any = { userId: new Types.ObjectId(userId) };
    if (projectId) {
      match.projectId = new Types.ObjectId(projectId);
    }

    const stats = await this.activityLogModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          type: '$_id',
          count: 1,
          _id: 0,
        },
      },
    ]);

    return stats;
  }

  /**
   * 获取项目活动时间线
   */
  async getProjectTimeline(projectId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const timeline = await this.activityLogModel.aggregate([
      {
        $match: {
          projectId: new Types.ObjectId(projectId),
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            type: '$type',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.date',
          activities: {
            $push: {
              type: '$_id.type',
              count: '$count',
            },
          },
          total: { $sum: '$count' },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    return timeline;
  }

  /**
   * 清理旧日志（可选功能）
   */
  async cleanOldLogs(days = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.activityLogModel.deleteMany({
      createdAt: { $lt: cutoffDate },
    });

    return {
      deleted: result.deletedCount,
      message: `删除了 ${result.deletedCount} 条超过 ${days} 天的日志`,
    };
  }

  /**
   * 获取项目的操作日志详情
   */
  async getActivityDetails(activityId: string) {
    return this.activityLogModel
      .findById(activityId)
      .populate('userId', 'name email id avatar')
      .populate('projectId', 'name')
      .exec();
  }
} 