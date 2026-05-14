import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../jwt/guard';
import { AiConfigService } from './ai-config.service';
import type { AiConfigDto } from './providers/translation-provider.interface';
import { maskApiKey } from './encryption.util';
import { MembershipRepository } from '../repository/membership.repository';
import { ProjectRepository } from '../repository/project.repository';
import { CurrentUser, UserPayload } from '../jwt/current-user.decorator';

@Controller('api/ai/config')
@UseGuards(AuthGuard)
export class AiConfigController {
  constructor(
    private readonly aiConfigService: AiConfigService,
    private readonly memberships: MembershipRepository,
    private readonly projects: ProjectRepository,
  ) {}

  @Get('status')
  async getConfigStatus(
    @Query('projectId') projectId: string,
    @CurrentUser() user: UserPayload,
  ) {
    const project = await this.projects.findById(projectId);
    if (!project) throw new NotFoundException('project not found');
    await this.assertTeamMember(user.userId, project.teamId);
    return this.aiConfigService.getConfigStatus(projectId);
  }

  @Get('team/:teamId')
  async getTeamConfig(
    @Param('teamId') teamId: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.assertTeamMember(user.userId, teamId);
    const config = await this.aiConfigService.getTeamConfig(teamId);
    if (!config) {
      return { configured: false };
    }
    return {
      configured: true,
      provider: config.provider,
      model: config.model,
      baseUrl: config.baseUrl,
      keyHint: maskApiKey(config.apiKey),
    };
  }

  @Put('team/:teamId')
  async setTeamConfig(
    @Param('teamId') teamId: string,
    @Body() config: AiConfigDto,
    @CurrentUser() user: UserPayload,
  ) {
    await this.assertOwnerOrManager(user.userId, teamId);
    await this.aiConfigService.setTeamConfig(teamId, config);
    return { success: true };
  }

  @Delete('team/:teamId')
  async removeTeamConfig(
    @Param('teamId') teamId: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.assertOwnerOrManager(user.userId, teamId);
    await this.aiConfigService.removeTeamConfig(teamId);
    return { success: true };
  }

  @Get('project/:projectId')
  async getProjectConfig(
    @Param('projectId') projectId: string,
    @CurrentUser() user: UserPayload,
  ) {
    const project = await this.projects.findById(projectId);
    if (!project) throw new NotFoundException('project not found');
    await this.assertTeamMember(user.userId, project.teamId);
    const config = await this.aiConfigService.getProjectConfig(projectId);
    if (!config) {
      return { configured: false };
    }
    return {
      configured: true,
      provider: config.provider,
      model: config.model,
      baseUrl: config.baseUrl,
      keyHint: maskApiKey(config.apiKey),
    };
  }

  @Put('project/:projectId')
  async setProjectConfig(
    @Param('projectId') projectId: string,
    @Body() config: AiConfigDto,
    @CurrentUser() user: UserPayload,
  ) {
    const project = await this.projects.findById(projectId);
    if (!project) throw new NotFoundException('project not found');
    await this.assertOwnerOrManager(user.userId, project.teamId);
    await this.aiConfigService.setProjectConfig(projectId, config);
    return { success: true };
  }

  @Delete('project/:projectId')
  async removeProjectConfig(
    @Param('projectId') projectId: string,
    @CurrentUser() user: UserPayload,
  ) {
    const project = await this.projects.findById(projectId);
    if (!project) throw new NotFoundException('project not found');
    await this.assertOwnerOrManager(user.userId, project.teamId);
    await this.aiConfigService.removeProjectConfig(projectId);
    return { success: true };
  }

  @Post('models')
  async listModels(
    @Body() body: { provider: string; apiKey: string; baseUrl?: string },
    @CurrentUser() _user: UserPayload,
  ) {
    const models = await this.aiConfigService.listModels(
      body.provider,
      body.apiKey,
      body.baseUrl,
    );
    return { models };
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  private async assertTeamMember(userId: string, teamId: string) {
    const m = await this.memberships.findByUserAndTeam(userId, teamId);
    if (!m) throw new ForbiddenException();
  }

  private async assertOwnerOrManager(userId: string, teamId: string) {
    const m = await this.memberships.findByUserAndTeam(userId, teamId);
    if (!m || !['owner', 'manager'].includes(m.role)) throw new ForbiddenException();
  }
}
