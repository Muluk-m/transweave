import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ProjectRepository } from '../repository/project.repository';
import { TeamRepository } from '../repository/team.repository';
import type {
  AiConfigDto,
  AiConfigStored,
} from './providers/translation-provider.interface';
import { encryptApiKey, maskApiKey } from './encryption.util';
import { createTranslationProvider } from './providers/provider-factory';

@Injectable()
export class AiConfigService {
  private readonly logger = new Logger(AiConfigService.name);

  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly teamRepository: TeamRepository,
  ) {}

  async getTeamConfig(teamId: string): Promise<AiConfigStored | null> {
    const team = await this.teamRepository.findById(teamId);
    return (team?.aiConfig as AiConfigStored) ?? null;
  }

  async setTeamConfig(teamId: string, config: AiConfigDto): Promise<void> {
    // Validate the API key by creating a provider and testing it
    const provider = createTranslationProvider({
      provider: config.provider,
      apiKey: config.apiKey,
      model: config.model,
      baseUrl: config.baseUrl,
    });

    const isValid = await provider.validateApiKey();
    if (!isValid) {
      throw new BadRequestException(
        'Invalid API key for the selected provider',
      );
    }

    const stored: AiConfigStored = {
      provider: config.provider,
      apiKey: encryptApiKey(config.apiKey),
      model: config.model,
      baseUrl: config.baseUrl,
    };

    await this.teamRepository.update(teamId, { aiConfig: stored } as any);
    this.logger.log(
      `AI config set for team ${teamId}: provider=${config.provider}`,
    );
  }

  async getProjectConfig(projectId: string): Promise<AiConfigStored | null> {
    const project = await this.projectRepository.findById(projectId);
    return (project?.aiConfig as AiConfigStored) ?? null;
  }

  async setProjectConfig(
    projectId: string,
    config: AiConfigDto,
  ): Promise<void> {
    // Validate the API key by creating a provider and testing it
    const provider = createTranslationProvider({
      provider: config.provider,
      apiKey: config.apiKey,
      model: config.model,
      baseUrl: config.baseUrl,
    });

    const isValid = await provider.validateApiKey();
    if (!isValid) {
      throw new BadRequestException(
        'Invalid API key for the selected provider',
      );
    }

    const stored: AiConfigStored = {
      provider: config.provider,
      apiKey: encryptApiKey(config.apiKey),
      model: config.model,
      baseUrl: config.baseUrl,
    };

    await this.projectRepository.update(projectId, {
      aiConfig: stored,
    } as any);
    this.logger.log(
      `AI config set for project ${projectId}: provider=${config.provider}`,
    );
  }

  async removeTeamConfig(teamId: string): Promise<void> {
    await this.teamRepository.update(teamId, { aiConfig: null } as any);
    this.logger.log(`AI config removed for team ${teamId}`);
  }

  async removeProjectConfig(projectId: string): Promise<void> {
    await this.projectRepository.update(projectId, { aiConfig: null } as any);
    this.logger.log(`AI config removed for project ${projectId}`);
  }

  async getConfigStatus(projectId: string): Promise<{
    configured: boolean;
    provider?: string;
    level?: 'project' | 'team';
    keyHint?: string;
  }> {
    // Check project-level config first
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      return { configured: false };
    }

    const projectConfig = project.aiConfig as AiConfigStored | null;
    if (projectConfig?.provider && projectConfig?.apiKey) {
      return {
        configured: true,
        provider: projectConfig.provider,
        level: 'project',
        keyHint: maskApiKey(projectConfig.apiKey),
      };
    }

    // Fall back to team-level config
    const team = await this.teamRepository.findById(project.teamId);
    const teamConfig = (team?.aiConfig as AiConfigStored) ?? null;
    if (teamConfig?.provider && teamConfig?.apiKey) {
      return {
        configured: true,
        provider: teamConfig.provider,
        level: 'team',
        keyHint: maskApiKey(teamConfig.apiKey),
      };
    }

    return { configured: false };
  }
}
