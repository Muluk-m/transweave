import { Inject, Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.provider';
import type { DrizzleDB } from '../db/drizzle.types';
import {
  tokenHistory,
  type NewTokenHistoryRecord,
  type TokenHistoryRecord,
} from '../db/schema';
import { users } from '../db/schema';
import { BaseRepository } from './base.repository';

@Injectable()
export class TokenHistoryRepository extends BaseRepository<
  typeof tokenHistory,
  TokenHistoryRecord,
  NewTokenHistoryRecord
> {
  constructor(@Inject(DRIZZLE) db: DrizzleDB) {
    super(db, tokenHistory);
  }

  async findByTokenId(
    tokenId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<TokenHistoryRecord[]> {
    let query = this.db
      .select()
      .from(tokenHistory)
      .where(eq(tokenHistory.tokenId, tokenId))
      .$dynamic();

    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.offset(options.offset);
    }

    return query;
  }

  async findByTokenIdWithUser(tokenId: string) {
    return this.db
      .select({
        history: tokenHistory,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
        },
      })
      .from(tokenHistory)
      .leftJoin(users, eq(tokenHistory.userId, users.id))
      .where(eq(tokenHistory.tokenId, tokenId));
  }

  async findByTokenIdsWithUser(tokenIds: string[]) {
    return this.db
      .select({
        history: tokenHistory,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
        },
      })
      .from(tokenHistory)
      .leftJoin(users, eq(tokenHistory.userId, users.id))
      .where(inArray(tokenHistory.tokenId, tokenIds));
  }

  async deleteByTokenId(tokenId: string): Promise<void> {
    await this.db
      .delete(tokenHistory)
      .where(eq(tokenHistory.tokenId, tokenId));
  }
}
