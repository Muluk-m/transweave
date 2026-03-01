import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.provider';
import type { DrizzleDB } from '../db/drizzle.types';
import { tokens, type Token } from '../db/schema';
import { TokenRepository } from '../repository/token.repository';
import { TokenHistoryRepository } from '../repository/token-history.repository';
import { ProjectRepository } from '../repository/project.repository';
import { ActivityLogService } from './activity-log.service';
import { ActivityType } from '../models';

// --- Search & Progress Types ---

export interface TokenSearchOptions {
  query?: string;
  module?: string;
  status?: 'all' | 'completed' | 'incomplete';
  language?: string;
  tags?: string[];
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface LanguageProgress {
  language: string;
  total: number;
  completed: number;
  percentage: number;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly tokenRepository: TokenRepository,
    private readonly tokenHistoryRepository: TokenHistoryRepository,
    private readonly activityLogService: ActivityLogService,
    private readonly projectRepository: ProjectRepository,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

  /**
   * Get all tokens for a project, including history with user details.
   */
  async findByProject(projectId: string) {
    const tokenRows = await this.tokenRepository.findByProjectId(projectId);

    // Populate history with user details for each token
    const tokensWithHistory = await Promise.all(
      tokenRows.map(async (token) => {
        const historyRows =
          await this.tokenHistoryRepository.findByTokenIdWithUser(token.id);
        return {
          ...token,
          history: historyRows.map((row) => ({
            ...row.history,
            user: row.user,
          })),
        };
      }),
    );

    return tokensWithHistory;
  }

  /**
   * Get a single token by ID, including history with user details.
   * Throws NotFoundException if not found.
   */
  async findById(tokenId: string) {
    const token = await this.tokenRepository.findById(tokenId);
    if (!token) {
      throw new NotFoundException(`Token ${tokenId} not found`);
    }

    const historyRows =
      await this.tokenHistoryRepository.findByTokenIdWithUser(tokenId);

    return {
      ...token,
      history: historyRows.map((row) => ({
        ...row.history,
        user: row.user,
      })),
    };
  }

  /**
   * Create a new token in a project.
   * Enforces unique key per project.
   * Creates initial history record and logs activity.
   */
  async create(data: {
    projectId: string;
    key: string;
    module?: string;
    tags?: string[];
    comment?: string;
    translations?: Record<string, string>;
    screenshots?: string[];
    userId: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    // Check for duplicate key within project
    const existing = await this.tokenRepository.findByProjectIdAndKey(
      data.projectId,
      data.key,
    );
    if (existing) {
      throw new BadRequestException(`Token key '${data.key}' already exists`);
    }

    // Insert token
    const token = await this.tokenRepository.create({
      projectId: data.projectId,
      key: data.key,
      module: data.module || '',
      tags: data.tags || [],
      comment: data.comment || '',
      translations: data.translations || {},
      screenshots: data.screenshots || [],
    });

    // Insert initial history record
    await this.tokenHistoryRepository.create({
      tokenId: token.id,
      userId: data.userId,
      translations: data.translations || {},
    });

    // Log activity
    await this.activityLogService.create({
      type: ActivityType.TOKEN_CREATE,
      projectId: data.projectId,
      userId: data.userId,
      details: {
        entityId: token.id,
        entityType: 'token',
        entityName: token.key,
        metadata: {
          tags: data.tags || [],
          comment: data.comment || '',
          translationsCount: Object.keys(data.translations || {}).length,
          languages: Object.keys(data.translations || {}),
        },
      },
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });

    // Return token with populated history
    return this.findById(token.id);
  }

  /**
   * Update a token.
   * Enforces unique key per project when key changes.
   * Uses MERGE semantics for translations (spread existing with new).
   * Creates history record only when translations actually change.
   */
  async update(
    tokenId: string,
    data: {
      key?: string;
      module?: string;
      tags?: string[];
      comment?: string;
      translations?: Record<string, string>;
      screenshots?: string[];
      userId: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    // Fetch existing token
    const token = await this.tokenRepository.findById(tokenId);
    if (!token) {
      throw new NotFoundException(`Token ${tokenId} not found`);
    }

    // Check for duplicate key if key is changing
    if (data.key !== undefined && data.key !== token.key) {
      const existing = await this.tokenRepository.findByProjectIdAndKey(
        token.projectId,
        data.key,
      );
      if (existing && existing.id !== tokenId) {
        throw new BadRequestException(`Token key '${data.key}' already exists`);
      }
    }

    // Build update payload
    const updatePayload: Partial<{
      key: string;
      module: string | null;
      tags: string[];
      comment: string | null;
      translations: Record<string, string>;
      screenshots: string[];
    }> = {};

    if (data.key !== undefined) updatePayload.key = data.key;
    if (data.module !== undefined) updatePayload.module = data.module;
    if (data.tags !== undefined) updatePayload.tags = data.tags;
    if (data.comment !== undefined) updatePayload.comment = data.comment;
    if (data.screenshots !== undefined)
      updatePayload.screenshots = data.screenshots;

    // MERGE semantics for translations
    let mergedTranslations: Record<string, string> | undefined;
    if (data.translations) {
      const currentTranslations =
        (token.translations as Record<string, string>) || {};
      mergedTranslations = {
        ...currentTranslations,
        ...data.translations,
      };
      updatePayload.translations = mergedTranslations;

      // Check if translations actually changed
      const translationsChanged =
        JSON.stringify(mergedTranslations) !==
        JSON.stringify(currentTranslations);

      if (translationsChanged) {
        // Create history record with the new translations delta
        await this.tokenHistoryRepository.create({
          tokenId,
          userId: data.userId,
          translations: data.translations,
        });
      }
    }

    // Perform update
    const updatedToken = await this.tokenRepository.update(
      tokenId,
      updatePayload as any,
    );

    // Track field changes for activity log
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

    if (data.key !== undefined && data.key !== token.key) {
      changes.push({ field: 'key', oldValue: token.key, newValue: data.key });
    }
    if (data.tags !== undefined) {
      const oldTags = JSON.stringify(token.tags || []);
      const newTags = JSON.stringify(data.tags);
      if (oldTags !== newTags) {
        changes.push({
          field: 'tags',
          oldValue: token.tags,
          newValue: data.tags,
        });
      }
    }
    if (data.comment !== undefined && data.comment !== token.comment) {
      changes.push({
        field: 'comment',
        oldValue: token.comment,
        newValue: data.comment,
      });
    }
    if (data.translations !== undefined && mergedTranslations) {
      changes.push({
        field: 'translations',
        oldValue: token.translations,
        newValue: mergedTranslations,
      });
    }

    // Log activity if there were changes
    if (changes.length > 0) {
      await this.activityLogService.create({
        type: ActivityType.TOKEN_UPDATE,
        projectId: token.projectId,
        userId: data.userId,
        details: {
          entityId: tokenId,
          entityType: 'token',
          entityName: updatedToken?.key || token.key,
          changes,
          metadata: {
            translationsUpdated: data.translations
              ? Object.keys(data.translations)
              : undefined,
          },
        },
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      });
    }

    // Return updated token with history
    return this.findById(tokenId);
  }

  /**
   * Delete a token.
   * Cascade delete of history is handled by FK ON DELETE CASCADE.
   * Logs activity before deletion.
   */
  async delete(
    tokenId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Fetch token to get details for logging
    const token = await this.tokenRepository.findById(tokenId);
    if (!token) {
      throw new NotFoundException(`Token ${tokenId} not found`);
    }

    // Delete token (cascade handles token_history via FK)
    await this.tokenRepository.delete(tokenId);

    // Log activity
    await this.activityLogService.create({
      type: ActivityType.TOKEN_DELETE,
      projectId: token.projectId,
      userId,
      details: {
        entityId: tokenId,
        entityType: 'token',
        entityName: token.key,
        metadata: {
          tags: token.tags,
          comment: token.comment,
          translationsCount: Object.keys(
            (token.translations as Record<string, string>) || {},
          ).length,
        },
      },
      ipAddress,
      userAgent,
    });

    return token;
  }

  // ============= Search & Filter (Plan 05-02) =============

  /**
   * Search and filter tokens with pagination and sorting.
   * Supports full-text search across keys and translation values,
   * module filtering, completion status filtering, and tag filtering.
   */
  async search(
    projectId: string,
    options: TokenSearchOptions,
  ): Promise<{ tokens: Token[]; total: number }> {
    const page = Math.max(1, options.page || 1);
    const perPage = Math.min(Math.max(1, options.perPage || 50), 200);
    const offset = (page - 1) * perPage;
    const sortOrder = options.sortOrder || 'desc';
    const sortBy = options.sortBy || 'createdAt';

    // Build WHERE conditions
    const conditions: any[] = [eq(tokens.projectId, projectId)];

    // Text search across key and translation values
    if (options.query) {
      const pattern = `%${options.query}%`;
      conditions.push(
        or(
          ilike(tokens.key, pattern),
          sql`EXISTS (SELECT 1 FROM jsonb_each_text(${tokens.translations}) AS t(lang, val) WHERE t.val ILIKE ${pattern})`,
        ),
      );
    }

    // Module filter
    if (options.module) {
      if (options.module === '__no_module__') {
        conditions.push(
          or(eq(tokens.module, ''), isNull(tokens.module)),
        );
      } else {
        conditions.push(eq(tokens.module, options.module));
      }
    }

    // Completion status filter
    if (options.status && options.status !== 'all') {
      if (options.language) {
        // Filter by specific language completion
        if (options.status === 'completed') {
          conditions.push(
            sql`${tokens.translations}->>${options.language} IS NOT NULL AND ${tokens.translations}->>${options.language} != ''`,
          );
        } else {
          // incomplete for specific language
          conditions.push(
            sql`(${tokens.translations}->>${options.language} IS NULL OR ${tokens.translations}->>${options.language} = '')`,
          );
        }
      } else {
        // Filter by ALL project languages completion
        const project = await this.projectRepository.findById(projectId);
        if (!project) {
          throw new NotFoundException(`Project ${projectId} not found`);
        }
        const languages = (project.languages as string[]) || [];
        if (languages.length > 0) {
          if (options.status === 'completed') {
            // All languages must have non-empty values
            for (const lang of languages) {
              conditions.push(
                sql`${tokens.translations}->>${lang} IS NOT NULL AND ${tokens.translations}->>${lang} != ''`,
              );
            }
          } else {
            // incomplete: at least one language missing
            const missingConditions = languages.map(
              (lang) =>
                sql`(${tokens.translations}->>${lang} IS NULL OR ${tokens.translations}->>${lang} = '')`,
            );
            conditions.push(or(...missingConditions));
          }
        }
      }
    }

    // Tags filter (token must have ALL specified tags)
    if (options.tags && options.tags.length > 0) {
      conditions.push(
        sql`${tokens.tags} @> ${JSON.stringify(options.tags)}::jsonb`,
      );
    }

    const whereClause = and(...conditions);

    // Determine sort column
    const orderFn = sortOrder === 'asc' ? asc : desc;
    let orderByClause;
    switch (sortBy) {
      case 'key':
        orderByClause = orderFn(tokens.key);
        break;
      case 'updatedAt':
        orderByClause = orderFn(tokens.updatedAt);
        break;
      case 'createdAt':
      default:
        orderByClause = orderFn(tokens.createdAt);
        break;
    }

    // Count total matching records
    const [countResult] = await (this.db as any)
      .select({ count: count() })
      .from(tokens)
      .where(whereClause);

    const total: number = countResult?.count ?? 0;

    // Fetch paginated results
    const results: Token[] = await (this.db as any)
      .select()
      .from(tokens)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(perPage)
      .offset(offset);

    return { tokens: results, total };
  }

  // ============= Language Completion (Plan 05-02) =============

  /**
   * Compute per-language completion percentages for a project.
   * Returns an array showing how many tokens have non-empty translations
   * for each language in the project's language list.
   */
  async getLanguageCompletion(
    projectId: string,
  ): Promise<LanguageProgress[]> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const languages = (project.languages as string[]) || [];

    // Count total tokens in the project
    const [totalResult] = await (this.db as any)
      .select({ count: count() })
      .from(tokens)
      .where(eq(tokens.projectId, projectId));

    const total: number = totalResult?.count ?? 0;

    if (total === 0) {
      return languages.map((lang) => ({
        language: lang,
        total: 0,
        completed: 0,
        percentage: 0,
      }));
    }

    const results: LanguageProgress[] = [];

    for (const lang of languages) {
      const [completedResult] = await (this.db as any)
        .select({ count: count() })
        .from(tokens)
        .where(
          and(
            eq(tokens.projectId, projectId),
            sql`${tokens.translations}->>${lang} IS NOT NULL AND ${tokens.translations}->>${lang} != ''`,
          ),
        );

      const completed: number = completedResult?.count ?? 0;

      results.push({
        language: lang,
        total,
        completed,
        percentage: Math.round((completed / total) * 100),
      });
    }

    return results;
  }

  // ============= Bulk Operations (Plan 05-03) =============

  /**
   * Bulk delete tokens.
   * Verifies all tokens exist and belong to the same project.
   * FK CASCADE handles token_history cleanup.
   */
  async bulkDelete(
    tokenIds: string[],
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ deleted: number }> {
    if (tokenIds.length === 0) {
      throw new BadRequestException('No token IDs provided');
    }

    // Verify all tokens exist and belong to the same project
    const existingTokens: Token[] = await (this.db as any)
      .select()
      .from(tokens)
      .where(inArray(tokens.id, tokenIds));

    if (existingTokens.length !== tokenIds.length) {
      throw new NotFoundException('One or more tokens not found');
    }

    const projectIds = new Set(existingTokens.map((t) => t.projectId));
    if (projectIds.size > 1) {
      throw new BadRequestException('All tokens must belong to the same project');
    }

    const projectId = existingTokens[0].projectId;
    const deletedKeys = existingTokens.map((t) => t.key);

    // Delete all tokens in a single query
    await (this.db as any)
      .delete(tokens)
      .where(inArray(tokens.id, tokenIds));

    // Log a single activity entry
    await this.activityLogService.create({
      type: ActivityType.TOKEN_BATCH_UPDATE,
      projectId,
      userId,
      details: {
        entityType: 'token',
        metadata: {
          operation: 'bulk-delete',
          count: tokenIds.length,
          deletedKeys,
        },
      },
      ipAddress,
      userAgent,
    });

    return { deleted: tokenIds.length };
  }

  /**
   * Bulk update tags on tokens.
   * Verifies all tokens exist and belong to the same project.
   * Sets the same tags array on all specified tokens.
   */
  async bulkUpdateTags(
    tokenIds: string[],
    tags: string[],
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Token[]> {
    if (tokenIds.length === 0) {
      throw new BadRequestException('No token IDs provided');
    }

    // Verify all tokens exist and belong to the same project
    const existingTokens: Token[] = await (this.db as any)
      .select()
      .from(tokens)
      .where(inArray(tokens.id, tokenIds));

    if (existingTokens.length !== tokenIds.length) {
      throw new NotFoundException('One or more tokens not found');
    }

    const projectIds = new Set(existingTokens.map((t) => t.projectId));
    if (projectIds.size > 1) {
      throw new BadRequestException('All tokens must belong to the same project');
    }

    const projectId = existingTokens[0].projectId;

    // Update all tokens with the new tags
    const updatedTokens: Token[] = await (this.db as any)
      .update(tokens)
      .set({ tags, updatedAt: new Date() })
      .where(inArray(tokens.id, tokenIds))
      .returning();

    // Log activity
    await this.activityLogService.create({
      type: ActivityType.TOKEN_BATCH_UPDATE,
      projectId,
      userId,
      details: {
        entityType: 'token',
        metadata: {
          operation: 'bulk-set-tags',
          count: tokenIds.length,
          tags,
        },
      },
      ipAddress,
      userAgent,
    });

    return updatedTokens;
  }

  /**
   * Bulk update module assignment on tokens.
   * Verifies all tokens exist and belong to the same project.
   */
  async bulkUpdateModule(
    tokenIds: string[],
    moduleCode: string | null,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Token[]> {
    if (tokenIds.length === 0) {
      throw new BadRequestException('No token IDs provided');
    }

    // Verify all tokens exist and belong to the same project
    const existingTokens: Token[] = await (this.db as any)
      .select()
      .from(tokens)
      .where(inArray(tokens.id, tokenIds));

    if (existingTokens.length !== tokenIds.length) {
      throw new NotFoundException('One or more tokens not found');
    }

    const projectIds = new Set(existingTokens.map((t) => t.projectId));
    if (projectIds.size > 1) {
      throw new BadRequestException('All tokens must belong to the same project');
    }

    const projectId = existingTokens[0].projectId;

    // Update all tokens with the new module
    const updatedTokens: Token[] = await (this.db as any)
      .update(tokens)
      .set({ module: moduleCode, updatedAt: new Date() })
      .where(inArray(tokens.id, tokenIds))
      .returning();

    // Log activity
    await this.activityLogService.create({
      type: ActivityType.TOKEN_BATCH_UPDATE,
      projectId,
      userId,
      details: {
        entityType: 'token',
        metadata: {
          operation: 'bulk-set-module',
          count: tokenIds.length,
          moduleCode,
        },
      },
      ipAddress,
      userAgent,
    });

    return updatedTokens;
  }
}
