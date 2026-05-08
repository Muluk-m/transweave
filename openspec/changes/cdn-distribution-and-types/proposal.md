## Why

`developer-platform-moat` design.md D6 决策已锁：CDN per-project bundle、publish-driven。对标 Locize 的卖点级特性："改完无需 redeploy + TS 类型生成 + 编译期检查 key"。

不变量见父 change `developer-platform-design`：
- 新 endpoint 必须向后兼容（旧 client 不受影响）
- bundle 仅在显式 publish 触发生成

## Non-goals

- 不做 i18n key splitting（大 project bundle 拆 chunk）— 见 TODOS.md
- 不做 ICU placeholder 类型推断（TS 类型生成深化）— 见 TODOS.md
- 不做 Cloudflare R2 / S3 直接 upload —— 默认依靠 nginx 反向代理 + ETag

## What Changes

### Bundle 发布

- 新表 `published_bundles`：
  ```
  id           uuid PK
  project_id   uuid FK
  etag         text  (sha-256 of bundle JSON)
  bundle       jsonb  (i18n key→translations map)
  published_by uuid FK users
  published_at timestamp
  ```
- 保留近 50 版供回滚
- `POST /api/projects/:id/publish` → 收集 main 全部 token translation → 计算 sha256 → 写表
- `GET /cdn/projects/:id/translations.json` → 取 latest bundle，`Cache-Control: public, max-age=60, stale-while-revalidate=300`，`ETag` 头匹配
- `GET /cdn/projects/:id/events`（SSE）→ 推 `bundle_published` 事件

### CLI

- `transweave types --out src/i18n/types.ts` 生成 `Messages` interface（key→string）
- `transweave types --watch` 监听 server SSE 自动重生
- 与 next-intl / react-i18next 的 augmentation 提供 d.ts 模板

### Web

- ProjectSettingTab 加 "Publish & CDN" sub-tab，列最近 50 版 bundle，提供 publish 按钮 + 回滚

## Capabilities

### New Capabilities

- `cdn-distribution-and-types`: published_bundles 表 + publish API + CDN endpoint + SSE + CLI types 子命令

## Impact

- **schema**: 新 `published_bundles` 表 + migration
- **代码**: `service/publish.service.ts`、`controller/publish.controller.ts`、SSE handler、CLI 子命令、Web Settings tab
- **依赖**: 无（用 Node crypto 算 sha256）
- **风险**: 大 project bundle 可能 MB 级 — 引出 splitting follow-up（TODOS.md）；SSE 长连接对 nginx / 反向代理需正确配置
