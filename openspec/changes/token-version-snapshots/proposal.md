## Why

`developer-platform-moat` design.md D2 决策已定：Branch Phase 1 复用 `token-history` 表实现只读 snapshot（不复制 token 数据）。本子 change 落地 Phase 1：建轻量 `token_snapshots` 元数据表 + read 路径。

竞争意义：与 Crowdin / Weblate 的 git-style branching 同位（先做只读，未来扩展可写）；release tagging 场景立刻可用。

## Non-goals

- 不做可写 branch（Phase 2）
- 不做双向同步与冲突解决 UI（Phase 3）
- 不做 Branch UI（snapshot 列表查看）— 见 TODOS.md

## What Changes

### 数据模型

- 新表 `token_snapshots`：
  ```
  id              uuid PK
  project_id      uuid FK projects(id) ON DELETE CASCADE
  name            text  (release tag, e.g. "v1.2.0")
  description     text  nullable
  base_history_at timestamp  (snapshot 锚点)
  created_by      uuid FK users(id) ON DELETE SET NULL
  created_at      timestamp
  ```
- `token-history` 表如缺业务字段（PoC 2.4 需先确认），加列；不新增 entries 表

### Service / API

- `SnapshotService.create({ projectId, name, description? }) → Snapshot`
- `SnapshotService.list(projectId) → Snapshot[]`
- `SnapshotService.readEntries(snapshotId) → Token[]`（join token_history + base_history_at 取最新行）
- `SnapshotService.delete(id)`
- `GET /api/projects/:id/snapshots`、`POST /api/projects/:id/snapshots`
- `GET /api/snapshots/:id/tokens` （只读）
- `DELETE /api/snapshots/:id`

### CLI

- `transweave snapshot create --project <id> --name <tag>` → 触发 create
- `transweave pull --snapshot <id>` → 拉指定 snapshot 译文

### MCP

- 新 tool `list_snapshots`、`read_snapshot`（受 mcp-tools-v2 是否同步上线影响——可独立）

## Capabilities

### New Capabilities

- `token-version-snapshots`: 只读 snapshot 元数据 + read 路径 + CLI/API/MCP 入口

## Impact

- **schema**：新 table + 可能 token-history 加列；新 migration
- **代码**：`service/snapshot.service.ts`、`controller/snapshot.controller.ts`、CLI 新命令、MCP tool（如启用）
- **测试**：read path EXPLAIN ANALYZE（PoC 2.4 验收 c）；100k token × 5 snapshot 性能基线
- **风险**：依赖 `token-history` 写入及时；如 import 路径不写 history，snapshot 会拿不到那批数据 — PoC 2.4 验收 d 检查
