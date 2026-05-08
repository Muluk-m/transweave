## Why

Transweave 的数据层与 UI 层存在显著错位——大量后端能力（5 级翻译状态、活动日志、Webhook 事件、翻译元数据 confidence/source、token 历史）已经建好但前端没有兑现到用户体感。同时存在若干明显小坑：占位组件 `translateDrawer.tsx` 是 shadcn 默认代码、`ProjectActivityTab` 写完了但没挂载到 ProjectView、Webhook 表 + service 都齐了但全代码库没有一处真正触发事件、`openspec/project.md` 还写着 MongoDB（实际已是 Drizzle/PostgreSQL）。

把这些"已完成 80% 但缺最后一公里"的能力补上，可以在不改架构的前提下立刻提升产品体感，并为后续 ai-translation-power-up / translator-friendly-editor / developer-platform-moat 三个 proposal 打底。

## What Changes

### 前端：兑现已有能力到 UI

- **挂载 Activity tab**：在 `ProjectView` 的 tabs 列表加入 `ProjectActivityTab`，紧跟 `setting` 之前
- **状态可视化**：`TokenTable` 行级展示 5 级状态 badge（draft/translated/reviewed/approved/rejected），按状态着色（沿用 DESIGN.md 的 semantic 色板）
- **状态批量切换**：表格 toolbar 在已选行场景下增加"标记为 reviewed / approved / rejected"批量操作；与现有 `BatchTranslate` / `BatchSetModule` / `BatchSetTags` 操作风格一致
- **Stale（陈旧）标记**：源语言译文更新后，其他语言译文的 `translationMeta.updatedAt` 早于源语言时显示 stale 角标。表格列加 stale 列、toolbar 加 stale 快速筛选
- **预设 filter chips**：toolbar 增加预设过滤器："missing in lang"（按目标语言筛缺失）、"stale"、"low confidence"（< 70）、"AI translated"（source=ai 且 status=draft），点击即应用
- **键盘快捷键**：J/K 行间导航、E 编辑当前行、A approve、R reject、/ 聚焦搜索、G 跳转模块；表格右下角"?"显示快捷键弹层
- **删除死代码**：移除 `packages/web/components/views/translateDrawer.tsx`（占位代码，已被 `TokenFormDrawer` 替代）

### 后端：接线 Webhook 事件触发

- **接线事件触发**：在 `TokenService` 的 `create / update / delete` 和 `setTranslationStatus` 路径中调用 `webhookService.deliver(projectId, event, payload)`
- **批量场景去抖**：批量操作（importTokens、batchTranslate）触发单个 `tokens.batch_completed` 事件代替逐条事件
- **统一事件 payload**：所有 token 类事件 payload 包含 `event`、`projectId`、`tokenId`、`key`、`module`、`changedFields`、`actorId`、`occurredAt`，并使用 HMAC-SHA256 签名头 `X-Transweave-Signature`
- **失败重试与日志**：deliver 失败记入 `activity-logs`（type=`webhook_failed`），暂不实现自动重试（留 proposal 4 中 platform-moat 处理）

### 杂项

- **修订 `openspec/project.md`**：技术栈段从 MongoDB+Mongoose 更新为 Drizzle ORM + PostgreSQL/PGlite，对齐实际代码

## Capabilities

### New Capabilities

- `web-tokens-ui`: TokenTable 状态可视化、stale 标记、预设 filter chips、批量状态切换、键盘快捷键
- `server-webhook-events`: Token 生命周期事件触发、HMAC 签名、失败日志

### Modified Capabilities

- `web-component-splitting`：清理 `translateDrawer.tsx` 死代码（属于 architecture-optimization 已经声明的 web 组件清理范围的延伸）

## Impact

- **前端代码**：`components/views/projectView/index.tsx`、`components/views/projectView/ProjectTokensTab/{TokenTable,TokenToolbar,columns,index}.tsx` + 新增 `useTokenKeyboardShortcuts.ts` 和 `TokenStatusBadge.tsx`
- **后端代码**：`service/token.service.ts`、`service/webhook.service.ts`（小调整）、可能新增 `service/token-event-emitter.ts`（解耦事件触发）
- **数据库**：无 schema 变更
- **API 契约**：Webhook payload 格式新增（外部约定，需在 `docs/webhook-events.md` 文档化）
- **依赖变更**：无
- **测试**：webhook 接线需补 service spec；前端键盘快捷键 hook 加单测
- **风格**：新 UI 元素需符合 DESIGN.md（status badge 用 semantic 色板的 8-10% 不透明度作背景）
