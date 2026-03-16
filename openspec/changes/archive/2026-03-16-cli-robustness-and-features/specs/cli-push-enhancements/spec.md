## ADDED Requirements

### Requirement: Dry-run mode for push
`transweave push --dry-run` SHALL send local files to `POST /api/project/import/preview/:projectId` and display what would change without actually importing.

#### Scenario: Dry-run shows preview
- **WHEN** `transweave push --dry-run` is run
- **THEN** the CLI SHALL display added/updated/removed counts per language without modifying server data
- **AND** the output SHALL clearly indicate this is a preview ("Dry run — no changes applied")

#### Scenario: Dry-run with JSON output
- **WHEN** `transweave push --dry-run --json` is run
- **THEN** the CLI SHALL output the preview result as structured JSON

### Requirement: Unified pull endpoint
The `pull` command SHALL use `POST /api/project/export/:projectId` exclusively, removing the fallback to `GET /api/project/download/:projectId`.

#### Scenario: Pull with module filter
- **WHEN** `transweave pull --module dashboard` is run
- **THEN** the CLI SHALL pass `modules: ["dashboard"]` in the export request body and only save translations for that module

#### Scenario: Pull standard
- **WHEN** `transweave pull` is run without `--module`
- **THEN** the CLI SHALL request all modules via `scope: "all"` in the export body
