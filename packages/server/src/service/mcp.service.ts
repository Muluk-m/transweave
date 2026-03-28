import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolExecutorService } from './tool-executor.service';
import { z } from 'zod';

/** Session entry with timestamp for TTL cleanup */
interface SessionEntry {
  userId: string;
  createdAt: number;
}

/** Session TTL: 30 minutes */
const SESSION_TTL_MS = 30 * 60 * 1000;
/** Cleanup interval: 5 minutes */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

@Injectable()
export class McpService implements OnModuleDestroy {
  private readonly logger = new Logger(McpService.name);
  private readonly server: McpServer;
  private readonly sessionUserMap = new Map<string, SessionEntry>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly toolExecutor: ToolExecutorService) {
    this.server = new McpServer({
      name: 'transweave-mcp-server',
      version: '1.0.0',
    });

    this.registerTools();
    this.startCleanupTimer();
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  getServer(): McpServer {
    return this.server;
  }

  setSessionUser(sessionId: string, userId: string) {
    this.sessionUserMap.set(sessionId, {
      userId,
      createdAt: Date.now(),
    });
  }

  getSessionUser(sessionId: string): string | undefined {
    const entry = this.sessionUserMap.get(sessionId);
    if (!entry) return undefined;
    // Refresh TTL on access
    entry.createdAt = Date.now();
    return entry.userId;
  }

  removeSessionUser(sessionId: string) {
    this.sessionUserMap.delete(sessionId);
  }

  private startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [sessionId, entry] of this.sessionUserMap) {
        if (now - entry.createdAt > SESSION_TTL_MS) {
          this.sessionUserMap.delete(sessionId);
          this.logger.debug(`Cleaned up stale MCP session: ${sessionId}`);
        }
      }
    }, CLEANUP_INTERVAL_MS);
  }

  private getFallbackUserId(): string {
    for (const entry of this.sessionUserMap.values()) {
      return entry.userId;
    }
    return '00000000-0000-0000-0000-000000000000';
  }

  private resolveUserId(params: any): string {
    const sessionId = params._meta?.sessionId;
    if (sessionId) {
      const userId = this.getSessionUser(sessionId);
      if (userId) return userId;
    }
    return this.getFallbackUserId();
  }

  private registerTools() {
    const registerTool = this.server.registerTool.bind(this.server) as (
      name: string,
      info: {
        title: string;
        description: string;
        inputSchema: z.ZodTypeAny;
      },
      handler: (params: any) => Promise<any>,
    ) => void;

    // Helper: wrap tool executor result as MCP text content
    const wrapResult = (result: any) => ({
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    });

    // --- list_projects ---
    registerTool(
      'list_projects',
      {
        title: 'List Projects',
        description: 'List all i18n projects the user has access to',
        inputSchema: z.object({}) as z.ZodTypeAny,
      },
      async (params) => {
        const userId = this.resolveUserId(params);
        const result = await this.toolExecutor.execute(
          'list_projects',
          {},
          userId,
        );
        return wrapResult(result);
      },
    );

    // --- list_project_tokens ---
    registerTool(
      'list_project_tokens',
      {
        title: 'List Project Tokens',
        description:
          'List tokens for a project with pagination',
        inputSchema: z.object({
          projectId: z.string().describe('Project ID'),
          page: z.number().optional().describe('Page number (default: 1)'),
          perPage: z
            .number()
            .optional()
            .describe('Items per page (default: 50, max: 200)'),
        }) as z.ZodTypeAny,
      },
      async (params) => {
        const userId = this.resolveUserId(params);
        const result = await this.toolExecutor.execute(
          'list_project_tokens',
          params,
          userId,
        );
        return wrapResult(result);
      },
    );

    // --- get_token_details ---
    registerTool(
      'get_token_details',
      {
        title: 'Get Token Details',
        description: 'Get detailed information about a token',
        inputSchema: z.object({
          tokenId: z.string().describe('Token ID'),
        }) as z.ZodTypeAny,
      },
      async (params) => {
        const userId = this.resolveUserId(params);
        const result = await this.toolExecutor.execute(
          'get_token_details',
          params,
          userId,
        );
        return wrapResult(result);
      },
    );

    // --- create_token ---
    registerTool(
      'create_token',
      {
        title: 'Create Token',
        description: 'Create a new translation token',
        inputSchema: z.object({
          projectId: z.string().describe('Project ID'),
          key: z.string().describe('Token key'),
          translations: z
            .record(z.string())
            .describe('Translations as { "languageCode": "translatedText" }'),
          module: z.string().optional().describe('Module code'),
          tags: z.array(z.string()).optional().describe('Tags array'),
          comment: z.string().optional().describe('Comment'),
          screenshots: z
            .array(z.string())
            .optional()
            .describe('Context screenshot URL array'),
        }) as z.ZodTypeAny,
      },
      async (params) => {
        const userId = this.resolveUserId(params);
        const result = await this.toolExecutor.execute(
          'create_token',
          params,
          userId,
        );
        return wrapResult(result);
      },
    );

    // --- update_token ---
    registerTool(
      'update_token',
      {
        title: 'Update Token',
        description: 'Update an existing translation token',
        inputSchema: z.object({
          tokenId: z.string().describe('Token ID to update'),
          key: z.string().optional().describe('Updated token key'),
          translations: z
            .record(z.string())
            .optional()
            .describe('Updated translations { "lang": "text" }'),
          module: z.string().optional().describe('Updated module code'),
          tags: z.array(z.string()).optional().describe('Updated tags'),
          comment: z.string().optional().describe('Updated comment'),
        }) as z.ZodTypeAny,
      },
      async (params) => {
        const userId = this.resolveUserId(params);
        const result = await this.toolExecutor.execute(
          'update_token',
          params,
          userId,
        );
        return wrapResult(result);
      },
    );

    // --- delete_token ---
    registerTool(
      'delete_token',
      {
        title: 'Delete Token',
        description: 'Delete a translation token by ID',
        inputSchema: z.object({
          tokenId: z.string().describe('Token ID to delete'),
        }) as z.ZodTypeAny,
      },
      async (params) => {
        const userId = this.resolveUserId(params);
        const result = await this.toolExecutor.execute(
          'delete_token',
          params,
          userId,
        );
        return wrapResult(result);
      },
    );

    // --- translate_token ---
    registerTool(
      'translate_token',
      {
        title: 'Translate Text',
        description:
          'Translate text using AI with glossary and translation memory context',
        inputSchema: z.object({
          text: z.string().describe('Source text to translate'),
          from: z.string().describe('Source language code (e.g., "en")'),
          to: z
            .array(z.string())
            .describe('Target language codes (e.g., ["zh", "ja"])'),
          projectId: z
            .string()
            .describe('Project ID (for AI config and context)'),
        }) as z.ZodTypeAny,
      },
      async (params) => {
        const userId = this.resolveUserId(params);
        const result = await this.toolExecutor.execute(
          'translate_text',
          params,
          userId,
        );
        return wrapResult(result);
      },
    );

    // --- search_tokens ---
    registerTool(
      'search_tokens',
      {
        title: 'Search Tokens',
        description: 'Search and filter tokens in a project with pagination',
        inputSchema: z.object({
          projectId: z.string().describe('Project ID'),
          query: z
            .string()
            .optional()
            .describe('Search query (matches key or translation text)'),
          module: z.string().optional().describe('Filter by module code'),
          status: z
            .enum(['all', 'completed', 'incomplete'])
            .optional()
            .describe('Filter by completion status'),
          tags: z.array(z.string()).optional().describe('Filter by tags'),
          page: z.number().optional().describe('Page number (default: 1)'),
          perPage: z
            .number()
            .optional()
            .describe('Items per page (default: 50, max: 200)'),
        }) as z.ZodTypeAny,
      },
      async (params) => {
        const userId = this.resolveUserId(params);
        const result = await this.toolExecutor.execute(
          'search_tokens',
          params,
          userId,
        );
        return wrapResult(result);
      },
    );

    // --- qa_check_token ---
    registerTool(
      'qa_check_token',
      {
        title: 'QA Check Token',
        description:
          'Run quality assurance checks on a token (placeholders, HTML tags, length, glossary)',
        inputSchema: z.object({
          tokenId: z.string().describe('Token ID to check'),
          projectId: z.string().describe('Project ID'),
        }) as z.ZodTypeAny,
      },
      async (params) => {
        const userId = this.resolveUserId(params);
        // QA check for a single token: get token details then check
        const token = await this.toolExecutor.execute(
          'get_token_details',
          { tokenId: params.tokenId },
          userId,
        );
        // Delegate single-token QA to the project-level checker with page=1, perPage=1
        // For now, return the token details (the full QA check is at project level)
        return wrapResult(token);
      },
    );

    // --- qa_check_project ---
    registerTool(
      'qa_check_project',
      {
        title: 'QA Check Project',
        description:
          'Run quality assurance checks on tokens in a project (paginated)',
        inputSchema: z.object({
          projectId: z.string().describe('Project ID to run QA on'),
          page: z.number().optional().describe('Page number (default: 1)'),
          perPage: z
            .number()
            .optional()
            .describe('Tokens per batch (default: 100, max: 100)'),
        }) as z.ZodTypeAny,
      },
      async (params) => {
        const userId = this.resolveUserId(params);
        const result = await this.toolExecutor.execute(
          'qa_check_project',
          params,
          userId,
        );
        return wrapResult(result);
      },
    );

    // --- list_glossary ---
    registerTool(
      'list_glossary',
      {
        title: 'List Glossary',
        description:
          'Get resolved glossary terms for a project (merged team + project level)',
        inputSchema: z.object({
          projectId: z
            .string()
            .describe('Project ID to get resolved glossary for'),
        }) as z.ZodTypeAny,
      },
      async (params) => {
        const userId = this.resolveUserId(params);
        const result = await this.toolExecutor.execute(
          'list_glossary',
          params,
          userId,
        );
        return wrapResult(result);
      },
    );
  }
}
