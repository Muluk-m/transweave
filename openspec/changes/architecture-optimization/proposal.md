## Why

Transweave 代码库在快速迭代中积累了多项架构债务：N+1 查询、缺少事务保护的多步操作、过大的 God Service、前端巨型组件与服务端状态管理不当。这些问题正在影响性能、可维护性和数据一致性，需要在功能继续扩展前系统性解决。

## What Changes

### 后端
- **修复 N+1 查询**：`ProjectController.findAllProjects()` 改为单次 JOIN 查询
- **添加事务保护**：`TokenService.create()` 等多步操作包裹在数据库事务中
- **拆分 God Service**：将 `TokenService`(852行) 和 `ProjectService`(685行) 按职责拆分为多个细粒度服务
- **添加全局异常过滤器**：统一错误响应格式，防止数据库错误泄露
- **修复 Repository 类型断言**：消除 `base.repository.ts` 中的 `as any` 类型断言
- **补充数据库索引**：为 `users.email`、`api_keys.keyHash`、`tokens.module` 添加索引
- **清理残留依赖**：移除未使用的 Prisma 依赖
- **提取 MCP HTML 文档**：将 `mcp.controller.ts` 中 655 行内嵌 HTML 移至模板文件

### 前端
- **引入服务端状态管理**：用 React Query (TanStack Query) 替代 Jotai atoms 管理 teams/projects 等服务端数据
- **拆分巨型组件**：将 `ProjectTokensTab`(917行)、`TokenTable`(752行)、`TokenFormDrawer`(717行) 拆分为可组合的子组件和自定义 hooks
- **统一 API 客户端**：将 `upload.ts` 的原生 fetch 调用迁移到 `apiClient`

## Capabilities

### New Capabilities
- `server-error-handling`: 全局异常过滤器、统一错误响应格式、数据库错误拦截
- `server-service-splitting`: TokenService 和 ProjectService 按职责拆分为细粒度服务
- `server-query-optimization`: N+1 查询修复、事务保护、数据库索引补充
- `server-code-cleanup`: Repository 类型修复、残留依赖清理、MCP HTML 提取
- `web-server-state`: 引入 React Query 管理服务端状态，替代 Jotai atoms
- `web-component-splitting`: 拆分巨型组件为可组合的子组件与自定义 hooks

### Modified Capabilities
<!-- 无现有 spec 需要修改，本次变更不改变已有能力的需求定义 -->

## Impact

- **后端代码**：`controller/`、`service/`、`repository/`、`db/schema/`、`ai/` 目录下多个文件
- **前端代码**：`components/views/projectView/`、`jotai/`、`api/`、`lib/` 目录
- **依赖变更**：新增 `@tanstack/react-query`；移除 `@prisma/client`、`prisma`
- **数据库**：新增 migration 添加索引（无破坏性变更）
- **API 契约**：不变，仅内部重构
