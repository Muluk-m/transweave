import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.provider';
import type { DrizzleDB } from '../db/drizzle.types';
import { users, type NewUser, type User } from '../db/schema';
import { BaseRepository } from './base.repository';

@Injectable()
export class UserRepository extends BaseRepository<typeof users, User, NewUser> {
  constructor(@Inject(DRIZZLE) db: DrizzleDB) {
    super(db, users);
  }

  async findByEmail(email: string): Promise<User | null> {
    const results = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return results[0] ?? null;
  }

  override async update(
    id: string,
    data: Partial<NewUser>,
  ): Promise<User | null> {
    const [result] = await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result ?? null;
  }
}
