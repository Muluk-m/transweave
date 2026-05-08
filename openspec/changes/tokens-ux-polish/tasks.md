## 1. 前端：状态可视化与 Activity 暴露

- [ ] 1.1 在 `ProjectView/index.tsx` 的 `tabs` 数组加入 `activity` 项（图标 `Activity`），并加 `<TabsContent value="activity">` 渲染 `ProjectActivityTab`
- [ ] 1.2 创建 `ProjectTokensTab/TokenStatusBadge.tsx`：5 个状态对应不同颜色（按 DESIGN.md semantic 色板的 muted variant 作背景），含 tooltip 描述
- [ ] 1.3 在 `ProjectTokensTab/columns.tsx` 中按语言 cell 增加 `TokenStatusBadge`（状态来自 `translationStatus[lang]`）
- [ ] 1.4 删除 `packages/web/components/views/translateDrawer.tsx` 及对其的引用（grep 无引用即可直接删）
- [ ] 1.5 修订 `openspec/project.md`：把 "MongoDB + Mongoose 8.x" 改为 "PostgreSQL / PGlite + Drizzle ORM"，移除"副本集"段落

## 2. 前端：批量状态切换

- [ ] 2.1 在 `useTokensManager.ts` 增加 `handleBatchSetStatus(ids, lang, status)` 方法，调用现有 `apiClient.put('/tokens/:id', ...)` 批量请求；如需新接口，在 `TokenController` 加 `PATCH /tokens/batch-status`
- [ ] 2.2 在 `TokenTable` 已选行 toolbar 中增加"批量状态"下拉菜单（"标记为 reviewed / approved / rejected / 重置为 draft"）
- [ ] 2.3 批量状态变更需触发批量进度条（沿用 `isBatchTranslating` 同款 UI 模式）

## 3. 前端：预设 filter chips（stale 标记降级 TODO，待 schema 加 per-language updatedAt 后再做）

- [ ] 3.1 ~~stale 标记~~ → TODOS.md（依赖 `translationMeta` 加 `updatedAt`/`source-lang touched_at`，schema 改动较大）
- [ ] 3.2 ~~stale 角标 UI~~ → 同 3.1
- [ ] 3.3 在 `useTokenFilters.ts` 与 server search 增加 `presets` 数组支持："low-confidence"（< 70）。其他 preset（missing-in-lang / ai-translated-draft）作为 follow-up TODO
- [ ] 3.4 在 `TokenToolbar.tsx` 加 chips 区域，可启用多个预设过滤器，与现有搜索/状态/模块/标签筛选叠加

## 4. 前端：键盘快捷键（精简版，行级导航降级 TODO）

- [ ] 4.1 创建 `useTokenKeyboardShortcuts.ts` hook，处理 `/` (聚焦搜索) 与 `?` (cheatsheet) 全局快捷键
- [ ] 4.2 ~~行级焦点 state + J/K/E/A/R~~ → TODOS.md（依赖 TokenTable 焦点 state 重构 + 行级快捷操作 API；本 PR 仅做轻量快捷键）
- [ ] 4.3 表格右下角"?"按钮 + cheatsheet 弹层
- [ ] 4.4 编辑模式（drawer 打开 / textarea 聚焦）禁用快捷键

## 5. 后端：Webhook 事件接线

- [ ] 5.1 创建 `service/token-event-emitter.ts`：依赖注入 `WebhookService` + `ActivityLogService`，对外暴露 `emitTokenEvent(event, payload)`
- [ ] 5.2 在 `TokenService.create / update / delete / setTranslationStatus` 中调用 emitter，传入对应事件类型
- [ ] 5.3 在 `TokenService.batchTranslate` / `importTokens` 中改为单次 `tokens.batch_completed` 事件，payload 含 `count` / `mode`（translate/import）
- [ ] 5.4 在 `WebhookService.deliver` 中增加 HMAC-SHA256 签名计算（用 `webhook.secret` 做 HMAC，header `X-Transweave-Signature: sha256=<hex>`）
- [ ] 5.5 deliver 失败时写入 `activity-logs`，type=`webhook_failed`，meta 包含 `webhookId` / `event` / `httpStatus` / `errorMessage`
- [ ] 5.6 补充 `webhook.service.spec.ts`：HMAC 签名测试、SSRF 防护测试（已有但确认覆盖）、失败日志测试
- [ ] 5.7 新增 `docs/webhook-events.md`：列出 5 个事件 + payload 示例 + 验签代码示例（Node/Python/Go）

## 6. 验收

- [ ] 6.1 `pnpm --filter @transweave/server test` 全部通过
- [ ] 6.2 `pnpm build:server && pnpm build:web` 无错误
- [ ] 6.3 手动验证：创建 webhook 指向 https://webhook.site，编辑/删除 token、批量翻译、改状态都触发对应事件
- [ ] 6.4 设计稿走查：所有新 UI 元素符合 DESIGN.md（status badge 颜色、border ring、无 drop shadow、键盘 hint 用 Geist Mono）
- [ ] 6.5 OpenSpec 校验：`openspec validate tokens-ux-polish --strict`
