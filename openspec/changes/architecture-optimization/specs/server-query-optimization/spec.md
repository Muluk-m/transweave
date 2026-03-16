## ADDED Requirements

### Requirement: findAllProjects uses single JOIN query
The `findAllProjects` operation SHALL retrieve all projects accessible to a user via a single database query joining memberships and projects, eliminating the N+1 query pattern.

#### Scenario: User with multiple teams
- **WHEN** a user belongs to 10 teams, each with 5 projects
- **THEN** the system SHALL execute exactly 1 database query (not 11) and return all 50 projects

#### Scenario: User with no teams
- **WHEN** a user belongs to no teams
- **THEN** the system SHALL return an empty array with exactly 1 database query

### Requirement: Token creation uses database transaction
The `TokenService.create()` method SHALL wrap token creation, history recording, and activity logging in a single database transaction.

#### Scenario: Successful token creation
- **WHEN** a new token is created successfully
- **THEN** the token, its history entry (if versioning enabled), and the activity log entry SHALL all be committed atomically

#### Scenario: Activity logging fails during token creation
- **WHEN** token creation succeeds but activity logging fails
- **THEN** the entire operation SHALL be rolled back, and no token SHALL be persisted

### Requirement: Token bulk operations use transactions
Bulk token operations (create many, update many, delete many) SHALL use database transactions to ensure atomicity.

#### Scenario: Bulk token creation partially fails
- **WHEN** a bulk create of 100 tokens fails on token #50 due to a duplicate key
- **THEN** all 100 tokens SHALL be rolled back and none SHALL be persisted

### Requirement: Missing database indexes are added
Database indexes SHALL be added for frequently queried columns that currently lack indexes.

#### Scenario: User login by email
- **WHEN** a user logs in with their email
- **THEN** the query SHALL use the index on `users.email`

#### Scenario: API key validation
- **WHEN** an API key is validated during authentication
- **THEN** the query SHALL use the index on `api_keys.key_hash`

#### Scenario: Token filtering by module
- **WHEN** tokens are filtered by module name
- **THEN** the query SHALL use the index on `tokens.module`
