import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '../jwt/guard';
import { AiConnectorRepository } from '../repository/ai-connector.repository';
import { MembershipRepository } from '../repository/membership.repository';
import { ProjectRepository } from '../repository/project.repository';
import { CreateConnectorDto, UpdateConnectorDto } from './dto/ai-connector.dto';
import { encryptApiKey, maskApiKey } from './encryption.util';
import { PROVIDER_CAPABILITIES } from './providers/capabilities';
import type { ProviderType } from './providers/translation-provider.interface';
import { CurrentUser, UserPayload } from '../jwt/current-user.decorator';

@Controller('api/ai/connectors')
@UseGuards(AuthGuard)
export class AiConnectorsController {
  constructor(
    private readonly connectors: AiConnectorRepository,
    private readonly memberships: MembershipRepository,
    private readonly projects: ProjectRepository,
  ) {}

  @Get()
  async list(
    @Query('teamId') teamId: string | undefined,
    @Query('projectId') projectId: string | undefined,
    @CurrentUser() user: UserPayload,
  ) {
    if (!teamId && !projectId) {
      throw new BadRequestException('teamId or projectId required');
    }
    const targetTeamId = teamId ?? (await this.projects.findById(projectId!))?.teamId;
    if (!targetTeamId) throw new NotFoundException('project not found');
    await this.assertTeamMember(user.userId, targetTeamId);
    const rows = projectId
      ? await this.connectors.listForProject(projectId)
      : await this.connectors.listForTeam(teamId!);
    return rows.map(this.maskRow);
  }

  @Post()
  async create(@Body() dto: CreateConnectorDto, @CurrentUser() user: UserPayload) {
    this.validateScope(dto);
    this.validateBaseUrlForProvider(dto);
    await this.assertTeamRole(user.userId, dto.teamId, ['owner', 'manager']);
    const row = await this.connectors.create({
      scope: dto.scope,
      teamId: dto.teamId,
      projectId: dto.scope === 'project' ? dto.projectId! : null,
      displayName: dto.displayName,
      provider: dto.provider,
      apiKey: encryptApiKey(dto.apiKey),
      baseUrl: dto.baseUrl ?? null,
      enabledModels: dto.enabledModels,
      createdBy: user.userId,
    } as any);
    return this.maskRow(row);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateConnectorDto,
    @CurrentUser() user: UserPayload,
  ) {
    const existing = await this.connectors.findById(id);
    if (!existing) throw new NotFoundException();
    await this.assertTeamRole(user.userId, existing.teamId, ['owner', 'manager']);
    const patch: any = {};
    if (dto.displayName !== undefined) patch.displayName = dto.displayName;
    if (dto.apiKey) patch.apiKey = encryptApiKey(dto.apiKey);
    if (dto.baseUrl !== undefined) patch.baseUrl = dto.baseUrl;
    if (dto.enabledModels !== undefined) patch.enabledModels = dto.enabledModels;
    const updated = await this.connectors.update(id, patch);
    return this.maskRow(updated!);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    const existing = await this.connectors.findById(id);
    if (!existing) throw new NotFoundException();
    await this.assertTeamRole(user.userId, existing.teamId, ['owner', 'manager']);
    await this.connectors.delete(id);
    return { ok: true };
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  private validateScope(dto: CreateConnectorDto) {
    if (dto.scope === 'project' && !dto.projectId) {
      throw new BadRequestException('projectId required for project scope');
    }
    if (dto.scope === 'team' && dto.projectId) {
      throw new BadRequestException('projectId must be null for team scope');
    }
  }

  private validateBaseUrlForProvider(dto: CreateConnectorDto) {
    const cap = PROVIDER_CAPABILITIES[dto.provider as ProviderType];
    if (cap?.requiresBaseUrl && !dto.baseUrl) {
      throw new BadRequestException(`${dto.provider} requires baseUrl`);
    }
  }

  private async assertTeamMember(userId: string, teamId: string) {
    const m = await this.memberships.findByUserAndTeam(userId, teamId);
    if (!m) throw new ForbiddenException();
  }

  private async assertTeamRole(userId: string, teamId: string, roles: string[]) {
    const m = await this.memberships.findByUserAndTeam(userId, teamId);
    if (!m || !roles.includes(m.role)) throw new ForbiddenException();
  }

  private maskRow = (row: any) => ({
    ...row,
    apiKey: undefined,
    keyHint: maskApiKey(row.apiKey),
  });
}
