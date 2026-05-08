## ADDED Requirements

### Requirement: Read-only snapshot metadata
The system SHALL persist `token_snapshots` rows with `(id, project_id, name, description, base_history_at, created_by, created_at)`. Snapshots SHALL not duplicate token translations — the read path joins `token_history` filtered by `base_history_at` to materialise the snapshot's contents at read time.

#### Scenario: Create snapshot
- **WHEN** a user calls `POST /api/projects/:id/snapshots` with `{ name: "v1.2.0" }`
- **THEN** the system SHALL insert a row with `base_history_at = NOW()`
- **AND** SHALL NOT copy any token rows

#### Scenario: Read snapshot tokens
- **WHEN** a user calls `GET /api/snapshots/:id/tokens`
- **THEN** the system SHALL return one row per token in the project, where each row's translation/status/meta reflects the latest `token_history` entry with `changed_at <= base_history_at`

### Requirement: Backward-compatible read path
Snapshots are an additive feature. The existing `/api/projects/:id/tokens` endpoint and CLI `transweave pull` SHALL continue to read live (latest) data when the `--snapshot` flag is not supplied.

#### Scenario: Old CLI without --snapshot
- **WHEN** a CLI v1.x binary calls `transweave pull --project X`
- **THEN** the server SHALL return the live token list, identical to its prior behaviour

#### Scenario: New CLI with --snapshot
- **WHEN** `transweave pull --snapshot <id>` is invoked
- **THEN** the server SHALL return the snapshot's materialised token list

### Requirement: Snapshot delete is reversible at translation level
Deleting a snapshot SHALL only remove the metadata row, never the underlying `token_history` rows it points to.

#### Scenario: Delete snapshot keeps history
- **WHEN** `DELETE /api/snapshots/:id` is invoked
- **THEN** the row in `token_snapshots` SHALL be removed
- **AND** all `token_history` rows referenced by other snapshots and live reads SHALL remain untouched
