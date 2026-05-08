import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE } from '../db/drizzle.provider';
import type { DrizzleDB } from '../db/drizzle.types';
import { AiPromptTemplateRepository } from '../repository/ai-prompt-template.repository';
import { ProjectRepository } from '../repository/project.repository';
import {
  type AiPromptTemplate,
  type NewAiPromptTemplate,
  type PromptKind,
} from '../db/schema';
import {
  BUILTIN_TEMPLATES,
  getBuiltinTemplate,
} from '../ai/prompts/builtin-templates';

const VALID_KINDS: PromptKind[] = [
  'translate',
  'translate_plural',
  'translate_batch',
  'tone_adjust',
];

export interface ResolvedTemplate {
  source: 'project' | 'team' | 'builtin';
  templateId?: string;
  kind: PromptKind;
  body: string;
  variables: string[];
}

@Injectable()
export class AiPromptTemplateService {
  constructor(
    private readonly repository: AiPromptTemplateRepository,
    private readonly projectRepository: ProjectRepository,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

  /**
   * Resolve the active template for a (projectId, kind) using cascade:
   * project default → team default → built-in default.
   */
  async resolve(projectId: string, kind: PromptKind): Promise<ResolvedTemplate> {
    if (!VALID_KINDS.includes(kind)) {
      throw new BadRequestException(`Invalid prompt kind: ${kind}`);
    }

    // 1) project-scoped default
    const projectDefault = await this.repository.findDefault('project', projectId, kind);
    if (projectDefault) {
      return {
        source: 'project',
        templateId: projectDefault.id,
        kind,
        body: projectDefault.body,
        variables: (projectDefault.variables as string[]) || [],
      };
    }

    // 2) team-scoped default
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }
    const teamDefault = await this.repository.findDefault('team', project.teamId, kind);
    if (teamDefault) {
      return {
        source: 'team',
        templateId: teamDefault.id,
        kind,
        body: teamDefault.body,
        variables: (teamDefault.variables as string[]) || [],
      };
    }

    // 3) built-in default
    const builtin = getBuiltinTemplate(kind);
    return {
      source: 'builtin',
      kind,
      body: builtin.body,
      variables: builtin.variables,
    };
  }

  async create(input: {
    scope: 'team' | 'project';
    scopeId: string;
    teamId: string;
    kind: PromptKind;
    name: string;
    body: string;
    variables?: string[];
    isDefault?: boolean;
    createdBy?: string;
  }): Promise<AiPromptTemplate> {
    if (!VALID_KINDS.includes(input.kind)) {
      throw new BadRequestException(`Invalid kind: ${input.kind}`);
    }
    if (input.scope !== 'team' && input.scope !== 'project') {
      throw new BadRequestException('scope must be "team" or "project"');
    }

    return (this.db as any).transaction(async (tx: any) => {
      if (input.isDefault) {
        await this.repository.clearDefaults(tx, input.scope, input.scopeId, input.kind);
      }
      const created = await this.repository.create({
        scope: input.scope,
        scopeId: input.scopeId,
        teamId: input.teamId,
        kind: input.kind,
        name: input.name,
        body: input.body,
        variables: (input.variables ?? []) as any,
        isDefault: input.isDefault ?? false,
        createdBy: input.createdBy,
      } as NewAiPromptTemplate);
      return created;
    });
  }

  async update(
    id: string,
    patch: {
      name?: string;
      body?: string;
      variables?: string[];
      isDefault?: boolean;
    },
  ): Promise<AiPromptTemplate> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Template ${id} not found`);
    }

    return (this.db as any).transaction(async (tx: any) => {
      if (patch.isDefault === true && !existing.isDefault) {
        await this.repository.clearDefaults(
          tx,
          existing.scope as 'team' | 'project',
          existing.scopeId,
          existing.kind as PromptKind,
          id,
        );
      }
      const updated = await this.repository.update(id, {
        ...patch,
        variables: patch.variables ? (patch.variables as any) : undefined,
      });
      return updated;
    });
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async listByScope(
    scope: 'team' | 'project',
    scopeId: string,
  ): Promise<AiPromptTemplate[]> {
    return this.repository.findByScope(scope, scopeId);
  }

  /** Lists the built-in defaults for documentation/UI purposes. */
  listBuiltins() {
    return Object.values(BUILTIN_TEMPLATES);
  }
}
