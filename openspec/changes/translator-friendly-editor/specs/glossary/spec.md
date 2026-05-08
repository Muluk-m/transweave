## MODIFIED Requirements

### Requirement: Glossary CRUD
The system SHALL provide API endpoints to create, read, update, and delete glossary entries. Each entry SHALL have a source term, translations (Record<string, string>), optional description, a caseSensitive flag, a doNotTranslate flag, and an `autoSyncToAllLanguages` flag (default `false`). Entries SHALL be scoped to either a team or a project (one of teamId/projectId required).

#### Scenario: Create glossary entry with sync flag
- **WHEN** a user with write access calls `POST /api/glossary` with `{sourceTerm, translations, projectId, autoSyncToAllLanguages: true}`
- **THEN** the system SHALL create the entry, perform cross-language backfill, and return the entry with all language slots populated

#### Scenario: Toggle sync after creation
- **WHEN** a user updates an existing entry to set `autoSyncToAllLanguages=true`
- **THEN** the system SHALL backfill empty-string translations for any missing language in the entry's scope at that moment

#### Scenario: Duplicate source term
- **WHEN** a user creates an entry with a sourceTerm that already exists in the same scope
- **THEN** the system SHALL return 409 Conflict

#### Scenario: List glossary entries
- **WHEN** a user calls `GET /api/glossary?projectId=X` or `GET /api/glossary?teamId=X`
- **THEN** the system SHALL return all entries for that scope, supporting optional `q` search parameter and pagination

#### Scenario: Update glossary entry
- **WHEN** a user calls `PUT /api/glossary/:id` with updated fields
- **THEN** the system SHALL update only the provided fields and return the updated entry

#### Scenario: Delete glossary entry
- **WHEN** a user calls `DELETE /api/glossary/:id`
- **THEN** the system SHALL delete the entry and return 200
