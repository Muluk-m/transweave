## Context

项目高级设置页面有四个功能开关，但状态仅存在于前端 React state，不持久化到后端。具体现状：

- **自动翻译**: 纯占位符，AiService 存在但无自动触发逻辑
- **版本控制**: `token_history` 表和自动记录逻辑已存在（TokenService.create/update 中），但开关无效（始终记录），且无回滚功能
- **启用评论**: 纯占位符，token 只有单个 comment 字段
- **公开项目**: 纯占位符，所有端点需 AuthGuard

## Goals / Non-Goals

**Goals:**
- 移除无价值的占位开关（评论、公开项目），简化 UI
- 自动翻译开关保留但禁用，标记 "Coming Soon"
- 版本控制功能补全：项目级开关持久化 + 控制历史记录 + 版本回滚

**Non-Goals:**
- 实现自动翻译功能（留给未来）
- 实现审校流程（替代评论的方案，留给未来）
- 公开项目访问（已决定移除）

## Decisions

### 1. projects 表新增 enableVersioning 字段

使用 `boolean` 类型，默认 `true`（与现有行为一致 — 历史始终记录）。

**替代方案**: 用 jsonb `settings` 字段存所有高级设置 → 否决，当前只有一个设置，jsonb 过度设计。未来需要时再迁移。

### 2. 回滚 API 设计

`POST /api/token/:tokenId/restore/:historyId`

回滚逻辑：读取 historyId 对应的 translations，**全量覆盖**（非 merge）到 token。回滚本身也产生一条新的 history 记录（形成完整审计链）。

**替代方案**: `PATCH /api/token/history/:historyId/restore` → 否决，REST 语义上操作的主体是 token 而非 history。

### 3. 前端开关持久化方式

高级设置保存复用现有 `handleSaveSettings` → `updateProject()` 调用，在 payload 中加入 `enableVersioning` 字段。前端初始化时从 `project.enableVersioning` 读取。

### 4. 版本控制关闭时的行为

关闭后 TokenService.create/update 跳过 `tokenHistoryRepository.create()` 调用。已有的历史记录保留不删除（用户可能临时关闭再开启）。

### 5. 数据库迁移策略

新增字段使用 `default(true)`，Drizzle auto-migration 在启动时自动执行。现有项目无需手动迁移。

## Risks / Trade-offs

- **[回滚覆盖风险]** 回滚是全量覆盖 translations，可能丢失某些语言的最新翻译 → 前端回滚按钮需二次确认对话框
- **[历史膨胀]** 版本控制始终默认开启，长期积累大量 history 记录 → 可接受，未来可加清理策略
- **[字段演进]** 后续可能需要更多项目级设置 → 单字段够用，需要时再加
