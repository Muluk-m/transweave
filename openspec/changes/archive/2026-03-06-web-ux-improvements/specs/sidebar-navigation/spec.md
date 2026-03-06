## ADDED Requirements

### Requirement: Team name links to team detail page
侧边栏中的团队名称 SHALL 可点击，点击后导航到 `/team/[teamId]` 页面。

#### Scenario: User clicks team name in sidebar
- **WHEN** user clicks a team name in the sidebar
- **THEN** browser navigates to `/team/<teamId>` showing team detail view

### Requirement: New project shortcut per team
每个展开的团队下 SHALL 显示一个"新建项目"按钮，点击后打开创建项目对话框。

#### Scenario: User creates project from sidebar
- **WHEN** user clicks the "new project" button under a team in the sidebar
- **THEN** a create project dialog opens with the team pre-selected

#### Scenario: Project list updates after creation
- **WHEN** user successfully creates a project via sidebar shortcut
- **THEN** the new project appears in the sidebar under that team without page refresh

### Requirement: Tutorial navigation entry
侧边栏底部 SHALL 包含一个指向 `/tutorial` 的导航链接，与 API Keys 并列。

#### Scenario: User navigates to tutorial
- **WHEN** user clicks the tutorial link in sidebar bottom section
- **THEN** browser navigates to `/tutorial` page

#### Scenario: Tutorial link in collapsed sidebar
- **WHEN** sidebar is collapsed
- **THEN** tutorial entry shows as an icon button with tooltip

### Requirement: Sidebar and homepage share team data
侧边栏 SHALL 从 `teamsAtom` 读取团队列表，不再独立调用 `fetchMyTeams()`。

#### Scenario: Team created on homepage reflects in sidebar
- **WHEN** user creates a new team on the homepage TeamsView
- **THEN** the new team immediately appears in the sidebar without refresh

#### Scenario: Team deleted reflects in sidebar
- **WHEN** user deletes a team on the homepage
- **THEN** the team disappears from the sidebar immediately

#### Scenario: Direct navigation to project page with empty atom
- **WHEN** user directly navigates to `/project/xxx` (skipping homepage)
- **THEN** sidebar detects empty `teamsAtom` and fetches team data as fallback
