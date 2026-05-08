## 1. 后端：Prompt 模板系统

- [ ] 1.1 新建 schema `db/schema/ai-prompt-templates.ts`：字段如 proposal.md 所列，外键到 `teams.id` 或 `projects.id`（互斥），加 `(scope, scopeId, kind, isDefault)` 复合索引
- [ ] 1.2 新建 migration（drizzle-kit generate）
- [ ] 1.3 新建 `repository/ai-prompt-template.repository.ts`：findByScope / findResolved（含三层 cascade 解析）/ create / update / delete / setDefault
- [ ] 1.4 新建 `service/ai-prompt-template.service.ts`：依赖 repository，提供 `resolve(projectId, kind)` 返回最终生效模板（project → team → builtin fallback）
- [ ] 1.5 新建 builtin 模板常量文件 `ai/prompts/builtin-templates.ts`，覆盖 `translate / translate_plural / translate_batch / tone_adjust` 4 个 kind
- [ ] 1.6 实现变量插值器 `ai/prompts/render.ts`：支持 `{{var}}`，未定义变量保留原文 + 警告日志
- [ ] 1.7 改造 `AIService.translate / batchTranslate`：调用 `resolve()` 拿模板 → render → 传给 provider
- [ ] 1.8 controller `ai-prompt.controller.ts` + DTOs，提供 CRUD `/api/ai/prompt-templates`
- [ ] 1.9 单测：cascade 解析、变量插值、未知变量行为、setDefault 互斥（每个 kind 同 scope 只能一个 default）

## 2. 后端：Tone 调优 API

- [ ] 2.1 在 `ai.controller.ts` 加 `POST /tokens/:id/ai-tone-adjust`
- [ ] 2.2 在 `AIService` 加 `adjustTone(tokenId, targetLang, tone, customInstruction?)`：拿当前译文作为 `sourceText`，target 不变，使用 `kind=tone_adjust` 模板，传 `toneStyle` 变量
- [ ] 2.3 同时返回 3 个候选（n=3 调用 provider 或并发 3 次）；返回类型 `{ candidates: Array<{ text, rationale? }> }`
- [ ] 2.4 e2e 测试：每个 tone 至少跑一次

## 3. 后端：上下文注入完善

- [ ] 3.1 修改 `AIService.batchTranslate`：在 batch 开始时按 `(targetLang, sourceText)` 批量查 TM，建立内存 map；每条 token 查询时 O(1) 命中
- [ ] 3.2 修改 prompt 渲染：`doNotTranslate=true` 的 glossary term 单独输出 "DO NOT TRANSLATE THESE TERMS — keep verbatim:" 段
- [ ] 3.3 修改 `glossaryService.filterMatchingTerms`：增加 `maxResults=10` 参数，按"匹配长度降序 + 频率次序"取前 N
- [ ] 3.4 修改翻译完成回写：把 `{ promptHash, glossaryHits: string[], tmHits: number, model }` 写入 `translationMeta`
- [ ] 3.5 单测：batch TM 注入正确性、doNotTranslate 段输出、命中限制

## 4. 前端：Tone 调优 UI

- [ ] 4.1 在 `TranslationFields.tsx` 中每条译文 input 旁加"✨ 调优"按钮
- [ ] 4.2 点击后弹 dropdown 6 项（Formal / Casual / Shorter / Rephrase / Polish / Custom...），Custom 弹小文本框
- [ ] 4.3 选定后调 `/tokens/:id/ai-tone-adjust`，loading 状态显示 spinner
- [ ] 4.4 候选 dialog：3 张卡片，点击 "采用" 替换原译文；"另存为新备选"暂不做（留 future）
- [ ] 4.5 失败 toast；成本提示文案"将消耗 3× AI 请求"放在调优按钮 tooltip

## 5. 前端：Prompt 模板管理 UI

- [ ] 5.1 在 ProjectSettingTab 增加 "AI Prompts" sub-section
- [ ] 5.2 列表展示 4 个 kind 当前生效模板（来自 cascade resolve）
- [ ] 5.3 点击编辑：drawer 表单（name + body monospace textarea + 变量提示），保存后该 kind 在该 project scope 生效
- [ ] 5.4 提供"恢复默认"按钮，清空 project 级覆盖回退到 team / builtin

## 6. 前端：AgentChat token 级渗透

- [ ] 6.1 `ProjectTokensTab/columns.tsx` actions 列加 Bot 图标按钮（icon-only，title "Ask Agent"）
- [ ] 6.2 创建 `jotai/agentChatContextAtom`：保存当前注入的 token 上下文 `{ tokenId, key, sourceText, translations, screenshots, module } | null`
- [ ] 6.3 点击行级按钮 → 设置 atom + 打开 AgentChat sheet
- [ ] 6.4 `AgentChat/index.tsx` 监听 atom，进入 token 模式时：对话开头注入系统消息（含 token JSON 上下文），输入框上方显示 3 个 chip 快捷指令
- [ ] 6.5 退出 sheet 或切换到不同 token 时清理 atom，避免上下文混淆
- [ ] 6.6 在 `TokenFormDrawer` 底部加同款入口

## 7. 验收

- [ ] 7.1 单测全过；e2e 覆盖 cascade resolve、tone adjust、batch TM 注入
- [ ] 7.2 OpenSpec validate `ai-translation-power-up --strict`
- [ ] 7.3 手动 dogfood：在 zh-CN/en-US 项目里建几条 token，跑 tone 调优、改 prompt 模板验证生效
- [ ] 7.4 文档更新：`docs/ai-prompts.md` 新增——讲解 kind / 变量 / cascade
