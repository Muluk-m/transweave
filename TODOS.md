# TODOS

## Open（来源：translator-friendly-editor 实施降级 2026-05-08）

### ICU 复数可视化编辑器
**What**：proposal 3 spec `web-icu-editor` — 检测 ICU 表达式自动切换可视化模式，每种 plural form 一个独立 textarea，支持 `#` 占位预览，CLDR plural rules 表，嵌套与降级。
**Why**：兼职翻译者面对原始 ICU 串容易出错；可视化是 Tolgee 招牌特性。
**Pros**：明确的差异化功能；非工程翻译者敢用。
**Cons**：依赖 `@messageformat/parser`（新 npm 包）；UI 边界 case 多；CLDR 表维护。
**Context**：项目自家 i18n 文件目前 0 处 ICU，可作为干净起点。
**Depends on**：—

### Lint 规则补全（ICU syntax + unescaped-apostrophe）
**What**：proposal 3 spec 列了 5 条规则，本 PR 落了 3 条（placeholder/HTML tag/length-overflow）。剩下 2 条 ICU 类规则需要 messageformat parser。
**Why**：ICU 错误是兼职翻译者常见炸点。
**Cons**：依赖 `@messageformat/parser`；与 ICU 编辑器一起做更经济。
**Depends on**：先引入 `@messageformat/parser`。

### Glossary 跨语言同步 UI（Web）
**What**：在 ProjectGlossaryTab 的"新建/编辑词条"对话框加 `autoSyncToAllLanguages` checkbox（已默认关闭）；列表展示已 sync 到全部语言的标记。
**Why**：用户必须能从 UI 启用这个特性。
**Context**：Server 已落地（schema + service.create/update/backfillForLanguage），addLanguage 路径已自动调用 backfill。
**Depends on**：—

### Project 级 lint 仪表盘
**What**：proposal 3 spec `server-translation-lint` 还要求 `POST /api/projects/:id/lint` 项目级汇总接口，本 PR 仅提供单条 lint。
**Why**：project-health 看板需要数字摘要。
**Depends on**：—

## Open（来源：ai-translation-power-up 实施降级 2026-05-08）

### Prompt 模板管理 UI
**What**：proposal 2 spec 中的 5.x — 在 ProjectSettingTab 加 "AI Prompts" sub-section，让用户编辑 4 种 kind 的 cascade 覆盖，支持新建/恢复默认。
**Why**：当前 prompt 模板系统已经全部建好（API + cascade resolve + builtin），但用户只能用 curl 调 API 改。UI 让 prompt 工艺变成产品功能。
**Pros**：不需要懂技术也能改 prompt；可视化展示 cascade 结果；支持变量提示。
**Cons**：UI 细节多（kind 切换、cascade source 标识、变量 cheatsheet、长文本编辑器）。
**Context**：API 已 ready：`/api/ai/prompt-templates` GET/POST/PUT/DELETE + `/builtins` + `/resolve`。
**Depends on**：—

### AgentChat quick-prompt chips
**What**：proposal 2 spec 中 6.x 的 chips 区域 — 当 AgentChat 处于 token 上下文模式时，显示三个一键 chip（"建议 3 个译文备选"、"为什么这样翻？"、"做一下 lint 检查"）。
**Why**：缩短从打开 sheet 到拿到答案的步数。
**Pros**：用户不需要键入；引导用户正确询问 AI。
**Cons**：chip 文案要本地化；点击后需要 auto-send。
**Context**：本次 PR 已落地 token context 自动注入，仅缺 chips。
**Depends on**：—

### AgentChat 切换 token confirm dialog
**What**：proposal 2 spec 6.x 中 — 切换不同 token 时弹"结束当前会话并切换？"确认。
**Why**：避免用户跨 token 时丢失对话。
**Pros**：避免误操作。
**Cons**：少数情况频繁打断。
**Context**：当前 PR 直接覆盖（lastNonceRef 比对）。
**Depends on**：—

## Open（来源：tokens-ux-polish 实施降级 2026-05-08）

### Per-language stale tracking
**What**：translationMeta 加按语言的 `updatedAt` 字段（或单独 `language_touched_at` 列），让 stale 判定可靠。
**Why**：proposal 1 spec 写了 stale 标记，但当前 schema 没法区分某语言译文 vs 其他字段更新——只能一刀切用 token.updatedAt，会误报。
**Pros**：解锁 stale 角标 + "stale" preset chip；让译者知道哪些译文与源文脱钩。
**Cons**：所有 update 路径要写 timestamp；TM update 也要写；schema 加列。
**Context**：tokens-ux-polish 已留下 stale chip 的 server preset 接口位（注释里），UI 端 `AVAILABLE_PRESETS` 数组解开注释加 `{ id: "stale", label: "陈旧" }` 即可。
**Depends on**：schema 加 per-language updatedAt + 写入路径覆盖 + 服务端 preset SQL 实现。

### Token table 行级焦点 + J/K/E/A/R 快捷键
**What**：proposal 1 原计划做的行级 J/K 导航 / E 编辑 / A approve / R reject。
**Why**：键盘流大幅提升审校效率。开发者画像下尤其有用。
**Pros**：批量审校效率翻倍；与 Linear / Lokalise Review Center 体验对标。
**Cons**：要在 TokenTable 引入行焦点 state、视觉高亮、行级 status mutation API；E 与现有 edit 抽屉打通；A/R 需要选默认作用语言（"全部" 或"当前默认 lang"？）。
**Context**：本次 PR 已落地 `useTokenKeyboardShortcuts` hook 框架（仅 `/` 和 `?`），扩展点已留好。
**Depends on**：TokenTable 焦点 state 重构。

### Webhook 失败写 activity_logs
**What**：proposal 1 spec 要求 deliver 失败时写 `activity_logs` (type=`webhook_failed`)，本次 PR 仅保留 logger.warn。
**Why**：自托管运维要看得到 webhook 失败历史，否则订阅方静默丢消息。
**Pros**：可观测性；和现有 ProjectActivityTab 天然集成。
**Cons**：要往 ActivityType enum 加 WEBHOOK_FAILED；注入 ActivityLogService 到 WebhookService。
**Depends on**：—

### batch translate / import 接 tokens.batch_completed
**What**：当前 `tokens.batch_completed` 已在 `bulkUpdate{Status,Tags,Module}` + `bulkDelete` 接线。AI batchTranslate 与 import flow 还没接。
**Why**：proposal 1 spec 列了这两个 batch 场景。
**Cons**：要碰 ai.service / project-export.service。
**Depends on**：—

## Open（来源：plan-eng-review developer-platform-moat 2026-05-08）

### CDN bundle splitting（大项目优化）
**What**：CDN 分发的 per-project bundle 在大项目（10 万 key+）下可能 MB 级，按 module / namespace 拆 chunk 让首屏只加载相关模块。
**Why**：影响 SDK 在大项目的实际启动时间；首屏拉一个 MB 级 JSON bundle 与现代 web 性能预期相悖。
**Pros**：首屏更快；可按需加载；与 i18n key splitting 业内做法一致。
**Cons**：bundle versioning 复杂化（每个 chunk 独立 ETag？还是 manifest+chunk？）；客户端缓存逻辑变复杂。
**Context**：D6 决策已锁 publish-driven CDN；本 TODO 是 D6 的扩展，针对大项目场景。等 SDK 发布后第一批用户反馈再激活。
**Depends on**：`cdn-distribution-and-types` 子 change 已落地，且至少一个大项目用户接入。

### Vanilla JS SDK
**What**：除了 React/Vue/Svelte 三个框架适配，加一个无框架（vanilla JS）SDK，可用于纯 HTML / Web Components / 任意 i18n 库自实现项目。
**Why**：开源生态有非主流框架用户；vanilla JS 是最低公分母。
**Pros**：覆盖更广；SDK Layer 1（核心 ALT+click + html2canvas + API client）已经是 framework-agnostic，包装成 vanilla 边际成本低。
**Cons**：维护一个新包；adapter API 需要更工程化（不能依赖框架的 hook 生命周期）；test surface 增大。
**Context**：D5 决策时已用 SDK 适配方案 A；vanilla 适配相当于额外加一层"找 DOM 元素 + 监听 ALT+click"。等三个主流框架适配落地后再启动。
**Depends on**：`sdk-in-context-editing` 子 change Phase 1 完成（React/Vue/Svelte 都跑通）。

### Branch UI Phase 1（snapshot 列表 / 选择查看）
**What**：Branch Phase 1 当前规划是 CLI/API only。是否需要在 Web 加一个 "Snapshots" 面板：列出所有 snapshot、查看某个 snapshot 时的全量 token、对比 main vs snapshot diff？
**Why**：发布工作流（QA → release tag）的可视化体验决定 release manager 是否会用。
**Pros**：让 snapshot 概念在 UI 显形；release tagging 体验闭环。
**Cons**：可能引诱人在 Phase 1 阶段过度依赖 UI，等 Phase 2 引入可写 branch 时 UI 还要重做。
**Context**：D2 决策保留 Phase 1 复用 token-history。Phase 2 上 UI 时机更对。
**Depends on**：`token-version-snapshots` 子 change Phase 2（可写 branch）。

### TS 类型生成深化 ICU placeholder 推断
**What**：`transweave types` 在生成 `Messages` interface 时，解析每条译文的 ICU 占位符，生成形如 `t('hello.user', { name: string; count: number })` 的 typed signature。
**Why**：开发者爱：调用 t() 时编译期检查参数；漏参 / 错参直接 type error。
**Pros**：与 `react-i18next` v14+ / `@intlify/unplugin-vue-i18n` 业内方向一致；下游 IDE 自动补全。
**Cons**：依赖 `translator-friendly-editor` 中的 ICU parser；复数 / select 的类型推断需 messageformat AST 转 TypeScript types；维护成本较高。
**Context**：基础类型生成（key→string）应在 `cdn-distribution-and-types` 子 change Phase 1 完成。本 TODO 是 Phase 2 增强。
**Depends on**：(1) `cdn-distribution-and-types` Phase 1 已 ship；(2) `translator-friendly-editor` 已 ship 提供 ICU parser。

## Completed

### ~~自动翻译流水线~~ ✅
CLI `transweave translate` 命令 + GitHub Action 模板。

### ~~快捷键系统~~ ✅
Cmd+Enter 保存、Cmd+Shift+T AI 翻译。

### ~~Agent 对话历史持久化~~ ✅
agent_sessions + agent_messages 表，Session CRUD API。

### ~~创建 DESIGN.md~~ ✅
Vercel 风格设计系统：Satoshi + Geist + Geist Mono，teal 主色，纯黑暗色模式。
