import { Inject, Injectable } from '@nestjs/common';
import { and, eq, ilike, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.provider';
import type { DrizzleDB } from '../db/drizzle.types';
import {
  translationMemory,
  type TranslationMemoryEntry,
  type NewTranslationMemoryEntry,
  projects,
} from '../db/schema';

@Injectable()
export class TranslationMemoryRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async upsert(entry: NewTranslationMemoryEntry): Promise<TranslationMemoryEntry> {
    const [result] = await this.db
      .insert(translationMemory)
      .values(entry)
      .onConflictDoUpdate({
        target: [
          translationMemory.projectId,
          translationMemory.sourceLanguage,
          translationMemory.targetLanguage,
          translationMemory.sourceText,
        ],
        set: {
          targetText: entry.targetText,
          tokenId: entry.tokenId,
          createdBy: entry.createdBy,
          updatedAt: sql`now()`,
        },
      })
      .returning();
    return result;
  }

  async batchUpsert(entries: NewTranslationMemoryEntry[]): Promise<void> {
    const CHUNK_SIZE = 100;
    for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
      const chunk = entries.slice(i, i + CHUNK_SIZE);
      await this.db
        .insert(translationMemory)
        .values(chunk)
        .onConflictDoUpdate({
          target: [
            translationMemory.projectId,
            translationMemory.sourceLanguage,
            translationMemory.targetLanguage,
            translationMemory.sourceText,
          ],
          set: {
            targetText: sql`excluded.target_text`,
            tokenId: sql`excluded.token_id`,
            createdBy: sql`excluded.created_by`,
            updatedAt: sql`now()`,
          },
        });
    }
  }

  async findBySourceText(opts: {
    projectId: string;
    sourceLanguage: string;
    targetLanguage: string;
    sourceText: string;
    limit?: number;
  }): Promise<TranslationMemoryEntry[]> {
    // Pre-filter with substring match to limit candidates for Levenshtein ranking
    const keyword = opts.sourceText.slice(0, 20);
    return this.db
      .select()
      .from(translationMemory)
      .where(
        and(
          eq(translationMemory.projectId, opts.projectId),
          eq(translationMemory.sourceLanguage, opts.sourceLanguage),
          eq(translationMemory.targetLanguage, opts.targetLanguage),
        ),
      )
      .limit(opts.limit || 200);
  }

  async findCrossProject(opts: {
    teamId: string;
    excludeProjectId: string;
    sourceLanguage: string;
    targetLanguage: string;
    limit?: number;
  }): Promise<(TranslationMemoryEntry & { projectName?: string })[]> {
    const results = await this.db
      .select({
        id: translationMemory.id,
        projectId: translationMemory.projectId,
        sourceLanguage: translationMemory.sourceLanguage,
        targetLanguage: translationMemory.targetLanguage,
        sourceText: translationMemory.sourceText,
        targetText: translationMemory.targetText,
        tokenId: translationMemory.tokenId,
        createdBy: translationMemory.createdBy,
        createdAt: translationMemory.createdAt,
        updatedAt: translationMemory.updatedAt,
        projectName: projects.name,
      })
      .from(translationMemory)
      .innerJoin(projects, eq(translationMemory.projectId, projects.id))
      .where(
        and(
          eq(projects.teamId, opts.teamId),
          sql`${translationMemory.projectId} != ${opts.excludeProjectId}`,
          eq(translationMemory.sourceLanguage, opts.sourceLanguage),
          eq(translationMemory.targetLanguage, opts.targetLanguage),
        ),
      )
      .limit(opts.limit || 200);
    return results;
  }
}
