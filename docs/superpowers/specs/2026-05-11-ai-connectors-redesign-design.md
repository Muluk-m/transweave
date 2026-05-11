# AI Connectors 重设计

**日期：** 2026-05-11
**状态：** 待审 (Draft)
**作者：** Nain + Claude

## 1. 背景与动机

现有 AI 配置（`packages/server/src/ai/ai-config.service.ts`）把一组 `(provider, apiKey, model, baseUrl)` 直接以单条 JSON 形式挂在 `teams.aiConfig` 与 `projects.aiConfig` 上，存在以下问题：

1. **每个 team / project 只能配置一条** AI 凭证：用户无法同时挂多把 key，也无法跨 model 切换。
2. **「自定义模型」=「填一个 baseUrl」**：没有真正的 connector 概念，缺乏可见性、可命名性和管理界面。
3. **硬编码默认 model 已严重过期**（`gpt-4o-mini` / `claude-sonnet-4-20250514` / `gemini-2.0-flash` / `deepseek-chat`），2026-05 已不该再出现在 picker 或默认值里。
4. **运行时无法选择 model**：AgentChat 只看 `aiConfigured: boolean`，「在用哪个模型」对用户完全不可见。

参考主流 AI 聚合平台（OpenRouter / OneAPI / LiteLLM / OpenWebUI / Cursor），本次把单条 `aiConfig` 升级为**多 connector + 模型白名单 + 翻译时可切换**的形态，但**不引入定价 / 限流 / 多 key 池 / 失败降级** 等 gateway 级能力（保留演进路径，本次不做）。

## 2. 设计目标 & 非目标

### 目标
- 一个 team / project 下可以挂任意多个 AI connector。
- Connector = 1 把 key（`vendor + key + baseUrl?`），不绑定具体 model；通过 `enabledModels[]` 白名单决定该 connector 暴露哪些 model。
- 加 connector 时支持 `listModels` 自动拉远端列表勾选；不支持远端 list 的 provider 给静态推荐列表 + 手动追加兜底。
- Team 与 Project 双层：project 可加自己的 connector，可覆盖默认；project 缺省时回退到 team 默认。
- 翻译 / Agent 入口顶部显示当前 model chip，可临时切换或持久化为 project default。
- **始终用 2026-当前模型 ID** 做默认值与推荐列表；**已退役模型** 主动从 picker 过滤。

### 非目标（本次不做）
- 成本估算 / 定价展示。
- 多 key 池、失败降级链、限流、缓存。
- 用户级（per-member）connector。
- 抛弃厂商分类、转向 protocol+preset 抽象（保留厂商 enum）。
- CLI 层面对 connector 的直接管理（CLI 不变）。

## 3. 已确认决策

| # | 维度 | 决策 |
|---|---|---|
| 1 | 整体范围 | 多 connector + 模型聚合视图（无定价） |
| 2 | 层级 | team + project 双层，project 增量并可覆盖 default |
| 3 | 类型抽象 | 厂商分类（保留 `ProviderType` enum，`openai-compatible` 是通用项） |
| 4 | Connector ↔ Model | 1 connector = 1 把 key，`enabledModels[]` 白名单 |
| 5 | 白名单来源 | `listModels` 优先 + 手动追加兜底；过期模型过滤 |
| 6 | 设置页 UI | 左列表 + 右详情（主从面板） |
| 7 | 翻译入口 UI | 顶部 model chip selector，旁边按钮"Set as default" |
| 8 | 迁移 | 启动时自动迁移老 `aiConfig` → 1 条 "Default" connector |
| 9 | 权限 | `owner` / `manager` 可管 |
| 10 | Agent 能力过滤 | 按 `PROVIDER_CAPABILITIES[p].toolCalling` 控制可用范围 |

## 4. 数据模型

### 4.1 新表 `ai_connectors`

```ts
// packages/server/src/db/schema/ai-connectors.ts
export const aiConnectors = pgTable('ai_connectors', {
  id: uuid('id').defaultRandom().primaryKey(),

  scope: varchar('scope', { length: 10 }).notNull(),         // 'team' | 'project'
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),  // null when scope='team'

  displayName: varchar('display_name', { length: 80 }).notNull(),
  provider: varchar('provider', { length: 30 }).notNull(),   // ProviderType

  apiKey: text('api_key').notNull(),                          // AES-encrypted
  baseUrl: varchar('base_url', { length: 500 }),              // required for 'openai-compatible'

  enabledModels: jsonb('enabled_models').$type<EnabledModel[]>().notNull().default([]),

  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  teamIdx: index('ai_connectors_team_idx').on(t.teamId),
  projectIdx: index('ai_connectors_project_idx').on(t.projectId),
  scopeCheck: check(
    'ai_connectors_scope_consistent',
    sql`(scope = 'team' AND project_id IS NULL) OR (scope = 'project' AND project_id IS NOT NULL)`,
  ),
}));

export type EnabledModel = {
  modelId: string;
  label?: string;
  addedManually: boolean;
};
```

### 4.2 `teams` / `projects` 新增字段

```ts
defaultConnectorId: uuid('default_connector_id')
  .references(() => aiConnectors.id, { onDelete: 'set null' }),
defaultModel: varchar('default_model', { length: 100 }),
```

老的 `aiConfig` jsonb 列**保留一个版本**作为回滚兜底，下一个版本 drop。

### 4.3 解析顺序（翻译 / Agent 调用时）

```
1. 请求带 { connectorId, model } → 直接使用；校验 connector 属该 project（自身或所在 team）
2. project.defaultConnectorId + project.defaultModel
3. team.defaultConnectorId + team.defaultModel
4. 抛 AI_NOT_CONFIGURED
```

## 5. Provider 层

### 5.1 静态能力表

```ts
// packages/server/src/ai/providers/capabilities.ts
// 2026-05 当前主流模型 — 对照 /Users/qiqian/openclaw/docs/providers 维护
export const PROVIDER_CAPABILITIES: Record<ProviderType, {
  toolCalling: boolean;
  listModels: boolean;
  requiresBaseUrl: boolean;
  recommendedModels: string[];
  defaultModel: string;
}> = {
  openai: {
    toolCalling: true, listModels: true, requiresBaseUrl: false,
    recommendedModels: ['gpt-5.2', 'gpt-5.1-codex'],
    defaultModel: 'gpt-5.2',
  },
  claude: {
    toolCalling: true, listModels: false, requiresBaseUrl: false,
    recommendedModels: ['claude-sonnet-4-5', 'claude-opus-4-6', 'claude-haiku-4'],
    defaultModel: 'claude-sonnet-4-5',
  },
  gemini: {
    toolCalling: true, listModels: true, requiresBaseUrl: false,
    recommendedModels: ['gemini-3-flash-preview', 'gemini-3-pro-preview'],
    defaultModel: 'gemini-3-flash-preview',
  },
  deepseek: {
    toolCalling: true, listModels: true, requiresBaseUrl: false,
    recommendedModels: ['deepseek-v3.2'],
    defaultModel: 'deepseek-v3.2',
  },
  'openai-compatible': {
    toolCalling: true, listModels: true, requiresBaseUrl: true,
    recommendedModels: [],
    defaultModel: '',
  },
  deepl: {
    toolCalling: false, listModels: false, requiresBaseUrl: false,
    recommendedModels: [], defaultModel: '',
  },
  'google-translate': {
    toolCalling: false, listModels: false, requiresBaseUrl: false,
    recommendedModels: [], defaultModel: '',
  },
};
```

注意：本设计 **新增** `openai-compatible` 作为一种独立的 `ProviderType`（当前 `SUPPORTED_PROVIDERS` 没有它）。`base-openai-compatible.provider.ts` 已经实现底层，本次只是把它显式提升为 picker 中的一类。

### 5.2 过期模型过滤

```ts
// packages/server/src/ai/providers/deprecated-models.ts
const DEPRECATED_MODEL_PATTERNS: RegExp[] = [
  /^gpt-3(\.|-|$)/i, /^gpt-3\.5/i,
  /^gpt-4(?!\.5)(\.|-|$)/i,                          // gpt-4 / gpt-4-turbo / gpt-4-32k
  /^gpt-4o/i, /^gpt-4\.1/i,
  /^o[1-3](-|$)/i,                                    // o1 / o2 / o3
  /^claude-(instant|1|2|3)(-|$)/i,
  /^claude-(opus|sonnet|haiku)-(3|4-0|4-2|4-20)/i,    // claude-sonnet-4-20250514 等
  /^gemini-(1|2)(\.|-)/i,
  /^deepseek-(chat|coder|reasoner)$/i,
];

export const isDeprecatedModel = (modelId: string): boolean =>
  DEPRECATED_MODEL_PATTERNS.some((p) => p.test(modelId));
```

应用：
- 所有 provider 的 `listModels()` 在返回前内部过滤一次。
- UI「Add manually」输入时如果命中，弹 warning 但允许保存（escape hatch）。
- 静态 `recommendedModels` 在 dev 启动期断言「列表里没有 deprecated 项」（防御性测试）。

### 5.3 老 default model 替换

| 文件 | 旧值 | 新值 |
|---|---|---|
| `openai.provider.ts:9` | `gpt-4o-mini` | `gpt-5.2` |
| `claude.provider.ts:8` | `claude-sonnet-4-20250514` | `claude-sonnet-4-5` |
| `deepseek.provider.ts:9` | `deepseek-chat` | `deepseek-v3.2` |
| `gemini.provider.ts:8` | `gemini-2.0-flash` | `gemini-3-flash-preview` |
| `agent.service.ts:287` | `gpt-4o-mini` | `gpt-5.2` |
| `AiProviderSettings.tsx:76-111` | 全旧 | 同步替换 |

后续 `defaultModel` 改为从 `PROVIDER_CAPABILITIES` 读，避免双源真相。

### 5.4 新 `ConnectorResolver` service

```ts
@Injectable()
export class ConnectorResolver {
  constructor(
    private connectors: AiConnectorRepository,
    private projects: ProjectRepository,
    private teams: TeamRepository,
  ) {}

  /** 解析翻译 / Agent 调用应该使用的 connector + model（带越权检查） */
  async resolve(projectId: string, override?: { connectorId?: string; model?: string })
    : Promise<{ connector: AiConnector; model: string; source: 'explicit' | 'project' | 'team' }>;

  /** 项目可见的全部 connector（team 共享 + project 私有） */
  async listForProject(projectId: string): Promise<AiConnector[]>;

  /** 团队可见的全部 connector */
  async listForTeam(teamId: string): Promise<AiConnector[]>;
}
```

`AiService` / `AgentService` 调用 `ConnectorResolver.resolve(...)`，不再自己读 `aiConfig` 列。

## 6. API

```
GET    /api/ai/connectors?teamId=...               # 列 team 的所有 connector
GET    /api/ai/connectors?projectId=...            # 列 project 可见（继承 + 私有）
POST   /api/ai/connectors                          # body: { scope, teamId, projectId?, provider, displayName, apiKey, baseUrl?, enabledModels[] }
PATCH  /api/ai/connectors/:id                      # 部分更新；apiKey 缺省则不动
DELETE /api/ai/connectors/:id

POST   /api/ai/connectors/:id/list-models          # 用已存 key 重新拉远端列表（过滤后返回）
POST   /api/ai/connectors/probe-models             # 未保存时探测：body { provider, apiKey, baseUrl? } → 过滤后返回

PUT    /api/ai/defaults/team/:teamId               # body: { connectorId, model }
PUT    /api/ai/defaults/project/:projectId         # body: { connectorId, model } — 二者皆 null 表示清除（回退到 team）
GET    /api/ai/defaults/resolve?projectId=...      # 返回 { connectorId, model, source, toolCalling, keyHint }
```

### 6.1 权限

- 所有写操作要求调用者在该 `teamId` 的 `memberships.role` 是 `owner` 或 `manager`。Project 级写操作同样落到 team membership 上判断（与现有 project 设置接口一致）。
- 读操作放宽到 team member。
- `apiKey` 在响应里**始终**以 `keyHint`（mask）形式返回，绝不回明文。

### 6.2 老接口兼容

`PUT /api/ai/config/team|project/:id` 标记 deprecated，行为改为 **upsert 语义**：
1. 在该 scope 下查找 `displayName='Default'` 的 connector
2. 存在则就地更新 `(provider, apiKey, baseUrl)` 并把 model 加入 `enabledModels`
3. 不存在则新建
4. 将该 connector 设为该 scope 的 default（同时把 `defaultModel` 设为请求里的 model）

**不删除**其它已有 connector，保证多 connector 用户的额外配置不被旧客户端覆盖。响应继续返回与旧版兼容的 status 形状。

`DELETE /api/ai/config/...` 行为：仅清除该 scope 的 default 指针（不删 connector 本身）。

至少保留一个版本，下个版本（0014）连同 `ai_config` 列一起 drop。

## 7. UI

### 7.1 Settings：`AI Connectors` Tab

挂在 `/team/[id]/settings` 与 `/project/[id]/settings` 各一处，**主从面板**布局：

- **左列表**：所有 connector 卡片。Project 级页面同时展示继承的 team connector（badge 标 "Team" / 灰色）。
- **右详情**：当前选中 connector 的表单 — `displayName / provider / apiKey (输入后变成 mask + Update 按钮) / baseUrl (provider=openai-compatible 时显示) / Enabled Models`。
- **底部 footer**：「Default for this {team|project}: {Connector · model} ▾ [Change]」。
- **+ Add Connector** 按钮在左列表底部，点击后右面板进入三步表单：
  1. 选 provider
  2. 填 key / baseUrl，点 "Fetch models"
  3. 勾选 model（或 "Add manually"，命中 deprecated 时弹 warning）

i18n key（zh-CN / en-US 同步加）：
`aiConnectors.title / addConnector / displayName / fetchModels / enabledModels / addManually / inheritedFromTeam / setAsDefault / deprecatedWarning / removeConfirm / scopeTeam / scopeProject` 等约 20 条。

### 7.2 AgentChat：顶部 model chip

`AgentChat`（`packages/web/components/views/projectView/AgentChat/index.tsx`）从 `aiConfigured: boolean` 升级为接收当前解析结果：

```tsx
const { connectorId, model, source, toolCalling } = useAiDefaults(projectId);
```

顶部插入一个 chip：
- 显示 `{Connector.displayName} · {model}`
- 点击展开 popover：按 scope 分组（Team / Project）× 每个 connector 下列 enabled models，且过滤掉 `!toolCalling` 的 provider（agent 用不了）。
- 旁边小按钮 "Set as project default"（owner/manager 可见）。
- 切换仅影响当前会话；调用 `agentChat()` 时把 `{connectorId, model}` 一并带上。

请求体新增字段（向后兼容）：

```ts
POST /api/agent/chat
{ projectId, message, history, connectorId?, model? }
```

不传走默认解析。

## 8. 迁移

### 8.1 Schema

`packages/server/src/db/migrations/0013_ai_connectors.sql`：
- 建 `ai_connectors` 表
- 给 `teams` / `projects` 加 `default_connector_id` + `default_model`
- 保留旧的 `ai_config` 列

### 8.2 数据迁移

服务启动时调用一次性 idempotent 迁移 service（`AiConnectorMigrationService.runOnce()`）：

```ts
for each team where ai_config IS NOT NULL AND default_connector_id IS NULL:
  create ai_connectors row (
    scope='team', teamId=team.id, displayName='Default (migrated)',
    provider=ai_config.provider, apiKey=ai_config.apiKey, baseUrl=ai_config.baseUrl,
    enabledModels = ai_config.model
      ? [{ modelId: ai_config.model, addedManually: true }]
      : [],
  )
  set team.default_connector_id = <new.id>
  set team.default_model = ai_config.model ?? PROVIDER_CAPABILITIES[provider].defaultModel ?? null

# project 同理
```

迁移完成后**不立刻**清 `ai_config` 列（留作回滚锚）。下个版本（0014）再 drop。

### 8.3 回滚

`0013` 反向迁移脚本：
1. 把 `default_connector_id` 关联 connector 的字段拷回各 team/project 的 `ai_config`
2. drop 新表与新列

## 9. 测试

### Server
- `AiConnectorRepository` 基础 CRUD 单测。
- `ConnectorResolver` 单测：四条解析路径 + project 引用 team connector + 越权拒绝。
- `ai-connectors.controller.e2e-spec.ts`：CRUD + 权限 (`owner`/`manager`/`member`) + `list-models` + `probe-models`。
- `agent.service.spec.ts`：`toolCallingCapable=false` 的 connector 被拒绝（如 deepl）。
- `deprecated-models.spec.ts`：deny-list 正反例覆盖；assert 所有 `recommendedModels` 都不命中 deny-list。
- `ai-connector-migration.spec.ts`：fixture（老 team / project + `aiConfig`）→ 期望落地 connector + default 字段；二次运行 idempotent。

### Web
- `AiProviderSettings.test.tsx` 改造为新主从面板交互（加 connector / 勾 model / deprecated warning）。
- AgentChat model chip 切换 → 请求体携带 `connectorId/model` 的快照测试。

### i18n
- 现有 `i18n` lint（`pnpm --filter @transweave/web i18n`）确保 zh-CN / en-US 同步。

## 10. 风险与对策

| 风险 | 对策 |
|---|---|
| 老用户升级后看不到原 AI 配置 | 迁移自动跑，并在 settings 顶部展示 banner "已迁移自 v1 配置" |
| `recommendedModels` 跟不上 vendor 实际更新 | 1) 数据维护在 `capabilities.ts` 一处；2) listModels 是真实事实源；3) CI 加一个手动触发的 sanity check（可选） |
| Project 引用了 team connector，team owner 删除该 connector | DB `ON DELETE SET NULL`；project 默认 fallback 回 team default 或抛 `AI_NOT_CONFIGURED` |
| `apiKey` 误回明文 | 响应 DTO 显式只暴露 `keyHint`；加单测 |
| 字段冗余（旧 `ai_config` + 新表并存一段时间） | 文档清楚标注「下个版本 drop」；resolver 始终读新表（旧列只用于回滚） |

## 11. 范围外（后续可演进）

- Connector 级 priority / 备用 (fallback) 链
- 多 key 池
- 调用次数 / token 统计
- 成本展示
- Preset 库（OpenRouter / Groq / Together / SiliconFlow / 智谱 / 千问 / 火山方舟 …）
- 用户级（per-member）connector
