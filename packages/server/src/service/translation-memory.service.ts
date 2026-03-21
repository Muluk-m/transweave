import { Inject, Injectable } from '@nestjs/common';
import { TranslationMemoryRepository } from '../repository/translation-memory.repository';
import type { NewTranslationMemoryEntry, TranslationMemoryEntry } from '../db/schema';
import { similarity } from '../utils/levenshtein';
import { DRIZZLE } from '../db/drizzle.provider';
import type { DrizzleDB } from '../db/drizzle.types';
import { projects } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface TmSuggestion {
  sourceText: string;
  targetText: string;
  similarity: number;
  crossProject?: boolean;
  projectName?: string;
}

@Injectable()
export class TranslationMemoryService {
  constructor(
    private readonly tmRepo: TranslationMemoryRepository,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

  /**
   * Record translation pairs from a token save.
   * Extracts each source→target pair using project.defaultLang as source.
   */
  async recordTokenTranslations(opts: {
    projectId: string;
    tokenId: string;
    translations: Record<string, string>;
    defaultLang: string;
    userId?: string;
  }): Promise<void> {
    const sourceText = opts.translations[opts.defaultLang];
    if (!sourceText) return;

    const entries: NewTranslationMemoryEntry[] = [];
    for (const [lang, text] of Object.entries(opts.translations)) {
      if (lang === opts.defaultLang || !text) continue;
      entries.push({
        projectId: opts.projectId,
        sourceLanguage: opts.defaultLang,
        targetLanguage: lang,
        sourceText,
        targetText: text,
        tokenId: opts.tokenId,
        createdBy: opts.userId,
      });
    }

    if (entries.length > 0) {
      await this.tmRepo.batchUpsert(entries);
    }
  }

  /**
   * Query TM suggestions ranked by Levenshtein similarity.
   */
  async querySuggestions(opts: {
    projectId: string;
    sourceText: string;
    sourceLanguage: string;
    targetLanguage: string;
    minSimilarity?: number;
    maxResults?: number;
  }): Promise<TmSuggestion[]> {
    const minSim = opts.minSimilarity ?? 60;
    const maxResults = opts.maxResults ?? 5;

    // Load candidates from current project
    const candidates = await this.tmRepo.findBySourceText({
      projectId: opts.projectId,
      sourceLanguage: opts.sourceLanguage,
      targetLanguage: opts.targetLanguage,
      sourceText: opts.sourceText,
    });

    // Rank by similarity
    let suggestions: TmSuggestion[] = candidates
      .map((c) => ({
        sourceText: c.sourceText,
        targetText: c.targetText,
        similarity: similarity(opts.sourceText, c.sourceText),
      }))
      .filter((s) => s.similarity >= minSim)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);

    // If not enough results, try cross-project
    if (suggestions.length < maxResults) {
      const project = await this.db
        .select({ teamId: projects.teamId, enableCrossProjectTM: projects.enableCrossProjectTM })
        .from(projects)
        .where(eq(projects.id, opts.projectId))
        .limit(1);

      if (project[0]?.enableCrossProjectTM) {
        const crossCandidates = await this.tmRepo.findCrossProject({
          teamId: project[0].teamId,
          excludeProjectId: opts.projectId,
          sourceLanguage: opts.sourceLanguage,
          targetLanguage: opts.targetLanguage,
        });

        const crossSuggestions: TmSuggestion[] = crossCandidates
          .map((c) => ({
            sourceText: c.sourceText,
            targetText: c.targetText,
            similarity: similarity(opts.sourceText, c.sourceText),
            crossProject: true,
            projectName: c.projectName,
          }))
          .filter((s) => s.similarity >= minSim);

        // Merge and re-sort
        suggestions = [...suggestions, ...crossSuggestions]
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, maxResults);
      }
    }

    return suggestions;
  }

  /**
   * Batch-populate TM from imported tokens.
   */
  async batchRecordFromTokens(
    tokenTranslations: Array<{ tokenId: string; translations: Record<string, string> }>,
    projectId: string,
    defaultLang: string,
    userId?: string,
  ): Promise<void> {
    const entries: NewTranslationMemoryEntry[] = [];

    for (const token of tokenTranslations) {
      const sourceText = token.translations[defaultLang];
      if (!sourceText) continue;

      for (const [lang, text] of Object.entries(token.translations)) {
        if (lang === defaultLang || !text) continue;
        entries.push({
          projectId,
          sourceLanguage: defaultLang,
          targetLanguage: lang,
          sourceText,
          targetText: text,
          tokenId: token.tokenId,
          createdBy: userId,
        });
      }
    }

    if (entries.length > 0) {
      await this.tmRepo.batchUpsert(entries);
    }
  }
}
