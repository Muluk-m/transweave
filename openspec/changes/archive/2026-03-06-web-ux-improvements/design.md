## Context

Transweave web 前端基于 Next.js 15 + Jotai + shadcn/ui 构建。当前侧边栏仅展示团队/项目树和 API Keys 入口，缺少创建项目、团队详情跳转、教程导航等关键操作。路由层存在 `/signup`、`/teams`、`/project` 三个冗余入口。状态管理分裂在 AuthContext（用户）和 Jotai（团队/项目）两套体系中，侧边栏和首页各自独立拉取团队数据。API 层无统一错误处理。

## Goals / Non-Goals

**Goals:**
- 侧边栏成为核心导航中心：团队可跳转详情、每个团队下可新建项目、底部增加教程入口
- 侧边栏与首页 TeamsView 共享同一个 Jotai atom 数据源，任一侧创建/删除操作自动同步
- 清理冗余路由，统一注册流程到 `/login`
- API 响应 401 时自动清除 token 跳转登录，网络错误统一 toast
- 前端根据用户角色（owner/admin/member）控制"删除团队"、"团队设置"等敏感操作的可见性

**Non-Goals:**
- 不重构后端 API 或数据库结构
- 不统一 AuthContext 和 Jotai 为单一状态管理方案（保持现有二元体系）
- 不拆分项目 Settings Tab 为子 Tab（留作后续优化）
- 不引入 SWR/React Query 等数据获取库

## Decisions

### 1. 侧边栏数据源共享

**选择**: 侧边栏直接读取 `teamsAtom`，不再独立 fetch，由首页 TeamsView 负责初始化数据。

**替代方案**: 引入 SWR/React Query 做缓存层 → 过于复杂，当前数据量小，Jotai atom 足够。

**实现**: 侧边栏 `useAtom(teamsAtom)` 读取数据，创建/删除团队时更新 atom 即可自动同步。侧边栏仍自行 fetch 各团队的 projects（这些数据仅侧边栏需要）。

### 2. 路由清理策略

**选择**: 直接删除冗余路由文件，不保留 redirect。

- `/signup` → 删除，注册已集成在 `/login` 页面的 toggle 中
- `/teams/page.tsx` → 删除（redirect to `/`，不再需要）
- `/project/page.tsx` → 删除（redirect to `/teams`，不再需要）

**理由**: 这些路由无外部链接依赖，不会影响 SEO 或书签。

### 3. 权限角色前端化

**选择**: 在团队成员 API 响应中已包含 `role` 字段，前端从 `teamsAtom` 中的 membership 提取当前用户角色，通过 helper 函数控制 UI。

```
canDeleteTeam(team, userId)   → role === 'owner'
canEditTeam(team, userId)     → role === 'owner' || role === 'admin'
canManageMembers(team, userId) → role === 'owner' || role === 'admin'
```

**替代方案**: 后端新增 `/api/team/permissions` 接口 → 不必要，membership 数据已包含角色信息。

### 4. API 统一错误处理

**选择**: 在 `lib/api.ts` 的 `apiFetch` 函数中增加拦截逻辑：

- 401 → 清除 localStorage token，`window.location.href = '/login'`
- 网络错误 → 触发全局 toast 提示
- 其余错误 → 继续抛出，由调用方处理

**不使用 Axios interceptors**，保持当前 fetch-based 架构。

### 5. 教程入口

**选择**: 在侧边栏底部区域增加 Tutorial 链接（与 API Keys 并列），不在 header 中加。

**理由**: header 已有主题切换、语言切换、用户菜单，再加入口会拥挤。侧边栏底部是功能入口的自然位置。

## Risks / Trade-offs

- **[侧边栏依赖首页数据]** → 如果用户直接访问 `/project/xxx`（跳过首页），teamsAtom 可能为空。**缓解**: 侧边栏检测到 atom 为空时自行 fetch 一次作为 fallback。
- **[删除 /signup 路由]** → 如有外部链接指向 /signup 会 404。**缓解**: 搜索确认无外部引用，且 /login 已包含注册功能。
- **[权限仅在前端控制]** → 恶意用户可绕过前端限制直接调用 API。**缓解**: 后端已有权限校验，前端仅做 UI 层优化，不是安全边界。
