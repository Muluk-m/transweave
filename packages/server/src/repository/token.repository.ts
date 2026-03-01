import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, ilike, or, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.provider';
import type { DrizzleDB } from '../db/drizzle.types';
import { tokens, type NewToken, type Token } from '../db/schema';
import { BaseRepository } from './base.repository';

@Injectable()
export class TokenRepository extends BaseRepository<
  typeof tokens,
  Token,
  NewToken
> {
  constructor(@Inject(DRIZZLE) db: DrizzleDB) {
    super(db, tokens);
  }

  async findByProjectId(
    projectId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<Token[]> {
    let query = this.db
      .select()
      .from(tokens)
      .where(eq(tokens.projectId, projectId))
      .$dynamic();

    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.offset(options.offset);
    }

    return query;
  }

  async findByProjectIdAndKey(
    projectId: string,
    key: string,
  ): Promise<Token | null> {
    const results = await this.db
      .select()
      .from(tokens)
      .where(and(eq(tokens.projectId, projectId), eq(tokens.key, key)))
      .limit(1);
    return results[0] ?? null;
  }

  async findByProjectIdAndModule(
    projectId: string,
    module: string,
  ): Promise<Token[]> {
    return this.db
      .select()
      .from(tokens)
      .where(
        and(eq(tokens.projectId, projectId), eq(tokens.module, module)),
      );
  }

  async createMany(data: NewToken[]): Promise<Token[]> {
    if (data.length === 0) return [];
    return this.db.insert(tokens).values(data).returning();
  }

  override async update(
    id: string,
    data: Partial<NewToken>,
  ): Promise<Token | null> {
    const [result] = await this.db
      .update(tokens)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tokens.id, id))
      .returning();
    return result ?? null;
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    await this.db.delete(tokens).where(eq(tokens.projectId, projectId));
  }

  async countByProjectId(projectId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(tokens)
      .where(eq(tokens.projectId, projectId));
    return result?.count ?? 0;
  }

  async searchByKeyOrTranslation(
    projectId: string,
    query: string,
  ): Promise<Token[]> {
    const pattern = `%${query}%`;
    return this.db
      .select()
      .from(tokens)
      .where(
        and(
          eq(tokens.projectId, projectId),
          or(
            ilike(tokens.key, pattern),
            sql`${tokens.translations}::text ILIKE ${pattern}`,
          ),
        ),
      );
  }
}
