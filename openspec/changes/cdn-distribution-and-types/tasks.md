## 1. Backend: Publish + CDN

- [ ] 1.1 `published_bundles` schema + migration
- [ ] 1.2 `PublishService.publish(projectId, userId)` — 收集 token translations、算 sha256 etag、INSERT、保留最近 50 版
- [ ] 1.3 `PublishService.getLatest(projectId)` — 取最新 bundle（或单版 by etag）
- [ ] 1.4 `PublishController` `POST /api/projects/:id/publish` + `GET /api/projects/:id/published-bundles`
- [ ] 1.5 `CdnController` `GET /cdn/projects/:id/translations.json` 含 ETag + Cache-Control
- [ ] 1.6 `CdnController` SSE endpoint `GET /cdn/projects/:id/events`，订阅 `bundle_published` 事件（用 EventEmitter / Redis pub-sub）
- [ ] 1.7 单测 + e2e（publish → CDN 拉取 → ETag 命中 → 304）

## 2. CLI: types

- [ ] 2.1 `transweave types --out <file>`：从 server 拉 published bundle → 生成 TS interface `Messages`
- [ ] 2.2 `transweave types --watch`：连 SSE，bundle 更新时重生
- [ ] 2.3 next-intl / react-i18next augmentation 模板（`docs/types-integration.md`）

## 3. Web: Publish Settings

- [ ] 3.1 ProjectSettingTab 新 sub-tab "Publish & CDN"
- [ ] 3.2 Publish 按钮（弹 confirm，触发 `POST /publish`）
- [ ] 3.3 已发布 bundle 列表（带 etag / 时间 / publisher）
- [ ] 3.4 回滚按钮（POST 一个新 bundle，内容来自旧 bundle —— 不删除旧版）

## 4. SDK 集成

- [ ] 4.1 `@transweave/sdk-core` 暴露 `subscribeToCdn(projectId)` API（依赖 `sdk-in-context-editing` 子 change 落地）
- [ ] 4.2 dev mode 编辑保存后从 server 拉新 bundle（不走 CDN）

## 5. 文档与发布

- [ ] 5.1 `docs/cdn.md` — bundle 协议、ETag 验证、SSE 重连策略
- [ ] 5.2 `docs/types-integration.md` — TS 类型生成集成步骤
- [ ] 5.3 OpenSpec validate
