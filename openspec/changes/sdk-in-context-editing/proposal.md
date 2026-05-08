## Why

`developer-platform-moat` design.md 已锁定方案 A（监听 i18n 库返回点）+ 三框架适配（React / Vue / Svelte）+ 共享 sdk-core。本子 change 落地 SDK 包族，复刻 Tolgee 的"ALT+click 任意文案 → 弹窗编辑 + 自动截图"招牌特性。

不变量见父 change `developer-platform-design`：
- SDK never owns the i18n read path（prod 模式 0 运行时代码）
- prod bundle ≤ 1KB gzip per package
- dev token scope 限制为 `inContextEdit`（对应子 change 中扩展 api_keys.scopes）

## Non-goals

- 不做 vanilla JS（无框架）适配 — 见 TODOS.md
- 不做 Figma 插件
- 不做 in-context editing 的"批量批准"工作流（保持单条编辑）

## What Changes

### 包族结构

```
@transweave/sdk-core      共享 ALT+click handler / html2canvas / API client / token storage
@transweave/sdk-react     React Provider + hooks (next-intl + react-i18next 适配)
@transweave/sdk-vue       Vue plugin + composables (vue-i18n 适配)
@transweave/sdk-svelte    Svelte action + store (svelte-i18n 适配)
```

每包独立 semver、peerDependencies 锁住 sdk-core。

### 后端 auth scope 扩展

- `api_keys` schema 加 `scopes JSONB NOT NULL DEFAULT '["admin"]'`
- 旧 token 默认 `["admin"]`，行为不变
- SDK token 颁发时 scope 为 `["inContextEdit"]`
- 守卫装饰器 `@RequireScope('inContextEdit')` 限定可调端点
- `inContextEdit` scope 仅可访问：
  - `POST /api/screenshots`（上传截图）
  - `GET /api/tokens/:projectId/by-key/:key`（按 key 读单 token）
  - `PUT /api/tokens/:tokenId`（编辑单 token）

### SDK 行为

- Provider 接受 `mode: "dev" | "prod"`、`apiUrl`、`apiToken`
- dev 模式：渲染时为 i18n 节点添加 `data-trans-key` 属性 → 全局 `keydown` Alt + `click` 监听 → 命中后打开 modal
- modal：表单编辑当前译文 + 提交按钮；提交后调 PUT 接口
- 同时调用 `html2canvas` 截当前元素 + 父级 padding，POST 到 `/api/screenshots` 并 attach 到 token

### 发布管线（capability `sdk-distribution-pipeline`）

- 仓库根加 `.changeset/`
- GitHub Actions：PR merge → Changesets 自动开 release PR；release PR merge → npm publish + GitHub Release
- 矩阵：Node 18/20/22 × macOS/Ubuntu × {React 18/19, Vue 3.3+, Svelte 4/5}

## Capabilities

### New Capabilities

- `sdk-in-context-editing`: 包族 + dev/prod 模式 + ALT+click + html2canvas + token 编辑
- `sdk-distribution-pipeline`: changesets + GitHub Actions + npm publish 自动化

### Modified Capabilities

- `server-api-keys` (TBD — 现有 capability 名待确认)：scope 字段 + 守卫装饰器

## Impact

- **新包**：`packages/sdk-core`、`packages/sdk-react`、`packages/sdk-vue`、`packages/sdk-svelte`
- **后端**：`api_keys` schema 加列 + migration；新装饰器；现有 endpoint 加 scope 校验
- **CI**：新增 `.github/workflows/sdk-release.yml`
- **依赖**：`html2canvas`、`@changesets/cli`
- **风险**：bundle size 1KB 约束需要积极 tree-shake；多框架适配维护成本随时间累积
