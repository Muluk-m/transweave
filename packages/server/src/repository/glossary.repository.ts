import { Inject, Injectable } from '@nestjs/common';
import { and, eq, ilike, or, sql, count } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.provider';
import type { DrizzleDB } from '../db/drizzle.types';
import { glossaryEntries, type GlossaryEntry, type NewGlossaryEntry } from '../db/schema';
import { BaseRepository } from './base.repository';

@Injectable()
export class GlossaryRepository extends BaseRepository<
  typeof glossaryEntries,
  GlossaryEntry,
  NewGlossaryEntry
> {
  constructor(@Inject(DRIZZLE) db: DrizzleDB) {
    super(db, glossaryEntries);
  }

  async findByScope(opts: {
    teamId?: string;
    projectId?: string;
    query?: string;
    page?: number;
    perPage?: number;
  }): Promise<{ entries: GlossaryEntry[]; total: number }> {
    const conditions: any[] = [];

    if (opts.projectId) {
      conditions.push(eq(glossaryEntries.projectId, opts.projectId));
    }
    if (opts.teamId) {
      conditions.push(eq(glossaryEntries.teamId, opts.teamId));
      // Team-level entries have no projectId
      if (!opts.projectId) {
        conditions.push(sql`${glossaryEntries.projectId} IS NULL`);
      }
    }
    if (opts.query) {
      conditions.push(
        or(
          ilike(glossaryEntries.sourceTerm, `%${opts.query}%`),
          ilike(glossaryEntries.description, `%${opts.query}%`),
        ),
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const page = opts.page || 1;
    const perPage = Math.min(opts.perPage || 50, 200);

    const [entries, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(glossaryEntries)
        .where(where)
        .limit(perPage)
        .offset((page - 1) * perPage)
        .orderBy(glossaryEntries.sourceTerm),
      this.db
        .select({ total: count() })
        .from(glossaryEntries)
        .where(where),
    ]);

    return { entries, total };
  }

  async findByProjectAndTerm(
    projectId: string | null,
    teamId: string | null,
    sourceTerm: string,
  ): Promise<GlossaryEntry | null> {
    const conditions: any[] = [eq(glossaryEntries.sourceTerm, sourceTerm)];
    if (projectId) conditions.push(eq(glossaryEntries.projectId, projectId));
    else conditions.push(sql`${glossaryEntries.projectId} IS NULL`);
    if (teamId) conditions.push(eq(glossaryEntries.teamId, teamId));
    else conditions.push(sql`${glossaryEntries.teamId} IS NULL`);

    const results = await this.db
      .select()
      .from(glossaryEntries)
      .where(and(...conditions))
      .limit(1);
    return results[0] ?? null;
  }

  async findAllByProjectId(projectId: string): Promise<GlossaryEntry[]> {
    return this.db
      .select()
      .from(glossaryEntries)
      .where(eq(glossaryEntries.projectId, projectId));
  }

  async findAllByTeamId(teamId: string): Promise<GlossaryEntry[]> {
    return this.db
      .select()
      .from(glossaryEntries)
      .where(
        and(
          eq(glossaryEntries.teamId, teamId),
          sql`${glossaryEntries.projectId} IS NULL`,
        ),
      );
  }

  async bulkUpsert(entries: NewGlossaryEntry[]): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    for (const entry of entries) {
      const existing = await this.findByProjectAndTerm(
        entry.projectId ?? null,
        entry.teamId ?? null,
        entry.sourceTerm,
      );
      if (existing) {
        await this.update(existing.id, entry);
        updated++;
      } else {
        await this.create(entry);
        created++;
      }
    }

    return { created, updated };
  }
}
