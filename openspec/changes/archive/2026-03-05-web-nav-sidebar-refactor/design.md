## Context

Transweave Web 目前使用全宽顶部 Header 作为唯一的导航容器，包含面包屑（`Transweave > [Team] > [Project]`）和团队/项目切换下拉。这套设计适合页面层级浅的应用，但 Transweave 有三层数据结构（团队 → 项目 → 翻译键），用户频繁跨层切换，全靠顶部 header 来承载这些状态导致：
- 切换团队/项目需要找 header 上的下拉，不直观
- Jotai atom（`nowTeam`, `nowProject`）存放当前上下文，刷新后丢失
- `/teams` 和 `/team/[teamId]` 两个页面功能重叠

技术栈：Next.js 15 App Router、Jotai、next-intl、Tailwind CSS、shadcn/ui。

## Goals / Non-Goals

**Goals:**
- 加入 240px 左侧边栏，作为团队/项目的持久导航
- Header 瘦身，只保留 Logo + 主题/语言/用户操作
- Project 页面从 7 Tabs 精简为 4 Tabs
- 刷新页面后通过 URL params 恢复当前团队/项目上下文
- 废弃冗余页面 `/teams` 和 `/team/[teamId]`

**Non-Goals:**
- 移动端响应式（侧边栏折叠为 drawer 留作后续）
- 改动后端 API
- 重构 Jotai 状态管理架构（只减少对 atom 的依赖，不全部移除）
- 改变翻译编辑器的核心功能

## Decisions

### D1. 侧边栏布局方式：CSS 固定列 vs 独立 Layout

**选择**：在 `app/layout.tsx` 中用 `flex` 将整个 main 区分为 `<Sidebar>` + `<main>` 两列。

**理由**：Next.js App Router 的根 layout 天然支持这种结构，侧边栏组件可以是 Client Component，独立管理折叠状态，不影响服务端渲染的 `main` 区。

**放弃**：独立的嵌套 layout（如 `app/(with-sidebar)/layout.tsx`）——登录/注册等页面需要排除侧边栏，用 `header-manager.tsx` 的现有 auth-page 检测模式即可（侧边栏用同样机制控制显示）。

---

### D2. 侧边栏折叠状态存储：localStorage vs URL param vs Jotai

**选择**：`localStorage`（key: `sidebar-collapsed`）。

**理由**：这是纯 UI 偏好，与路由无关，不需要服务端感知，localStorage 最简单，跨 session 持久化。

---

### D3. 当前团队/项目上下文：Jotai atom vs URL params

**选择**：URL params 为主，Jotai atom 为辅助缓存。

- 当前项目从 `/project/[projectId]` URL 中读取 `projectId`，页面挂载时 fetch 项目详情并写入 `nowProjectAtom`
- 当前团队从项目详情的 `teamId` 字段恢复（项目归属于团队），不再需要 `/team/[teamId]` 的独立页面
- 侧边栏直接用 API 数据渲染，不强依赖全局 atom

**理由**：URL 是天然的状态存储，分享链接/刷新页面不丢失上下文。

---

### D4. Project Tabs 合并方案

| 现有 Tab | 合并后 | 说明 |
|----------|--------|------|
| 概览 (overview) | **概览** | 保留，活动 feed 作为右侧面板内嵌 |
| 活动 (activity) | 合并进概览 | 作为概览下方的时间线区域 |
| Tokens | **翻译** | 改名，模块切换作为翻译 Tab 内的分组选择器 |
| 模块管理 (modules) | 合并进翻译 | 模块 = Token 分组，用 select/tabs 内嵌 |
| 导入 (import) | **文件** | 合并 |
| 导出 (export) | **文件** | 合并，用子 Tab 或分区区分导入/导出 |
| 设置 (setting) | **设置** | 不变 |

---

### D5. 废弃页面处理

- `/teams` → `redirect("/")` 或重定向到第一个团队的项目页
- `/team/[teamId]` → `redirect("/")` 或重定向到该团队下第一个项目

不直接删除文件，先改为 redirect，便于回滚。

## Risks / Trade-offs

- **侧边栏宽度占用** → 在宽屏够用，窄屏（<768px）时侧边栏默认收起（collapsed），可用 `useMediaQuery` 检测
- **废弃页面有外链** → 用 redirect 而非删文件，已有书签/分享链接不会 404
- **活动 Tab 合并进概览** → 概览页内容变多，需注意懒加载避免首次渲染过重
- **模块合并进翻译 Tab** → 现有 `ProjectModulesTab` 组件需要重构为内嵌分组选择器，有一定改动量

## Migration Plan

1. 先做侧边栏（新增，不删除任何现有功能）
2. 更新 layout，接入侧边栏，验证现有页面正常
3. Header 瘦身（去掉面包屑）
4. 重构 Project Tabs（合并）
5. 废弃 `/teams` 和 `/team/[teamId]`（改 redirect）
6. 收尾：i18n key 补全、样式对齐

## Open Questions

- 侧边栏在移动端（<768px）用 Drawer（sheet）还是直接隐藏？（建议后续迭代，本次先做桌面端）
- 概览页中活动 feed 的数量限制是 10 条还是 20 条？
