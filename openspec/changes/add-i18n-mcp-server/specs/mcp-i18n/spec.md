# i18n MCP Server Capability

## ADDED Requirements

### Requirement: MCP 协议支持
系统 SHALL 使用官方 `@modelcontextprotocol/sdk` v1.x 实现 Model Context Protocol (MCP) 2024-11-05 版本,通过 JSON-RPC 2.0 协议提供工具调用接口。

#### Scenario: 初始化连接
- **WHEN** 客户端发送 `initialize` 方法请求
- **THEN** 返回协议版本、服务器信息和能力声明

#### Scenario: 列出可用工具
- **WHEN** 客户端发送 `tools/list` 方法请求
- **THEN** 返回所有可用的 MCP 工具列表及其参数定义

### Requirement: SSE 传输支持
系统 SHALL 使用官方 SDK 的 `SSEServerTransport` 支持通过 Server-Sent Events (SSE) 建立持久连接,用于实时消息推送。

#### Scenario: 建立 SSE 连接
- **WHEN** 客户端请求 `GET /api/mcp/sse`
- **THEN** 使用 `SSEServerTransport` 建立 SSE 流,并返回唯一的 session ID

#### Scenario: 消息处理
- **WHEN** 客户端通过 `POST /api/mcp/messages` 发送消息
- **THEN** 使用 `SSEServerTransport.handlePostMessage()` 处理请求并通过 SSE 返回响应

#### Scenario: 连接关闭
- **WHEN** 客户端断开 SSE 连接
- **THEN** 清理 transport 实例和会话资源

### Requirement: 项目列表查询
系统 SHALL 提供查询所有 i18n 项目的功能。

#### Scenario: 查询项目列表
- **WHEN** 调用 `list_projects` 工具
- **THEN** 返回所有项目列表,包含 id、name、description 和 languages

### Requirement: 词条列表查询
系统 SHALL 支持查询指定项目的所有词条。

#### Scenario: 成功查询词条列表
- **WHEN** 调用 `list_project_tokens` 工具并提供有效 projectId
- **THEN** 返回该项目的所有词条列表,包含 key、module、translations、tags、comment

#### Scenario: 项目不存在
- **WHEN** 提供的 projectId 不存在
- **THEN** 返回错误信息

### Requirement: 词条详情查询
系统 SHALL 支持查询单个词条的详细信息。

#### Scenario: 成功查询词条详情
- **WHEN** 调用 `get_token_details` 工具并提供有效 tokenId
- **THEN** 返回词条的完整信息,包括历史记录

#### Scenario: 词条不存在
- **WHEN** 提供的 tokenId 不存在
- **THEN** 返回错误信息

### Requirement: 词条创建
系统 SHALL 支持创建新的翻译词条。

#### Scenario: 成功创建词条
- **WHEN** 调用 `create_token` 工具并提供 projectId、key、translations 等必需参数
- **THEN** 创建词条并返回创建结果

#### Scenario: 词条 key 已存在
- **WHEN** 提供的 key 在项目中已存在
- **THEN** 返回参数验证失败错误

#### Scenario: 缺少必需参数
- **WHEN** 调用时缺少 projectId、key 或 translations
- **THEN** 返回参数验证失败错误

### Requirement: 参数验证
系统 SHALL 使用 `zod` 进行工具参数验证。

#### Scenario: 参数类型验证
- **WHEN** 工具调用的参数类型不符合 schema 定义
- **THEN** zod 抛出验证错误,SDK 自动返回标准 JSON-RPC 错误响应

#### Scenario: 必需参数缺失
- **WHEN** 调用时缺少必需参数
- **THEN** zod 抛出验证错误,SDK 自动返回错误信息

### Requirement: 错误处理
系统 SHALL 依赖官方 SDK 提供的标准化错误处理,自动处理 JSON-RPC 协议层面的错误。

#### Scenario: 协议错误
- **WHEN** 请求不符合 JSON-RPC 2.0 规范
- **THEN** SDK 自动返回相应的错误码和错误信息

#### Scenario: 工具执行错误
- **WHEN** 工具执行过程中抛出异常
- **THEN** SDK 捕获异常并返回标准错误响应

## MODIFIED Requirements

### Requirement: 依赖管理
系统 SHALL 添加以下依赖:
- `@modelcontextprotocol/sdk` ^1.25.2 - MCP 官方 TypeScript SDK
- `zod` ^3.25 - 参数验证库 (SDK 必需的 peer dependency)
