import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../jwt/guard';
import { CurrentUser, type UserPayload } from '../jwt/current-user.decorator';
import { AiPromptTemplateService } from '../service/ai-prompt-template.service';
import { ProjectRepository } from '../repository/project.repository';
import type { PromptKind } from '../db/schema';

@Controller('api/ai/prompt-templates')
@UseGuards(AuthGuard)
export class AiPromptTemplateController {
  constructor(
    private readonly templateService: AiPromptTemplateService,
    private readonly projectRepository: ProjectRepository,
  ) {}

  @Post()
  async create(
    @Body()
    data: {
      scope: 'team' | 'project';
      scopeId: string;
      kind: PromptKind;
      name: string;
      body: string;
      variables?: string[];
      isDefault?: boolean;
    },
    @CurrentUser() user: UserPayload,
  ) {
    const teamId = await this.resolveTeamId(data.scope, data.scopeId);
    return this.templateService.create({
      ...data,
      teamId,
      createdBy: user.userId,
    });
  }

  @Get()
  async list(
    @Query('scope') scope?: 'team' | 'project',
    @Query('scopeId') scopeId?: string,
  ) {
    if (!scope || !scopeId) {
      throw new BadRequestException('scope and scopeId are required');
    }
    return this.templateService.listByScope(scope, scopeId);
  }

  @Get('builtins')
  listBuiltins() {
    return this.templateService.listBuiltins();
  }

  @Get('resolve')
  async resolve(
    @Query('projectId') projectId: string,
    @Query('kind') kind: PromptKind,
  ) {
    if (!projectId || !kind) {
      throw new BadRequestException('projectId and kind are required');
    }
    return this.templateService.resolve(projectId, kind);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body()
    data: {
      name?: string;
      body?: string;
      variables?: string[];
      isDefault?: boolean;
    },
  ) {
    return this.templateService.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.templateService.delete(id);
    return { success: true };
  }

  private async resolveTeamId(
    scope: 'team' | 'project',
    scopeId: string,
  ): Promise<string> {
    if (scope === 'team') return scopeId;
    const project = await this.projectRepository.findById(scopeId);
    if (!project) {
      throw new BadRequestException(`Project ${scopeId} not found`);
    }
    return project.teamId;
  }
}
