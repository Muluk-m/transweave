## 1. Refactor MCP module shape

- [ ] 1.1 拆分 `mcp.service.ts` 为 `mcp/{token-tools,glossary-tools,tm-tools,lint-tools,insights-tools,activity-tools}.ts`，每个文件提供 `register(server, deps)` 函数
- [ ] 1.2 `mcp.service.ts` 改为只做 server 初始化 + 调用各 sub-module register

## 2. P0 工具

- [ ] 2.1 `lint_token` — 输入 `{ tokenId }`，调用 `translation-lint`，返回每语言 issues 列表
- [ ] 2.2 `lint_project` — 输入 `{ projectId, sampleSize? }`，遍历 token 跑 lint，返回 `{ totalIssues, byRule, samples }`
- [ ] 2.3 `detect_unused_keys` — 输入 `{ projectId, codePathRoots: string[] }`；服务端通过 grep API（暂不做远程文件读取，输入由客户端提供命中信息）；先实现 server side 简化版：列出"30 天 + 0 次访问"的 token（依赖 activity log）
- [ ] 2.4 `suggest_key_name` — 输入 `{ remark, tag?, module? }`；复用 `AiService.generateTokenKey`

## 3. P1 工具

- [ ] 3.1 Glossary `create_glossary_entry` / `update_glossary_entry` / `delete_glossary_entry`
- [ ] 3.2 TM `query_tm` / `add_tm_entry` / `list_tm`
- [ ] 3.3 `set_translation_status`（单 token + 多语言）
- [ ] 3.4 `batch_translate`（异步任务，返回 task id；轮询完成）

## 4. P2 工具

- [ ] 4.1 `list_activity`（按 token / actor / event 筛选 + cursor）
- [ ] 4.2 `screenshot_attach`（multipart upload？或 base64 input）

## 5. 不变量校验

- [ ] 5.1 每个工具 input schema 单测：projectId 缺失返回 ValidationError
- [ ] 5.2 修改类工具 e2e 断言响应含 `before` 和 `after`
- [ ] 5.3 list 类工具 e2e 断言 cursor 支持

## 6. 文档与发布

- [ ] 6.1 `docs/mcp-tools.md` — 列工具 schema 示例
- [ ] 6.2 `/mcp/info` 端点自动渲染新工具
- [ ] 6.3 版本号 bump（package.json `mcp.version`）
