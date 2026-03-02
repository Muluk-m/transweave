import { Injectable, Logger } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ProjectService } from './project.service';
import { TokenService } from './token.service';
import { z } from 'zod';

type ListProjectsParams = Record<string, any>;
type ListProjectTokensParams = Record<string, any>;
type GetTokenDetailsParams = Record<string, any>;
type CreateTokenParams = Record<string, any>;
type UpdateTokenParams = Record<string, any>;

@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);
  private readonly server: McpServer;
  private readonly sessionUserMap = new Map<string, string>();

  constructor(
    private readonly projectService: ProjectService,
    private readonly tokenService: TokenService,
  ) {
    this.server = new McpServer({
      name: 'transweave-mcp-server',
      version: '1.0.0',
    });

    this.registerTools();
  }

  getServer(): McpServer {
    return this.server;
  }

  /**
   * Associate a session ID with an authenticated user ID.
   */
  setSessionUser(sessionId: string, userId: string) {
    this.sessionUserMap.set(sessionId, userId);
  }

  /**
   * Get the authenticated user ID for a session.
   */
  getSessionUser(sessionId: string): string | undefined {
    return this.sessionUserMap.get(sessionId);
  }

  /**
   * Remove session user mapping when session closes.
   */
  removeSessionUser(sessionId: string) {
    this.sessionUserMap.delete(sessionId);
  }

  private registerTools() {
    const listProjectsSchema: z.ZodTypeAny = z.object({});

    const listProjectTokensSchema: z.ZodTypeAny = z.object({
      projectId: z.string().describe('Project ID'),
    });

    const getTokenDetailsSchema: z.ZodTypeAny = z.object({
      tokenId: z.string().describe('Token ID'),
    });

    const createTokenSchema: z.ZodTypeAny = z.object({
      projectId: z.string().describe('Project ID'),
      key: z.string().describe('Token key'),
      translations: z.record(z.string()).describe('Translations as { "languageCode": "translatedText" }'),
      module: z.string().optional().describe('Module code'),
      tags: z.array(z.string()).optional().describe('Tags array'),
      comment: z.string().optional().describe('Comment'),
      screenshots: z.array(z.string()).optional().describe('Context screenshot URL array'),
    });

    const updateTokenSchema: z.ZodTypeAny = z.object({
      tokenId: z.string().describe('Token ID to update'),
      key: z.string().optional().describe('Updated token key'),
      translations: z.record(z.string()).optional().describe('Updated translations { "lang": "text" }'),
      module: z.string().optional().describe('Updated module code'),
      tags: z.array(z.string()).optional().describe('Updated tags'),
      comment: z.string().optional().describe('Updated comment'),
    });

    const registerTool = this.server.registerTool.bind(this.server) as (
      name: string,
      info: {
        title: string;
        description: string;
        inputSchema: z.ZodTypeAny;
      },
      handler: (params: any) => Promise<any>,
    ) => void;

    // Register list_projects tool
    registerTool(
      'list_projects',
      {
        title: 'List Projects',
        description: 'List all i18n projects',
        inputSchema: listProjectsSchema,
      },
      async (_params: ListProjectsParams) => {
        const projects = await this.listProjects();
        return {
          content: [{ type: 'text', text: JSON.stringify(projects, null, 2) }],
        };
      },
    );

    // Register list_project_tokens tool
    registerTool(
      'list_project_tokens',
      {
        title: 'List Project Tokens',
        description: 'List tokens for a specific project',
        inputSchema: listProjectTokensSchema,
      },
      async (params: ListProjectTokensParams) => {
        const tokens = await this.listProjectTokens(params.projectId);
        return {
          content: [{ type: 'text', text: JSON.stringify(tokens, null, 2) }],
        };
      },
    );

    // Register get_token_details tool
    registerTool(
      'get_token_details',
      {
        title: 'Get Token Details',
        description: 'Get detailed information about a token',
        inputSchema: getTokenDetailsSchema,
      },
      async (params: GetTokenDetailsParams) => {
        const token = await this.getTokenDetails(params.tokenId);
        return {
          content: [{ type: 'text', text: JSON.stringify(token, null, 2) }],
        };
      },
    );

    // Register create_token tool
    registerTool(
      'create_token',
      {
        title: 'Create Token',
        description: 'Create a new translation token',
        inputSchema: createTokenSchema,
      },
      async (params: CreateTokenParams) => {
        const token = await this.createToken(params as any);
        return {
          content: [{ type: 'text', text: JSON.stringify(token, null, 2) }],
        };
      },
    );

    // Register update_token tool
    registerTool(
      'update_token',
      {
        title: 'Update Token',
        description: 'Update an existing translation token',
        inputSchema: updateTokenSchema,
      },
      async (params: UpdateTokenParams) => {
        const token = await this.updateToken(params as any);
        return {
          content: [{ type: 'text', text: JSON.stringify(token, null, 2) }],
        };
      },
    );
  }

  // List all projects
  private async listProjects() {
    try {
      const projects = await this.projectService.findAllProjects();
      return projects.map((project) => ({
        id: project.id || project._id.toString(),
        name: project.name,
        description: project.description,
        languages: project.languages,
        url: project.url,
      }));
    } catch (error: any) {
      this.logger.error('Failed to list projects:', error.message);
      throw new Error(`Failed to list projects: ${error.message}`);
    }
  }

  // List project tokens
  private async listProjectTokens(projectId: string) {
    try {
      const tokens = await this.tokenService.findByProject(projectId);
      return tokens.map((token: any) => ({
        id: token.id,
        key: token.key,
        module: token.module,
        translations: token.translations,
        tags: token.tags,
        comment: token.comment,
        screenshots: token.screenshots,
      }));
    } catch (error: any) {
      this.logger.error('Failed to list project tokens:', error.message);
      throw new Error(`Failed to list project tokens: ${error.message}`);
    }
  }

  // Get token details
  private async getTokenDetails(tokenId: string) {
    try {
      const token = await this.tokenService.findById(tokenId);
      if (!token) {
        throw new Error('Token not found');
      }
      return {
        id: token.id,
        key: token.key,
        module: token.module,
        translations: token.translations,
        tags: token.tags,
        comment: token.comment,
        screenshots: token.screenshots,
        projectId: token.projectId,
        history: token.history,
        createdAt: token.createdAt,
        updatedAt: token.updatedAt,
      };
    } catch (error: any) {
      this.logger.error('Failed to get token details:', error.message);
      throw new Error(`Failed to get token details: ${error.message}`);
    }
  }

  // Create token (uses authenticated user's ID from session map)
  private async createToken(params: {
    projectId: string;
    key: string;
    translations: Record<string, string>;
    module?: string;
    tags?: string[];
    comment?: string;
    screenshots?: string[];
    _meta?: { sessionId?: string };
  }): Promise<any> {
    try {
      // Resolve user ID from session map
      const sessionId = params._meta?.sessionId;
      const userId = sessionId
        ? this.getSessionUser(sessionId)
        : this.getFallbackUserId();

      const token: any = await this.tokenService.create({
        projectId: params.projectId,
        key: params.key,
        translations: params.translations,
        module: params.module,
        tags: params.tags,
        comment: params.comment,
        screenshots: params.screenshots,
        userId: userId || this.getFallbackUserId(),
      });

      if (!token) {
        throw new Error('Create token returned empty result');
      }

      return {
        id: token.id,
        key: token.key,
        module: token.module,
        translations: token.translations,
        tags: token.tags,
        comment: token.comment,
        screenshots: token.screenshots,
      };
    } catch (error: any) {
      this.logger.error('Failed to create token:', error.message);
      throw new Error(`Failed to create token: ${error.message}`);
    }
  }

  // Update token (uses authenticated user's ID from session map)
  private async updateToken(params: {
    tokenId: string;
    key?: string;
    translations?: Record<string, string>;
    module?: string;
    tags?: string[];
    comment?: string;
    _meta?: { sessionId?: string };
  }): Promise<any> {
    try {
      // Resolve user ID from session map
      const sessionId = params._meta?.sessionId;
      const userId = sessionId
        ? this.getSessionUser(sessionId)
        : this.getFallbackUserId();

      const { tokenId, _meta, ...updateData } = params;

      const token = await this.tokenService.update(tokenId, {
        ...updateData,
        userId: userId || this.getFallbackUserId(),
      });

      if (!token) {
        throw new Error('Update token returned empty result');
      }

      return {
        id: token.id,
        key: token.key,
        module: token.module,
        translations: token.translations,
        tags: token.tags,
        comment: token.comment,
        screenshots: token.screenshots,
        projectId: token.projectId,
      };
    } catch (error: any) {
      this.logger.error('Failed to update token:', error.message);
      throw new Error(`Failed to update token: ${error.message}`);
    }
  }

  /**
   * Returns a fallback user ID when no session user is available.
   * This should only be used as a last resort when session context
   * cannot be resolved (e.g., during initialization).
   */
  private getFallbackUserId(): string {
    // Use the first available session user, or a system placeholder
    for (const userId of this.sessionUserMap.values()) {
      return userId;
    }
    return '00000000-0000-0000-0000-000000000000';
  }
}
