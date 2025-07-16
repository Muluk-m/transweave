import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '../jwt/guard';
import { CurrentUser, UserPayload } from '../jwt/current-user.decorator';
import { ActivityLogService, QueryActivityLogDto } from '../service/activity-log.service';
import { ProjectService } from '../service/project.service';

@Controller('api/activity-logs')
@UseGuards(AuthGuard)
export class ActivityLogController {
  constructor(
    private readonly activityLogService: ActivityLogService,
    private readonly projectService: ProjectService,
  ) {}

  @Get()
  @UseGuards(AuthGuard)
  async queryLogs(
    @Query() query: QueryActivityLogDto,
    @CurrentUser() user: UserPayload,
  ) {
    // 如果指定了projectId，验证用户权限
    if (query.projectId) {
      const hasPermission = await this.projectService.checkUserProjectPermission(
        query.projectId,
        user.userId,
      );
      if (!hasPermission) {
        throw new BadRequestException('无权访问该项目的操作日志');
      }
    }

    return this.activityLogService.query({
      ...query,
      page : query.page ? +query.page : 1,
      limit: query.limit ? +query.limit : 10,
    });
  }

  @Get('project/:projectId/recent')
  @UseGuards(AuthGuard)
  async getProjectRecentActivities(
    @Param('projectId') projectId: string,
    @Query('limit') limit: string,
    @CurrentUser() user: UserPayload,
  ) {
    // 验证用户权限
    const hasPermission = await this.projectService.checkUserProjectPermission(
      projectId,
      user.userId,
    );
    if (!hasPermission) {
      throw new BadRequestException('无权访问该项目的操作日志');
    }

    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.activityLogService.getRecentActivities(projectId, limitNum);
  }

  @Get('project/:projectId/timeline')
  @UseGuards(AuthGuard)
  async getProjectTimeline(
    @Param('projectId') projectId: string,
    @Query('days') days: string,
    @CurrentUser() user: UserPayload,
  ) {
    // 验证用户权限
    const hasPermission = await this.projectService.checkUserProjectPermission(
      projectId,
      user.userId,
    );
    if (!hasPermission) {
      throw new BadRequestException('无权访问该项目的操作日志');
    }

    const daysNum = days ? parseInt(days, 10) : 30;
    return this.activityLogService.getProjectTimeline(projectId, daysNum);
  }

  @Get('user/:userId/stats')
  @UseGuards(AuthGuard)
  async getUserStats(
    @Param('userId') userId: string,
    @Query('projectId') projectId: string,
    @CurrentUser() user: UserPayload,
  ) {
    // 只能查看自己的统计，除非是管理员
    if (userId !== user.userId) {
      throw new BadRequestException('无权查看其他用户的操作统计');
    }

    // 如果指定了projectId，验证用户权限
    if (projectId) {
      const hasPermission = await this.projectService.checkUserProjectPermission(
        projectId,
        user.userId,
      );
      if (!hasPermission) {
        throw new BadRequestException('无权访问该项目');
      }
    }

    return this.activityLogService.getUserActivityStats(userId, projectId);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  async getActivityDetail(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    const activity = await this.activityLogService.getActivityDetails(id);
    
    if (!activity) {
      throw new BadRequestException('操作日志不存在');
    }

    // 验证用户权限
    const hasPermission = await this.projectService.checkUserProjectPermission(
      String(activity.projectId),
      user.userId,
    );
    if (!hasPermission) {
      throw new BadRequestException('无权访问该操作日志');
    }

    return activity;
  }
} 