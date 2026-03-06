## 1. 侧边栏组件

- [x] 1.1 创建 `packages/web/components/views/sidebarView/index.tsx`，实现侧边栏框架（固定宽度 240px，支持折叠为 52px）
- [x] 1.2 实现团队列表：从 API 拉取所有团队，每个团队可折叠展开显示项目列表
- [x] 1.3 实现项目高亮逻辑：读取 URL 中的 `projectId`，对应项目条目高亮
- [x] 1.4 实现折叠/展开单个团队的 accordion 交互
- [x] 1.5 实现侧边栏整体折叠（collapsed 模式：只显示图标），折叠状态存入 localStorage
- [x] 1.6 实现侧边栏底部区域：API Keys 快捷入口、设置入口
- [x] 1.7 补充 i18n key（中英文）用于侧边栏内所有文案

## 2. 布局集成

- [x] 2.1 修改 `app/layout.tsx`：根布局改为 `flex-row`，左侧 `<SidebarView>`，右侧 `<main>`
- [x] 2.2 参考 `header-manager.tsx` 的 auth-page 检测模式，在认证页面（/login、/register、/setup）隐藏侧边栏
- [x] 2.3 修改 `headerView.tsx`：移除面包屑（团队/项目切换下拉），Header 只保留 Logo + 主题/语言/用户操作
- [ ] 2.4 验证各页面在新布局下样式正常（特别是 page-container 的宽度/padding）

## 3. 上下文恢复（URL 优先）

- [x] 3.1 修改 `app/project/[projectId]/page.tsx`：页面挂载时根据 URL `projectId` fetch 项目详情，写入 `nowProjectAtom` 和 `nowTeamAtom`
- [ ] 3.2 验证刷新 `/project/[projectId]` 后侧边栏正确高亮、Header 正常显示

## 4. 废弃冗余页面

- [x] 4.1 修改 `app/teams/page.tsx`：改为 `redirect("/")`
- [x] 4.2 修改 `app/team/[teamId]/page.tsx`：改为 `redirect("/")`
- [x] 4.3 移除或替换首页 (`app/page.tsx`) 中跳转到 `/teams` 的逻辑

## 5. Project Tabs 精简（7 → 4）

- [x] 5.1 修改 `projectView/index.tsx`：Tab 列表改为 4 个（overview、tokens、files、setting），补全 i18n key
- [x] 5.2 将活动 Tab 内容（`ProjectActivityTab`）内嵌到概览 Tab（`ProjectOverviewTab`）底部，作为时间线区域（原已内置，无需额外改动）
- [x] 5.3 在翻译 Tab（原 `ProjectTokensTab`）顶部增加模块分组选择器（原已内置 Select 过滤器，无需额外改动）
- [x] 5.4 新建 `ProjectFilesTab.tsx`，整合原 `ProjectImportTab` 和 `ProjectExportTab`，用子选项卡区分导入/导出
- [x] 5.5 删除不再使用的独立 Tab 引用（modules、import、export、activity）

## 6. i18n key 补全

- [x] 6.1 在 `zh-CN.json` 和 `en-US.json` 中添加侧边栏相关 key（`sidebar.*`）
- [x] 6.2 在 `zh-CN.json` 和 `en-US.json` 中添加新 Tab key（`project.tabs.translations`、`project.tabs.files`）
- [x] 6.3 删除不再使用的旧 Tab i18n key（`project.tabs.modules`、`project.tabs.activity`、`project.tabs.task`）

## 7. 收尾与验证

- [x] 7.1 检查所有页面路由正常，旧 URL 均正确重定向
- [ ] 7.2 验证刷新任意页面后上下文正确恢复，侧边栏高亮正确
- [ ] 7.3 检查中英文切换，所有文案无硬编码中文
- [x] 7.4 检查 TypeScript 类型无报错（仅 profile 页有预存在的 react-hook-form 类型问题）
