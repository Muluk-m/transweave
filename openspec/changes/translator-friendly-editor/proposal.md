## Why

Transweave 当前用户画像是"开发者 + 兼职翻译者"——**兼职翻译者不一定懂工程**。但目前编辑器假设了三件他们其实不懂的事：

1. **ICU 复数语法**：`{count, plural, one {You have one item} other {You have # items}}` 这种串，兼职翻译者面对时会打错符号、漏分支、改错变量名。Tolgee 的 Visual Editor 把每种 plural form 拆成独立输入框，是其差异化卖点。
2. **占位符与变量**：`{userName}` / `%s` / `{{count}}` / `<0>...</0>` 多种格式并存，复制译文时容易写错变量名、遗漏占位符、HTML 标签不闭合。Phrase 的实时 lint 是其杀手特性。
3. **术语跨语言不一致**：当前 glossary 已存在并能注入 AI prompt，但**没有"标记一个术语后自动在所有语言里建空条目"的能力**——翻译者建词条时只能记得给当前语言填，其他语言会缺。Weblate 的 cross-language sync 能解决这个。

补这三块，从"开发者搭台、翻译者填空但容易错"升级为"翻译者敢用、用得对，翻译质量在保存时就有最低保障"。

## Non-goals

- 不做完整 CAT 工具（句段对齐、机器学习排序等）
- 不做外接 LSP（人工翻译 marketplace）
- 不引入新的 i18n 运行时格式——仍以 ICU MessageFormat 为基准

## What Changes

### 前端：ICU 复数可视化编辑器

- **检测 + 拆分**：当某条译文（任意语言）写入或导入的 raw 字符串符合 ICU plural / select / selectordinal 模式时，编辑器自动切换为可视化模式
- **可视化形态**：每种 plural form（zero / one / two / few / many / other）一个独立 textarea；form 列表按 CLDR 规则自动按目标语言显示（zh-CN 只 other；en 是 one + other；ar 全 6 个）
- **`#` 占位预览**：textarea 实时预览 `#` 替换为 "1" / "2" / "5" 的渲染结果（小字提示）
- **嵌套支持**：plural 内部还有 placeholder（`{name}`）时正常保留；select 嵌套 plural 时也能拆
- **降级保留**：可视化无法解析的 ICU 表达式回退到原 raw textarea + 显眼 warning

### 后端 + 前端：占位符/语法 lint 引擎

- **服务端 lint service**：新模块 `lint/translation-lint.service.ts`，规则：
  - `placeholder-mismatch`：源文 vs 译文中占位符集合（按格式自适配检测）必须一致
  - `html-tag-mismatch`：源文有的 `<0>` 类标签译文必须保留且闭合
  - `length-overflow`：超过项目设定的 `maxLength`（来自 module / project 配置）时 warn
  - `icu-syntax-invalid`：ICU 表达式语法不合法（用 messageformat-parser 解析）
  - `unescaped-apostrophe`：ICU 中未转义的 `'`（messageformat 特殊字符）
- **接入时机**：`TokenService.update / create` 保存时跑 lint；保存仍然成功，但返回 `{ token, lintIssues: [{ severity, rule, message, language? }] }`
- **批量 lint API**：`POST /api/projects/:id/lint`，返回项目内所有 lint 问题，用于 dashboard
- **前端展示**：`TokenFormDrawer` 译文 input 下方实时 lint（debounce 500ms 调本地静态规则 + 保存时取后端权威结果）；问题列表在 `QaIssuesDisplay`（已有组件）扩展，新增 lint 类问题展示

### 后端 + 前端：Glossary 跨语言自动同步

- **新增 schema 字段**：`glossary` 表加 `autoSyncToAllLanguages` boolean，默认 `false`（保持向后兼容）
- **新建术语流程**：当用户在术语表新建一个 entry 且 `autoSyncToAllLanguages=true` 时，service 自动为该 project / team 配置的所有语言建空字符串条目（`translations[lang] = ""`）
- **语言新增同步**：当一个 project / team 新增语言时，扫描所有 `autoSyncToAllLanguages=true` 的 entries 自动补该语言空条目
- **UI**：术语表"新建条目"对话框增加 checkbox "在所有语言里同步建空条目"
- **AI prompt 强化**：未填的目标语言 entry 在注入 prompt 时显示为 "MISSING — please decide a translation consistent with similar terms"，提示 AI 注意一致性

### 杂项

- **现有自家 i18n 文件 ICU smoke test**：在新加的可视化编辑器对 `packages/web/i18n/zh-CN.json + en-US.json` 跑通解析（目前 0 处 ICU——证明降级路径不会破坏现状）

## Capabilities

### New Capabilities

- `web-icu-editor`: 可视化 ICU plural / select 编辑器、CLDR plural form 列表、`#` 预览、降级保留
- `server-translation-lint`: 多规则 lint 引擎、API、保存时执行
- `glossary-cross-language-sync`: 跨语言自动建条目、新语言时回填、AI prompt MISSING 提示

### Modified Capabilities

- `glossary`: 增加 `autoSyncToAllLanguages` 字段及配套行为

## Impact

- **后端代码**：新模块 `lint/`、`service/glossary.service.ts`（增 sync 逻辑）、`service/token.service.ts`（保存时调 lint）、新 migration（glossary 加字段）
- **前端代码**：`TranslationFields.tsx`（最大改造点 — 检测 ICU + 切换可视化）、新 `IcuPluralEditor.tsx`、`QaIssuesDisplay.tsx`（扩展 lint 类）、`ProjectGlossaryTab/index.tsx`（checkbox + 同步逻辑触发）
- **数据库**：glossary 加字段（无破坏性）；非破坏性 migration
- **API 契约**：`/api/tokens` PUT/POST 响应新增 `lintIssues` 字段（向后兼容）；`/api/projects/:id/lint` 新增
- **依赖变更**：新增 `@messageformat/parser` 或 `messageformat` 用于 ICU 解析（已是行业标准库）；新增 `@formatjs/icu-messageformat-parser` 二选一，倾向 `@messageformat/parser`（轻量）
- **i18n 资源**：术语表 UI 新增文案（zh-CN + en-US 两份）
- **测试**：lint 规则单测、ICU 解析降级测试、跨语言同步 e2e
