import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, gte, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.provider';
import type { DrizzleDB } from '../db/drizzle.types';
import {
  activityLogs,
  type ActivityLog,
  type NewActivityLog,
} from '../db/schema';
import { users } from '../db/schema';
import { BaseRepository } from './base.repository';

@Injectable()
export class ActivityLogRepository extends BaseRepository<
  typeof activityLogs,
  ActivityLog,
  NewActivityLog
> {
  constructor(@Inject(DRIZZLE) db: DrizzleDB) {
    super(db, activityLogs);
  }

  async findByProjectId(
    projectId: string,
    options?: { limit?: number; offset?: number; type?: string },
  ): Promise<ActivityLog[]> {
    const conditions = [eq(activityLogs.projectId, projectId)];
    if (options?.type) {
      conditions.push(eq(activityLogs.type, options.type));
    }

    let query = this.db
      .select()
      .from(activityLogs)
      .where(and(...conditions))
      .$dynamic();

    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.offset(options.offset);
    }

    return query;
  }

  async findByProjectIdWithUser(
    projectId: string,
    options?: { limit?: number; offset?: number; type?: string },
  ) {
    const conditions = [eq(activityLogs.projectId, projectId)];
    if (options?.type) {
      conditions.push(eq(activityLogs.type, options.type));
    }

    let query = this.db
      .select({
        log: activityLogs,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
        },
      })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .where(and(...conditions))
      .$dynamic();

    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.offset(options.offset);
    }

    return query;
  }

  async getUserActivityStats(
    userId: string,
    projectId?: string,
  ): Promise<{ type: string; count: number }[]> {
    const conditions = [eq(activityLogs.userId, userId)];
    if (projectId) {
      conditions.push(eq(activityLogs.projectId, projectId));
    }

    return this.db
      .select({ type: activityLogs.type, count: count() })
      .from(activityLogs)
      .where(and(...conditions))
      .groupBy(activityLogs.type);
  }

  async getProjectTimeline(
    projectId: string,
    days?: number,
  ): Promise<{ date: string; type: string; count: number }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days || 30));

    return this.db
      .select({
        date: sql<string>`DATE_TRUNC('day', ${activityLogs.createdAt})::text`,
        type: activityLogs.type,
        count: count(),
      })
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.projectId, projectId),
          gte(activityLogs.createdAt, startDate),
        ),
      )
      .groupBy(
        sql`DATE_TRUNC('day', ${activityLogs.createdAt})`,
        activityLogs.type,
      )
      .orderBy(sql`DATE_TRUNC('day', ${activityLogs.createdAt})`);
  }
}
