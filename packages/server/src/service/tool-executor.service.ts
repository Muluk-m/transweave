import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { ProjectService } from './project.service';
import { TokenService } from './token.service';
import { AiService } from '../ai/ai.service';
import { QaCheckService } from './qa-check.service';
import { GlossaryService } from './glossary.service';

/**
 * Shared tool definitions (OpenAI function-calling format).
 * Used by AgentService directly; McpService converts to Zod as needed.
 */
export const TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'list_projects',
      description: 'List all i18n projects the user has access to',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_project_tokens',
      description:
        'List tokens for a project with pagination (use search_tokens for filtered results)',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          page: { type: 'number', description: 'Page number (default: 1)' },
          perPage: {
            type: 'number',
            description: 'Items per page (default: 50, max: 200)',
          },
        },
        required: ['projectId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_tokens',
      description: 'Search and filter tokens in a project',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          query: { type: 'string', description: 'Search query' },
          module: { type: 'string', description: 'Filter by module code' },
          status: {
            type: 'string',
            enum: ['all', 'completed', 'incomplete'],
          },
          page: { type: 'number' },
          perPage: { type: 'number' },
        },
        required: ['projectId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_token_details',
      description: 'Get detailed information about a token including history',
      parameters: {
        type: 'object',
        properties: { tokenId: { type: 'string' } },
        required: ['tokenId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_token',
      description: 'Create a new translation token',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          key: { type: 'string' },
          translations: {
            type: 'object',
            additionalProperties: { type: 'string' },
            description: 'Translations as { "lang": "text" }',
          },
          module: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          comment: { type: 'string' },
        },
        required: ['projectId', 'key', 'translations'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_token',
      description: 'Update an existing translation token',
      parameters: {
        type: 'object',
        properties: {
          tokenId: { type: 'string' },
          key: { type: 'string' },
          translations: {
            type: 'object',
            additionalProperties: { type: 'string' },
          },
          module: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          comment: { type: 'string' },
        },
        required: ['tokenId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'delete_token',
      description: 'Delete a translation token by ID',
      parameters: {
        type: 'object',
        properties: { tokenId: { type: 'string' } },
        required: ['tokenId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'translate_text',
      description: 'Translate text using AI with glossary and TM context',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Source text' },
          from: { type: 'string', description: 'Source language code' },
          to: {
            type: 'array',
            items: { type: 'string' },
            description: 'Target language codes',
          },
          projectId: { type: 'string' },
        },
        required: ['text', 'from', 'to', 'projectId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'qa_check_project',
      description:
        'Run QA checks on tokens in a project (paginated, max 100 per batch)',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          page: { type: 'number', description: 'Page number (default: 1)' },
          perPage: {
            type: 'number',
            description: 'Tokens per batch (default: 100, max: 100)',
          },
        },
        required: ['projectId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_glossary',
      description: 'Get glossary terms for a project',
      parameters: {
        type: 'object',
        properties: { projectId: { type: 'string' } },
        required: ['projectId'],
      },
    },
  },
] as const;

/**
 * Shared tool executor used by both AgentService and McpService.
 * Enforces permission checks on every tool call.
 */
@Injectable()
export class ToolExecutorService {
  private readonly logger = new Logger(ToolExecutorService.name);

  constructor(
    private readonly projectService: ProjectService,
    private readonly tokenService: TokenService,
    private readonly aiService: AiService,
    private readonly qaCheckService: QaCheckService,
    private readonly glossaryService: GlossaryService,
  ) {}

  /**
   * Execute a tool by name with permission enforcement.
   * @param name - Tool name
   * @param args - Tool arguments
   * @param userId - Authenticated user ID (for permission checks and audit)
   */
  async execute(name: string, args: any, userId: string): Promise<any> {
    // Permission check for tools that operate on a project
    const projectId = args.projectId;
    if (projectId) {
      await this.assertProjectAccess(projectId, userId);
    }

    switch (name) {
      case 'list_projects':
        return this.listProjects(userId);

      case 'list_project_tokens':
        return this.listProjectTokens(args);

      case 'search_tokens':
        return this.searchTokens(args);

      case 'get_token_details': {
        // Need to verify permission via the token's project
        const token = await this.tokenService.findById(args.tokenId);
        if (!token) throw new Error('Token not found');
        await this.assertProjectAccess(token.projectId, userId);
        return token;
      }

      case 'create_token':
        return this.tokenService.create({ ...args, userId });

      case 'update_token': {
        const { tokenId, ...data } = args;
        // Verify permission via the token's project
        const existing = await this.tokenService.findById(tokenId);
        if (!existing) throw new Error('Token not found');
        await this.assertProjectAccess(existing.projectId, userId);
        return this.tokenService.update(tokenId, { ...data, userId });
      }

      case 'delete_token': {
        const toDelete = await this.tokenService.findById(args.tokenId);
        if (!toDelete) throw new Error('Token not found');
        await this.assertProjectAccess(toDelete.projectId, userId);
        await this.tokenService.delete(args.tokenId, userId);
        return { success: true, tokenId: args.tokenId };
      }

      case 'translate_text':
        return this.aiService.translate(args);

      case 'qa_check_project':
        return this.qaCheckProject(args, userId);

      case 'list_glossary':
        return this.listGlossary(args.projectId);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * Assert that the user has access to the given project.
   * Throws ForbiddenException if not.
   */
  private async assertProjectAccess(
    projectId: string,
    userId: string,
  ): Promise<void> {
    const hasPermission =
      await this.projectService.checkUserProjectPermission(projectId, userId);
    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to access this project',
      );
    }
  }

  private async listProjects(userId: string) {
    const projects = await this.projectService.findProjectsByUserId(userId);
    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      languages: p.languages,
    }));
  }

  private async listProjectTokens(args: {
    projectId: string;
    page?: number;
    perPage?: number;
  }) {
    const result = await this.tokenService.search(args.projectId, {
      query: undefined,
      module: undefined,
      status: 'all',
      page: args.page || 1,
      perPage: Math.min(args.perPage || 50, 200),
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    return {
      tokens: result.tokens.map((t: any) => ({
        id: t.id,
        key: t.key,
        module: t.module,
        translations: t.translations,
        tags: t.tags,
      })),
      total: result.total,
    };
  }

  private async searchTokens(args: {
    projectId: string;
    query?: string;
    module?: string;
    status?: 'all' | 'completed' | 'incomplete';
    page?: number;
    perPage?: number;
  }) {
    const result = await this.tokenService.search(args.projectId, {
      query: args.query,
      module: args.module,
      status: args.status || 'all',
      page: args.page || 1,
      perPage: Math.min(args.perPage || 20, 200),
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    return {
      tokens: result.tokens.map((t: any) => ({
        id: t.id,
        key: t.key,
        module: t.module,
        translations: t.translations,
        tags: t.tags,
      })),
      total: result.total,
    };
  }

  private async qaCheckProject(
    args: { projectId: string; page?: number; perPage?: number },
    userId: string,
  ) {
    const project = await this.projectService.findProjectById(args.projectId);
    if (!project) throw new Error('Project not found');

    const sourceLang = project.defaultLang || project.languages?.[0] || '';
    const batchSize = Math.min(args.perPage || 100, 100);
    const page = args.page || 1;

    // Use paginated search instead of loading all tokens
    const { tokens } = await this.tokenService.search(args.projectId, {
      status: 'all',
      page,
      perPage: batchSize,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    let glossaryTerms;
    try {
      glossaryTerms = await this.glossaryService.resolveForProject(
        args.projectId,
        project.teamId,
      );
    } catch {
      /* continue without glossary */
    }

    const results = tokens.map((token: any) => {
      const sourceText = token.translations?.[sourceLang] || '';
      const matching = glossaryTerms
        ? this.glossaryService.filterMatchingTerms(glossaryTerms, sourceText)
        : undefined;
      return this.qaCheckService.checkToken({
        tokenId: token.id,
        sourceText,
        sourceLang,
        translations: token.translations || {},
        glossaryTerms: matching,
      });
    });

    const failed = results.filter((r) => !r.passed);
    return {
      total: results.length,
      passed: results.length - failed.length,
      failed: failed.length,
      issues: failed.slice(0, 20),
      page,
      perPage: batchSize,
    };
  }

  private async listGlossary(projectId: string) {
    const project = await this.projectService.findProjectById(projectId);
    if (!project) throw new Error('Project not found');
    return this.glossaryService.resolveForProject(projectId, project.teamId);
  }
}
