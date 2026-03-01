import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt, isNull, or } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.provider';
import type { DrizzleDB } from '../db/drizzle.types';
import { apiKeys, users, type ApiKey, type NewApiKey } from '../db/schema';
import { BaseRepository } from './base.repository';

@Injectable()
export class ApiKeyRepository extends BaseRepository<
  typeof apiKeys,
  ApiKey,
  NewApiKey
> {
  constructor(@Inject(DRIZZLE) db: DrizzleDB) {
    super(db, apiKeys);
  }

  /**
   * Find all non-expired keys matching a given prefix.
   */
  async findByPrefix(prefix: string): Promise<ApiKey[]> {
    return this.db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.keyPrefix, prefix),
          or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, new Date())),
        ),
      );
  }

  /**
   * Find all keys for a user, sorted by newest first.
   * Selects only safe fields (never keyHash).
   */
  async findByUserId(userId: string): Promise<
    Omit<ApiKey, 'keyHash'>[]
  > {
    const results = await this.db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        userId: apiKeys.userId,
        scopes: apiKeys.scopes,
        expiresAt: apiKeys.expiresAt,
        lastUsedAt: apiKeys.lastUsedAt,
        createdAt: apiKeys.createdAt,
        updatedAt: apiKeys.updatedAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.userId, userId))
      .orderBy(desc(apiKeys.createdAt));
    return results;
  }

  /**
   * Delete a key only if it belongs to the given user.
   * Returns true if a row was deleted.
   */
  async deleteByIdAndUserId(id: string, userId: string): Promise<boolean> {
    const result = await (this.db as any)
      .delete(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
      .returning();
    return result.length > 0;
  }

  /**
   * Update lastUsedAt timestamp for a key.
   */
  async updateLastUsed(id: string): Promise<void> {
    await (this.db as any)
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, id));
  }

  /**
   * Find a key by ID and join with user to get user details.
   */
  async findByIdWithUser(
    id: string,
  ): Promise<(ApiKey & { userName: string; userEmail: string }) | null> {
    const results = await this.db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        keyHash: apiKeys.keyHash,
        userId: apiKeys.userId,
        scopes: apiKeys.scopes,
        expiresAt: apiKeys.expiresAt,
        lastUsedAt: apiKeys.lastUsedAt,
        createdAt: apiKeys.createdAt,
        updatedAt: apiKeys.updatedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(apiKeys)
      .innerJoin(users, eq(apiKeys.userId, users.id))
      .where(eq(apiKeys.id, id))
      .limit(1);
    return results[0] ?? null;
  }

  /**
   * Find all non-expired keys matching prefix, with user details.
   */
  async findByPrefixWithUser(
    prefix: string,
  ): Promise<
    (ApiKey & { userName: string; userEmail: string; userAvatar: string | null })[]
  > {
    return this.db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        keyHash: apiKeys.keyHash,
        userId: apiKeys.userId,
        scopes: apiKeys.scopes,
        expiresAt: apiKeys.expiresAt,
        lastUsedAt: apiKeys.lastUsedAt,
        createdAt: apiKeys.createdAt,
        updatedAt: apiKeys.updatedAt,
        userName: users.name,
        userEmail: users.email,
        userAvatar: users.avatar,
      })
      .from(apiKeys)
      .innerJoin(users, eq(apiKeys.userId, users.id))
      .where(
        and(
          eq(apiKeys.keyPrefix, prefix),
          or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, new Date())),
        ),
      );
  }
}
