import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.provider';
import type { DrizzleDB } from '../db/drizzle.types';
import {
  aiPromptTemplates,
  type AiPromptTemplate,
  type NewAiPromptTemplate,
  type PromptKind,
} from '../db/schema';

@Injectable()
export class AiPromptTemplateRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async create(data: NewAiPromptTemplate): Promise<AiPromptTemplate> {
    const [row] = await (this.db as any)
      .insert(aiPromptTemplates)
      .values(data)
      .returning();
    return row;
  }

  async findById(id: string): Promise<AiPromptTemplate | null> {
    const [row] = await (this.db as any)
      .select()
      .from(aiPromptTemplates)
      .where(eq(aiPromptTemplates.id, id));
    return row ?? null;
  }

  async findByScope(
    scope: 'team' | 'project',
    scopeId: string,
  ): Promise<AiPromptTemplate[]> {
    return (this.db as any)
      .select()
      .from(aiPromptTemplates)
      .where(
        and(
          eq(aiPromptTemplates.scope, scope),
          eq(aiPromptTemplates.scopeId, scopeId),
        ),
      );
  }

  /** Find the active default template for a (scope, scopeId, kind). */
  async findDefault(
    scope: 'team' | 'project',
    scopeId: string,
    kind: PromptKind,
  ): Promise<AiPromptTemplate | null> {
    const [row] = await (this.db as any)
      .select()
      .from(aiPromptTemplates)
      .where(
        and(
          eq(aiPromptTemplates.scope, scope),
          eq(aiPromptTemplates.scopeId, scopeId),
          eq(aiPromptTemplates.kind, kind),
          eq(aiPromptTemplates.isDefault, true),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async update(
    id: string,
    data: Partial<Omit<AiPromptTemplate, 'id' | 'createdAt'>>,
  ): Promise<AiPromptTemplate> {
    const [row] = await (this.db as any)
      .update(aiPromptTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(aiPromptTemplates.id, id))
      .returning();
    return row;
  }

  async delete(id: string): Promise<void> {
    await (this.db as any)
      .delete(aiPromptTemplates)
      .where(eq(aiPromptTemplates.id, id));
  }

  /**
   * Atomically clear isDefault=true on all templates with matching
   * (scope, scopeId, kind), excluding `keepId` if provided.
   */
  async clearDefaults(
    tx: any,
    scope: 'team' | 'project',
    scopeId: string,
    kind: PromptKind,
    keepId?: string,
  ): Promise<void> {
    const conditions = [
      eq(aiPromptTemplates.scope, scope),
      eq(aiPromptTemplates.scopeId, scopeId),
      eq(aiPromptTemplates.kind, kind),
      eq(aiPromptTemplates.isDefault, true),
    ];
    if (keepId) {
      conditions.push(sql`${aiPromptTemplates.id} <> ${keepId}`);
    }
    await tx
      .update(aiPromptTemplates)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(and(...conditions));
  }
}
