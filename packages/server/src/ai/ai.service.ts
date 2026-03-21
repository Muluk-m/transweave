import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AiConfigService } from './ai-config.service';
import { ProjectRepository } from '../repository/project.repository';
import { TeamRepository } from '../repository/team.repository';
import { GlossaryService } from '../service/glossary.service';
import { TranslationMemoryService } from '../service/translation-memory.service';
import type {
  AiConfigStored,
  ProviderConfig,
  TranslationContext,
  TranslationResult,
} from './providers/translation-provider.interface';
import { decryptApiKey } from './encryption.util';
import {
  createTranslationProvider,
  isLLMProvider,
} from './providers/provider-factory';
import { buildKeyGenerationPrompt } from './providers/prompt';
import type { ResolvedGlossaryTerm } from '../service/glossary.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly aiConfigService: AiConfigService,
    private readonly projectRepository: ProjectRepository,
    private readonly teamRepository: TeamRepository,
    private readonly glossaryService: GlossaryService,
    private readonly translationMemoryService: TranslationMemoryService,
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
  }): Promise<TranslationResult> {
    const config = await this.resolveProviderConfig(params.projectId);
    if (!config) {
      throw new HttpException(
        'No AI provider configured. Configure one in team or project settings.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const provider = createTranslationProvider(config);

    // Build translation context from glossary and TM
    let context: TranslationContext | undefined;
    try {
      const project = await this.projectRepository.findById(params.projectId);
      if (project) {
        const [allTerms, tmSuggestions] = await Promise.all([
          this.glossaryService.resolveForProject(params.projectId, project.teamId),
          project.defaultLang
            ? Promise.all(
                params.to.map((lang) =>
                  this.translationMemoryService.querySuggestions({
                    projectId: params.projectId,
                    sourceText: params.text,
                    sourceLanguage: params.from,
                    targetLanguage: lang,
                    minSimilarity: 80,
                    maxResults: 3,
                  }),
                ),
              )
            : Promise.resolve([]),
        ]);

        const matchingTerms = this.glossaryService.filterMatchingTerms(allTerms, params.text);
        const flatTmMatches = tmSuggestions
          .flat()
          .map((m) => ({
            sourceText: m.sourceText,
            targetText: m.targetText,
            targetLanguage: (m as any).targetLanguage || '',
            similarity: m.similarity,
          }));

        if (matchingTerms.length > 0 || flatTmMatches.length > 0) {
          context = {
            glossaryTerms: matchingTerms.length > 0 ? matchingTerms : undefined,
            tmMatches: flatTmMatches.length > 0 ? flatTmMatches : undefined,
          };
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to load glossary/TM context: ${err}`);
    }

    try {
      const result = await provider.translate({
        text: params.text,
        from: params.from,
        to: params.to,
        context,
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
          context,
        });
        return retryResult;
      }
      throw error;
    }
  }

  async *batchTranslate(params: {
    tokens: Array<{ id: string; text: string; from: string; to: string[] }>;
    projectId: string;
  }): AsyncGenerator<{
    type: 'progress' | 'result' | 'error' | 'done';
    tokenId?: string;
    translations?: Record<string, string>;
    confidence?: Record<string, number>;
    completed?: number;
    total?: number;
    failed?: number;
    error?: string;
  }> {
    const config = await this.resolveProviderConfig(params.projectId);
    if (!config) {
      throw new HttpException(
        'No AI provider configured. Configure one in team or project settings.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const { default: pLimit } = await import('p-limit');
    const limit = pLimit(5);

    const total = params.tokens.length;
    let completed = 0;
    let failed = 0;

    // Pre-resolve glossary once for the whole batch
    let glossaryTerms: ResolvedGlossaryTerm[] | undefined;
    try {
      const project = await this.projectRepository.findById(params.projectId);
      if (project) {
        const allTerms = await this.glossaryService.resolveForProject(
          params.projectId,
          project.teamId,
        );
        if (allTerms.length > 0) {
          glossaryTerms = allTerms;
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to load glossary context for batch: ${err}`);
    }

    // Use a shared results queue for yielding
    const results: Array<{
      type: 'progress' | 'result' | 'error';
      tokenId?: string;
      translations?: Record<string, string>;
      confidence?: Record<string, number>;
      completed?: number;
      total?: number;
      failed?: number;
      error?: string;
    }> = [];

    const tasks = params.tokens.map((token) =>
      limit(async () => {
        try {
          // Build per-token context (TM is text-specific)
          let context: TranslationContext | undefined;
          const matchingTerms = glossaryTerms
            ? this.glossaryService.filterMatchingTerms(glossaryTerms, token.text)
            : [];

          if (matchingTerms.length > 0) {
            context = { glossaryTerms: matchingTerms };
          }

          const provider = createTranslationProvider(config);
          const result = await provider.translate({
            text: token.text,
            from: token.from,
            to: token.to,
            context,
          });

          completed++;
          results.push({
            type: 'result',
            tokenId: token.id,
            translations: result.translations,
            confidence: result.confidence,
            completed,
            total,
            failed,
          });
        } catch (err) {
          completed++;
          failed++;
          this.logger.warn(`Batch translate failed for token ${token.id}: ${err}`);
          results.push({
            type: 'error',
            tokenId: token.id,
            error: err instanceof Error ? err.message : String(err),
            completed,
            total,
            failed,
          });
        }
      }),
    );

    // Run all tasks concurrently (limited to 5)
    await Promise.all(tasks);

    // Yield all results
    for (const r of results) {
      yield r;
    }

    yield { type: 'done', completed, total, failed };
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
