## ADDED Requirements

### Requirement: Glossary CRUD
The system SHALL provide API endpoints to create, read, update, and delete glossary entries. Each entry SHALL have a source term, translations (Record<string, string>), optional description, a caseSensitive flag, and a doNotTranslate flag. Entries SHALL be scoped to either a team or a project (one of teamId/projectId required).

#### Scenario: Create glossary entry
- **WHEN** a user with write access calls `POST /api/glossary` with `{sourceTerm, translations, projectId}`
- **THEN** the system SHALL create the entry and return it with an id

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

### Requirement: Glossary resolution with cascade
When resolving glossary for a project, the system SHALL merge project-level entries with team-level entries. Project-level entries SHALL take precedence over team-level entries for the same sourceTerm.

#### Scenario: Project entry overrides team entry
- **WHEN** team glossary has "Token" → "令牌" and project glossary has "Token" → "词条"
- **THEN** the resolved glossary for that project SHALL use "词条"

#### Scenario: Team-only entry
- **WHEN** team glossary has "Module" → "模块" and project has no entry for "Module"
- **THEN** the resolved glossary SHALL include "模块"

### Requirement: Glossary bulk import/export
The system SHALL support bulk import and export of glossary entries in JSON and CSV formats.

#### Scenario: Export as JSON
- **WHEN** a user calls `GET /api/glossary/export?projectId=X&format=json`
- **THEN** the system SHALL return a JSON array of glossary entries

#### Scenario: Import from CSV
- **WHEN** a user calls `POST /api/glossary/import` with a CSV body containing columns `sourceTerm,en,zh,...`
- **THEN** the system SHALL upsert entries (update existing by sourceTerm, create new ones) and return stats `{created, updated, unchanged}`

### Requirement: Glossary term highlighting in editor
The web UI translation editor SHALL highlight source text segments that match glossary terms. Hovering over a highlighted term SHALL show the glossary translation for the current target language.

#### Scenario: Term highlighted
- **WHEN** a user edits a translation and the source text contains the word "Token"
- **AND** "Token" exists in the resolved glossary
- **THEN** "Token" SHALL be highlighted in the source text display with the target-language translation shown on hover

#### Scenario: Do-not-translate term
- **WHEN** a glossary entry has doNotTranslate=true
- **THEN** the highlight SHALL indicate the term should be kept as-is in the translation

### Requirement: Glossary management page
The web UI SHALL provide a glossary management page accessible from project settings and team settings, allowing users to view, search, add, edit, and delete glossary entries.

#### Scenario: View glossary page
- **WHEN** a user navigates to project glossary settings
- **THEN** the system SHALL display a searchable table of glossary entries with source term, translations, and description
