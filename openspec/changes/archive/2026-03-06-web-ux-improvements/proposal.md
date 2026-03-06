## Why

新用户注册后体验断裂：首页曾完全空白（已修复为 TeamsView），侧边栏缺少创建入口，路由存在冗余和断链，数据在侧边栏与页面间不同步，权限模型在前端不透明。这些问题导致用户无法顺畅地完成"注册 → 创建团队 → 创建项目 → 管理翻译"的核心流程。

## What Changes

- 侧边栏增加"新建项目"快捷入口，团队名可点击进入团队详情页
- 侧边栏与首页共享团队数据源（通过 Jotai atom），创建/删除团队后自动同步
- 清理冗余路由：删除 `/signup`（合并到 `/login`）、删除 `/project`（无用 redirect）、删除 `/teams`（无用 redirect）
- 前端权限角色化：API 返回用户角色，前端按角色隐藏/禁用操作按钮（如删除团队仅 owner 可见）
- Tutorial 页面在侧边栏底部和首页添加导航入口
- API 层增加统一错误处理（401 自动跳登录、网络错误 toast 提示）

## Capabilities

### New Capabilities
- `sidebar-navigation`: 侧边栏导航增强 — 团队可点击、新建项目入口、教程入口、数据与首页同步
- `route-cleanup`: 路由清理 — 删除冗余路由，统一注册入口到 /login
- `role-based-ui`: 前端权限角色化 — 按用户角色控制 UI 操作可见性
- `api-error-handling`: API 层统一错误处理 — 401 重定向、网络错误提示、统一 toast

### Modified Capabilities

_(无已有 spec 需要修改)_

## Impact

- **路由**: 删除 `app/signup/`, `app/teams/`, `app/project/page.tsx` 三个路由文件
- **组件**: 修改 `sidebarView/index.tsx`、`teamsView/`、`headerView.tsx`
- **状态管理**: 修改 `jotai/index.ts` 新增 atom，修改 sidebar 和 TeamsView 共享数据源
- **API 层**: 修改 `lib/api.ts` 增加拦截器逻辑
- **i18n**: 增加新的翻译 key（侧边栏新入口文案）
- **无后端改动**: 所有变更仅限 `packages/web`
