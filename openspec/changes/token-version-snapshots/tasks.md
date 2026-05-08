## 1. PoC（重要 — 阻塞 schema 决策）

- [ ] 1.1 检查 `token-history` schema 是否覆盖 token 全部业务字段（key, module, translations, translationStatus, translationMeta, tags, comment, screenshots）。如缺，列出补哪些列
- [ ] 1.2 编写 seed 脚本灌 100k token + 平均 10 次 history 改动
- [ ] 1.3 跑 read snapshot query（join + DISTINCT ON），EXPLAIN ANALYZE 验证 ≤ 200ms（带索引）
- [ ] 1.4 对比 `pg_database_size()` vs 方案 A（branch_id 复制）的存储占用

## 2. Schema 与 migration

- [ ] 2.1 新 `token_snapshots` 表 schema
- [ ] 2.2 如 PoC 1.1 发现缺字段，token-history 加列 migration
- [ ] 2.3 索引：`(project_id, base_history_at)` 复合索引到 token_history

## 3. Service / Controller

- [ ] 3.1 `SnapshotRepository` (CRUD + read entries via join)
- [ ] 3.2 `SnapshotService`
- [ ] 3.3 `SnapshotController` (REST endpoints)
- [ ] 3.4 单测 + e2e

## 4. CLI

- [ ] 4.1 `transweave snapshot create`
- [ ] 4.2 `transweave snapshot list`
- [ ] 4.3 `transweave pull --snapshot <id>`

## 5. 验收

- [ ] 5.1 旧 CLI v1.x 不传 snapshot 参数行为不变（向后兼容不变量）
- [ ] 5.2 OpenSpec validate
- [ ] 5.3 文档：`docs/snapshots.md`
