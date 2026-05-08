## 1. PoC 验收（来源父 change tasks 2.1 / 2.2）

- [ ] 1.1 PoC：React + next-intl 适配 hook 在 Next.js 15 RSC 下 ALT+click 工作
  - 验收 (a) ALT+click 触发回调，payload 含 `key` / `module` / `boundingClientRect`
  - 验收 (b) prod build SDK gzip ≤ 1KB
  - 验收 (c) prod 运行时无 ALT 监听 / API 调用
  - 验收 (d) HMR 后 listener 不重复注册
- [ ] 1.2 PoC：html2canvas 5 类容器（overflow / transform / CSS3D / Shadow DOM / video）
  - 验收 (a) 5 类容器尝试结果记录
  - 验收 (b) cross-origin image 失败时走 fallback
  - 验收 (c) PNG dataURL > 0 且能 decode
  - 验收 (d) 单次截图 ≤ 800ms

## 2. Backend auth scope

- [ ] 2.1 `api_keys` schema 加 `scopes JSONB NOT NULL DEFAULT '["admin"]'` + migration
- [ ] 2.2 新建 `@RequireScope(scope)` 装饰器 + JWT/API key payload 携带 scopes
- [ ] 2.3 SDK 限定 scope 的 endpoint（screenshots / token by-key / token update）添加守卫
- [ ] 2.4 旧 token 默认 admin scope 行为不变（migration 中显式回填）
- [ ] 2.5 e2e：admin token 可调全部；inContextEdit token 调其他 endpoint 返回 403

## 3. SDK core

- [ ] 3.1 `packages/sdk-core` package.json + tsup build 配置
- [ ] 3.2 ALT+click handler（监听 keydown + click，命中带 `data-trans-key` 元素）
- [ ] 3.3 html2canvas 封装（含 cross-origin / shadow DOM 降级）
- [ ] 3.4 API client（带 token + 自动重试 + 错误码处理）
- [ ] 3.5 状态存储（dev/prod mode flag）

## 4. SDK adapters

- [ ] 4.1 `@transweave/sdk-react` — Provider + `useT` 包装 hook（适配 next-intl + react-i18next）
- [ ] 4.2 `@transweave/sdk-vue` — Vue plugin + composable（适配 vue-i18n）
- [ ] 4.3 `@transweave/sdk-svelte` — Svelte action + store（适配 svelte-i18n）

## 5. Bundle size 验证

- [ ] 5.1 每个 adapter prod build 加 size-limit 配置
- [ ] 5.2 CI 卡 1KB gzip 上限

## 6. 发布管线 (capability sdk-distribution-pipeline)

- [ ] 6.1 仓库根加 `.changeset/` + `pnpm-lock` 中加 `@changesets/cli`
- [ ] 6.2 `.github/workflows/sdk-release.yml`（merge 触发 release PR；release PR merge 触发 npm publish）
- [ ] 6.3 CI 矩阵 Node 18/20/22 × macOS/Ubuntu × 适配框架版本
- [ ] 6.4 README × 4（每包一份）+ 示例项目 ` `examples/sdk-in-context-edit-react`

## 7. 文档

- [ ] 7.1 `docs/sdk.md` — 安装、配置、ALT+click 流程截图
- [ ] 7.2 `docs/sdk-distribution.md` — semver 策略、breaking change RFC 流程
