# Change: 添加 i18n MCP Server 用于词条管理

## Why
需要为 AI 助手提供 MCP (Model Context Protocol) 支持,使其能够通过标准化接口查询和管理 i18n 项目的词条(tokens)。这将使 AI 助手能够查询指定项目的翻译词条列表、创建新词条等操作。

## What Changes
- 在 server 包中新增 i18n MCP controller 和 service
- 使用官方 `@modelcontextprotocol/sdk` v1.x 实现 MCP 协议
- 使用 `SSEServerTransport` 实现 SSE (Server-Sent Events) 连接
- 使用 `zod` 进行参数验证
- 提供 MCP 工具:
  - `list_projects`: 列出所有项目
  - `list_project_tokens`: 查询指定项目的词条列表
  - `get_token_details`: 获取词条详细信息
  - `create_token`: 创建新词条
- 新增路由:
  - `GET /api/mcp/sse`: 建立 SSE 连接
  - `POST /api/mcp/messages`: 处理 MCP 请求
  - `GET /api/mcp`: 显示 MCP 服务信息页面

## Impact
- 新增功能: mcp-i18n capability
- 影响的文件:
  - 新增 `packages/server/src/controller/mcp.controller.ts`
  - 新增 `packages/server/src/service/mcp.service.ts`
  - 修改 `packages/server/src/app.module.ts` (注册新 controller)
  - 修改 `packages/server/package.json` (添加依赖)
- 新增依赖:
  - `@modelcontextprotocol/sdk` ^1.25.2
  - `zod` ^3.25 (从 ^3.24 升级)
- 注意: MCP 工具调用不需要 JWT 认证,但需要提供有效的 projectId
