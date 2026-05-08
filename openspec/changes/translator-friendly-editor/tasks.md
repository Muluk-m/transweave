## 1. 后端：translation-lint 模块

- [ ] 1.1 新建 `lint/translation-lint.module.ts` + `lint/translation-lint.service.ts`，对外暴露 `lint(sourceText, targetText, opts: { format?, maxLength?, language? }): LintIssue[]`
- [ ] 1.2 实现 `placeholder-mismatch` 规则：自适配 `{var}` / `%s` / `%d` / `{{var}}` / `<0>` 五种格式；提取后做 set 对比
- [ ] 1.3 实现 `html-tag-mismatch` 规则：源含 `<N>...</N>` 标签时，译文必须有同 N 且闭合
- [ ] 1.4 实现 `icu-syntax-invalid` 规则：用 `@messageformat/parser` 解析译文，捕获 SyntaxError
- [ ] 1.5 实现 `unescaped-apostrophe` 规则：识别译文里未在 `''` pair 中的单 `'`
- [ ] 1.6 实现 `length-overflow` 规则：超过 opts.maxLength 时 warn
- [ ] 1.7 在 `TokenService.update / create / batchUpdate` 中调用 lint（每个语言独立 lint），把结果加到响应
- [ ] 1.8 新建 `LintController` 暴露 `POST /api/projects/:id/lint`，遍历项目所有 token 跑 lint，返回汇总
- [ ] 1.9 单测：每条规则 happy path + 边缘 case；性能测试：1000 条 token 跑 lint 应 < 500ms

## 2. 后端：Glossary 跨语言同步

- [ ] 2.1 schema migration：`glossary` 加 `auto_sync_to_all_languages` boolean default false
- [ ] 2.2 修改 `GlossaryService.create`：当 `autoSyncToAllLanguages=true` 时，按 scope（project / team）查所有配置语言，给 `translations[lang] = ""` 补齐
- [ ] 2.3 修改 `ProjectService.update / addLanguage`：扫描该 project 的 `autoSyncToAllLanguages=true` entries（含继承的 team-level），为新增语言补空条目
- [ ] 2.4 修改 AI prompt 渲染：glossary 中目标语言为空字符串时，渲染为 `[MISSING — pick consistent with related terms]` 而不是被过滤掉
- [ ] 2.5 单测：跨语言同步、新增语言 backfill、project 级覆盖 team 级时的 sync 边界

## 3. 前端：ICU plural 可视化编辑器

- [ ] 3.1 新建 `IcuPluralEditor.tsx`：props `{ raw: string; onChange(raw: string): void; targetLanguage: string }`
- [ ] 3.2 解析：用 `@messageformat/parser` 将 raw 解析为 AST；若不是 plural / select，回调 `onParseFailed` 让上层降级
- [ ] 3.3 渲染：根据 AST 找到 plural 节点，遍历 cases；用 CLDR plural rules 表（基于目标语言 code）显示 form 列表
- [ ] 3.4 每个 form 一个 textarea；保留嵌套占位符 / select 不展开（高级用户可点 "Edit raw"）
- [ ] 3.5 `#` 占位实时预览：在 textarea 旁渲染当前值替换 `#` 为示例数字（form=one→"1"、form=other→"5"）
- [ ] 3.6 onChange：把改后的 cases 重新组装为 ICU 字符串
- [ ] 3.7 在 `TranslationFields.tsx` 中检测 raw 是否含 `{var, plural,...}` / `{var, select,...}`，自动启用 IcuPluralEditor，提供 "Edit raw" 切换
- [ ] 3.8 单测：解析常见 plural 形式、降级行为、嵌套 select+plural、所有 CLDR forms

## 4. 前端：lint 集成

- [ ] 4.1 在 `TranslationFields.tsx` 中每个语言 input 下方加 lint 提示区域（debounce 500ms 后调本地 lint，保存后用后端权威结果替换）
- [ ] 4.2 静态 lint 用一个轻量子集（placeholder-mismatch + html-tag-mismatch）跑在 client 端；其他规则只在 save 时由后端跑
- [ ] 4.3 lint 问题颜色：error 红、warning 黄、info 蓝（按 DESIGN.md 的 semantic muted 色）
- [ ] 4.4 在 `QaIssuesDisplay.tsx` 中扩展显示 lint issue（已是 QA 类问题展示组件）；新增 "show only lint" / "show only QA" 过滤

## 5. 前端：Glossary 同步 UI

- [ ] 5.1 `ProjectGlossaryTab/AddTermDialog.tsx`：新建条目对话框增加 checkbox "在所有语言里同步建空条目"，默认勾选（推荐行为）
- [ ] 5.2 已有条目编辑：增加 "在所有语言里同步" 按钮（一次性 backfill）
- [ ] 5.3 列表中已 sync 全部语言的 entry 显示绿色对号；缺语言的显示警告小角标 + tooltip 列出缺哪些

## 6. 验收

- [ ] 6.1 跑现有 i18n 资源（`packages/web/i18n/zh-CN.json + en-US.json`）通过新编辑器：可视化模式无误（实际无 ICU，应全走降级）；保存时 lint 全绿
- [ ] 6.2 e2e：建一条带 plural 的 token，从可视化模式编辑、保存、再次打开仍然正确解析
- [ ] 6.3 e2e：建术语 + 同步勾选 → 验证所有语言空条目；新增语言 → 验证 backfill
- [ ] 6.4 OpenSpec validate `translator-friendly-editor --strict`
- [ ] 6.5 文档：`docs/translation-lint-rules.md` + `docs/icu-plural-editor.md`
