import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, lt } from 'drizzle-orm';
import { ActivityLogRepository } from '../repository/activity-log.repository';
import { DRIZZLE } from '../db/drizzle.provider';
import type { DrizzleDB } from '../db/drizzle.types';
import {
  activityLogs,
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
  constructor(
    private readonly activityLogRepository: ActivityLogRepository,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

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

    const conditions: any[] = [];
    if (projectId) {
      conditions.push(eq(activityLogs.projectId, projectId));
    }
    if (type) {
      conditions.push(eq(activityLogs.type, type));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await (this.db as any)
      .select({ count: count() })
      .from(activityLogs)
      .where(whereClause);

    const total: number = countResult?.count ?? 0;

    const logs = await (this.db as any)
      .select()
      .from(activityLogs)
      .where(whereClause)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit)
      .offset(offset);

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
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const deleted = await (this.db as any)
      .delete(activityLogs)
      .where(lt(activityLogs.createdAt, cutoff))
      .returning();

    return {
      deleted: deleted.length,
      message: `Cleaned logs older than ${days} days`,
    };
  }

  async getActivityDetails(activityId: string) {
    return this.activityLogRepository.findById(activityId);
  }
}
