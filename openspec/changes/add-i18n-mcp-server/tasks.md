# Implementation Tasks

## 1. 创建 i18n MCP Service
- [x] 1.1 创建 `mcp.service.ts` 调用现有的 ProjectService
- [x] 1.2 实现词条列表查询功能 (`listProjectTokens`)
- [x] 1.3 实现词条详情获取功能 (`getTokenDetails`)
- [x] 1.4 实现词条创建功能 (`createToken`)
- [x] 1.5 实现项目列表查询功能 (`listProjects`)
- [x] 1.6 实现 JSON-RPC 请求处理逻辑 (`handleMCPRequest`)
- [x] 1.7 实现 SSE 会话管理

## 2. 创建 i18n MCP Controller
- [x] 2.1 创建 `mcp.controller.ts`
- [x] 2.2 实现 SSE 连接端点 (`GET /mcp/sse`)
- [x] 2.3 实现 MCP 消息处理端点 (`POST /mcp/messages`)
- [x] 2.4 实现 HTTP POST 端点 (`POST /mcp`)
- [x] 2.5 实现服务信息页面端点 (`GET /mcp`)

## 3. 集成到应用
- [x] 3.1 在 `app.module.ts` 中注册 McpController 和 McpService
- [x] 3.2 测试 SSE 连接
- [x] 3.3 测试 MCP 工具调用
- [x] 3.4 验证 CORS 配置
