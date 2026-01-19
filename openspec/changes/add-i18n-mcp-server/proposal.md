# Change: 添加 i18n MCP Server 用于词条管理

## Why
需要为 AI 助手提供 MCP (Model Context Protocol) 支持,使其能够通过标准化接口查询和管理 i18n 项目的词条(tokens)。这将使 AI 助手能够查询指定项目的翻译词条列表、创建新词条等操作。

## What Changes
- 在 server 包中新增 i18n MCP controller 和 service
- 实现 SSE (Server-Sent Events) 连接支持
- 实现 JSON-RPC 2.0 协议处理
- 提供 MCP 工具:
  - `list_project_tokens`: 查询指定项目的词条列表
  - `get_token_details`: 获取词条详细信息
  - `create_token`: 创建新词条
  - `list_projects`: 列出所有项目
- 新增路由:
  - `GET /mcp/sse`: 建立 SSE 连接
  - `POST /mcp/messages`: 处理 MCP 请求
  - `POST /mcp`: HTTP POST 模式处理请求
  - `GET /mcp`: 显示 MCP 服务信息页面

## Impact
- 新增功能: mcp-i18n capability
- 影响的文件:
  - 新增 `packages/server/src/controller/mcp.controller.ts`
  - 新增 `packages/server/src/service/mcp.service.ts`
  - 修改 `packages/server/src/app.module.ts` (注册新 controller)
- 外部依赖: 无新增依赖,使用现有的 NestJS
- 注意: MCP 工具调用不需要 JWT 认证,但需要提供有效的 projectId
