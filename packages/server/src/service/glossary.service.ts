import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { GlossaryRepository } from '../repository/glossary.repository';
import { ProjectRepository } from '../repository/project.repository';
import { TeamRepository } from '../repository/team.repository';
import type { GlossaryEntry, NewGlossaryEntry } from '../db/schema';

export interface ResolvedGlossaryTerm {
  sourceTerm: string;
  translations: Record<string, string>;
  description?: string | null;
  caseSensitive: boolean;
  doNotTranslate: boolean;
}

@Injectable()
export class GlossaryService {
  constructor(
    private readonly glossaryRepo: GlossaryRepository,
    private readonly projectRepo: ProjectRepository,
    private readonly teamRepo: TeamRepository,
  ) {}

  async create(data: NewGlossaryEntry): Promise<GlossaryEntry> {
    const existing = await this.glossaryRepo.findByProjectAndTerm(
      data.projectId ?? null,
      data.teamId ?? null,
      data.sourceTerm,
    );
    if (existing) {
      throw new ConflictException(`Glossary entry for "${data.sourceTerm}" already exists in this scope`);
    }
    if (data.autoSyncToAllLanguages) {
      const langs = await this.resolveScopeLanguages({
        projectId: data.projectId ?? null,
        teamId: data.teamId ?? null,
      });
      data = {
        ...data,
        translations: this.fillMissingLanguages(data.translations ?? {}, langs),
      };
    }
    return this.glossaryRepo.create(data);
  }

  async update(id: string, data: Partial<NewGlossaryEntry>): Promise<GlossaryEntry> {
    const entry = await this.glossaryRepo.findById(id);
    if (!entry) throw new NotFoundException('Glossary entry not found');

    // If user just toggled autoSync ON, backfill missing languages now.
    if (data.autoSyncToAllLanguages === true && !entry.autoSyncToAllLanguages) {
      const langs = await this.resolveScopeLanguages({
        projectId: entry.projectId,
        teamId: entry.teamId,
      });
      data = {
        ...data,
        translations: this.fillMissingLanguages(
          { ...(entry.translations as Record<string, string>), ...(data.translations ?? {}) },
          langs,
        ),
      };
    }

    const result = await this.glossaryRepo.update(id, { ...data, updatedAt: new Date() } as any);
    return result!;
  }

  async backfillForLanguage(
    scope: { teamId?: string | null; projectId?: string | null },
    newLanguage: string,
  ): Promise<{ updated: number }> {
    const entries = scope.projectId
      ? await this.glossaryRepo.findAllByProjectId(scope.projectId)
      : scope.teamId
        ? await this.glossaryRepo.findAllByTeamId(scope.teamId)
        : [];

    const todo = entries.filter((e) => {
      if (!e.autoSyncToAllLanguages) return false;
      const tr = (e.translations as Record<string, string>) || {};
      return !(newLanguage in tr);
    });

    await Promise.all(
      todo.map((e) => {
        const tr = (e.translations as Record<string, string>) || {};
        return this.glossaryRepo.update(e.id, {
          translations: { ...tr, [newLanguage]: '' },
          updatedAt: new Date(),
        } as any);
      }),
    );

    return { updated: todo.length };
  }

  private async resolveScopeLanguages(scope: {
    projectId: string | null;
    teamId: string | null;
  }): Promise<string[]> {
    if (scope.projectId) {
      const project = await this.projectRepo.findById(scope.projectId);
      return ((project?.languages as string[]) || []).slice();
    }
    if (scope.teamId) {
      // Team-level: union of all projects' languages.
      const projects = await this.projectRepo.findByTeamId(scope.teamId);
      const langs = new Set<string>();
      for (const p of projects) {
        for (const l of (p.languages as string[]) || []) {
          langs.add(l);
        }
      }
      return Array.from(langs);
    }
    return [];
  }

  private fillMissingLanguages(
    existing: Record<string, string>,
    languages: string[],
  ): Record<string, string> {
    const next = { ...existing };
    for (const lang of languages) {
      if (!(lang in next)) next[lang] = '';
    }
    return next;
  }

  async delete(id: string): Promise<void> {
    const entry = await this.glossaryRepo.findById(id);
    if (!entry) throw new NotFoundException('Glossary entry not found');
    await this.glossaryRepo.delete(id);
  }

  async list(opts: {
    teamId?: string;
    projectId?: string;
    query?: string;
    page?: number;
    perPage?: number;
  }) {
    return this.glossaryRepo.findByScope(opts);
  }

  /**
   * Resolve glossary for a project: merge team-level + project-level,
   * project entries take precedence over team entries for the same term.
   */
  async resolveForProject(projectId: string, teamId: string): Promise<ResolvedGlossaryTerm[]> {
    const [teamEntries, projectEntries] = await Promise.all([
      this.glossaryRepo.findAllByTeamId(teamId),
      this.glossaryRepo.findAllByProjectId(projectId),
    ]);

    const merged = new Map<string, ResolvedGlossaryTerm>();

    // Team entries first
    for (const e of teamEntries) {
      merged.set(e.sourceTerm.toLowerCase(), {
        sourceTerm: e.sourceTerm,
        translations: e.translations,
        description: e.description,
        caseSensitive: e.caseSensitive,
        doNotTranslate: e.doNotTranslate,
      });
    }

    // Project entries override
    for (const e of projectEntries) {
      merged.set(e.sourceTerm.toLowerCase(), {
        sourceTerm: e.sourceTerm,
        translations: e.translations,
        description: e.description,
        caseSensitive: e.caseSensitive,
        doNotTranslate: e.doNotTranslate,
      });
    }

    return Array.from(merged.values());
  }

  /**
   * Filter resolved glossary terms to only those matching the given source text.
   */
  filterMatchingTerms(terms: ResolvedGlossaryTerm[], sourceText: string): ResolvedGlossaryTerm[] {
    return terms.filter((term) => {
      if (term.caseSensitive) {
        return sourceText.includes(term.sourceTerm);
      }
      return sourceText.toLowerCase().includes(term.sourceTerm.toLowerCase());
    });
  }

  async bulkImport(
    entries: Array<{
      sourceTerm: string;
      translations: Record<string, string>;
      description?: string;
      caseSensitive?: boolean;
      doNotTranslate?: boolean;
    }>,
    scope: { teamId?: string; projectId?: string },
    userId: string,
  ) {
    const toUpsert: NewGlossaryEntry[] = entries.map((e) => ({
      ...scope,
      sourceTerm: e.sourceTerm,
      translations: e.translations,
      description: e.description,
      caseSensitive: e.caseSensitive ?? false,
      doNotTranslate: e.doNotTranslate ?? false,
      createdBy: userId,
    }));
    return this.glossaryRepo.bulkUpsert(toUpsert);
  }

  async exportAll(opts: { teamId?: string; projectId?: string }): Promise<GlossaryEntry[]> {
    const { entries } = await this.glossaryRepo.findByScope({ ...opts, perPage: 10000 });
    return entries;
  }
}
