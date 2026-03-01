import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AiConfigService } from './ai-config.service';
import { ProjectRepository } from '../repository/project.repository';
import { TeamRepository } from '../repository/team.repository';
import type {
  AiConfigStored,
  ProviderConfig,
} from './providers/translation-provider.interface';
import { decryptApiKey } from './encryption.util';
import {
  createTranslationProvider,
  isLLMProvider,
} from './providers/provider-factory';
import { buildKeyGenerationPrompt } from './providers/prompt';
import { extractJson } from './providers/json-extract';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly aiConfigService: AiConfigService,
    private readonly projectRepository: ProjectRepository,
    private readonly teamRepository: TeamRepository,
  ) {}

  async resolveProviderConfig(
    projectId: string,
  ): Promise<ProviderConfig | null> {
    // 1. Check project-level config
    const project = await this.projectRepository.findById(projectId);
    if (!project) return null;

    const projectConfig = project.aiConfig as AiConfigStored | null;
    if (projectConfig?.provider && projectConfig?.apiKey) {
      return this.decryptConfig(projectConfig);
    }

    // 2. Fall back to team-level config
    const team = await this.teamRepository.findById(project.teamId);
    const teamConfig = (team?.aiConfig as AiConfigStored) ?? null;
    if (teamConfig?.provider && teamConfig?.apiKey) {
      return this.decryptConfig(teamConfig);
    }

    // 3. No config found -- AI is disabled
    return null;
  }

  private decryptConfig(stored: AiConfigStored): ProviderConfig {
    return {
      provider: stored.provider,
      apiKey: decryptApiKey(stored.apiKey),
      model: stored.model,
      baseUrl: stored.baseUrl,
    };
  }

  async translate(params: {
    text: string;
    from: string;
    to: string[];
    projectId: string;
  }): Promise<Record<string, string>> {
    const config = await this.resolveProviderConfig(params.projectId);
    if (!config) {
      throw new HttpException(
        'No AI provider configured. Configure one in team or project settings.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const provider = createTranslationProvider(config);

    try {
      const result = await provider.translate({
        text: params.text,
        from: params.from,
        to: params.to,
      });
      return result;
    } catch (error) {
      // For LLM providers, retry once on failure (JSON parse errors etc.)
      if (isLLMProvider(config.provider)) {
        this.logger.warn(
          `Translation failed with ${config.provider}, retrying once: ${error}`,
        );
        const retryResult = await provider.translate({
          text: params.text,
          from: params.from,
          to: params.to,
        });
        return retryResult;
      }
      throw error;
    }
  }

  async generateTokenKey(params: {
    remark: string;
    tag?: string;
    module?: string;
    projectId: string;
  }): Promise<string> {
    const config = await this.resolveProviderConfig(params.projectId);
    if (!config) {
      throw new HttpException(
        'No AI provider configured. Configure one in team or project settings.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (!isLLMProvider(config.provider)) {
      throw new HttpException(
        'Token key generation requires an LLM provider (OpenAI or Claude)',
        HttpStatus.BAD_REQUEST,
      );
    }

    const provider = createTranslationProvider(config);
    const prompt = buildKeyGenerationPrompt(
      params.remark,
      params.tag,
      params.module,
    );

    // LLM providers (OpenAI, Claude) have a generateText method
    const result = await (provider as any).generateText(prompt);
    return result;
  }
}
