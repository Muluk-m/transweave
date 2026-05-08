## Why

Transweave 已经站在一个独特位置：**开源 + 自托管 + MCP + 多 AI provider** 的组合，目前正面对手只有 Tolgee。但要把"独特位置"转化为"护城河"，需要做齐四件事：

1. **SDK 注入式 in-context editing**（C1）：开发模式下 ALT+click 任意文案 → 弹窗编辑 + 自动截图。Tolgee 的招牌，**自托管开源里只有它一家有**。
2. **MCP 工具集深化**（C2）：Tolgee 2025 才推 MCP，目前仅基础工具。我们已有 11 个 tool，还有清晰的扩展空间（Glossary CUD、TM ops、unused keys、suggest_key_name、screenshot ops、activity）。**窗口期还没关闭**。
3. **Git-style 分支与版本快照**（C3）：Crowdin + Weblate 的差异化点。schema 级别决定，越早做越便宜。
4. **CDN 实时分发 + TS 类型生成**（C4）：Locize 的卖点级特性，对企业用户特别有吸引力。

**这是一个大改造**——四个能力都要触及数据层、API、SDK、CLI、Web 三处，预估 6-12 周量级。直接拆细 tasks 风险高（设计还没收敛就锁实现），所以这个 proposal 重 `design.md` 探索可行路径，spec 仅写关键不变量；具体实施待 design 收敛后拆为 4 个子 change。

## Non-goals

- 不在本 change 中完成全部四件事——本 change 的产物是**设计落定 + 数据模型方向 + 拆分计划**
- 不引入 Figma 插件（按体检结论排除）
- 不做完整 CAT 工具

## What Changes

本 change 是一个**设计驱动的 umbrella change**，主要产物是 `design.md`。它将探索：

- **SDK 形态**：React/Vue/Svelte 三框架的 hook/composable 方案、ALT+click 监听机制、html2canvas 截图边界、生产环境安全模式
- **MCP 扩展计划**：列出新增 tool 清单（含 input/output schema 草案）、权限边界、与 REST API 的语义对齐
- **Branch 数据模型**：在 tokens / translations 表上加 `branchId`？还是单独 `token_versions` 快照表？两种方案的 read/write 路径权衡
- **CDN 分发架构**：自托管下用 nginx 静态 + ETag？还是接 R2/S3？版本一致性边界（如何避免读到 mix）
- **TS 类型生成**：CLI 子命令 `transweave types` 的设计、动态 key 处理、watch 模式、tsconfig path 映射

本 proposal 的 spec 只锁定**全平台不变量**：

- 数据模型变更必须保持向后兼容（旧 API 返回的 token 仍可被旧 CLI 使用）
- SDK 必须严格 dev-mode 隔离，生产模式编译期可剔除
- MCP 工具新增不破坏现有工具语义

## Capabilities

### New Capabilities

- `developer-platform-design`: 本 change 唯一新增 capability——设计探索的不变量（向后兼容、dev-mode 隔离、MCP 语义稳定）。具体功能 capability 在子 change 中各自添加：
  - `sdk-in-context-editing`（子 change）
  - `mcp-tools-v2`（子 change）
  - `token-version-snapshots`（子 change）
  - `cdn-distribution-and-types`（子 change）

## Impact

- **本 change 实际改动**：仅 `design.md` 与新建 `developer-platform-design` capability 的 spec
- **后续子 change**：会触及 SDK 新包（packages/sdk）、CLI 新命令、server schema/API、web in-context overlay、MCP service
- **依赖变更（子 change 中预期）**：`html2canvas`、`canvas`、`@modelcontextprotocol/sdk`（已存在）、`changesets`（SDK 发布管线，D3）、可能新增 ETag/CDN 相关
- **风险**：分支模型若设计错，重做成本巨大——本 change 把这条放最前

## Failure Modes（plan-eng-review）

| 子 change | 失败模式 | 测试覆盖? | 错误处理? | 用户可见? |
|---|---|---|---|---|
| sdk-in-context-editing | 宿主应用因 SDK 加载失败而崩 | spec 有 scenario | spec 不变量"SDK never owns i18n read path"锁住 | ✅ console warn |
| sdk-in-context-editing | html2canvas 在 cross-origin image 上炸 | PoC 2.2 验收 (b) | 需在子 change 实现：fallback to纯背景 | ✅ console warn |
| token-version-snapshots | snapshot read path 在 token-history join 上慢查询 | PoC 2.4 验收 (c) | 必须有索引；EXPLAIN ANALYZE 锁定 ≤ 200ms | 慢响应 |
| mcp-tools-v2 | 新 tool 调用导致跨项目误操作 | spec 不变量 + 子 change unit 测试 | 每个 tool input schema 限定 projectId | 静默失败可能 |
| cdn-distribution-and-types | CDN 读到 published bundle 不存在 | 子 change 单测 | 404 回退到 server endpoint | ✅ HTTP 404 |
| cdn-distribution-and-types | SSE 连接断开后客户端不更新 | 子 change e2e | reconnect + ETag 验证 | 静默 staleness |

**critical gaps**：MCP 跨项目误操作 = 静默失败 + 数据破坏。子 change 必须强制每个 tool input schema 含 projectId 校验，否则失败模式无法被用户察觉。

## Worktree Parallelization Strategy

本 change 自身无并行（仅文档 + spec），但拆分后的 4 个子 change 有并行机会：

| Step | Modules touched | Depends on |
|------|-----------------|------------|
| `mcp-tools-v2` | `service/mcp.service.ts`、`service/{glossary,translation-memory,activity}.service.ts`、CLI mcp config | — |
| `token-version-snapshots` | `db/schema/`、新 service、`controller/` 部分、CLI 部分 | — |
| `sdk-in-context-editing` | `packages/sdk-*`（新）、`api_keys` schema 加 scopes、`auth/` 守卫装饰器 | — |
| `cdn-distribution-and-types` | server endpoint + cache 层、CLI types 子命令 | (建议) `token-version-snapshots` 落地以便 publish 与 main merge 衔接 |

**Lane 规划**：

- **Lane A**: `mcp-tools-v2`（独立、易先做）
- **Lane B**: `sdk-in-context-editing`（独立 packages/sdk + 小改 api_keys schema）
- **Lane C**: `token-version-snapshots` → `cdn-distribution-and-types`（顺序，C 依赖 B 的 publish 概念）

A、B 并行；C 系列与 A/B 并行（C 的 schema 改动主要在 token-history 加列与新 snapshots 表，与 A/B 无冲突）。

**冲突点**：`api_keys` schema 在 `sdk-in-context-editing` 子 change 中加 `scopes` 列；如果其他子 change 也碰它，需协调先后。目前看其他子 change 不需要碰 api_keys。
