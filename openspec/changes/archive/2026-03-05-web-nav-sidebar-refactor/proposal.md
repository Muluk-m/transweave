## Why

当前 Web 采用"全宽 Header + 页面跳转"的布局，但产品核心是三层数据结构（团队 → 项目 → 翻译键），导航设计与数据结构不匹配——用户要多次跳页才能切换上下文，且刷新后状态丢失。

## What Changes

- **新增** 左侧固定侧边栏，承载团队/项目导航，支持折叠
- **移除** `/teams` 独立页面（侧边栏替代其功能）
- **移除** `/team/[teamId]` 页面（侧边栏 + 直接进入项目替代）
- **移除** Header 中的面包屑导航和团队/项目下拉切换
- **精简** Project Tabs：7 个合并为 4 个（概览 | 翻译 | 文件 | 设置）
- **修复** 页面刷新后上下文丢失问题（改为从 URL params 恢复）
- **修复** 模块管理 Tab 缺少 i18n 的问题（合并进翻译 Tab 后一并解决）

## Capabilities

### New Capabilities

- `sidebar-navigation`: 左侧边栏，展示所有团队及其项目，支持折叠/展开，当前项目高亮，底部有全局设置入口
- `project-tabs-v2`: 重构后的项目 Tab 结构（4 个：概览、翻译、文件、设置），其中翻译 Tab 内嵌模块分组过滤，文件 Tab 合并导入导出

### Modified Capabilities

（无现有 spec 需要修改）

## Impact

- `packages/web/app/layout.tsx` — 整体布局从纯 Header 改为 Header + Sidebar + Main
- `packages/web/components/views/headerView.tsx` — 移除面包屑、团队/项目切换器
- `packages/web/app/teams/page.tsx` — 废弃或重定向到首页
- `packages/web/app/team/[teamId]/page.tsx` — 废弃或重定向到项目页
- `packages/web/components/views/projectView/index.tsx` — Tabs 从 7 个合并为 4 个
- 新增 `packages/web/components/views/sidebarView/` 组件目录
- Jotai atoms 中的 `nowTeam` / `nowProject` 依赖减少，改为从 URL 读取
