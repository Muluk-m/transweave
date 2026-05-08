## Why

Transweave 的 AI 能力已经具备深度（6 个 provider、单条/批量翻译、glossary + TM 已注入 prompt、AgentChat 项目级 sheet），但相对竞品仍有三个明显短板：

1. **Prompt 工艺空白**：AI 翻译用的是固定 prompt，用户无法调整语气（Formal / Casual / Shorter / Rephrase）、按 project 定制风格、或加入领域知识。POEditor 把这一层做成了"Custom AI Prompts + 调优按钮"，是其核心卖点。
2. **AgentChat 边界过粗**：当前 AgentChat 只在项目级浮窗，无法对单个 token 行做"右键问 AI"——开发者真正想要的"针对这条文案，给我三个 alternative + 解释为何这样译"的工作流缺失。
3. **Glossary/TM 注入存在漏洞**：单条翻译时 glossary + TM 都注入；但 `batchTranslate` 只注入了 glossary，没注入 TM。同时 glossary 的 `doNotTranslate` 标记没显式让 AI 强制保持原文（仅作为提示），不可靠。

补上这三块，AI 体验从"多 provider 的中规中矩"升级为"prompt 工艺扎实 + 上下文最深 + 针对性强"，立刻和 Tolgee/Lokalise 拉开 AI 体验差距。

## What Changes

### 后端：Custom AI Prompt 模板系统

- **新表 `ai_prompt_templates`**：`id, scope (team|project), scopeId, kind, name, body, variables jsonb, isDefault, createdBy, createdAt, updatedAt`。`kind` 取值 `translate` / `translate_plural` / `translate_batch` / `tone_adjust`
- **三层覆盖优先级**：project 级 > team 级 > 内置默认
- **变量插值**：模板 body 支持 `{{sourceText}} {{sourceLang}} {{targetLang}} {{glossaryTerms}} {{tmMatches}} {{toneStyle}} {{customInstructions}}`
- **CRUD API**：`/api/ai/prompt-templates`（create/list/update/delete/setDefault）
- **AI service 改造**：翻译时按优先级解析模板，渲染后传给 provider

### 后端：AI Tone 调优一键操作

- **新接口 `POST /api/tokens/:id/ai-tone-adjust`**：参数 `{ targetLang, tone: "formal"|"casual"|"shorter"|"rephrase"|"polish"|"custom", customInstruction? }`
- **实现**：用 `kind=tone_adjust` 模板 + 现有译文作为 `sourceText`，目标语言不变；返回 3 个候选译文供用户选择
- **前端**：`TokenFormDrawer` 中每条已有译文旁加"✨ 调优"按钮，下拉菜单 6 个选项

### 后端：上下文注入完善

- **批量翻译补 TM 注入**：`AIService.batchTranslate` 在 pre-resolve 阶段也查询 TM（按目标语言批量预热缓存，避免 N+1）
- **强制 doNotTranslate**：glossary 中标记 `doNotTranslate=true` 的 term，在 prompt 里以独立段落（不是普通 hint）声明 "MUST keep these terms verbatim in the output"
- **glossary 命中筛选**：当前命中阈值是"包含即注入"，改为"按命中频率 + 长度排序，最多 10 条注入 prompt"，避免 prompt 膨胀
- **prompt 元数据落库**：每次翻译完后，把渲染后的 prompt（脱敏）+ 命中的 glossary terms + TM matches 存入 `translationMeta`，方便用户调试和审计

### 前端：AgentChat token 级渗透

- **TokenTable 行级"问 AI"**：每行在 actions 列加 Bot 图标按钮，点击后打开 AgentChat sheet（已有），并自动注入系统消息：`"上下文：当前正在查看 token \`<key>\` 模块=<module>，源语言=zh-CN：'<sourceText>'，已有翻译：{...}，截图：[urls]"`
- **AgentChat 输入快捷指令**：当 token 上下文已注入时，输入框上方显示三个 chip："给我 3 个译文备选"、"为什么这样翻？"、"做一下 lint 检查"——点击直接发送对应 prompt
- **TokenFormDrawer 内嵌**：drawer 里增加 "Ask Agent about this token" 入口，复用同一逻辑

## Capabilities

### New Capabilities

- `ai-prompt-templates`: 三层覆盖的 prompt 模板系统、变量插值、内置 kind 集合
- `ai-tone-adjust`: 单条翻译的 tone 调优 API + 候选生成
- `agent-chat-token-context`: AgentChat 接入 token 级上下文，从行级入口启动会话

### Modified Capabilities

- `ai-context-injection`: 覆盖批量场景 TM 注入、doNotTranslate 强制段、命中筛选 cap、prompt 元数据落库（promptHash / glossaryHits / tmHits / model / templateId）

## Impact

- **后端代码**：`ai/ai.service.ts`、`controller/ai.controller.ts`（或新增 `ai-prompt.controller.ts`）、新增 `repository/ai-prompt-template.repository.ts`、`service/ai-prompt-template.service.ts`、`db/schema/ai-prompt-templates.ts`、新 migration
- **前端代码**：`api/ai.ts`、`components/views/projectView/ProjectTokensTab/TokenFormDrawer.tsx`、`TranslationFields.tsx`、`AgentChat/index.tsx`、`columns.tsx`（行级按钮）
- **数据库**：新表 `ai_prompt_templates` + 索引；`translationMeta` 字段类型扩展（jsonb 不需要 schema 变更，文档化即可）
- **API 契约**：新增 4-5 个端点；现有 `/api/ai/translate` 行为变化（返回 prompt metadata）但保持向后兼容
- **依赖变更**：无
- **AI 成本**：tone-adjust 每次产生 3 个候选 = 3× 请求；建议在 UI 提示用户
- **测试**：新 service 单测、prompt 模板渲染测试、e2e 覆盖优先级
