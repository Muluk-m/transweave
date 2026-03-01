import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { DRIZZLE } from '../db/drizzle.provider';
import type { DrizzleDB } from '../db/drizzle.types';

export abstract class BaseRepository<
  TTable extends PgTable,
  TSelect = TTable['$inferSelect'],
  TInsert = TTable['$inferInsert'],
> {
  constructor(
    @Inject(DRIZZLE) protected readonly db: DrizzleDB,
    protected readonly table: TTable,
  ) {}

  async findById(id: string): Promise<TSelect | null> {
    const results = await (this.db as any)
      .select()
      .from(this.table)
      .where(eq((this.table as any).id, id))
      .limit(1);
    return (results[0] as TSelect) ?? null;
  }

  async findAll(): Promise<TSelect[]> {
    return (this.db as any).select().from(this.table) as Promise<TSelect[]>;
  }

  async create(data: TInsert): Promise<TSelect> {
    const [result] = await (this.db as any)
      .insert(this.table)
      .values(data)
      .returning();
    return result as TSelect;
  }

  async update(id: string, data: Partial<TInsert>): Promise<TSelect | null> {
    const [result] = await (this.db as any)
      .update(this.table)
      .set(data)
      .where(eq((this.table as any).id, id))
      .returning();
    return (result as TSelect) ?? null;
  }

  async delete(id: string): Promise<void> {
    await (this.db as any)
      .delete(this.table)
      .where(eq((this.table as any).id, id));
  }
}
