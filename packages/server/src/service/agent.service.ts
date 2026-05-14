import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.provider';
import type { DrizzleDB } from '../db/drizzle.types';
import { agentSessions, agentMessages } from '../db/schema';
import { ProjectService } from './project.service';
import { ToolExecutorService, TOOL_DEFINITIONS } from './tool-executor.service';
import { ConnectorResolver } from '../ai/connector-resolver.service';
import { PROVIDER_CAPABILITIES } from '../ai/providers/capabilities';
import { decryptApiKey } from '../ai/encryption.util';
import type { ProviderType } from '../ai/providers/translation-provider.interface';

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

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private llmClient: any = null;
  private llmClientKey: string | null = null;

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly resolver: ConnectorResolver,
    private readonly projectService: ProjectService,
    private readonly toolExecutor: ToolExecutorService,
  ) {}

  // --- Session persistence ---

  async listSessions(projectId: string, userId: string) {
    return this.db
      .select()
      .from(agentSessions)
      .where(eq(agentSessions.projectId, projectId))
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
    await this.db
      .delete(agentSessions)
      .where(eq(agentSessions.id, sessionId));
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
    options?: { connectorId?: string; model?: string };
  }): AsyncGenerator<AgentEvent> {
    let resolved: Awaited<ReturnType<ConnectorResolver['resolve']>>;
    try {
      resolved = await this.resolver.resolve(params.projectId, params.options);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith('AI_NOT_CONFIGURED')) {
        throw new HttpException(
          'No AI provider configured',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      throw err;
    }

    const provider = resolved.connector.provider as ProviderType;
    const cap = PROVIDER_CAPABILITIES[provider];
    if (!cap?.toolCalling) {
      throw new BadRequestException(
        `AI provider "${provider}" does not support the Agent chat feature. Configure an LLM provider that supports tool calling.`,
      );
    }
    let apiKey: string;
    try {
      apiKey = decryptApiKey(resolved.connector.apiKey);
    } catch (err) {
      // Stale ciphertext (e.g. AI_ENCRYPTION_KEY rotated or salt upgrade in b314580):
      // surface as 503 so the UI can prompt the user to re-enter the key.
      throw new HttpException(
        err instanceof Error ? err.message : 'Connector API key could not be decrypted',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const model = resolved.model || cap.defaultModel || 'gpt-5.5';
    const baseUrl = resolved.connector.baseUrl ?? undefined;

    const project = await this.projectService.findProjectById(
      params.projectId,
    );
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
    const collectedToolCalls: Array<{
      name: string;
      args: any;
      result?: any;
      id: string;
    }> = [];
    const maxIterations = 10;

    for (let i = 0; i < maxIterations; i++) {
      const response = await this.callLLM({ apiKey, baseUrl, model }, messages);

      const assistantMessage = response.choices[0]?.message;
      if (!assistantMessage) break;

      messages.push(assistantMessage);

      // If there are tool calls, execute them
      if (assistantMessage.tool_calls?.length) {
        for (const toolCall of assistantMessage.tool_calls) {
          const fn = toolCall.function;

          // Parse arguments once, defensively
          let parsedArgs: any;
          try {
            parsedArgs = JSON.parse(fn.arguments);
          } catch {
            const parseError = {
              error: `Failed to parse tool arguments: ${fn.arguments}`,
            };
            yield {
              type: 'tool_result',
              toolName: fn.name,
              toolResult: parseError,
              toolCallId: toolCall.id,
            };
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(parseError),
            });
            continue;
          }

          yield {
            type: 'tool_call',
            toolName: fn.name,
            toolArgs: parsedArgs,
            toolCallId: toolCall.id,
          };

          let result: any;
          try {
            result = await this.toolExecutor.execute(
              fn.name,
              parsedArgs,
              params.userId,
            );
          } catch (err) {
            result = {
              error: err instanceof Error ? err.message : String(err),
            };
          }

          collectedToolCalls.push({
            name: fn.name,
            args: parsedArgs,
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

  /**
   * Call the LLM with tool definitions.
   * Reuses the OpenAI client instance when apiKey + baseUrl haven't changed.
   */
  private async callLLM(
    config: { apiKey: string; baseUrl?: string; model: string },
    messages: any[],
  ): Promise<any> {
    const clientKey = `${config.apiKey}:${config.baseUrl || ''}`;
    if (!this.llmClient || this.llmClientKey !== clientKey) {
      const { default: OpenAI } = await import('openai');
      this.llmClient = new OpenAI({
        apiKey: config.apiKey,
        ...(config.baseUrl && { baseURL: config.baseUrl }),
      });
      this.llmClientKey = clientKey;
    }

    return this.llmClient.chat.completions.create({
      model: config.model,
      messages,
      tools: TOOL_DEFINITIONS,
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
}
