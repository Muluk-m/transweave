## ADDED Requirements

### Requirement: Permission helper functions
系统 SHALL 提供权限判断工具函数，基于用户在团队中的 membership role 返回操作可见性。

#### Scenario: Owner can delete team
- **WHEN** user's role in a team is "owner"
- **THEN** `canDeleteTeam()` returns true

#### Scenario: Member cannot delete team
- **WHEN** user's role in a team is "member"
- **THEN** `canDeleteTeam()` returns false

#### Scenario: Admin can edit team
- **WHEN** user's role in a team is "admin"
- **THEN** `canEditTeam()` returns true

### Requirement: Delete team button visibility
"删除团队"按钮 SHALL 仅在当前用户为团队 owner 时可见。

#### Scenario: Owner sees delete button
- **WHEN** user with owner role views team card
- **THEN** the delete team action button is visible

#### Scenario: Member does not see delete button
- **WHEN** user with member role views team card
- **THEN** the delete team action button is hidden

### Requirement: Edit team button visibility
"编辑团队"和"管理成员"按钮 SHALL 仅在当前用户为 owner 或 admin 时可见。

#### Scenario: Admin sees edit and members buttons
- **WHEN** user with admin role views team card
- **THEN** edit team and manage members buttons are visible

#### Scenario: Member does not see edit button
- **WHEN** user with member role views team card
- **THEN** edit team and manage members buttons are hidden
