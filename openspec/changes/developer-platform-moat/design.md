# Design — Developer Platform Moat

## Context

Transweave 当前已有：
- 11 个 MCP tool（CRUD + Translate + Search + QA + List Glossary）
- CLI（`pull` / `push` / `init` / `login`）
- 多 AI provider + glossary + TM 注入
- 5 级状态机
- Webhook（数据层完整、未接线 — 由 proposal 1 处理）
- Activity / TokenHistory / Screenshot / Token Comment

竞品差距分析（详见 `openspec/changes/tokens-ux-polish/proposal.md` 等同期文档）：

| 维度 | Tolgee | Crowdin | Weblate | Locize | Transweave 现状 |
|---|---|---|---|---|---|
| In-context SDK | ✅ ALT+click + 自动截图 | Web overlay + OCR | ✗ | 点击式 | ✗ |
| MCP 深度 | 基础（2025 新出） | ✗ | ✗ | ✗ | 11 tools |
| Git-style 分支 | 弱 | ✅ branch/clone/merge/protect | ✅ git-native | ✗ | ✗ |
| CDN + 类型生成 | 部分 | 部分 | ✗ | ✅ 卖点 | ✗ |

四个差距都是**正面对手 Tolgee 也未补齐的位置**——这构成了 Transweave 的窗口期。

## Goals

1. 把"开源 + 自托管"的优势从"功能对等"升级为"开发者集成最深"
2. 数据模型决定（分支）做对一次，避免后续重写
3. SDK / CDN / 类型生成给企业用户提供商业级体验
4. 本 change 不直接交付功能，而是**让后续四个子 change 设计就绪、可独立排期**

## Design Explorations

### 1. SDK in-context editing

#### 候选方案 A — 监听 i18n 库返回点

```
React: 监听 next-intl 的 useTranslations() 返回的字符串
       通过代理/包装 hook，在 dev mode 给所有渲染的字符串加 data-trans-key
       全局 ALT+click handler 匹配 data-trans-key → 调 SDK API
```

优点：精准，无需文本扫描。
缺点：需要为每个 i18n 库写适配（next-intl / react-i18next / vue-i18n / svelte-i18n）。

#### 候选方案 B — 文本节点扫描

```
SDK 在 dev mode 注入 MutationObserver
扫描所有 text node，hash 后查询服务端 "找含此文本的 token"
匹配则给最近 element 加可点击 overlay
```

优点：与 i18n 库解耦。
缺点：性能开销大；多义文本无法准确匹配（需后端帮忙做 fuzzy）；HMR 时反复扫描。

#### **倾向方案 A**

为 next-intl + react-i18next + vue-i18n + svelte-i18n 各做一个适配 hook/composable。
SDK 包结构：

```
@transweave/sdk-react
@transweave/sdk-vue
@transweave/sdk-svelte
@transweave/sdk-core (共享 ALT+click handler、html2canvas、API 客户端)
```

#### 安全 / 生产隔离

- SDK 必须导出 `<TransweaveProvider mode="dev|prod">` —— prod 模式下所有逻辑被 tree-shake（用 `if (process.env.NODE_ENV !== 'production')` 包裹核心代码）
- API token 必须是 dev-only token（带 `inContextEdit` scope），生产环境拿到也只能编辑，不能读其他项目
- CSP nonce 处理（用户自定 CSP 时，inject overlay 的 style 需要 nonce）

#### 截图实现

`html2canvas` 对当前 element + 父级路径截图（含 5px padding）→ 上传 `POST /api/projects/:id/screenshots`（已有接口）→ 自动关联到 token

#### 关键约束

- bundle size：`@transweave/sdk-react` 在 prod 模式应当 < 1KB（仅留 provider 空壳），dev 模式 < 30KB
- 不污染全局变量（除 dev mode 的一个 `__transweave_dev`）
- 与 SSR 兼容（Next.js App Router 友好）

---

### 2. MCP 工具集深化

#### 当前 11 个 tool 分类

```
Project: list_projects
Token: list_tokens, get_token, create_token, update_token, delete_token, search_tokens
AI: translate_text
QA: qa_check_token, qa_check_project
Glossary: list_glossary
```

#### 计划新增 tool（约 12-15 个）

```
Glossary: create_glossary_entry, update_glossary_entry, delete_glossary_entry
TM: query_tm, add_tm_entry, list_tm
Activity: list_activity (filterable by token / actor / event)
Insights: detect_unused_keys, suggest_key_name (input: text → 推荐 kebab/dot 命名)
Lint: lint_token, lint_project (依赖 proposal 3)
Snapshot: list_branches (依赖本 change C3 子 change)
Translation: batch_translate, set_translation_status
```

总数从 11 → ~25。

#### 设计原则

- **每个 tool 的 input schema 必须在 schema 中限定 projectId**（避免 AI 跨项目误操作）
- **修改类 tool 必须返回 diff**（before/after），便于 AI 自查
- **list 类 tool 必须支持分页 cursor**
- **MCP 文档 endpoint** `/mcp/info` 自动从 tool 注册表生成（已有，需扩展显示新增 tool）

---

### 3. Branch / Version snapshot

#### 候选方案 A — Branch 字段直接挂在 tokens 上

```sql
ALTER TABLE tokens ADD COLUMN branch_name TEXT NOT NULL DEFAULT 'main';
-- (project_id, branch_name, key) UNIQUE
```

优点：API/CLI/Web 改动最小（多带一个 branch 参数）。
缺点：每个分支的 token 都重复一份，10 万 token 的项目 × 5 分支 = 50 万行；merge 算法复杂。

#### 候选方案 B — 单独 token_versions 快照表

```sql
-- tokens 表保持唯一（永远是 main）
-- 新表
CREATE TABLE token_versions (
  id UUID PRIMARY KEY,
  project_id UUID,
  branch_name TEXT,
  base_version_id UUID NULL,  -- 父快照
  is_active BOOLEAN,           -- 当前 head
  created_at TIMESTAMP,
  ...
);
CREATE TABLE token_version_entries (
  version_id UUID,
  token_key TEXT,
  translations JSONB,
  status JSONB,
  ...
);
```

优点：分支稀疏（只存 diff），merge 可走 patch；更接近 git 模型。
缺点：read 路径变复杂（main + active branch overlay）；需重写 import/export。

#### 候选方案 C — 渐进式：只读 snapshot 先行

```
Phase 1: 只支持创建只读 snapshot（按时间点冻结所有 token），用于 release tagging
Phase 2: 支持从 snapshot 创建可写 branch，单向同步回 main（CLI: transweave merge --branch=...）
Phase 3: 完整双向同步、冲突解决 UI
```

#### **决策（D2 / 2026-05-08）：方案 C phased，Phase 1 复用 token-history**

Phase 1：新增轻量 `token_snapshots` 表 `(id, project_id, name, base_history_at, created_by, created_at)`——**不复制 token 数据**。read 路径通过 join `token_history`，按 `base_history_at` 取每条 token 在该时间点的最新 row。

```sql
-- read 一个 snapshot 的所有 token：
SELECT DISTINCT ON (h.token_id) h.*
FROM token_history h
JOIN token_snapshots s ON s.id = $1
WHERE h.project_id = s.project_id
  AND h.changed_at <= s.base_history_at
ORDER BY h.token_id, h.changed_at DESC;
```

Phase 2 引入 `branches` 表 + `token_branch_entries` overrides；read 路径 = snapshot 基线 + branch overrides 合并。
Phase 3 实现完整双向同步与冲突解决 UI。

**前提**：PoC 2.4 必须先确认 `token-history` schema 包含 token 全部业务字段（key, module, translations, translationStatus, translationMeta, tags, comment, screenshots）；如有缺失，先在 token-history 上加列，**而不是**新建 snapshot 数据表。

#### 关键约束

- 旧 API（无 branch 参数）必须等价于"在 main 分支"
- CLI 旧版本 push/pull 不传 branch 时仍然工作
- import/export 需要支持指定 branch

---

### 4. CDN 分发 + TypeScript 类型生成

#### CDN 分发设计

```
Server 维护一个 "published bundle" 缓存：
  GET /cdn/projects/:id/translations.json
  Cache-Control: public, max-age=60, stale-while-revalidate=300
  ETag: <hash of all translations>

SDK 客户端：
  - 启动时拉一次（带 ETag）
  - 通过 SSE 或 polling 在 ETag 变化时重新拉
  - 译文改动 → 服务端发布事件 → SSE 推送给所有连接的客户端
```

自托管场景的实现：
- 默认走 nginx 反向代理 + ETag（足够）
- 大型部署可指向 R2/S3，server 在发布时上传

#### TypeScript 类型生成

```bash
$ transweave types --out src/i18n/types.ts
# Output:
export interface Messages {
  "user.profile.title": string;
  "user.profile.email": string;
  "common.save": string;
  // 1234 keys
}
```

集成方式：
- CLI 子命令 `transweave types`（一次性生成）
- watch 模式：`transweave types --watch`（监听 server 变化，本地 file 自动更新）
- 配合 `next-intl` / `react-i18next` 的 augmentation 模式自动接入

动态 key 的处理：
- 检测包含 `{var}` 的 key（如 `errors.{code}`）→ 标记为 `Record<string, string>` 类型
- 基础类型生成不处理；高级模式可读取代码中 `t('key')` 调用做交叉验证

---

## SDK Distribution（D3 / 2026-05-08）

SDK 4 个 npm 包必须有完整发布管线，作为 `sdk-in-context-editing` 子 change 的一个独立 capability：`sdk-distribution-pipeline`。

- **版本号**：semver。`@transweave/sdk-core` 与三个适配包独立版本（peerDependencies 锁住 core）
- **CI/CD**：GitHub Actions + [Changesets](https://github.com/changesets/changesets)。PR 中带 `.changeset/*.md` 描述本次变更；merge 到 main 后 Changesets bot 自动开 release PR；release PR merge 触发 npm publish + GitHub Release
- **Changelog**：Changesets 自动生成 `CHANGELOG.md`，按 patch/minor/major 归档
- **Breaking change**：major bump + RFC 流程（开 issue 标 `breaking-rfc`，14 天评论期）
- **CI 矩阵**：build × {Node 18 / 20 / 22} × {macOS / Ubuntu}。三个适配包对应宿主框架版本矩阵：sdk-react × {React 18 / 19}、sdk-vue × {Vue 3.3+}、sdk-svelte × {Svelte 4 / 5}

## Auth Scope（D5 / 2026-05-08）

dev-mode SDK token 不另立新表。在现有 `api_keys` 表加 `scopes JSONB NOT NULL DEFAULT '["admin"]'` 列。

- 旧 token 默认 `["admin"]`，行为不变
- SDK 颁发的 token 为 `["inContextEdit"]`，**仅能调用** `screenshots`、`tokens.write`（指定 token id）、`tokens.read`（按 token key 命名）三个 endpoint
- 守卫装饰器 `@RequireScope('inContextEdit')` 在 `JwtAuthGuard` 之后执行；缺失 scope 返回 403
- `api-keys.controller` 创建 endpoint 增加 `scopes` 参数，UI 上"创建 SDK token"按钮预填 `["inContextEdit"]`

## CDN Consistency（D6 / 2026-05-08）

bundle 仅在显式 publish 动作生成新版本。

- `POST /api/projects/:id/publish` → 收集 main 当前所有译文 → 生成 JSON bundle → 计算 SHA-256 作 ETag → 写入 `published_bundles` 表（保留最近 50 版供回滚）
- `GET /cdn/projects/:id/translations.json` 走 ETag + `Cache-Control: public, max-age=60, stale-while-revalidate=300`
- SSE `/cdn/projects/:id/events` 推 `bundle_published` 事件给在线 SDK 客户端
- 译文编辑中（draft）只通过 `GET /api/...` server endpoint 可见，CDN 永远是 published 视图
- 与 Branch Phase 2 的衔接：merge to main + 自动 publish；branch 不上 CDN

## SDK Failure & Degradation（D7 / 2026-05-08）

不变量（已写入 `developer-platform-design` capability spec）：**SDK never owns the i18n read path**。

- prod 模式：SDK 0 运行时代码；i18n 仍由宿主 i18n 库（next-intl / react-i18next / vue-i18n / svelte-i18n）负责
- dev 模式：API 失败时 SDK 隐藏 overlay + 控制台 `warn`，**不**屏蔽宿主 i18n
- 宿主应用从未"接入了 SDK 后崩了"——这是入选 spec 不变量的硬约束

## MCP Tool Inventory（D4 / 2026-05-08）

不分组，平铺注册。25 tool 全量加入 system prompt。同期监控两件事，触发时再做 grouping：

1. 大客户端（Claude Desktop / Cursor）反馈 prompt 压力
2. tool 总数 > 35 时强制 review

## Open Questions

1. SDK 是否要支持 vanilla JS（无框架）？决策影响 sdk-core 的 API 形态
2. Branch 模型 Phase 1 是否需要 UI（snapshot 列表 / 选择查看），还是只 CLI/API
3. CDN bundle 是否做 i18n key splitting（大项目按模块拆 bundle）→ 进 TODOS
4. TS 类型生成：是否要解析 ICU 拿出 placeholder 类型推断（高阶但开发者爱）

## 拆分为子 change 的建议

设计收敛后，建议按以下顺序拆分（按依赖与价值）：

1. **`mcp-tools-v2`**（独立、易先做、立刻提升 AI agent 体验）
2. **`token-version-snapshots`**（schema 决策风险大，要早做）
3. **`sdk-in-context-editing`**（独立、用户感知最强、单独验收）
4. **`cdn-distribution-and-types`**（建议在 1-3 收敛后做）

## Decisions Made

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-08 | D2 — Branch Phase 1 复用 token-history（方案 C 强化版）| 数据不冷、不重复存储；snapshot 表只记元信息 + base_history_at 锚点 |
| 2026-05-08 | D3 — SDK 分发管线写入 design + 子 change | 入 `sdk-distribution-pipeline` capability，避免子 change 实施时再回头 |
| 2026-05-08 | D4 — MCP 25 tool 平铺注册 | 无证据表明会触发 client prompt 压力；同类产品（Tolgee/GitHub/Linear MCP）已验证可行；保留 35 tool 阈值再 review |
| 2026-05-08 | D5 — dev token 复用 api_keys + scopes 字段 | DRY；旧 token 默认 admin scope 行为不变；新增轻量守卫装饰器 |
| 2026-05-08 | D6 — CDN per-project bundle、publish-driven | 杜绝 half-translated mix；与 Branch Phase 2 自然衔接；冷热路径分离 |
| 2026-05-08 | D7 — SDK never owns i18n read path（spec 不变量）| 宿主应用永远不会因为 SDK 崩；prod 模式 0 运行时；dev 失败软降级 |

## Decisions Pending

| Date | Decision | Rationale |
|------|----------|-----------|
| (待) | SDK 适配方案 A vs B | 等三个 i18n 库适配 PoC 完成后定 |
| (待) | vanilla JS 是否支持 | 等 react/vue/svelte 适配落地后再评估 |
