## ADDED Requirements

### Requirement: 侧边栏展示团队和项目列表
系统 SHALL 在所有认证页面左侧渲染一个固定侧边栏（宽度 240px），展示当前用户所有团队及其项目，支持折叠/展开每个团队。

#### Scenario: 用户查看侧边栏
- **WHEN** 用户已登录并访问任意非认证页面（非 /login, /register, /setup）
- **THEN** 页面左侧显示侧边栏，列出所有团队，每个团队下展示其项目列表

#### Scenario: 折叠团队
- **WHEN** 用户点击团队名称左侧的折叠箭头
- **THEN** 该团队的项目列表折叠隐藏，箭头变为收起状态

#### Scenario: 展开团队
- **WHEN** 用户点击已折叠的团队名称左侧的箭头
- **THEN** 该团队的项目列表重新展示

### Requirement: 侧边栏高亮当前项目
系统 SHALL 在侧边栏中高亮显示当前访问的项目。

#### Scenario: 访问项目页
- **WHEN** 用户导航到 `/project/[projectId]`
- **THEN** 侧边栏中对应项目条目高亮（背景色 + 文字加粗）

#### Scenario: 切换项目
- **WHEN** 用户点击侧边栏中另一个项目
- **THEN** 路由跳转到 `/project/[newProjectId]`，新项目高亮，旧项目高亮取消

### Requirement: 侧边栏支持整体折叠
系统 SHALL 支持将侧边栏整体折叠为图标模式（宽度约 52px），折叠状态持久化到 localStorage。

#### Scenario: 折叠侧边栏
- **WHEN** 用户点击侧边栏底部的折叠按钮
- **THEN** 侧边栏收窄为图标模式，团队/项目名称隐藏，主内容区扩展

#### Scenario: 刷新后保持折叠状态
- **WHEN** 用户折叠侧边栏后刷新页面
- **THEN** 侧边栏保持折叠状态（从 localStorage 恢复）

### Requirement: 侧边栏底部提供全局设置入口
系统 SHALL 在侧边栏底部展示 API Keys 和用户设置的快捷入口。

#### Scenario: 点击 API Keys 入口
- **WHEN** 用户点击侧边栏底部的 API Keys 图标/文字
- **THEN** 路由跳转到 `/settings/api-keys`

### Requirement: 废弃 /teams 和 /team/[teamId] 页面
系统 SHALL 将 `/teams` 和 `/team/[teamId]` 重定向，避免 404。

#### Scenario: 访问旧 /teams 页面
- **WHEN** 用户访问 `/teams`
- **THEN** 自动重定向到首页 `/`

#### Scenario: 访问旧 /team/[teamId] 页面
- **WHEN** 用户访问 `/team/[teamId]`
- **THEN** 自动重定向到首页 `/`

### Requirement: 通过 URL params 恢复项目上下文
系统 SHALL 在访问 `/project/[projectId]` 时从 URL 中读取项目 ID，不依赖 Jotai atom 作为唯一来源。

#### Scenario: 刷新项目页
- **WHEN** 用户在 `/project/[projectId]` 页面刷新
- **THEN** 页面正确加载该项目的数据，侧边栏高亮对应项目
