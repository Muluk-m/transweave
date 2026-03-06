## ADDED Requirements

### Requirement: Remove redundant signup route
`/signup` 路由 SHALL 被删除。注册功能已集成在 `/login` 页面的 toggle 中。

#### Scenario: User visits /signup
- **WHEN** user navigates to `/signup`
- **THEN** a 404 page is returned (route no longer exists)

### Requirement: Remove redundant teams redirect route
`/teams` 路由 SHALL 被删除。首页 `/` 已直接渲染 TeamsView。

#### Scenario: User visits /teams
- **WHEN** user navigates to `/teams`
- **THEN** a 404 page is returned (route no longer exists)

### Requirement: Remove redundant project redirect route
`/project/page.tsx`（无 projectId 的 `/project` 路由）SHALL 被删除。

#### Scenario: User visits /project without ID
- **WHEN** user navigates to `/project` (no project ID)
- **THEN** a 404 page is returned (route no longer exists)

### Requirement: Login page handles both login and registration
`/login` 页面 SHALL 同时支持登录和注册两种模式，通过 toggle 切换，注册模式包含"确认密码"字段。

#### Scenario: User toggles to registration mode
- **WHEN** user clicks "立即注册" on the login page
- **THEN** form switches to registration mode with name, email, password, and confirm password fields
