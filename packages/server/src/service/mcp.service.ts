import { Injectable, Logger } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ProjectService } from './project.service';
import { z } from 'zod';

type ListProjectsParams = Record<string, any>;
type ListProjectTokensParams = Record<string, any>;
type GetTokenDetailsParams = Record<string, any>;
type CreateTokenParams = Record<string, any>;

@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);
  private readonly server: McpServer;

  constructor(private readonly projectService: ProjectService) {
    // 初始化 MCP Server
    this.server = new McpServer({
      name: 'qlj-i18n-mcp-server',
      version: '1.0.0',
    });

    // 注册工具
    this.registerTools();
  }

  getServer(): McpServer {
    return this.server;
  }

  private registerTools() {
    // Schema 定义
    const listProjectsSchema: z.ZodTypeAny = z.object({});

    const listProjectTokensSchema: z.ZodTypeAny = z.object({
      projectId: z.string().describe('项目 ID'),
    });

    const getTokenDetailsSchema: z.ZodTypeAny = z.object({
      tokenId: z.string().describe('词条 ID'),
    });

    const createTokenSchema: z.ZodTypeAny = z.object({
      projectId: z.string().describe('项目 ID'),
      key: z.string().describe('词条 key'),
      translations: z.record(z.string()).describe('翻译内容,格式为 { "语言代码": "翻译文本" }'),
      module: z.string().optional().describe('模块代码'),
      tags: z.array(z.string()).optional().describe('标签数组'),
      comment: z.string().optional().describe('备注'),
      screenshots: z.array(z.string()).optional().describe('上下文截图 URL 数组'),
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

    // 注册 list_projects 工具
    registerTool(
      'list_projects',
      {
        title: '列出项目',
        description: '列出所有 i18n 项目',
        inputSchema: listProjectsSchema,
      },
      async (_params: ListProjectsParams) => {
        const projects = await this.listProjects();
        return {
          content: [{ type: 'text', text: JSON.stringify(projects, null, 2) }],
        };
      },
    );

    // 注册 list_project_tokens 工具
    registerTool(
      'list_project_tokens',
      {
        title: '列出词条',
        description: '查询指定项目的词条列表',
        inputSchema: listProjectTokensSchema,
      },
      async (params: ListProjectTokensParams) => {
        const tokens = await this.listProjectTokens(params.projectId);
        return {
          content: [{ type: 'text', text: JSON.stringify(tokens, null, 2) }],
        };
      },
    );

    // 注册 get_token_details 工具
    registerTool(
      'get_token_details',
      {
        title: '词条详情',
        description: '获取词条详细信息',
        inputSchema: getTokenDetailsSchema,
      },
      async (params: GetTokenDetailsParams) => {
        const token = await this.getTokenDetails(params.tokenId);
        return {
          content: [{ type: 'text', text: JSON.stringify(token, null, 2) }],
        };
      },
    );

    // 注册 create_token 工具
    registerTool(
      'create_token',
      {
        title: '创建词条',
        description: '创建新的翻译词条',
        inputSchema: createTokenSchema,
      },
      async (params: CreateTokenParams) => {
        const token = await this.createToken(
          params.projectId,
          params.key,
          params.translations,
          params.module,
          params.tags,
          params.comment,
          params.screenshots,
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(token, null, 2) }],
        };
      },
    );
  }

  // 列出所有项目
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
      this.logger.error('查询项目列表失败:', error.message);
      throw new Error(`查询项目列表失败: ${error.message}`);
    }
  }

  // 查询项目词条列表
  private async listProjectTokens(projectId: string) {
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
  private async getTokenDetails(tokenId: string) {
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
  private async createToken(
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
}
