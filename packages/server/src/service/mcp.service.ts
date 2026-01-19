import { Injectable, Logger } from '@nestjs/common';
import { ProjectService } from './project.service';

// MCP 工具定义
export const MCP_TOOLS = [
  {
    name: 'list_projects',
    description: '列出所有 i18n 项目',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'list_project_tokens',
    description: '查询指定项目的词条列表',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: '项目 ID',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_token_details',
    description: '获取词条详细信息',
    inputSchema: {
      type: 'object',
      properties: {
        tokenId: {
          type: 'string',
          description: '词条 ID',
        },
      },
      required: ['tokenId'],
    },
  },
  {
    name: 'create_token',
    description: '创建新的翻译词条',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: '项目 ID',
        },
        key: {
          type: 'string',
          description: '词条 key',
        },
        translations: {
          type: 'object',
          description: '翻译内容,格式为 { "语言代码": "翻译文本" }',
        },
        module: {
          type: 'string',
          description: '模块代码(可选)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: '标签数组(可选)',
        },
        comment: {
          type: 'string',
          description: '备注(可选)',
        },
        screenshots: {
          type: 'array',
          items: { type: 'string' },
          description: '上下文截图 URL 数组(可选)',
        },
      },
      required: ['projectId', 'key', 'translations'],
    },
  },
];

// SSE 会话管理
export interface SSESession {
  id: string;
  controller: any;
  lastActivity: number;
}

@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);
  private readonly sseSessions = new Map<string, SSESession>();

  constructor(private readonly projectService: ProjectService) {
    // 定期清理过期会话
    setInterval(() => this.cleanupExpiredSessions(), 60000); // 每分钟清理一次
  }

  // 生成唯一的会话 ID
  generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  // 清理过期的 SSE 会话(超过 5 分钟无活动)
  private cleanupExpiredSessions() {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 分钟
    for (const [id, session] of this.sseSessions.entries()) {
      if (now - session.lastActivity > timeout) {
        try {
          this.sseSessions.delete(id);
          this.logger.debug(`Session ${id} expired and removed`);
        } catch (e) {
          this.logger.error(`Error cleaning up session ${id}:`, e);
        }
      }
    }
  }

  // 注册 SSE 会话
  registerSSESession(sessionId: string, controller: any) {
    const session: SSESession = {
      id: sessionId,
      controller,
      lastActivity: Date.now(),
    };
    this.sseSessions.set(sessionId, session);
    this.logger.debug(`Session ${sessionId} registered`);
  }

  // 获取 SSE 会话
  getSSESession(sessionId: string): SSESession | undefined {
    return this.sseSessions.get(sessionId);
  }

  // 删除 SSE 会话
  removeSSESession(sessionId: string) {
    this.sseSessions.delete(sessionId);
    this.logger.debug(`Session ${sessionId} removed`);
  }

  // 发送 SSE 消息
  sendSSEMessage(session: SSESession, data: any) {
    try {
      const message = `data: ${JSON.stringify(data)}\n\n`;
      session.controller.enqueue(message);
      session.lastActivity = Date.now();
    } catch (error) {
      this.logger.error('发送 SSE 消息失败:', error);
    }
  }

  // 列出所有项目
  async listProjects() {
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
      this.logger.error('查询项目列表失败:', error.message);
      throw new Error(`查询项目列表失败: ${error.message}`);
    }
  }

  // 查询项目词条列表
  async listProjectTokens(projectId: string) {
    try {
      const tokens = await this.projectService.getProjectTokens(projectId);
      return tokens.map((token: any) => ({
        id: token.id || token._id?.toString(),
        key: token.key,
        module: token.module,
        translations: token.translations,
        tags: token.tags,
        comment: token.comment,
        screenshots: token.screenshots,
      }));
    } catch (error: any) {
      this.logger.error('查询词条列表失败:', error.message);
      throw new Error(`查询词条列表失败: ${error.message}`);
    }
  }

  // 获取词条详情
  async getTokenDetails(tokenId: string) {
    try {
      const token = await this.projectService.getTokenById(tokenId);
      if (!token) {
        throw new Error('词条不存在');
      }
      return {
        id: token.id || token._id?.toString(),
        key: token.key,
        module: token.module,
        translations: token.translations,
        tags: token.tags,
        comment: token.comment,
        screenshots: token.screenshots,
        projectId: token.projectId?.toString(),
        history: token.history,
        createdAt: token.createdAt,
        updatedAt: token.updatedAt,
      };
    } catch (error: any) {
      this.logger.error('查询词条详情失败:', error.message);
      throw new Error(`查询词条详情失败: ${error.message}`);
    }
  }

  // 创建词条
  async createToken(
    projectId: string,
    key: string,
    translations: Record<string, string>,
    module?: string,
    tags?: string[],
    comment?: string,
    screenshots?: string[],
  ): Promise<any> {
    try {
      const token: any = await this.projectService.createToken({
        projectId,
        key,
        translations,
        module,
        tags,
        comment,
        screenshots,
        userId: '000000000000000000000000', // MCP 调用使用固定的系统用户 ID
      });

      if (!token) {
        throw new Error('创建词条返回空结果');
      }

      return {
        id: token.id || token._id?.toString(),
        key: token.key,
        module: token.module,
        translations: token.translations,
        tags: token.tags,
        comment: token.comment,
        screenshots: token.screenshots,
      };
    } catch (error: any) {
      this.logger.error('创建词条失败:', error.message);
      throw new Error(`创建词条失败: ${error.message}`);
    }
  }

  // 验证参数
  private validateParams(
    schema: any,
    params: any,
  ): { valid: boolean; error?: any } {
    const required = schema.required || [];
    const properties = schema.properties || {};

    // 检查必需参数
    for (const field of required) {
      if (params[field] === undefined || params[field] === null) {
        return {
          valid: false,
          error: {
            field,
            message: `缺少必需参数: ${field}`,
          },
        };
      }

      // 简单的类型检查
      const expectedType = properties[field]?.type;
      const actualType = typeof params[field];

      if (expectedType === 'object' && actualType !== 'object') {
        return {
          valid: false,
          error: {
            field,
            message: `参数 ${field} 类型错误,期望 object,实际 ${actualType}`,
          },
        };
      }

      if (
        expectedType === 'string' &&
        actualType !== 'string' &&
        actualType !== 'number'
      ) {
        return {
          valid: false,
          error: {
            field,
            message: `参数 ${field} 类型错误,期望 string,实际 ${actualType}`,
          },
        };
      }
    }

    return { valid: true };
  }

  // 处理 MCP JSON-RPC 请求
  async handleMCPRequest(request: any): Promise<any> {
    const { jsonrpc, id, method, params } = request;

    // 验证 JSON-RPC 版本
    if (jsonrpc !== '2.0') {
      return {
        jsonrpc: '2.0',
        id: id || null,
        error: {
          code: -32600,
          message: '无效的请求: JSON-RPC 版本必须是 2.0',
        },
      };
    }

    try {
      switch (method) {
        case 'initialize':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2024-11-05',
              serverInfo: {
                name: 'qlj-i18n-mcp-server',
                version: '1.0.0',
              },
              capabilities: {
                tools: {},
              },
            },
          };

        case 'tools/list':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              tools: MCP_TOOLS,
            },
          };

        case 'tools/call': {
          const { name, arguments: args } = params;

          switch (name) {
            case 'list_projects': {
              const result = await this.listProjects();
              return {
                jsonrpc: '2.0',
                id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify(result, null, 2),
                    },
                  ],
                },
              };
            }

            case 'list_project_tokens': {
              const tool = MCP_TOOLS.find((t) => t.name === name);
              const validation = this.validateParams(tool!.inputSchema, args);

              if (!validation.valid) {
                return {
                  jsonrpc: '2.0',
                  id,
                  error: {
                    code: -32602,
                    message: '参数验证失败',
                    data: validation.error,
                  },
                };
              }

              const result = await this.listProjectTokens(args.projectId);
              return {
                jsonrpc: '2.0',
                id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify(result, null, 2),
                    },
                  ],
                },
              };
            }

            case 'get_token_details': {
              const tool = MCP_TOOLS.find((t) => t.name === name);
              const validation = this.validateParams(tool!.inputSchema, args);

              if (!validation.valid) {
                return {
                  jsonrpc: '2.0',
                  id,
                  error: {
                    code: -32602,
                    message: '参数验证失败',
                    data: validation.error,
                  },
                };
              }

              const result = await this.getTokenDetails(args.tokenId);
              return {
                jsonrpc: '2.0',
                id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify(result, null, 2),
                    },
                  ],
                },
              };
            }

            case 'create_token': {
              const tool = MCP_TOOLS.find((t) => t.name === name);
              const validation = this.validateParams(tool!.inputSchema, args);

              if (!validation.valid) {
                return {
                  jsonrpc: '2.0',
                  id,
                  error: {
                    code: -32602,
                    message: '参数验证失败',
                    data: validation.error,
                  },
                };
              }

              const result = await this.createToken(
                args.projectId,
                args.key,
                args.translations,
                args.module,
                args.tags,
                args.comment,
                args.screenshots,
              );

              return {
                jsonrpc: '2.0',
                id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify(result, null, 2),
                    },
                  ],
                },
              };
            }

            default:
              return {
                jsonrpc: '2.0',
                id,
                error: {
                  code: -32601,
                  message: `未知工具: ${name}`,
                },
              };
          }
        }

        default:
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `未知方法: ${method}`,
            },
          };
      }
    } catch (error: any) {
      this.logger.error('MCP 请求处理错误:', error);
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: error.message || '内部错误',
        },
      };
    }
  }
}
