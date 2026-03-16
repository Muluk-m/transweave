## Context

Transweave 是一个自托管的 i18n 管理平台，采用 NestJS + Next.js + CLI 的 pnpm monorepo 架构。随着功能迭代，代码库积累了以下技术债务：

- **性能**：`ProjectController.findAllProjects()` 存在 N+1 查询（用户有 N 个 team 就发 N+1 次查询）
- **数据一致性**：`TokenService.create()` 等多步操作未使用事务，中间步骤失败会导致脏数据
- **可维护性**：`TokenService`(852行) 和 `ProjectService`(685行) 承担过多职责；前端 `ProjectTokensTab`(917行) 等组件过于臃肿
- **类型安全**：`BaseRepository` 中 5 处 `as any` 类型断言；前端 API 层存在 `any` 返回值
- **前端状态**：teams/projects 等服务端数据存储在 Jotai atoms 中，无自动刷新和缓存失效机制
- **错误处理**：无全局异常过滤器，数据库错误可能直接暴露给客户端

## Goals / Non-Goals

**Goals:**
- 消除 N+1 查询，将 `findAllProjects` 优化为单次数据库查询
- 为关键多步操作添加事务保护
- 将 God Service 拆分为职责单一的服务
- 建立全局异常过滤器和统一错误响应格式
- 引入 React Query 管理服务端状态
- 拆分前端巨型组件为可组合的子组件
- 修复 Repository 层类型断言
- 补充缺失的数据库索引

**Non-Goals:**
- 不创建 `packages/shared` 共享类型包（范围太大，可后续单独做）
- 不重构 NestJS 模块结构（当前 flat module 结构在项目规模下可接受）
- 不添加 JWT refresh token 机制
- 不添加新功能，纯重构
- 不改变 API 契约（所有接口保持向后兼容）

## Decisions

### D1: N+1 查询修复策略

**选择**：在 `ProjectRepository` 新增 `findByUserTeams(userId)` 方法，使用 Drizzle 的 JOIN 查询一次性获取用户所有项目。

**替代方案**：在 `TeamService` 中批量获取所有 team IDs 后用 `IN` 查询 → 仍然两次查询，且需要改动两个 service。

**理由**：单次 JOIN 是最高效的方案，且逻辑内聚在 Repository 层。

### D2: 事务保护方案

**选择**：使用 Drizzle 的 `db.transaction()` API，在 service 层包裹需要原子性的操作。

```typescript
await this.db.transaction(async (tx) => {
  // 所有操作共享同一个 tx
});
```

**理由**：Drizzle 原生支持事务，与现有代码风格一致。`TeamService` 中已有事务使用先例。

### D3: TokenService 拆分方案

**选择**：按职责拆分为 3 个服务：

```
TokenService (852行)
  ├─ TokenService         → CRUD、搜索、批量操作 (~300行)
  ├─ TokenHistoryService  → 版本历史、差异对比 (~200行)
  └─ TokenImportExportService → 导入/导出预览与执行 (~350行)
```

**替代方案**：只提取 ImportExport 为独立 service → 剩余的 TokenService 仍然过大。

**理由**：三个拆分维度对应三个不同的业务域，各自有独立的依赖关系。

### D4: ProjectService 拆分方案

**选择**：拆分为 2 个服务：

```
ProjectService (685行)
  ├─ ProjectService       → CRUD、语言管理、模块管理 (~400行)
  └─ ProjectExportService → 导出/导入、格式转换 (~285行)
```

**理由**：导出/导入逻辑与核心 CRUD 独立，且依赖格式化工具函数。

### D5: 全局异常过滤器设计

**选择**：创建 `AllExceptionsFilter` 实现 `ExceptionFilter`，注册为全局过滤器。

统一错误响应格式：
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "InternalServerError",
  "requestId": "uuid"
}
```

- HttpException → 直接透传 status 和 message
- 数据库唯一约束违反 (23505) → 409 Conflict
- 其他数据库错误 → 500 + 日志记录
- 未知错误 → 500 + 日志记录

**理由**：NestJS 推荐的全局过滤器模式，不需要每个 controller 单独处理。

### D6: 前端服务端状态方案

**选择**：引入 `@tanstack/react-query` 管理 teams、projects 等服务端数据。保留 Jotai 仅用于 `nowTeamAtom`、`nowProjectAtom` 等纯客户端选择状态。

**替代方案**：
- SWR → 功能较少，缺少 mutation 和乐观更新
- 继续用 Jotai + 手动刷新 → 缓存失效逻辑分散且易遗漏

**理由**：React Query 提供开箱即用的缓存、自动刷新、mutation 失效，且社区生态成熟。

### D7: 前端组件拆分策略

**选择**：采用 "提取 hooks + 拆分子组件" 的方式：

```
ProjectTokensTab (917行)
  ├─ useTokensManager()       → 数据获取、筛选、分页逻辑
  ├─ TokenToolbar             → 搜索、筛选、批量操作按钮
  ├─ TokenTable               → 表格渲染（列定义提取到单独文件）
  └─ TokenFormDrawer           → 表单（进一步拆分）
        ├─ TokenBasicFields    → 基本字段
        ├─ TranslationFields   → 翻译字段
        ├─ ScreenshotManager   → 截图管理
        └─ TokenHistoryPanel   → 版本历史
```

**理由**：hooks 提取业务逻辑，子组件各自管理渲染，消除 prop drilling。

### D8: Repository 类型修复

**选择**：使用 Drizzle 的 `DrizzleDB` 类型配合泛型约束，消除 `as any`。

核心思路：将 `db` 的类型从通用的 `DrizzleDB` 细化为携带 schema 信息的类型，使 `select().from(table)` 能正确推断。

**替代方案**：保持 `as any` 但添加运行时类型检查 → 不治本。

## Risks / Trade-offs

- **[拆分 Service 可能引入循环依赖]** → 使用 NestJS 的 `forwardRef()` 或调整依赖方向。确保拆分后的 service 之间无双向依赖。
- **[React Query 引入增加 bundle size]** → `@tanstack/react-query` gzipped ~12KB，在可接受范围内。且可通过移除 Jotai 中不再需要的 atoms 部分抵消。
- **[全局异常过滤器可能掩盖开发阶段的错误]** → 在开发模式下保留详细的错误堆栈输出，仅在生产模式下隐藏。
- **[事务包裹可能降低并发性能]** → 事务范围控制在最小必要操作内，避免长事务。当前操作量级下不构成瓶颈。
- **[组件拆分可能引入短期回归]** → 拆分过程保持功能不变，通过现有 E2E 测试验证。
