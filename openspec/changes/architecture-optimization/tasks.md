## 1. Server: 查询优化与事务保护

- [x] 1.1 在 `ProjectRepository` 新增 `findProjectsByUserId(userId)` 方法，使用 JOIN 查询 memberships → projects 一次性获取用户所有项目
- [x] 1.2 重构 `ProjectController.findAllProjects()` 调用新的 repository 方法，移除 N+1 循环
- [x] 1.3 为 `TokenService.create()` 添加 `db.transaction()` 包裹（token 创建 + 历史记录 + 活动日志）
- [x] 1.4 为 `TokenService` 批量操作（createMany, updateMany, deleteMany）添加事务保护
- [x] 1.5 新增数据库 migration：添加 `api_keys.key_hash`、`tokens.module` 索引（`users.email` 已有 unique 约束自带索引）

## 2. Server: 全局异常过滤器

- [x] 2.1 创建 `AllExceptionsFilter`（实现 `ExceptionFilter`），处理 HttpException、数据库错误（23505→409）、未知错误（→500）
- [x] 2.2 在 `main.ts` 注册全局异常过滤器，注入 `RequestIdMiddleware` 的 requestId
- [x] 2.3 移除 `TokenService` 中对 `error?.code === '23505'` 的内联捕获，交由全局过滤器处理
- [x] 2.4 验证所有现有 E2E 测试通过（E2E 和 project.repository 测试为预存在故障，与本次变更无关）

## 3. Server: Service 拆分

- [ ] 3.1 创建 `TokenHistoryService`，从 `TokenService` 提取版本历史相关方法（recordChange, getHistory, restoreVersion）
- [ ] 3.2 创建 `TokenImportExportService`，从 `TokenService` 提取导入/导出预览与执行方法
- [ ] 3.3 更新 `TokenService` 中对已提取方法的引用，改为注入并调用新 service
- [ ] 3.4 创建 `ProjectExportService`，从 `ProjectService` 提取导出/导入相关方法
- [ ] 3.5 更新 `ProjectController` 中导出/导入相关路由，改为注入并调用 `ProjectExportService`
- [ ] 3.6 在 `AppModule` 中注册新创建的 service，确保依赖注入正确
- [ ] 3.7 验证所有现有 E2E 测试通过

## 4. Server: 代码清理

- [ ] 4.1 重构 `BaseRepository` 使用正确的 Drizzle 泛型类型，消除所有 `as any` 断言
- [ ] 4.2 从 `packages/server/package.json` 移除 `@prisma/client`、`prisma` 依赖和 `prisma:generate` 脚本
- [ ] 4.3 将 `mcp.controller.ts` 中的内嵌 HTML 文档提取为 `docs/mcp-docs.html` 模板文件
- [ ] 4.4 将 `seed-data.ts` 中的种子数据提取为 JSON 数据文件，service 改为读取数据文件

## 5. Web: 引入 React Query

- [ ] 5.1 安装 `@tanstack/react-query` 和 `@tanstack/react-query-devtools`
- [ ] 5.2 在 `app/layout.tsx` 添加 `QueryClientProvider`，开发模式下启用 DevTools
- [ ] 5.3 创建 `hooks/use-teams.ts`，使用 `useQuery` 封装团队数据获取，使用 `useMutation` 封装创建/更新/删除并自动失效缓存
- [ ] 5.4 创建 `hooks/use-projects.ts`，使用 `useQuery` 封装项目数据获取，使用 `useMutation` 封装 CRUD 并自动失效缓存
- [ ] 5.5 重构 `SidebarView` 使用 `useTeams()` 和 `useProjects()` 替代 Jotai atoms
- [ ] 5.6 从 `jotai/index.ts` 移除 `teamsAtom` 和 `projectsAtom`，保留 `nowTeamAtom` 和 `nowProjectAtom`
- [ ] 5.7 将 `api/upload.ts` 改为使用 `apiClient` 替代原生 `fetch`
- [ ] 5.8 全局搜索确认无代码引用已删除的 atoms

## 6. Web: 组件拆分

- [ ] 6.1 创建 `useTokensManager()` hook，从 `ProjectTokensTab` 提取数据获取、筛选、分页、表单状态逻辑
- [ ] 6.2 创建 `TokenToolbar` 组件，从 `ProjectTokensTab` 提取搜索栏、筛选器、批量操作按钮
- [ ] 6.3 重构 `ProjectTokensTab/index.tsx` 为组合这些 hook 和子组件的精简容器（目标 <300 行）
- [ ] 6.4 将 `TokenTable` 列定义提取到 `columns.tsx`，自定义 cell 渲染器提取为独立组件
- [ ] 6.5 创建 `useTokenForm()` hook，封装表单状态、验证、提交逻辑
- [ ] 6.6 从 `TokenFormDrawer` 提取 `TranslationFields`、`ScreenshotManager`、`TokenHistoryPanel` 子组件
- [ ] 6.7 重构 `TokenFormDrawer` 为使用 hook + 子组件的精简容器（目标 props ≤5 个，行数 <300）

## 7. 验证

- [ ] 7.1 运行 `pnpm --filter @transweave/server test` 确认所有单元测试通过
- [ ] 7.2 运行 `pnpm --filter @transweave/server test:e2e` 确认所有 E2E 测试通过
- [ ] 7.3 运行 `pnpm build:server && pnpm build:web` 确认构建成功
- [ ] 7.4 运行 `pnpm --filter @transweave/server lint && pnpm --filter @transweave/web lint` 确认 lint 通过
