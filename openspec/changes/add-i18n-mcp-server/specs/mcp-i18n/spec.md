# i18n MCP Server Capability

## ADDED Requirements

### Requirement: MCP 协议支持
系统 SHALL 支持 Model Context Protocol (MCP) 2024-11-05 版本,通过 JSON-RPC 2.0 协议提供工具调用接口。

#### Scenario: 初始化连接
- **WHEN** 客户端发送 `initialize` 方法请求
- **THEN** 返回协议版本、服务器信息和能力声明

#### Scenario: 列出可用工具
- **WHEN** 客户端发送 `tools/list` 方法请求
- **THEN** 返回所有可用的 MCP 工具列表及其参数定义

### Requirement: SSE 传输支持
系统 SHALL 支持通过 Server-Sent Events (SSE) 建立持久连接,用于实时消息推送。

#### Scenario: 建立 SSE 连接
- **WHEN** 客户端请求 `GET /mcp/sse`
- **THEN** 返回 SSE 流,并发送初始 endpoint 事件和唯一的 session ID

#### Scenario: 会话心跳
- **WHEN** SSE 连接建立后
- **THEN** 每 15 秒发送心跳消息保持连接活跃

#### Scenario: 会话过期清理
- **WHEN** SSE 会话超过 5 分钟无活动
- **THEN** 自动关闭连接并清理会话

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

### Requirement: 错误处理
系统 SHALL 对所有 MCP 请求提供标准化的错误处理。

#### Scenario: JSON-RPC 版本验证
- **WHEN** 请求的 jsonrpc 版本不是 "2.0"
- **THEN** 返回错误码 -32600 和相应错误信息

#### Scenario: 未知方法处理
- **WHEN** 调用未知的 RPC 方法或工具
- **THEN** 返回错误码 -32601 和相应错误信息

#### Scenario: 参数验证失败
- **WHEN** 工具调用的参数不符合 schema 定义
- **THEN** 返回错误码 -32602 和详细的验证错误信息

#### Scenario: 内部错误
- **WHEN** 处理请求时发生未预期的错误
- **THEN** 返回错误码 -32603 和错误描述

### Requirement: CORS 支持
系统 SHALL 支持跨域请求,允许来自任何源的 MCP 客户端连接。

#### Scenario: OPTIONS 预检请求
- **WHEN** 收到 OPTIONS 预检请求
- **THEN** 返回适当的 CORS 头,允许 GET、POST 方法和必要的请求头

#### Scenario: 跨域响应头
- **WHEN** 处理 MCP 请求
- **THEN** 在响应中包含 `access-control-allow-origin: *`
