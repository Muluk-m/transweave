## 1. 设计交付物

- [ ] 1.1 完成 `design.md` 探索段（已完成基础版本，留待评审 / 编辑迭代）
- [ ] 1.2 邀请设计审查（plan-eng-review / plan-design-review）
- [ ] 1.3 评审后落"Decisions Pending"段为 "Decisions Made"

## 2. 关键不变量校验（PoC）

- [ ] 2.1 PoC：在 `packages/sdk-poc/` 下做 React + next-intl 适配 hook，验证 ALT+click 在 Next.js 15 RSC 下可工作
  - 验收 (a)：dev 模式下 ALT+click 任意 next-intl `t()` 渲染节点能触发回调，回调 payload 含 `key` / `module` / `targetElement.boundingClientRect`
  - 验收 (b)：`next build` 产物中 `@transweave/sdk-react` 在 prod 模式 gzip ≤ 1KB（用 `bundlephobia` 或 `size-limit`）
  - 验收 (c)：prod 运行时 grep 未发现任何 ALT 相关 listener / API 调用 (Network tab + Performance recording)
  - 验收 (d)：HMR 触发后 listener 不重复注册（用 perf observer 或自定义计数）
- [ ] 2.2 PoC：用 html2canvas 对 Drawer 内 element 截图，确认 overflow 元素 + transform 等情况可处理
  - 验收 (a)：在测试页跑过 5 类容器 — `overflow:hidden` + 内容溢出、`transform: scale(0.8)`、CSS3D `rotateY`、Shadow DOM、`<video>`，记录每类成败
  - 验收 (b)：cross-origin `<img>` 是否走 fallback（CORS 失败时显示纯背景而不是炸）
  - 验收 (c)：截图返回 PNG dataURL 长度 > 0 且能 decode
  - 验收 (d)：单次截图耗时 ≤ 800ms（中端 Mac）
- [ ] 2.3 PoC：MCP 新增 1 个 tool（`detect_unused_keys`）跑通，验证 input/output schema 在 Claude Desktop 中可被发现并调用
  - 验收 (a)：在 Claude Desktop / Cursor 配置 MCP server 后，对话里输入 "list available tools" 能列出含 `detect_unused_keys` 的清单
  - 验收 (b)：tool 调用成功，返回 JSON 含 `unused: string[]` 和 `scanned: number`
  - 验收 (c)：自动化测试：`@modelcontextprotocol/sdk` client 直连本地 MCP server，跑 `tools/list` + `tools/call detect_unused_keys`，断言结构正确
- [ ] 2.4 PoC：用 `pg_dump` 模拟 100k token × 5 branch 的 schema 方案 A vs 复用 token-history 方案的存储成本
  - 验收 (a)：编写 seed script 在本地 PG 灌入 100k token + 平均每 token 10 次 history 修改 + 5 个 snapshot 标记
  - 验收 (b)：对比方案 A（token + branch_id 复制）vs 复用 token-history 方案的 `pg_database_size()`
  - 验收 (c)：跑 read snapshot 的 query path（join token-history + base_history_at），EXPLAIN ANALYZE 返回时间 ≤ 200ms（带索引）
  - 验收 (d)：确认 `token-history` schema 已包含 token 全部业务字段；如缺，列出需补的列

## 3. 拆分为子 change

- [ ] 3.1 `openspec` 新建 `mcp-tools-v2` change（基于 design.md MCP 段）
- [ ] 3.2 `openspec` 新建 `token-version-snapshots` change（仅 Phase 1: 只读 snapshot）
- [ ] 3.3 `openspec` 新建 `sdk-in-context-editing` change
- [ ] 3.4 `openspec` 新建 `cdn-distribution-and-types` change

## 4. 不变量入 spec

- [ ] 4.1 `developer-platform-design` capability spec.md：写定向后兼容、dev-mode 隔离、MCP 语义稳定三条
