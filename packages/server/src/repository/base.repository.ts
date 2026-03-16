import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import { DRIZZLE } from '../db/drizzle.provider';
import type { DrizzleDB } from '../db/drizzle.types';

// Drizzle's type system requires the exact table constant for full type inference.
// In a generic repository, we use `as any` for the db operations since PgTable
// doesn't carry enough type info. This is isolated here to keep subclasses clean.
type AnyDB = any;

export abstract class BaseRepository<
  TTable extends PgTable,
  TSelect = TTable['$inferSelect'],
  TInsert = TTable['$inferInsert'],
> {
  private readonly idColumn: PgColumn;

  constructor(
    @Inject(DRIZZLE) protected readonly db: DrizzleDB,
    protected readonly table: TTable,
  ) {
    this.idColumn = (table as any).id;
  }

  async findById(id: string): Promise<TSelect | null> {
    const results = await (this.db as AnyDB)
      .select()
      .from(this.table)
      .where(eq(this.idColumn, id))
      .limit(1);
    return (results[0] as TSelect) ?? null;
  }

  async findAll(): Promise<TSelect[]> {
    return (this.db as AnyDB).select().from(this.table) as Promise<TSelect[]>;
  }

  async create(data: TInsert): Promise<TSelect> {
    const [result] = await (this.db as AnyDB)
      .insert(this.table)
      .values(data)
      .returning();
    return result as TSelect;
  }

  async update(id: string, data: Partial<TInsert>): Promise<TSelect | null> {
    const [result] = await (this.db as AnyDB)
      .update(this.table)
      .set(data)
      .where(eq(this.idColumn, id))
      .returning();
    return (result as TSelect) ?? null;
  }

  async delete(id: string): Promise<void> {
    await (this.db as AnyDB)
      .delete(this.table)
      .where(eq(this.idColumn, id));
  }
}
