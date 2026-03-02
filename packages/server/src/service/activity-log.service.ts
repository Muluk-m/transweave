import { Injectable } from '@nestjs/common';
import { ActivityLogRepository } from '../repository/activity-log.repository';
import {
  type ActivityLog,
  type NewActivityLog,
  ActivityType,
  type ActivityDetails,
} from '../db/schema';

export { ActivityType, type ActivityDetails };

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
  constructor(private readonly activityLogRepository: ActivityLogRepository) {}

  async create(data: CreateActivityLogDto): Promise<ActivityLog> {
    const record: NewActivityLog = {
      type: data.type,
      projectId: data.projectId,
      userId: data.userId,
      details: data.details,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    };
    return this.activityLogRepository.create(record);
  }

  async createMany(data: CreateActivityLogDto[]): Promise<ActivityLog[]> {
    const results: ActivityLog[] = [];
    for (const item of data) {
      results.push(await this.create(item));
    }
    return results;
  }

  async query(params: QueryActivityLogDto) {
    const { projectId, type, page = 1, limit = 20 } = params;
    const offset = (page - 1) * limit;

    let logs: ActivityLog[] = [];
    if (projectId) {
      logs = await this.activityLogRepository.findByProjectId(projectId, {
        limit,
        offset,
        type: type as string | undefined,
      });
    } else {
      logs = await this.activityLogRepository.findAll();
      if (type) {
        logs = logs.filter((l) => l.type === type);
      }
      logs = logs.slice(offset, offset + limit);
    }

    const total = logs.length;
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

  async getRecentActivities(projectId: string, limit = 10) {
    return this.activityLogRepository.findByProjectIdWithUser(projectId, { limit });
  }

  async getUserActivityStats(userId: string, projectId?: string) {
    return this.activityLogRepository.getUserActivityStats(userId, projectId);
  }

  async getProjectTimeline(projectId: string, days = 30) {
    const rows = await this.activityLogRepository.getProjectTimeline(projectId, days);
    // Group by date to match original shape
    const byDate = new Map<string, { type: string; count: number }[]>();
    for (const row of rows) {
      const date = row.date.slice(0, 10);
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date)!.push({ type: row.type, count: row.count });
    }
    return Array.from(byDate.entries())
      .map(([date, activities]) => ({
        _id: date,
        activities,
        total: activities.reduce((s, a) => s + a.count, 0),
      }))
      .sort((a, b) => a._id.localeCompare(b._id));
  }

  async cleanOldLogs(days = 90) {
    // Simple approach: fetch all then delete old ones
    // For production use a raw SQL delete instead
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const all = await this.activityLogRepository.findAll();
    let deleted = 0;
    for (const log of all) {
      if (log.createdAt < cutoff) {
        await this.activityLogRepository.delete(log.id);
        deleted++;
      }
    }
    return {
      deleted,
      message: `删除了 ${deleted} 条超过 ${days} 天的日志`,
    };
  }

  async getActivityDetails(activityId: string) {
    return this.activityLogRepository.findById(activityId);
  }
}
