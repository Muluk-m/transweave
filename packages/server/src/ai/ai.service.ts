import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AiConfigService } from './ai-config.service';
import { ProjectRepository } from '../repository/project.repository';
import { TeamRepository } from '../repository/team.repository';
import { GlossaryService } from '../service/glossary.service';
import { TranslationMemoryService } from '../service/translation-memory.service';
import type {
  ProviderConfig,
  ProviderType,
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
import { AiPromptTemplateService } from '../service/ai-prompt-template.service';
import {
  renderTemplate,
  renderGlossarySection,
  renderTmSection,
  renderOutputFormat,
} from './prompts/render';
import { ConnectorResolver } from './connector-resolver.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly aiConfigService: AiConfigService,
    private readonly projectRepository: ProjectRepository,
    private readonly teamRepository: TeamRepository,
    private readonly glossaryService: GlossaryService,
    private readonly translationMemoryService: TranslationMemoryService,
    private readonly promptTemplateService: AiPromptTemplateService,
    private readonly resolver: ConnectorResolver,
  ) {}

  private renderTranslatePrompt(
    resolved: { body: string; templateId?: string; kind: string },
    text: string,
    from: string,
    to: string[],
    context: TranslationContext | undefined,
  ): string {
    return renderTemplate(
      resolved.body,
      {
        sourceText: text,
        sourceLang: from,
        targetLangs: to.join(', '),
        glossarySection: renderGlossarySection(context?.glossaryTerms ?? [], to),
        tmSection: renderTmSection(context?.tmMatches ?? []),
        outputFormat: renderOutputFormat(to),
      },
      { templateId: resolved.templateId, kind: resolved.kind },
    );
  }

  private async resolveActiveConfig(
    projectId: string,
    override?: { connectorId?: string; model?: string },
  ): Promise<ProviderConfig> {
    try {
      const r = await this.resolver.resolve(projectId, override);
      return {
        provider: r.connector.provider as ProviderType,
        apiKey: decryptApiKey(r.connector.apiKey),
        model: r.model,
        baseUrl: r.connector.baseUrl ?? undefined,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith('AI provider API key could not be decrypted')) {
        // Stale ciphertext (e.g. AI_ENCRYPTION_KEY rotated or qlj-i18n-ai-salt→transweave-ai-salt
        // upgrade in b314580): surface as config error so the UI can prompt re-entry.
        throw new HttpException(msg, HttpStatus.SERVICE_UNAVAILABLE);
      }
      if (msg.startsWith('AI_NOT_CONFIGURED')) {
        throw new HttpException(
          'No AI provider configured. Configure one in team or project settings.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      throw err;
    }
  }

  async translate(params: {
    text: string;
    from: string;
    to: string[];
    projectId: string;
    override?: { connectorId?: string; model?: string };
  }): Promise<TranslationResult> {
    const config = await this.resolveActiveConfig(params.projectId, params.override);

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

    let promptOverride: string | undefined;
    if (isLLMProvider(config.provider)) {
      try {
        const resolved = await this.promptTemplateService.resolve(params.projectId, 'translate');
        promptOverride = this.renderTranslatePrompt(
          resolved,
          params.text,
          params.from,
          params.to,
          context,
        );
      } catch (err) {
        this.logger.warn(`Falling back to legacy prompt: ${err}`);
      }
    }

    const callArgs = {
      text: params.text,
      from: params.from,
      to: params.to,
      context,
      promptOverride,
    };

    try {
      return await provider.translate(callArgs);
    } catch (error) {
      if (isLLMProvider(config.provider)) {
        this.logger.warn(
          `Translation failed with ${config.provider}, retrying once: ${error}`,
        );
        return provider.translate(callArgs);
      }
      throw error;
    }
  }

  async *batchTranslate(params: {
    tokens: Array<{ id: string; text: string; from: string; to: string[] }>;
    projectId: string;
    override?: { connectorId?: string; model?: string };
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
    const config = await this.resolveActiveConfig(params.projectId, params.override);

    const { default: pLimit } = await import('p-limit');
    const limit = pLimit(5);

    const total = params.tokens.length;
    let completed = 0;
    let failed = 0;

    const project = await this.projectRepository.findById(params.projectId).catch(() => null);

    let glossaryTerms: ResolvedGlossaryTerm[] | undefined;
    if (project) {
      const allTerms = await this.glossaryService
        .resolveForProject(params.projectId, project.teamId)
        .catch((err) => {
          this.logger.warn(`Failed to load glossary context for batch: ${err}`);
          return [] as ResolvedGlossaryTerm[];
        });
      if (allTerms.length > 0) glossaryTerms = allTerms;
    }

    // Pre-fetch TM matches concurrently. One query per (token, lang) — call
    // sites limited by the batch's existing 5-way concurrency on translate.
    const tmCache = new Map<string, TranslationContext['tmMatches']>();
    if (project?.defaultLang) {
      await Promise.all(
        params.tokens.map(async (token) => {
          const matches = (
            await Promise.all(
              token.to.map((lang) =>
                this.translationMemoryService
                  .querySuggestions({
                    projectId: params.projectId,
                    sourceText: token.text,
                    sourceLanguage: token.from,
                    targetLanguage: lang,
                    minSimilarity: 80,
                    maxResults: 3,
                  })
                  .catch(() => [])
                  .then((rows: any[]) =>
                    rows.map((m) => ({
                      sourceText: m.sourceText,
                      targetText: m.targetText,
                      targetLanguage: m.targetLanguage || lang,
                      similarity: m.similarity,
                    })),
                  ),
              ),
            )
          ).flat();
          if (matches.length > 0) tmCache.set(token.id, matches);
        }),
      );
    }

    // Resolve the batch template once for the whole batch (LLM providers only).
    const isLLM = isLLMProvider(config.provider);
    const resolvedTemplate = isLLM
      ? await this.promptTemplateService
          .resolve(params.projectId, 'translate_batch')
          .catch((err) => {
            this.logger.warn(`Falling back to legacy prompt for batch: ${err}`);
            return null;
          })
      : null;

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
          const matchingTerms = glossaryTerms
            ? this.glossaryService.filterMatchingTerms(glossaryTerms, token.text)
            : [];
          const tmMatches = tmCache.get(token.id) ?? [];

          const context: TranslationContext | undefined =
            matchingTerms.length > 0 || tmMatches.length > 0
              ? {
                  glossaryTerms: matchingTerms.length > 0 ? matchingTerms : undefined,
                  tmMatches: tmMatches.length > 0 ? tmMatches : undefined,
                }
              : undefined;

          const promptOverride = resolvedTemplate
            ? this.renderTranslatePrompt(
                resolvedTemplate,
                token.text,
                token.from,
                token.to,
                context,
              )
            : undefined;

          const provider = createTranslationProvider(config);
          const result = await provider.translate({
            text: token.text,
            from: token.from,
            to: token.to,
            context,
            promptOverride,
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

  /**
   * Generate 3 candidate rewrites of an existing translation in a different
   * tone. Uses the `tone_adjust` prompt kind via the cascade resolver.
   */
  async adjustTone(params: {
    projectId: string;
    currentTranslation: string;
    targetLang: string;
    tone: 'formal' | 'casual' | 'shorter' | 'rephrase' | 'polish' | 'custom';
    customInstruction?: string;
    override?: { connectorId?: string; model?: string };
  }): Promise<{ candidates: string[] }> {
    const config = await this.resolveActiveConfig(params.projectId, params.override);
    if (!isLLMProvider(config.provider)) {
      throw new HttpException(
        'Tone adjustment requires an LLM provider (OpenAI / Claude / Gemini / Deepseek)',
        HttpStatus.BAD_REQUEST,
      );
    }

    const resolved = await this.promptTemplateService.resolve(
      params.projectId,
      'tone_adjust',
    );

    const prompt = renderTemplate(
      resolved.body,
      {
        sourceText: params.currentTranslation,
        targetLang: params.targetLang,
        toneStyle: params.tone,
        customInstruction: params.customInstruction
          ? `Additional instruction: ${params.customInstruction}`
          : '',
      },
      { templateId: resolved.templateId, kind: 'tone_adjust' },
    );

    const provider = createTranslationProvider(config);
    const raw = await (provider as any).generateText(prompt);

    // Parse the expected `{ "candidates": [...] }` JSON.
    let parsed: any;
    try {
      const cleaned = raw.replace(/```json\s*|```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback: treat the raw text as a single candidate.
      return { candidates: [raw.trim()] };
    }
    const candidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];
    if (candidates.length === 0) {
      return { candidates: [raw.trim()] };
    }
    return { candidates: candidates.slice(0, 3).map(String) };
  }

  async generateTokenKey(params: {
    remark: string;
    tag?: string;
    module?: string;
    projectId: string;
    override?: { connectorId?: string; model?: string };
  }): Promise<string> {
    const config = await this.resolveActiveConfig(params.projectId, params.override);

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
