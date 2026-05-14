import { Body, Controller, Get, Param, Put, Query, UseGuards, BadRequestException, ForbiddenException } from '@nestjs/common';
import { IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';
import { AuthGuard } from '../jwt/guard';
import { CurrentUser, UserPayload } from '../jwt/current-user.decorator';
import { ConnectorResolver } from './connector-resolver.service';
import { TeamRepository } from '../repository/team.repository';
import { ProjectRepository } from '../repository/project.repository';
import { MembershipRepository } from '../repository/membership.repository';
import { AiConnectorRepository } from '../repository/ai-connector.repository';
import { maskApiKey } from './encryption.util';
import { PROVIDER_CAPABILITIES } from './providers/capabilities';
import type { ProviderType } from './providers/translation-provider.interface';

class SetDefaultDto {
  @ValidateIf((o) => o.connectorId !== null) @IsUUID() @IsOptional() connectorId!: string | null;
  @ValidateIf((o) => o.model !== null) @IsString() @IsOptional() model!: string | null;
}

@Controller('api/ai/defaults')
@UseGuards(AuthGuard)
export class AiDefaultsController {
  constructor(
    private readonly teams: TeamRepository,
    private readonly projects: ProjectRepository,
    private readonly memberships: MembershipRepository,
    private readonly connectors: AiConnectorRepository,
    private readonly resolver: ConnectorResolver,
  ) {}

  @Put('team/:teamId')
  async setTeam(@Param('teamId') teamId: string, @Body() dto: SetDefaultDto, @CurrentUser() user: UserPayload) {
    await this.assertOwnerOrManager(user.userId, teamId);
    if (dto.connectorId) {
      const c = await this.connectors.findById(dto.connectorId);
      if (!c || c.teamId !== teamId || c.scope !== 'team') throw new BadRequestException('connector not in this team');
    }
    await this.teams.update(teamId, { defaultConnectorId: dto.connectorId, defaultModel: dto.model } as any);
    return { ok: true };
  }

  @Put('project/:projectId')
  async setProject(@Param('projectId') projectId: string, @Body() dto: SetDefaultDto, @CurrentUser() user: UserPayload) {
    const project = await this.projects.findById(projectId);
    if (!project) throw new BadRequestException('project not found');
    await this.assertOwnerOrManager(user.userId, project.teamId);
    if (dto.connectorId) {
      const c = await this.connectors.findById(dto.connectorId);
      if (!c || c.teamId !== project.teamId) {
        throw new BadRequestException('connector not in this project\'s team');
      }
      // Project-scoped connectors are private to a project — don't let project A point at B's connector.
      if (c.scope === 'project' && c.projectId !== projectId) {
        throw new BadRequestException('connector belongs to a different project');
      }
    }
    await this.projects.update(projectId, { defaultConnectorId: dto.connectorId, defaultModel: dto.model } as any);
    return { ok: true };
  }

  @Get('resolve')
  async resolve(@Query('projectId') projectId: string, @CurrentUser() user: UserPayload) {
    if (!projectId) throw new BadRequestException('projectId required');
    const project = await this.projects.findById(projectId);
    if (!project) throw new BadRequestException();
    await this.assertMember(user.userId, project.teamId);
    try {
      const r = await this.resolver.resolve(projectId);
      const cap = PROVIDER_CAPABILITIES[r.connector.provider as ProviderType];
      return {
        configured: true,
        connectorId: r.connector.id,
        displayName: r.connector.displayName,
        provider: r.connector.provider,
        model: r.model,
        source: r.source,
        toolCalling: !!cap?.toolCalling,
        keyHint: maskApiKey(r.connector.apiKey),
      };
    } catch (err) {
      // Only the "no connector configured / no model" sentinels should be downgraded —
      // everything else (DB errors, decryption failures, etc.) must propagate.
      if (err instanceof Error && err.message.startsWith('AI_NOT_CONFIGURED')) {
        return { configured: false };
      }
      throw err;
    }
  }

  private async assertMember(userId: string, teamId: string) {
    const m = await this.memberships.findByUserAndTeam(userId, teamId);
    if (!m) throw new ForbiddenException();
  }
  private async assertOwnerOrManager(userId: string, teamId: string) {
    const m = await this.memberships.findByUserAndTeam(userId, teamId);
    if (!m || !['owner', 'manager'].includes(m.role)) throw new ForbiddenException();
  }
}
