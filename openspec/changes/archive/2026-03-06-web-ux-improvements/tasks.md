## 1. API 层统一错误处理

- [x] 1.1 修改 `lib/api.ts` 的 `apiFetch`：401 响应时清除 token 并跳转 `/login`（防重复跳转）
- [x] 1.2 修改 `lib/api.ts` 的 `apiFetch`：捕获网络 TypeError 并触发全局 toast 提示
- [x] 1.3 添加 i18n key：`error.network`（中/英）

## 2. 侧边栏数据共享与增强

- [x] 2.1 修改 `sidebarView/index.tsx`：从 `teamsAtom` 读取团队数据，移除独立的 `fetchMyTeams()` 调用，保留空 atom 时的 fallback fetch
- [x] 2.2 修改 `sidebarView/index.tsx`：团队名称改为可点击链接，导航到 `/team/[teamId]`
- [x] 2.3 修改 `sidebarView/index.tsx`：每个展开的团队下添加"新建项目"按钮，点击打开 `newProjectDialog`
- [x] 2.4 修改 `sidebarView/index.tsx`：底部区域增加 Tutorial 链接（含折叠态图标）
- [x] 2.5 添加 i18n key：`sidebar.newProject`、`sidebar.tutorial`（中/英）
- [x] 2.6 确保 TeamsView 创建/删除团队时更新 `teamsAtom`，验证侧边栏自动同步

## 3. 路由清理

- [x] 3.1 删除 `app/signup/page.tsx`（注册已在 /login 中）
- [x] 3.2 删除 `app/teams/page.tsx`（冗余 redirect）
- [x] 3.3 删除 `app/project/page.tsx`（冗余 redirect）
- [x] 3.4 验证 `/login` 注册模式包含确认密码字段

## 4. 权限角色化 UI

- [x] 4.1 创建 `lib/permissions.ts`：实现 `canDeleteTeam(team, userId)`, `canEditTeam(team, userId)`, `canManageMembers(team, userId)` 工具函数
- [x] 4.2 修改 `teamsView/teamCard/TeamActions.tsx`：根据权限函数控制删除/编辑/成员管理按钮的可见性
- [x] 4.3 验证团队 API 返回的 membership 数据中包含当前用户的 role 字段

## 5. 验证与收尾

- [x] 5.1 运行 `pnpm build:web` 确认构建通过
- [x] 5.2 浏览器手动测试：新用户注册 → 创建团队 → 侧边栏同步 → 创建项目 → 角色权限 → 教程入口
