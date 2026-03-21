import { Inject, Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.provider';
import type { DrizzleDB } from '../db/drizzle.types';
import { agentSessions, agentMessages } from '../db/schema';
import { AiService } from '../ai/ai.service';
import { ProjectService } from './project.service';
import { TokenService } from './token.service';
import { GlossaryService } from './glossary.service';
import { QaCheckService } from './qa-check.service';
import type { ProviderConfig } from '../ai/providers/translation-provider.interface';

interface AgentMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
}

interface AgentEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'done' | 'error';
  content?: string;
  toolName?: string;
  toolArgs?: any;
  toolResult?: any;
  toolCallId?: string;
  sessionId?: string;
}

const AGENT_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'list_projects',
      description: 'List all i18n projects',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_project_tokens',
      description: 'List all tokens for a project (use search_tokens for filtered results)',
      parameters: {
        type: 'object',
        properties: { projectId: { type: 'string', description: 'Project ID' } },
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
          status: { type: 'string', enum: ['all', 'completed', 'incomplete'] },
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
      name: 'translate_text',
      description: 'Translate text using AI with glossary and TM context',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Source text' },
          from: { type: 'string', description: 'Source language code' },
          to: { type: 'array', items: { type: 'string' }, description: 'Target language codes' },
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
      description: 'Run QA checks on all tokens in a project',
      parameters: {
        type: 'object',
        properties: { projectId: { type: 'string' } },
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
];

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly aiService: AiService,
    private readonly projectService: ProjectService,
    private readonly tokenService: TokenService,
    private readonly glossaryService: GlossaryService,
    private readonly qaCheckService: QaCheckService,
  ) {}

  // --- Session persistence ---

  async listSessions(projectId: string, userId: string) {
    return this.db
      .select()
      .from(agentSessions)
      .where(
        eq(agentSessions.projectId, projectId),
      )
      .orderBy(desc(agentSessions.updatedAt))
      .limit(50);
  }

  async getSessionMessages(sessionId: string) {
    return this.db
      .select()
      .from(agentMessages)
      .where(eq(agentMessages.sessionId, sessionId))
      .orderBy(agentMessages.createdAt);
  }

  async createSession(projectId: string, userId: string, title?: string) {
    const [session] = await this.db
      .insert(agentSessions)
      .values({ projectId, userId, title })
      .returning();
    return session;
  }

  async deleteSession(sessionId: string) {
    await this.db.delete(agentSessions).where(eq(agentSessions.id, sessionId));
  }

  private async persistMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    toolCalls?: any[],
  ) {
    await this.db.insert(agentMessages).values({
      sessionId,
      role,
      content,
      toolCalls: toolCalls?.length ? toolCalls : undefined,
    });
    // Touch session updatedAt
    await this.db
      .update(agentSessions)
      .set({ updatedAt: new Date() })
      .where(eq(agentSessions.id, sessionId));
  }

  async *chat(params: {
    message: string;
    projectId: string;
    sessionId?: string;
    history?: AgentMessage[];
    userId: string;
  }): AsyncGenerator<AgentEvent> {
    const config = await this.aiService.resolveProviderConfig(params.projectId);
    if (!config) {
      throw new HttpException(
        'No AI provider configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const project = await this.projectService.findProjectById(params.projectId);
    if (!project) {
      throw new HttpException('Project not found', HttpStatus.NOT_FOUND);
    }

    const systemPrompt = this.buildSystemPrompt(project);

    // Auto-create session if not provided
    let sessionId = params.sessionId;
    if (!sessionId) {
      const session = await this.createSession(
        params.projectId,
        params.userId,
        params.message.slice(0, 100),
      );
      sessionId = session.id;
    }

    // Persist user message
    await this.persistMessage(sessionId, 'user', params.message);

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...(params.history || []),
      { role: 'user', content: params.message },
    ];

    // Agent loop: call LLM, execute tools, repeat until no more tool calls
    const collectedToolCalls: Array<{ name: string; args: any; result?: any; id: string }> = [];
    const maxIterations = 10;
    for (let i = 0; i < maxIterations; i++) {
      const response = await this.callLLM(config, messages);

      const assistantMessage = response.choices[0]?.message;
      if (!assistantMessage) break;

      messages.push(assistantMessage);

      // If there are tool calls, execute them
      if (assistantMessage.tool_calls?.length) {
        for (const toolCall of assistantMessage.tool_calls) {
          const fn = toolCall.function;
          yield {
            type: 'tool_call',
            toolName: fn.name,
            toolArgs: JSON.parse(fn.arguments),
            toolCallId: toolCall.id,
          };

          let result: any;
          try {
            result = await this.executeTool(
              fn.name,
              JSON.parse(fn.arguments),
              params.userId,
            );
          } catch (err) {
            result = {
              error: err instanceof Error ? err.message : String(err),
            };
          }

          collectedToolCalls.push({
            name: fn.name,
            args: JSON.parse(fn.arguments),
            result,
            id: toolCall.id,
          });

          yield {
            type: 'tool_result',
            toolName: fn.name,
            toolResult: result,
            toolCallId: toolCall.id,
          };

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }
        continue; // Loop back for next LLM call
      }

      // No tool calls — this is the final text response
      if (assistantMessage.content) {
        yield { type: 'text', content: assistantMessage.content };
        // Persist assistant message
        await this.persistMessage(
          sessionId!,
          'assistant',
          assistantMessage.content,
          collectedToolCalls.length ? collectedToolCalls : undefined,
        );
      }
      break;
    }

    yield { type: 'done', sessionId };
  }

  private async callLLM(config: ProviderConfig, messages: any[]): Promise<any> {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({
      apiKey: config.apiKey,
      ...(config.baseUrl && { baseURL: config.baseUrl }),
    });

    return client.chat.completions.create({
      model: config.model || 'gpt-4o-mini',
      messages,
      tools: AGENT_TOOLS,
      temperature: 0.3,
    });
  }

  private buildSystemPrompt(project: any): string {
    return `You are a helpful i18n translation assistant for the project "${project.name}".

Project details:
- Languages: ${(project.languages || []).join(', ')}
- Default language: ${project.defaultLang || project.languages?.[0] || 'unknown'}
- Modules: ${(project.modules || []).map((m: any) => m.code).join(', ') || 'none'}
- Project ID: ${project.id}

You help users manage translations, create/update tokens, translate text, and check quality.
When the user asks to do something, use the available tools. Always provide clear, concise responses.
When creating or updating tokens, confirm the changes you made.
When translating, show the results clearly.
Respond in the same language the user uses.`;
  }

  private async executeTool(
    name: string,
    args: any,
    userId: string,
  ): Promise<any> {
    switch (name) {
      case 'list_projects': {
        const projects = await this.projectService.findAllProjects();
        return projects.map((p) => ({
          id: p.id,
          name: p.name,
          languages: p.languages,
        }));
      }

      case 'list_project_tokens': {
        const tokens = await this.tokenService.findByProject(args.projectId);
        return tokens.map((t: any) => ({
          id: t.id,
          key: t.key,
          module: t.module,
          translations: t.translations,
        }));
      }

      case 'search_tokens': {
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
          })),
          total: result.total,
        };
      }

      case 'get_token_details': {
        const token = await this.tokenService.findById(args.tokenId);
        return token;
      }

      case 'create_token': {
        return this.tokenService.create({ ...args, userId });
      }

      case 'update_token': {
        const { tokenId, ...data } = args;
        return this.tokenService.update(tokenId, { ...data, userId });
      }

      case 'translate_text': {
        const result = await this.aiService.translate(args);
        return result;
      }

      case 'qa_check_project': {
        const project = await this.projectService.findProjectById(args.projectId);
        if (!project) throw new Error('Project not found');
        const tokens = await this.tokenService.findByProject(args.projectId);
        const sourceLang = project.defaultLang || project.languages?.[0] || '';
        let glossaryTerms;
        try {
          glossaryTerms = await this.glossaryService.resolveForProject(args.projectId, project.teamId);
        } catch { /* continue */ }

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
          issues: failed.slice(0, 20), // Limit to avoid huge payloads
        };
      }

      case 'list_glossary': {
        const project = await this.projectService.findProjectById(args.projectId);
        if (!project) throw new Error('Project not found');
        return this.glossaryService.resolveForProject(args.projectId, project.teamId);
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
}
