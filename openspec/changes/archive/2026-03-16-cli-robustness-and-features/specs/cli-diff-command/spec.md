## ADDED Requirements

### Requirement: Diff command previews push changes
`transweave diff` SHALL read local translation files and send them to `POST /api/project/import/preview/:projectId` to display what would change if `push` were run.

#### Scenario: Show added, modified, and removed keys
- **WHEN** `transweave diff` is run and local files differ from server
- **THEN** the CLI SHALL display changes grouped by language, showing added (+), modified (~), and removed (-) keys with a summary count

#### Scenario: No changes
- **WHEN** local files match the server state
- **THEN** the CLI SHALL display "No changes detected"

#### Scenario: Specific language diff
- **WHEN** `transweave diff --languages zh-CN` is run
- **THEN** the CLI SHALL only diff the specified language
