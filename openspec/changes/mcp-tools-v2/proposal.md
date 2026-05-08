## Why

`developer-platform-moat` design.md 已收敛 MCP 扩展计划。当前 11 个工具仅覆盖核心 CRUD + Translate + Search + QA，与 Tolgee 同位竞争窗口期内需要把工具集从 11 → ~25 加深，覆盖 Glossary CUD、TM ops、Activity、Insights（detect_unused_keys / suggest_key_name）、Lint。

不变量见 `developer-platform-design` capability：
- 现有 11 个工具语义稳定，不能改名、不能去掉字段
- 每个修改类工具必须返回 diff（before/after）
- list 类工具必须支持 pagination cursor
- 每个 input schema 必须含 projectId 防止跨项目误操作

## What Changes

### 新增工具（按优先级）

P0（最具用户价值）：
- `lint_token`（依赖 `translator-friendly-editor` 的 lint engine）
- `lint_project`（项目级 lint 汇总）
- `detect_unused_keys`（基于 token 列表 + grep `t('...')` 静态扫描）
- `suggest_key_name`（输入文案 → 推荐符合命名规范的 key）

P1（完整 CUD 闭环）：
- `create_glossary_entry` / `update_glossary_entry` / `delete_glossary_entry`
- `query_tm` / `add_tm_entry` / `list_tm`
- `set_translation_status`（单 token 修改 status）
- `batch_translate`（启动批量翻译并返回 task id）

P2（observability）：
- `list_activity`（按 token / actor / event 筛选）
- `screenshot_attach`（attach 图片到 token）

### MCP 文档更新

- `/mcp/info` 自动包含新工具列表（已是 dynamic 渲染）
- 新增 `docs/mcp-tools.md` 列每个工具的输入输出 schema、示例

## Capabilities

### New Capabilities

- `mcp-tools-v2`: 新增 ~12 个工具的注册、入参 projectId 校验、修改类返回 diff、list 类支持 cursor

### Modified Capabilities

无（不变量在父 change `developer-platform-moat/specs/developer-platform-design/spec.md` 中已锁定）

## Impact

- **代码**：`packages/server/src/service/mcp.service.ts` 新增 tool 注册段；可能拆分为多个 module（`mcp/glossary-tools.ts` / `mcp/lint-tools.ts` 等）保持文件 ≤ 600 行
- **测试**：每个工具加 e2e（`@modelcontextprotocol/sdk` client 直连）
- **文档**：新增 `docs/mcp-tools.md`
- **风险**：tool 数量大涨可能让小型 client 系统 prompt 偏长 — 父 change D4 决策已明确"35 个上限再 review"，本 change 留余量
