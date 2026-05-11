import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ProjectRepository } from '../repository/project.repository';
import { TeamRepository } from '../repository/team.repository';
import { AiConnectorRepository } from '../repository/ai-connector.repository';
import type {
  AiConfigDto,
  AiConfigStored,
} from './providers/translation-provider.interface';
import { encryptApiKey, maskApiKey } from './encryption.util';
import {
  createTranslationProvider,
  isLLMProvider,
} from './providers/provider-factory';
import type { EnabledModel } from '../db/schema/ai-connectors';

@Injectable()
export class AiConfigService {
  private readonly logger = new Logger(AiConfigService.name);

  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly teamRepository: TeamRepository,
    private readonly connectorRepo: AiConnectorRepository,
  ) {}

  async getTeamConfig(teamId: string): Promise<AiConfigStored | null> {
    const team = await this.teamRepository.findById(teamId);
    if (!team?.defaultConnectorId) return null;
    const c = await this.connectorRepo.findById(team.defaultConnectorId);
    if (!c) return null;
    return {
      provider: c.provider as any,
      apiKey: c.apiKey,
      model: team.defaultModel ?? undefined,
      baseUrl: c.baseUrl ?? undefined,
    };
  }

  private async validateApiKey(config: AiConfigDto): Promise<void> {
    const provider = createTranslationProvider({
      provider: config.provider,
      apiKey: config.apiKey,
      model: config.model,
      baseUrl: config.baseUrl,
    });

    try {
      const isValid = await provider.validateApiKey();
      if (!isValid) {
        throw new BadRequestException(
          'Invalid API key for the selected provider',
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`API key validation failed: ${error.message}`);
      throw new BadRequestException(
        'Failed to validate API key. Please check your key and try again.',
      );
    }
  }

  private encryptKey(apiKey: string): string {
    try {
      return encryptApiKey(apiKey);
    } catch (error) {
      this.logger.error(`API key encryption failed: ${error.message}`);
      throw new InternalServerErrorException(
        'AI_ENCRYPTION_KEY is not configured on the server. Please contact your administrator.',
      );
    }
  }

  private async validateAndEncrypt(
    config: AiConfigDto,
  ): Promise<AiConfigStored> {
    await this.validateApiKey(config);
    const encryptedKey = this.encryptKey(config.apiKey);
    return {
      provider: config.provider,
      apiKey: encryptedKey,
      model: config.model,
      baseUrl: config.baseUrl,
    };
  }

  private upsertModelIntoList(list: EnabledModel[], model?: string): EnabledModel[] {
    if (!model) return list;
    if (list.some((m) => m.modelId === model)) return list;
    return [...list, { modelId: model, addedManually: true }];
  }

  async setTeamConfig(teamId: string, config: AiConfigDto): Promise<void> {
    await this.validateApiKey(config);
    const encryptedKey = this.encryptKey(config.apiKey);

    const existing = await this.connectorRepo.findDefaultForTeam(teamId);
    let connectorId: string;

    if (existing) {
      const updatedModels = this.upsertModelIntoList(
        existing.enabledModels ?? [],
        config.model,
      );
      await this.connectorRepo.update(existing.id, {
        provider: config.provider,
        apiKey: encryptedKey,
        baseUrl: config.baseUrl ?? null,
        enabledModels: updatedModels,
      });
      connectorId = existing.id;
    } else {
      const created = await this.connectorRepo.create({
        scope: 'team',
        teamId,
        projectId: null,
        displayName: 'Default',
        provider: config.provider,
        apiKey: encryptedKey,
        baseUrl: config.baseUrl ?? null,
        enabledModels: this.upsertModelIntoList([], config.model),
      } as any);
      connectorId = created.id;
    }

    await this.teamRepository.update(teamId, {
      defaultConnectorId: connectorId,
      defaultModel: config.model ?? null,
    } as any);

    this.logger.log(
      `AI config set for team ${teamId}: provider=${config.provider}`,
    );
  }

  async getProjectConfig(projectId: string): Promise<AiConfigStored | null> {
    const project = await this.projectRepository.findById(projectId);
    if (!project?.defaultConnectorId) return null;
    const c = await this.connectorRepo.findById(project.defaultConnectorId);
    if (!c) return null;
    return {
      provider: c.provider as any,
      apiKey: c.apiKey,
      model: project.defaultModel ?? undefined,
      baseUrl: c.baseUrl ?? undefined,
    };
  }

  async setProjectConfig(
    projectId: string,
    config: AiConfigDto,
  ): Promise<void> {
    await this.validateApiKey(config);
    const encryptedKey = this.encryptKey(config.apiKey);

    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new BadRequestException('Project not found');
    }

    const existing = await this.connectorRepo.findDefaultForProject(projectId);
    let connectorId: string;

    if (existing) {
      const updatedModels = this.upsertModelIntoList(
        existing.enabledModels ?? [],
        config.model,
      );
      await this.connectorRepo.update(existing.id, {
        provider: config.provider,
        apiKey: encryptedKey,
        baseUrl: config.baseUrl ?? null,
        enabledModels: updatedModels,
      });
      connectorId = existing.id;
    } else {
      const created = await this.connectorRepo.create({
        scope: 'project',
        teamId: project.teamId,
        projectId,
        displayName: 'Default',
        provider: config.provider,
        apiKey: encryptedKey,
        baseUrl: config.baseUrl ?? null,
        enabledModels: this.upsertModelIntoList([], config.model),
      } as any);
      connectorId = created.id;
    }

    await this.projectRepository.update(projectId, {
      defaultConnectorId: connectorId,
      defaultModel: config.model ?? null,
    } as any);

    this.logger.log(
      `AI config set for project ${projectId}: provider=${config.provider}`,
    );
  }

  async removeTeamConfig(teamId: string): Promise<void> {
    await this.teamRepository.update(teamId, {
      defaultConnectorId: null,
      defaultModel: null,
    } as any);
    this.logger.log(`AI config removed for team ${teamId}`);
  }

  async removeProjectConfig(projectId: string): Promise<void> {
    await this.projectRepository.update(projectId, {
      defaultConnectorId: null,
      defaultModel: null,
    } as any);
    this.logger.log(`AI config removed for project ${projectId}`);
  }

  async listModels(
    provider: string,
    apiKey: string,
    baseUrl?: string,
  ): Promise<string[]> {
    if (!isLLMProvider(provider)) {
      return [];
    }

    const instance = createTranslationProvider({
      provider: provider as any,
      apiKey,
      baseUrl,
    });

    if (!instance.listModels) {
      return [];
    }

    return instance.listModels();
  }

  async getConfigStatus(projectId: string): Promise<{
    configured: boolean;
    provider?: string;
    level?: 'project' | 'team';
    keyHint?: string;
  }> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      return { configured: false };
    }

    // Check project-level connector first
    if (project.defaultConnectorId) {
      const c = await this.connectorRepo.findById(project.defaultConnectorId);
      if (c?.provider && c?.apiKey) {
        return {
          configured: true,
          provider: c.provider,
          level: 'project',
          keyHint: maskApiKey(c.apiKey),
        };
      }
    }

    // Fall back to team-level connector
    const team = await this.teamRepository.findById(project.teamId);
    if (team?.defaultConnectorId) {
      const c = await this.connectorRepo.findById(team.defaultConnectorId);
      if (c?.provider && c?.apiKey) {
        return {
          configured: true,
          provider: c.provider,
          level: 'team',
          keyHint: maskApiKey(c.apiKey),
        };
      }
    }

    return { configured: false };
  }
}
